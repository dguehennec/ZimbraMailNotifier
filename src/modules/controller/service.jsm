/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Zimbra Mail Notifier.
 *
 * The Initial Developer of the Original Code is
 * David GUEHENNEC.
 * Portions created by the Initial Developer are Copyright (C) 2013
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 * Benjamin ROBIN
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

"use strict";

Components.utils.import("resource://zimbra_mail_notifier/constant/zimbrahelper.jsm");
Components.utils.import("resource://zimbra_mail_notifier/service/notifier.jsm");
Components.utils.import("resource://zimbra_mail_notifier/service/logger.jsm");
Components.utils.import("resource://zimbra_mail_notifier/service/util.jsm");
Components.utils.import("resource://zimbra_mail_notifier/service/prefs.jsm");
Components.utils.import("resource://zimbra_mail_notifier/service/request.jsm");
Components.utils.import("resource://zimbra_mail_notifier/service/webservices.jsm");
Components.utils.import("resource://zimbra_mail_notifier/service/infoerror.jsm");
Components.utils.import("resource://zimbra_mail_notifier/service/browser.jsm");

var EXPORTED_SYMBOLS = ["zimbra_notifier_Service", "zimbra_notifier_SERVICE_EVENT",
                          "zimbra_notifier_SERVICE_STATE"];


var zimbra_notifier_SERVICE_STATE = {
    DISCONNECTED         : 'DISCONNECTED',
    NOTHING_TO_DO        : 'NOTHING_TO_DO',

    CONNECT_CHECK        : 'CONNECT_CHECK',
    CONNECT_RUN          : 'CONNECT_RUN',
    CONNECT_WAIT         : 'CONNECT_WAIT',
    CONNECT_OK           : 'CONNECT_OK',
    CONNECT_INV_LOGIN    : 'CONNECT_INV_LOGIN',
    CONNECT_ERR          : 'CONNECT_ERR',

    WAITSET_CHECK        : 'WAITSET_CHECK',
    WAITSET_CHECK_RUN    : 'WAITSET_CHECK_RUN',
    WAITSET_CHECK_ENDED  : 'WAITSET_CHECK_ENDED',
    WAITSET_CREATE_RUN   : 'WAITSET_CREATE_RUN',
    WAITSET_CREATE_ENDED : 'WAITSET_CREATE_ENDED',

    REFRESH_START        : 'REFRESH_START',
    UNREAD_MSG_RUN       : 'UNREAD_MSG_RUN',
    UNREAD_MSG_ENDED     : 'UNREAD_MSG_ENDED',
    CALENDAR_RUN         : 'CALENDAR_RUN',
    CALENDAR_ENDED       : 'CALENDAR_ENDED',
    TASK_RUN             : 'TASK_RUN',
    TASK_ENDED           : 'TASK_ENDED',
    REFRESH_ENDED        : 'REFRESH_ENDED',

    WAITSET_BLOCK_RUN    : 'WAITSET_BLOCK_RUN',
    WAITSET_NO_BLOCK_RUN : 'WAITSET_NO_BLOCK_RUN',
    WAITSET_NEW_EVT      : 'WAITSET_NEW_EVT',
    WAITSET_NO_NEW_EVT   : 'WAITSET_NO_NEW_EVT'
};

var zimbra_notifier_SERVICE_EVENT = {
    STOPPED              : 'STOPPED',
    CONNECTING           : 'CONNECTING',
    INVALID_LOGIN        : 'INVALID_LOGIN',
    CONNECT_ERR          : 'CONNECT_ERR',
    CONNECTED            : 'CONNECTED',
    DISCONNECTED         : 'DISCONNECTED',
    CHECKING_UNREAD_MSG  : 'CHECKING_UNREAD_MSG',
    UNREAD_MSG_UPDATED   : 'UNREAD_MSG_UPDATED',
    CHECKING_CALENDAR    : 'CHECKING_CALENDAR',
    CALENDAR_UPDATED     : 'CALENDAR_UPDATED',
    CHECKING_TASK        : 'CHECKING_TASK',
    TASK_UPDATED         : 'TASK_UPDATED',
    PREF_UPDATED         : 'PREF_UPDATED'
};

/* ******************* Init functions *********************** */

/**
 * Creates an instance of Service.
 *
 * @constructor
 * @this {Service}
 * @param {Controller}
 *             The parent listening for events
 */
var zimbra_notifier_Service = function(parent) {
    this._parent = parent;
    this._logger = new zimbra_notifier_Logger("Service");
    this._reqInfoErrors = new zimbra_notifier_InfoErrors();

    this._currentState = zimbra_notifier_SERVICE_STATE.NOTHING_TO_DO;
    this._loadDefault();
    zimbra_notifier_Util.addObserver(this, zimbra_notifier_Constant.OBSERVER.PREF_SAVED);
};

/**
 * Load default values
 *
 * @private
 * @this {Service}
 */
zimbra_notifier_Service.prototype._loadDefault = function() {
    // Web service
    this._abortRunningReq();
    if (this._webservice) {
        this._webservice.release();
        this._webservice = null;
    }

    // Remove auth cookies
    zimbra_notifier_Browser.updateCookies('', []);

    // Timer for state machine
    this._stopStateTimer();

    // Updated when calling initializeConnection, used for notification
    this._dateConnection = null;
    this._firstCallbackNewMsg = true;

    // Calendar events / tasks / unread messages
    this._stopRemoveEvents();
    this._currentTasks = [];
    this._currentMessageUnRead = [];
    this._idxLoopQuery = 0;

    // Delay before trying again the connect
    this._delayWaitConnect = 0;

    // The date when launching the blocking wait request
    this._timeStartWaitReq = 0;
    this._timeStartLoopWaitReq = 0;
    this._needCheckWaitSet = false;
    this._needCheckAgainWaitSet = false;
};

/**
 * Stop and remove event notifier
 *
 * @private
 * @this {Service}
 */
zimbra_notifier_Service.prototype._stopRemoveEvents = function() {
    if (this._currentEvents) {
        // stop all notifiers if exist
        while (this._currentEvents.length > 0) {
            if (this._currentEvents[0].notifier) {
                this._currentEvents[0].notifier.stop();
            }
            this._currentEvents.shift();
        }
    }
    this._currentEvents = [];
};

/**
 * Release Service.
 *
 * @this {Service}
 */
zimbra_notifier_Service.prototype.shutdown = function() {
    this._logger.info("Shutdown...");
    zimbra_notifier_Util.removeObserver(this, zimbra_notifier_Constant.OBSERVER.PREF_SAVED);
    this._loadDefault();
    this._reqInfoErrors.clearAllErrors();
};

/**
 * Get the webservices or build a new one with backend associated with the server url in preferences
 *
 * @private
 * @this {Service}
 */
zimbra_notifier_Service.prototype._getWebService = function() {
    if (!this._webservice) {

        if (zimbra_notifier_Prefs.isFreeWebService()) {
            Components.utils.import("resource://zimbra_mail_notifier/specific/free.jsm");
            this._webservice = new zimbra_notifier_WebserviceFree(
                zimbra_notifier_Prefs.getRequestQueryTimeout(), 52000, this);
        }
        else {
            this._webservice = new zimbra_notifier_Webservice(
                zimbra_notifier_Prefs.getRequestQueryTimeout(),
                zimbra_notifier_Prefs.getRequestWaitTimeout(), this);
        }
        // Restore previous wait set
        var wSet = zimbra_notifier_Prefs.getPreviousWaitSet();
        if (wSet !== null) {
            this._webservice.restoreWaitSet(wSet.id, wSet.seq, wSet.urlWebService, wSet.user);
        }
        this._needCheckWaitSet = this._webservice.isWaitSetValid();
    }
    return this._webservice;
};


/* ******************* Manage state machine *********************** */

/**
 * Change state in the state machine
 *
 * @private
 * @this {Service}
 * @param {String}
 *            newState the new state
 */
zimbra_notifier_Service.prototype._changeState = function(newState) {
    var oldState = this._currentState;
    this._currentState = newState;
    if (oldState !== newState) {
        this._logger.info("Change state " + oldState + " -> " + newState);
    }
};

/**
 * After the delay run the new state
 *
 * @private
 * @this {Service}
 * @param {String}
 *            newState the new state
 * @param {Number}
 *            delayMs the delay before calling _changeAndRunState
 */
zimbra_notifier_Service.prototype._planRunState = function(newState, delayMs) {
    var object = this;
    this._stateTimer = zimbra_notifier_Util.setTimer(this._stateTimer, function() {
        object._changeAndRunState(newState);
        object._stateTimer = null;
    }, delayMs);
};

/**
 * Cancel the running timer to set a new state
 *
 * @private
 * @this {Service}
 */
zimbra_notifier_Service.prototype._stopStateTimer = function() {
    if (this._stateTimer) {
        this._stateTimer.cancel();
    }
    else {
        this._stateTimer = null;
    }
};

/**
 * Stop the current task, then change staten and run it
 *
 * @private
 * @this {Service}
 * @param {String}
 *            newState the new state
 * @param {Number}
 *            delayMs the delay before calling _changeAndRunState
 */
zimbra_notifier_Service.prototype._changeRunningState = function(newState, delayMs) {
    this._abortRunningReq();
    this._stopStateTimer();
    this._needCheckAgainWaitSet = true;
    this._planRunState(newState, delayMs);
};

/**
 * Check the current state of the state machine, if the state is unexpected, go the init state
 *
 * @private
 * @this {Service}
 * @param {String}
 *            expStates the array of expected states
 */
zimbra_notifier_Service.prototype._checkExpectedStates = function(expStates) {
    var ok = false;
    for ( var idx = 0; idx < expStates.length; idx++) {
        if (this._currentState === expStates[idx]) {
            ok = true;
            break;
        }
    }
    if (ok === false) {
        this._logger.error("Unexpected state: " + this._currentState + " instead: " + expStates);
        this._abortRunningReq();
        this._stopStateTimer();
        this._planRunState(zimbra_notifier_SERVICE_STATE.NOTHING_TO_DO, 100);
    }
    return ok;
};

/**
 * Check the current state of the state machine, if the state is unexpected, go the init state
 *
 * @private
 * @this {Service}
 * @param {String}
 *            expState the expected state
 */
zimbra_notifier_Service.prototype._checkExpectedState = function(expState) {
    return this._checkExpectedStates([expState]);
};

/**
 * Change the current state, and run it
 *
 * @private
 * @this {Service}
 * @param {Number}
 *            newState  The state to change and run
 */
zimbra_notifier_Service.prototype._changeAndRunState = function(newState) {
    try {
        // Change to the new state
        this._changeState(newState);
        // And run it
        this._runState(newState);
    }
    catch (e) {
        this._logger.error("Fail run state (" + newState + "): " + e);
        this._changeRunningState(zimbra_notifier_SERVICE_STATE.NOTHING_TO_DO, 500);
    }
};

/**
 * Execute the code of specified state
 *
 * @private
 * @this {Service}
 * @param {Number}
 *            newState  The state to run
 */
zimbra_notifier_Service.prototype._runState = function(newState) {
    switch (newState) {
        // We cannot login or we are just disconnected
        case zimbra_notifier_SERVICE_STATE.DISCONNECTED:
            this._reqInfoErrors.clearAllErrors();
            this._parent.event(zimbra_notifier_SERVICE_EVENT.DISCONNECTED);
            this._planRunState(zimbra_notifier_SERVICE_STATE.NOTHING_TO_DO, 10);
            break;

        // Nothing to do...
        case zimbra_notifier_SERVICE_STATE.NOTHING_TO_DO:
            this._loadDefault();
            this._parent.event(zimbra_notifier_SERVICE_EVENT.STOPPED);
            break;

        // The login is invalid, wait for user input...
        case zimbra_notifier_SERVICE_STATE.CONNECT_INV_LOGIN:
            this._parent.event(zimbra_notifier_SERVICE_EVENT.INVALID_LOGIN);
            this._planRunState(zimbra_notifier_SERVICE_STATE.NOTHING_TO_DO, 10);
            break;

        // The connect failed for any other reason, try again later
        case zimbra_notifier_SERVICE_STATE.CONNECT_ERR:
            this._parent.event(zimbra_notifier_SERVICE_EVENT.CONNECT_ERR);
            this._changeState(zimbra_notifier_SERVICE_STATE.CONNECT_WAIT);

        // Wait before trying again
        case zimbra_notifier_SERVICE_STATE.CONNECT_WAIT:
            this._delayWaitConnect += zimbra_notifier_Constant.SERVICE.CONNECT_BASE_WAIT_AFTER_FAILURE;
            if (this._delayWaitConnect > zimbra_notifier_Constant.SERVICE.CONNECT_MAX_WAIT_AFTER_FAILURE) {
                this._delayWaitConnect = zimbra_notifier_Constant.SERVICE.CONNECT_MAX_WAIT_AFTER_FAILURE;
            }
            this._planRunState(zimbra_notifier_SERVICE_STATE.CONNECT_RUN, this._delayWaitConnect);
            break;

        // Launch the connect query
        case zimbra_notifier_SERVICE_STATE.CONNECT_RUN:
            this._doConnect();
            break;

        // The connect query succeed, check if connected
        case zimbra_notifier_SERVICE_STATE.CONNECT_OK:
            this._parent.event(zimbra_notifier_SERVICE_EVENT.CONNECTED);
            this._changeState(zimbra_notifier_SERVICE_STATE.CONNECT_CHECK);

        // Check if we are connected
        case zimbra_notifier_SERVICE_STATE.CONNECT_CHECK:
            if (!this._webservice || this._webservice.needConnect()) {
                this._planRunState(zimbra_notifier_SERVICE_STATE.CONNECT_RUN, 100);
                break;
            }
            else {
                this._changeState(zimbra_notifier_SERVICE_STATE.WAITSET_CHECK);
            }

        // Check if waitset is still valid
        case zimbra_notifier_SERVICE_STATE.WAITSET_CHECK:
            if (!this._getWebService().isWaitSetValid()) {
                this._needCheckWaitSet = false;
                this._planRunState(zimbra_notifier_SERVICE_STATE.WAITSET_CREATE_RUN, 1);
                break;
            }
            else if (this._needCheckWaitSet === true) {
                this._needCheckWaitSet = false;
                this._planRunState(zimbra_notifier_SERVICE_STATE.WAITSET_CHECK_RUN, 1);
                break;
            }
            else {
                this._changeState(zimbra_notifier_SERVICE_STATE.REFRESH_START);
            }

        // Start the refresh query
        case zimbra_notifier_SERVICE_STATE.REFRESH_START:
            this._idxLoopQuery = 0;
            this._changeState(zimbra_notifier_SERVICE_STATE.UNREAD_MSG_RUN);

        // Check unread message
        case zimbra_notifier_SERVICE_STATE.UNREAD_MSG_RUN:
            this._parent.event(zimbra_notifier_SERVICE_EVENT.CHECKING_UNREAD_MSG);

            if (this._needRunReq(zimbra_notifier_REQUEST_TYPE.UNREAD_MSG)) {
                this._getWebService().searchUnReadMsg();
                break;
            }

        case zimbra_notifier_SERVICE_STATE.UNREAD_MSG_ENDED:
            this._parent.event(zimbra_notifier_SERVICE_EVENT.UNREAD_MSG_UPDATED);
            this._changeState(zimbra_notifier_SERVICE_STATE.CALENDAR_RUN);

        // Check calendar
        case zimbra_notifier_SERVICE_STATE.CALENDAR_RUN:
            this._parent.event(zimbra_notifier_SERVICE_EVENT.CHECKING_CALENDAR);

            if (zimbra_notifier_Prefs.isCalendarEnabled() &&
                this._needRunReq(zimbra_notifier_REQUEST_TYPE.CALENDAR)) {

                var date = new Date();
                var startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
                var endDate = new Date(date.getTime() +
                                        (86400000 * zimbra_notifier_Prefs.getCalendarPeriodDisplayed()));
                this._getWebService().searchCalendar(startDate, endDate);
                break;
            }

        case zimbra_notifier_SERVICE_STATE.CALENDAR_ENDED:
            this._parent.event(zimbra_notifier_SERVICE_EVENT.CALENDAR_UPDATED);
            this._changeState(zimbra_notifier_SERVICE_STATE.TASK_RUN);

        // Check tasks
        case zimbra_notifier_SERVICE_STATE.TASK_RUN:
            this._parent.event(zimbra_notifier_SERVICE_EVENT.CHECKING_TASK);

            if (zimbra_notifier_Prefs.isTaskEnabled() && this._needRunReq(zimbra_notifier_REQUEST_TYPE.TASK)) {
                this._getWebService().searchTask();
                break;
            }

        case zimbra_notifier_SERVICE_STATE.TASK_ENDED:
            this._parent.event(zimbra_notifier_SERVICE_EVENT.TASK_UPDATED);
            this._changeState(zimbra_notifier_SERVICE_STATE.REFRESH_ENDED);

        // Check if we need to try again the queries
        case zimbra_notifier_SERVICE_STATE.REFRESH_ENDED:
            this._idxLoopQuery += 1;
            // check if at least one query should be runned again
            var runagain = this._needRunReq(zimbra_notifier_REQUEST_TYPE.UNREAD_MSG);
            if (!runagain && zimbra_notifier_Prefs.isCalendarEnabled() &&
                this._needRunReq(zimbra_notifier_REQUEST_TYPE.CALENDAR)) {
                runagain = true;
            }
            if (!runagain && zimbra_notifier_Prefs.isTaskEnabled() &&
                this._needRunReq(zimbra_notifier_REQUEST_TYPE.TASK)) {
                runagain = true;
            }
            // Do we need to retry
            if (runagain === true) {
                this._planRunState(zimbra_notifier_SERVICE_STATE.UNREAD_MSG_RUN,
                                   zimbra_notifier_Constant.SERVICE.REFRESH_WAIT_AFTER_FAILURE);
                break;
            }
            else if (this._needCheckAgainWaitSet === true) {
                // Check again the wait set, fix the bug when a blocking WaitSet query is canceled
                this._needCheckAgainWaitSet = false;
                this._planRunState(zimbra_notifier_SERVICE_STATE.WAITSET_NO_BLOCK_RUN, 10);
                break;
            }
            else {
                this._changeState(zimbra_notifier_SERVICE_STATE.WAITSET_BLOCK_RUN);
            }

        // Launch the blocking query waiting for events
        case zimbra_notifier_SERVICE_STATE.WAITSET_BLOCK_RUN:
            this._timeStartWaitReq = new Date().getTime();
            if (this._timeStartLoopWaitReq === 0) {
                this._timeStartLoopWaitReq = this._timeStartWaitReq;
            }
            this._getWebService().waitRequest(true);
            break;

        // Launch the non blocking query waitset
        case zimbra_notifier_SERVICE_STATE.WAITSET_NO_BLOCK_RUN:
            this._timeStartWaitReq = 0;
            this._timeStartLoopWaitReq = new Date().getTime();
            this._getWebService().waitRequest(false);
            break;

        // Check that the wait set id is still valid
        case zimbra_notifier_SERVICE_STATE.WAITSET_CHECK_RUN:
            this._getWebService().waitRequest(false);
            break;

        // End of wait set check (Wait set non blocking returned or failed)
        case zimbra_notifier_SERVICE_STATE.WAITSET_CHECK_ENDED:
            this._planRunState(zimbra_notifier_SERVICE_STATE.CONNECT_CHECK, 10);
            break;

        // We received a change event
        case zimbra_notifier_SERVICE_STATE.WAITSET_NEW_EVT:
            this._needCheckAgainWaitSet = false;
            this._timeStartLoopWaitReq = 0;
            this._planRunState(zimbra_notifier_SERVICE_STATE.CONNECT_CHECK, 1);
            break;

        // The wait request failed, or the request did timeout (no new event)
        case zimbra_notifier_SERVICE_STATE.WAITSET_NO_NEW_EVT:
            this._needCheckAgainWaitSet = false;
            if (this._timeStartWaitReq === 0) {
                this._planRunState(zimbra_notifier_SERVICE_STATE.WAITSET_BLOCK_RUN, 500);
            }
            else {
                var timeEndW = new Date().getTime();
                // Get the delay to sleep before calling the next state
                var delayAfterWaitReq = 10;
                var timeExpW = this._timeStartWaitReq + this._getWebService().getWaitSetTimeout() - 1000;
                if (timeExpW > timeEndW) {
                    delayAfterWaitReq = timeExpW - timeEndW;
                }
                // Check if we need to run again a blocking wait set
                var timeEndLoop = this._timeStartLoopWaitReq + zimbra_notifier_Prefs.getRequestWaitLoopTime();
                if (timeEndLoop > timeEndW) {
                    this._planRunState(zimbra_notifier_SERVICE_STATE.WAITSET_BLOCK_RUN, delayAfterWaitReq);
                }
                else {
                    this._planRunState(zimbra_notifier_SERVICE_STATE.CONNECT_CHECK, delayAfterWaitReq);
                }
            }
            break;

        // Create the waitset
        case zimbra_notifier_SERVICE_STATE.WAITSET_CREATE_RUN:
            this._getWebService().createWaitRequest();
            break;

        // create wait set ended
        case zimbra_notifier_SERVICE_STATE.WAITSET_CREATE_ENDED:
            // Do not do any check here, if we failed, we will try again later
            this._planRunState(zimbra_notifier_SERVICE_STATE.REFRESH_START, 1);
            break;

        default:
            this._logger.error("Unknown state : " + newState);
            this._planRunState(zimbra_notifier_SERVICE_STATE.NOTHING_TO_DO, 100);
            break;
    }
};

/* ******************* Private function to launch query *********************** */

/**
 * Check if we need to run again the query
 * If this is the first loop, reset error loop counter of this request
 *
 * @private
 * @this {Service}
 * @param {String}
 *            reqType the type of the request
 */
zimbra_notifier_Service.prototype._needRunReq = function(reqType) {
    if (this._idxLoopQuery === 0) {
        this._reqInfoErrors.resetLoopErrorCounter(reqType);
    }
    else {
        var valCounter = this._reqInfoErrors.getLoopErrorCounter(reqType);
        if (valCounter === 0) {
            return false;
        }
        else if (valCounter >= zimbra_notifier_Constant.SERVICE.NB_RETRY_QUERY) {
            return false;
        }
    }
    return true;
};

/**
 * Try to run the connect query.
 *
 * @private
 * @this {Service}
 * @return {Boolean} True if we did launch the connect query
 */
zimbra_notifier_Service.prototype._doConnect = function(password) {

    if (!password || password === '') {
        password = zimbra_notifier_Prefs.getUserPassword();
        if (!password || password === '') {
            // No password, cannot login
            this._planRunState(zimbra_notifier_SERVICE_STATE.DISCONNECTED, 100);
            return false;
        }
    }

    if (this._checkExpectedState(zimbra_notifier_SERVICE_STATE.CONNECT_RUN)) {

        this._parent.event(zimbra_notifier_SERVICE_EVENT.CONNECTING);
        this._getWebService().authRequest(zimbra_notifier_Prefs.getUrlWebService(),
                                          zimbra_notifier_Prefs.getUserLogin(), password);
        return true;
    }
    return false;
};

/**
 * Abort the running query if any.
 *
 * @private
 * @this {Service}
 */
zimbra_notifier_Service.prototype._abortRunningReq = function() {
    if (this._webservice) {
        this._webservice.abortRunningReq();
    }
};

/* *********************** Public function called from UI ************************ */

/**
 * Initialize Connection
 * Call from the UI or when launching this app if the autologin is enabled
 *
 * @this {Service}
 * @return {Boolean} True if we did launch the connect query
 */
zimbra_notifier_Service.prototype.initializeConnection = function(password) {

    if (this._currentState === zimbra_notifier_SERVICE_STATE.CONNECT_RUN) {
        this._logger.warning("Already trying to connect, stop and try again...");
    }
    this._dateConnection = new Date();
    this._firstCallbackNewMsg = true;
    this._delayWaitConnect = 0;

    this._abortRunningReq();
    this._stopStateTimer();
    this._changeState(zimbra_notifier_SERVICE_STATE.CONNECT_RUN);

    this._reqInfoErrors.clearAllErrors();

    return this._doConnect(password);
};

/**
 * Close Connection
 *
 * @this {Service}
 */
zimbra_notifier_Service.prototype.closeConnection = function() {
    this._stopStateTimer();
    if (this._webservice) {
        this._webservice.disconnect();
    }
    else {
        this.callbackDisconnect();
    }
};

/**
 * Check now
 *
 * @this {Service}
 */
zimbra_notifier_Service.prototype.checkNow = function() {
    this._reqInfoErrors.clearAllErrors();
    this._changeRunningState(zimbra_notifier_SERVICE_STATE.REFRESH_START, 100);
};

/**
 * observe
 *
 * @this {Service}
 * @param {ISupports}
 *            subject the subject
 * @param {String}
 *            topic the topic
 * @param {String}
 *            data the data
 */
zimbra_notifier_Service.prototype.observe = function(subject, topic, data) {
    if (topic === zimbra_notifier_Constant.OBSERVER.PREF_SAVED) {
        var needRefresh = false;

        if (!zimbra_notifier_Prefs.isCalendarEnabled()) {
            // Clear previous error related to calendar request, and remove any calendar events
            this._reqInfoErrors.clearError(zimbra_notifier_REQUEST_TYPE.CALENDAR);
            this._stopRemoveEvents();
        }
        else {
            needRefresh = true;
        }

        if (!zimbra_notifier_Prefs.isTaskEnabled()) {
            // Clear previous error related to task request, and remove any task
            this._reqInfoErrors.clearError(zimbra_notifier_REQUEST_TYPE.TASK);
            this._currentTasks = [];
        }
        else {
            needRefresh = true;
        }

        // Inform that the prefs changed
        this._parent.event(zimbra_notifier_SERVICE_EVENT.PREF_UPDATED);

        if (zimbra_notifier_Prefs.isAutoConnectEnabled() && zimbra_notifier_Prefs.isSavePasswordEnabled() &&
            !this.isConnected() && this._currentState !== zimbra_notifier_SERVICE_STATE.CONNECT_RUN) {

            this.initializeConnection();
        }
        else if (this.isConnected() && needRefresh && !data) {
            this.checkNow();
        }
    }
};

/* ************************** Callback for Webservice *************************** */

/**
 * callbackError
 *
 * @this {Service}
 * @param {String}
 *            typeReq The type of request
 * @param {Number}
 *            statusReq The error code
 */
zimbra_notifier_Service.prototype.callbackError = function(typeReq, statusReq) {

    if (statusReq === zimbra_notifier_REQUEST_STATUS.AUTH_REQUIRED &&
        typeReq !== zimbra_notifier_REQUEST_TYPE.CONNECT) {

        this._planRunState(zimbra_notifier_SERVICE_STATE.CONNECT_CHECK, 500);
        return;
    }

    switch (typeReq) {
        case zimbra_notifier_REQUEST_TYPE.CONNECT:
            this._reqInfoErrors.addError(typeReq, statusReq);
            if (this._checkExpectedState(zimbra_notifier_SERVICE_STATE.CONNECT_RUN)) {
                if (statusReq === zimbra_notifier_REQUEST_STATUS.LOGIN_INVALID) {
                    this._changeAndRunState(zimbra_notifier_SERVICE_STATE.CONNECT_INV_LOGIN);
                }
                else {
                    this._changeAndRunState(zimbra_notifier_SERVICE_STATE.CONNECT_ERR);
                }
            }
            break;

        case zimbra_notifier_REQUEST_TYPE.CREATE_WAIT:
            this._reqInfoErrors.addError(typeReq, statusReq);
            if (this._checkExpectedState(zimbra_notifier_SERVICE_STATE.WAITSET_CREATE_RUN)) {
                this._changeAndRunState(zimbra_notifier_SERVICE_STATE.WAITSET_CREATE_ENDED);
            }
            break;

        case zimbra_notifier_REQUEST_TYPE.WAIT_BLOCK:
            if (statusReq === zimbra_notifier_REQUEST_STATUS.TIMEOUT) {
                // If the request timeout or the waitset id is invalid, do not add error
                this._reqInfoErrors.clearError(zimbra_notifier_REQUEST_TYPE.WAIT_BLOCK);
            }
            else if (statusReq !== zimbra_notifier_REQUEST_STATUS.WAITSET_INVALID) {
                this._reqInfoErrors.addError(typeReq, statusReq);
            }
            if (this._checkExpectedState(zimbra_notifier_SERVICE_STATE.WAITSET_BLOCK_RUN)) {
                if (statusReq === zimbra_notifier_REQUEST_STATUS.WAITSET_INVALID) {
                    this._planRunState(zimbra_notifier_SERVICE_STATE.WAITSET_CHECK, 500);
                }
                else {
                    this._changeAndRunState(zimbra_notifier_SERVICE_STATE.WAITSET_NO_NEW_EVT);
                }
            }
            break;

        case zimbra_notifier_REQUEST_TYPE.WAIT_NO_BLOCK:
            if (statusReq !== zimbra_notifier_REQUEST_STATUS.WAITSET_INVALID) {
                this._reqInfoErrors.addError(typeReq, statusReq);
            }
            if (this._checkExpectedStates([zimbra_notifier_SERVICE_STATE.WAITSET_CHECK_RUN,
                                           zimbra_notifier_SERVICE_STATE.WAITSET_NO_BLOCK_RUN])) {

                if (this._currentState === zimbra_notifier_SERVICE_STATE.WAITSET_CHECK_RUN) {
                    this._changeAndRunState(zimbra_notifier_SERVICE_STATE.WAITSET_CHECK_ENDED);
                }
                else if (statusReq === zimbra_notifier_REQUEST_STATUS.WAITSET_INVALID) {
                    this._planRunState(zimbra_notifier_SERVICE_STATE.WAITSET_CHECK, 500);
                }
                else {
                    this._changeAndRunState(zimbra_notifier_SERVICE_STATE.WAITSET_NO_NEW_EVT);
                }
            }
            break;

        case zimbra_notifier_REQUEST_TYPE.UNREAD_MSG:
            this._reqInfoErrors.addError(typeReq, statusReq);
            if (this._checkExpectedState(zimbra_notifier_SERVICE_STATE.UNREAD_MSG_RUN)) {
                this._changeAndRunState(zimbra_notifier_SERVICE_STATE.UNREAD_MSG_ENDED);
            }
            break;

        case zimbra_notifier_REQUEST_TYPE.CALENDAR:
            this._reqInfoErrors.addError(typeReq, statusReq);
            if (this._checkExpectedState(zimbra_notifier_SERVICE_STATE.CALENDAR_RUN)) {
                this._changeAndRunState(zimbra_notifier_SERVICE_STATE.CALENDAR_ENDED);
            }
            break;

        case zimbra_notifier_REQUEST_TYPE.TASK:
            this._reqInfoErrors.addError(typeReq, statusReq);
            if (this._checkExpectedState(zimbra_notifier_SERVICE_STATE.TASK_RUN)) {
                this._changeAndRunState(zimbra_notifier_SERVICE_STATE.TASK_ENDED);
            }
            break;

        default:
            this._logger.error("Unexpected request type: " + typeReq);
            this._planRunState(zimbra_notifier_SERVICE_STATE.NOTHING_TO_DO, 10);
            break;
    }
};

/**
 * callback Login Success
 *
 * @this {Service}
 */
zimbra_notifier_Service.prototype.callbackLoginSuccess = function() {
    this._delayWaitConnect = 0;
    this._reqInfoErrors.clearError(zimbra_notifier_REQUEST_TYPE.CONNECT);
    if (this._checkExpectedState(zimbra_notifier_SERVICE_STATE.CONNECT_RUN)) {
        this._changeAndRunState(zimbra_notifier_SERVICE_STATE.CONNECT_OK);
    }
};

/**
 * callback logout
 *
 * @this {Service}
 */
zimbra_notifier_Service.prototype.callbackDisconnect = function() {
    this._changeAndRunState(zimbra_notifier_SERVICE_STATE.DISCONNECTED);
};

/**
 * callback when information about session changed
 *
 * @this {Service}
 * @param {Session}
 *             session  The session object
 */
zimbra_notifier_Service.prototype.callbackSessionInfoChanged = function(session) {
    zimbra_notifier_Prefs.saveWaitSet(session.waitId(), session.waitSeq(),
                                      session.buildUrl(''), session.user());

    zimbra_notifier_Browser.updateCookies(session.buildUrl(''), session.getAuthCookies());
};

/**
 * callback create Wait Set
 *
 * @this {Service}
 */
zimbra_notifier_Service.prototype.callbackCreateWaitSet = function() {
    this._reqInfoErrors.clearError(zimbra_notifier_REQUEST_TYPE.CREATE_WAIT);
    if (this._checkExpectedState(zimbra_notifier_SERVICE_STATE.WAITSET_CREATE_RUN)) {
        this._changeAndRunState(zimbra_notifier_SERVICE_STATE.WAITSET_CREATE_ENDED);
    }
};

/**
 * callback Wait Set blocking request
 *
 * @this {Service}
 * @param {Boolean}
 *            newEvent indicate if it is necessary to refresh
 */
zimbra_notifier_Service.prototype.callbackWaitBlock = function(newEvent) {
    this._reqInfoErrors.clearError(zimbra_notifier_REQUEST_TYPE.WAIT_BLOCK);
    if (this._checkExpectedState(zimbra_notifier_SERVICE_STATE.WAITSET_BLOCK_RUN)) {
        if (newEvent) {
            this._changeAndRunState(zimbra_notifier_SERVICE_STATE.WAITSET_NEW_EVT);
        }
        else {
            this._changeAndRunState(zimbra_notifier_SERVICE_STATE.WAITSET_NO_NEW_EVT);
        }
    }
};

/**
 * callback Wait Set non blocking request
 *
 * @this {Service}
 * @param {Boolean}
 *            newEvent indicate if it is necessary to refresh
 */
zimbra_notifier_Service.prototype.callbackWaitNoBlock = function(newEvent) {
    this._reqInfoErrors.clearError(zimbra_notifier_REQUEST_TYPE.WAIT_NO_BLOCK);
    if (this._checkExpectedStates([zimbra_notifier_SERVICE_STATE.WAITSET_CHECK_RUN,
                                   zimbra_notifier_SERVICE_STATE.WAITSET_NO_BLOCK_RUN])) {

        if (this._currentState === zimbra_notifier_SERVICE_STATE.WAITSET_CHECK_RUN) {
            this._changeAndRunState(zimbra_notifier_SERVICE_STATE.WAITSET_CHECK_ENDED);
        }
        else if (newEvent) {
            this._changeAndRunState(zimbra_notifier_SERVICE_STATE.WAITSET_NEW_EVT);
        }
        else {
            this._changeAndRunState(zimbra_notifier_SERVICE_STATE.WAITSET_NO_NEW_EVT);
        }
    }
};

/**
 * Generate and notify new message
 *
 * @this {Service}
 * @param {Message[]}
 *            messages messages unread
 */
zimbra_notifier_Service.prototype.callbackNewMessages = function(messages) {
    try {
        var notify = true;

        if (this._firstCallbackNewMsg) {
            this._firstCallbackNewMsg = false;

            var dConnect = zimbra_notifier_Constant.SERVICE.DELAY_NOTIFY_FIRST_UNREAD;
            if (this._dateConnection) {
                dConnect += this._dateConnection.getTime();
            }
            if (dConnect > (new Date().getTime())) {
                notify = false;
            }
        }

        if (notify) {
            var util = zimbra_notifier_Util;
            var title = '';
            var msg = '';
            var nbMail = 0;

            // Find new unread messages
            for ( var index = 0; index < messages.length; index++) {
                var newMessage = messages[index];
                var nbNewUnReadMail = newMessage.getNbNewMail(this._currentMessageUnRead);
                if (nbNewUnReadMail > 0) {
                    nbMail += nbNewUnReadMail;
                    if (nbMail > 1) {
                        title = util.getBundleString("connector.notification.nbUnreadMessages");
                        title = title.replace("%NB%", nbMail);
                        msg += newMessage.subject + "\n";
                    }
                    else if (nbMail === 1) {
                        title = util.getBundleString("connector.notification.NewMessage");
                        title = title.replace("%EMAIL%", newMessage.senderEmail);
                        msg += newMessage.subject + "\n";
                    }
                }
            }

            // Notify
            if (nbMail > 0) {
                var listener = {
                    observe : function(subject, topic, data) {
                        if (topic === "alertclickcallback") {
                            zimbra_notifier_Browser.openZimbraWebInterface();
                        }
                    }
                };
                if (zimbra_notifier_Prefs.isSoundEnabled()) {
                    util.playSound();
                }
                if (zimbra_notifier_Prefs.isSystemNotificationEnabled()) {
                    util.showNotificaton(title, msg, null, listener);
                }
            }
        }
    }
    catch (e) {
        this._logger.error("Failed to notify new messages: " + e);
    }
    this._currentMessageUnRead = messages;

    this._reqInfoErrors.clearError(zimbra_notifier_REQUEST_TYPE.UNREAD_MSG);
    if (this._checkExpectedState(zimbra_notifier_SERVICE_STATE.UNREAD_MSG_RUN)) {
        this._changeAndRunState(zimbra_notifier_SERVICE_STATE.UNREAD_MSG_ENDED);
    }
};

/**
 * Generate and notify new event
 *
 * @this {Service}
 * @param {CalEvent[]}
 *            events
 */
zimbra_notifier_Service.prototype.callbackCalendar = function(events) {
    try {
        var newEvents = [];
        var index, indexC;

        for (index = 0; index < events.length; index++) {
            var newEvent = events[index];
            for (indexC = 0; indexC < this._currentEvents.length; indexC++) {
                var oldEvent = this._currentEvents[indexC];
                if (oldEvent.id === newEvent.id && oldEvent.notifier) {
                    // Keep the old notifier object
                    newEvent.notifier = oldEvent.notifier;
                    oldEvent.notifier = null;
                    // refresh notifier
                    newEvent.notifier.update(newEvent, zimbra_notifier_Prefs.getCalendarReminderTimeConf(),
                                             zimbra_notifier_Prefs.getCalendarReminderNbRepeat(),
                                             zimbra_notifier_Prefs.isCalendarSoundNotificationEnabled(),
                                             zimbra_notifier_Prefs.isCalendarSystemNotificationEnabled());
                    break;
                }
            }
            if (!newEvent.notifier) {
                newEvent.notifier = new zimbra_notifier_Notifier(
                        newEvent, zimbra_notifier_Prefs.getCalendarReminderTimeConf(),
                        zimbra_notifier_Prefs.getCalendarReminderNbRepeat(),
                        zimbra_notifier_Prefs.isCalendarSoundNotificationEnabled(),
                        zimbra_notifier_Prefs.isCalendarSystemNotificationEnabled());
            }
            newEvents.push(newEvent);
        }

        newEvents.sort(function(a, b) {
            return a.startDate - b.startDate;
        });

        // Destroy old event that does not exist anymore and stop notifier
        this._currentEvents.forEach(function(oldEvt){
            if (oldEvt.notifier) {
                oldEvt.notifier.stop();
            }
        });

        this._currentEvents = newEvents;
    }
    catch (e) {
        this._logger.error("Failed to add event for notification: " + e);
    }

    this._reqInfoErrors.clearError(zimbra_notifier_REQUEST_TYPE.CALENDAR);
    if (this._checkExpectedState(zimbra_notifier_SERVICE_STATE.CALENDAR_RUN)) {
        this._changeAndRunState(zimbra_notifier_SERVICE_STATE.CALENDAR_ENDED);
    }
};

/**
 * Generate and notify new task
 *
 * @this {Service}
 * @param {Task[]}
 *            tasks
 */
zimbra_notifier_Service.prototype.callbackTask = function(tasks) {

    tasks.sort(function(a, b) {
        if (a.priority === b.priority) {
            return a.date - b.date;
        } else {
            return a.priority - b.priority;
        }
    });
    this._currentTasks = tasks;

    this._reqInfoErrors.clearError(zimbra_notifier_REQUEST_TYPE.TASK);
    if (this._checkExpectedState(zimbra_notifier_SERVICE_STATE.TASK_RUN)) {
        this._changeAndRunState(zimbra_notifier_SERVICE_STATE.TASK_ENDED);
    }
};

/* ************************** Getter *************************** */

/**
 * Indicate if connected
 *
 * @this {Service}
 * @return {Boolean} true if connected
 */
zimbra_notifier_Service.prototype.isConnected = function() {
    if (this._webservice) {
        return this._webservice.isConnected();
    }
    return false;
};

/**
 * Get the current state of the state machine
 *
 * @this {Service}
 * @return {SERVICE_STATE} The current running state
 */
zimbra_notifier_Service.prototype.getCurrentState = function() {
    return this._currentState;
};

/**
 * Get nb of unread messages
 *
 * @this {Service}
 * @return {Number} nb of unread messages
 */
zimbra_notifier_Service.prototype.getNbMessageUnread = function() {
    var nbMessage = 0;
    for ( var index = 0; index < this._currentMessageUnRead.length; index++) {
        nbMessage += this._currentMessageUnRead[index].nbMail();
    }
    return nbMessage;
};

/**
 * Get events
 *
 * @this {Service}
 * @return {CalEvent[]} events
 */
zimbra_notifier_Service.prototype.getEvents = function() {
    return this._currentEvents;
};

/**
 * Get tasks
 *
 * @this {Service}
 * @return {Task[]} tasks
 */
zimbra_notifier_Service.prototype.getTasks = function() {
    return this._currentTasks;
};

/**
 * Get last error
 *
 * @this {Service}
 * @return {ReqInfoError} the info about the last error
 */
zimbra_notifier_Service.prototype.getLastError = function() {
    return this._reqInfoErrors.getLastError();
};
