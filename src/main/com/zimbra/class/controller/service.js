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

if (!com) {
    var com = {};
}
if (!com.zimbra) {
    com.zimbra = {};
}
if (!com.zimbra.controller) {
    com.zimbra.controller = {};
}

com.zimbra.controller.SERVICE_STATE = {
    DISCONNECTED         : 'DISCONNECTED',
    NOTHING_TO_DO        : 'NOTHING_TO_DO',

    CONNECT_CHECK        : 'CONNECT_CHECK',
    CONNECT_RUN          : 'CONNECT_RUN',
    CONNECT_WAIT         : 'CONNECT_WAIT',
    CONNECT_OK           : 'CONNECT_OK',
    CONNECT_INV_LOGIN    : 'CONNECT_INV_LOGIN',
    CONNECT_ERR          : 'CONNECT_ERR',

    WAITSET_CHECK        : 'WAITSET_CHECK',
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

/* ******************* Init functions *********************** */

/**
 * Creates an instance of Service.
 *
 * @constructor
 * @this {Service}
 */
com.zimbra.controller.Service = function() {
    this._logger = new com.zimbra.service.Logger("Service");
    this._util = new com.zimbra.service.Util();
    this._prefs = new com.zimbra.service.Prefs();
    this._prefs.load();

    this._webservice = new com.zimbra.service.Webservice(this._prefs.getRequestQueryTimeout(), this);
    this._reqInfoErrors = new com.zimbra.domain.InfoErrors();

    this._loadDefault();
    this._callbackList = [];
    this._util.addObserver(this, com.zimbra.constant.OBSERVER.PREF_SAVED);
};

/**
 * Load default values
 *
 * @private
 * @this {Service}
 */
com.zimbra.controller.Service.prototype._loadDefault = function() {

    this._webservice.abortRunningReq();
    // Timer for state machine
    this._stopStateTimer();
    this._stateTimer = null;

    // Updated when calling initializeConnection, used for notification
    this._dateConnection = null;
    this._firstCallbackNewMsg = true;

    // Calendar events / tasks / unread messages
    this._stopRemoveEvents();
    this._currentEvents = [];
    this._currentTasks = [];
    this._currentMessageUnRead = [];

    // error
    this._reqInfoErrors.clearAllErrors();

    // Current state
    this._currentState = com.zimbra.controller.SERVICE_STATE.NOTHING_TO_DO;
    this._idxLoopQuery = 0;

    // Delay before trying again the connect
    this._delayWaitConnect = 0;

    // The date when launching the blocking wait request
    this._timeStartWaitReq = 0;

    // Restore previous wait set
    var wSet = this._prefs.getPreviousWaitSet();
    if (wSet !== null) {
        this._webservice.restoreWaitSet(wSet.id, wSet.seq, wSet.hostname, wSet.user);
    }
    this._waitSetRestored = this._webservice.isWaitSetValid();
};

/**
 * Stop and remove event notifier
 *
 * @private
 * @this {Service}
 */
com.zimbra.controller.Service.prototype._stopRemoveEvents = function() {
    if (this._currentEvents) {
        // stop all notifiers if exist
        while (this._currentEvents.length > 0) {
            if (this._currentEvents[0].notifier) {
                this._currentEvents[0].notifier.stop();
            }
            this._currentEvents.shift();
        }
    }
};

/**
 * Initialize Service.
 *
 * @this {Service}
 * @param {Function}
 *            parent the parent object
 * @return {Boolean} False if we need to ask the password
 */
com.zimbra.controller.Service.prototype.initialize = function(parent) {

    this.addCallBackRefresh(parent);
    // start auto-connect if necessary
    if (this._prefs.isAutoConnectEnabled()) {
        if (this._prefs.isSavePasswordEnabled()) {
            return this.initializeConnection();
        } else {
            return false;
        }
    }
    return true;
};

/**
 * Release Service.
 *
 * @this {Service}
 */
com.zimbra.controller.Service.prototype.release = function() {
    this._util.removeObserver(this, com.zimbra.constant.OBSERVER.PREF_SAVED);
    this._loadDefault();
    this._callbackList = [];
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
com.zimbra.controller.Service.prototype._changeState = function(newState) {
    var oldState = this._currentState;
    this._currentState = newState;
    if (oldState !== newState) {
        this._logger.trace("Change state " + oldState + " -> " + newState);
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
com.zimbra.controller.Service.prototype._planRunState = function(newState, delayMs) {
    var object = this;
    this._stateTimer = window.setTimeout(function() {
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
com.zimbra.controller.Service.prototype._stopStateTimer = function() {
    if (this._stateTimer) {
        window.clearTimeout(this._stateTimer);
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
com.zimbra.controller.Service.prototype._changeRunningState = function(newState, delayMs) {
    this._webservice.abortRunningReq();
    this._stopStateTimer();
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
com.zimbra.controller.Service.prototype._checkExpectedStates = function(expStates) {
    var ok = false;
    for ( var idx = 0; idx < expStates.length; idx++) {
        if (this._currentState === expStates[idx]) {
            ok = true;
            break;
        }
    }
    if (ok === false) {
        this._logger.error("Unexpected state: " + this._currentState + " instead: " + expStates);
        this._webservice.abortRunningReq();
        this._stopStateTimer();
        this._planRunState(com.zimbra.controller.SERVICE_STATE.NOTHING_TO_DO, 100);
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
com.zimbra.controller.Service.prototype._checkExpectedState = function(expState) {
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
com.zimbra.controller.Service.prototype._changeAndRunState = function(newState) {
    try {
        // Change to the new state
        this._changeState(newState);
        // And run it
        this._runState(newState);
    }
    catch (e) {
        this._logger.error("Fail run state (" + newState + "): " + e);
        this._changeRunningState(com.zimbra.controller.SERVICE_STATE.NOTHING_TO_DO, 500);
    }
}
/**
 * Execute the code of specified state
 *
 * @private
 * @this {Service}
 * @param {Number}
 *            newState  The state to run
 */
com.zimbra.controller.Service.prototype._runState = function(newState) {
    switch (newState) {
        // We cannot login or we are just disconnected
        case com.zimbra.controller.SERVICE_STATE.DISCONNECTED:
            this._changeState(com.zimbra.controller.SERVICE_STATE.NOTHING_TO_DO);

        // Nothing to do...
        case com.zimbra.controller.SERVICE_STATE.NOTHING_TO_DO:
            this._sendCallBackRefreshEvent();
            break;

        // The login is invalid, wait for user input...
        case com.zimbra.controller.SERVICE_STATE.CONNECT_INV_LOGIN:
            this._sendCallBackRefreshEvent();
            this._planRunState(com.zimbra.controller.SERVICE_STATE.NOTHING_TO_DO, 10);
            break;

        // The connect failed for any other reason, try again later
        case com.zimbra.controller.SERVICE_STATE.CONNECT_ERR:
            this._sendCallBackRefreshEvent();
            this._changeState(com.zimbra.controller.SERVICE_STATE.CONNECT_WAIT);

        // Wait before trying again
        case com.zimbra.controller.SERVICE_STATE.CONNECT_WAIT:
            this._delayWaitConnect += com.zimbra.constant.SERVICE.CONNECT_BASE_WAIT_AFTER_FAILURE;
            if (this._delayWaitConnect > com.zimbra.constant.SERVICE.CONNECT_MAX_WAIT_AFTER_FAILURE) {
                this._delayWaitConnect = com.zimbra.constant.SERVICE.CONNECT_MAX_WAIT_AFTER_FAILURE;
            }
            this._planRunState(com.zimbra.controller.SERVICE_STATE.CONNECT_RUN, this._delayWaitConnect);
            break;

        // Launch the connect query
        case com.zimbra.controller.SERVICE_STATE.CONNECT_RUN:
            this._doConnect();
            break;

        // The connect query succeed, check if connected
        case com.zimbra.controller.SERVICE_STATE.CONNECT_OK:
            this._sendCallBackRefreshEvent();
            this._changeState(com.zimbra.controller.SERVICE_STATE.CONNECT_CHECK);

        // Check if we are connected
        case com.zimbra.controller.SERVICE_STATE.CONNECT_CHECK:
            if (this._webservice.needConnect()) {
                this._planRunState(com.zimbra.controller.SERVICE_STATE.CONNECT_RUN, 100);
                break;
            }
            else {
                this._changeState(com.zimbra.controller.SERVICE_STATE.WAITSET_CHECK);
            }

        // Check if waitset is still valid
        case com.zimbra.controller.SERVICE_STATE.WAITSET_CHECK:
            if (!this._webservice.isWaitSetValid()) {
                this._planRunState(com.zimbra.controller.SERVICE_STATE.WAITSET_CREATE_RUN, 1);
                break;
            }
            else if (this._waitSetRestored === true) {
                this._waitSetRestored = false;
                this._planRunState(com.zimbra.controller.SERVICE_STATE.WAITSET_NO_BLOCK_RUN, 1);
                break;
            }
            else {
                this._changeState(com.zimbra.controller.SERVICE_STATE.REFRESH_START);
            }

        // Start the refresh query
        case com.zimbra.controller.SERVICE_STATE.REFRESH_START:
            this._idxLoopQuery = 0;
            this._changeState(com.zimbra.controller.SERVICE_STATE.UNREAD_MSG_RUN);

        // Check unread message
        case com.zimbra.controller.SERVICE_STATE.UNREAD_MSG_RUN:
            this._sendCallBackRefreshEvent(true);

            if (this._needRunReq(com.zimbra.service.REQUEST_TYPE.UNREAD_MSG)) {
                if (!this._webservice.searchUnReadMsg()) {
                    this._reqInfoErrors.addError(com.zimbra.service.REQUEST_TYPE.UNREAD_MSG,
                                                 com.zimbra.service.REQUEST_STATUS.INTERNAL_ERROR);

                    this._planRunState(com.zimbra.controller.SERVICE_STATE.UNREAD_MSG_ENDED, 10);
                }
                break;
            }

        case com.zimbra.controller.SERVICE_STATE.UNREAD_MSG_ENDED:
            this._sendCallBackRefreshEvent();
            this._changeState(com.zimbra.controller.SERVICE_STATE.CALENDAR_RUN);

        // Check calendar
        case com.zimbra.controller.SERVICE_STATE.CALENDAR_RUN:
            this._sendCallBackRefreshEvent(true);

            if (this.getPrefs().isCalendarEnabled() &&
                this._needRunReq(com.zimbra.service.REQUEST_TYPE.CALENDAR)) {

                var date = new Date();
                var startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
                var endDate = new Date(startDate.getTime() + 86400000 * this.getPrefs().getCalendarPeriodDisplayed());

                if (!this._webservice.searchCalendar(startDate, endDate)) {
                    this._reqInfoErrors.addError(com.zimbra.service.REQUEST_TYPE.CALENDAR,
                                                com.zimbra.service.REQUEST_STATUS.INTERNAL_ERROR);

                    this._planRunState(com.zimbra.controller.SERVICE_STATE.CALENDAR_ENDED, 10);
                }
                break;
            }

        case com.zimbra.controller.SERVICE_STATE.CALENDAR_ENDED:
            this._sendCallBackRefreshEvent();
            this._changeState(com.zimbra.controller.SERVICE_STATE.TASK_RUN);

        // Check tasks
        case com.zimbra.controller.SERVICE_STATE.TASK_RUN:
            this._sendCallBackRefreshEvent(true);

            if (this.getPrefs().isTaskEnabled() && this._needRunReq(com.zimbra.service.REQUEST_TYPE.TASK)) {
                if (!this._webservice.searchTask()) {
                    this._reqInfoErrors.addError(com.zimbra.service.REQUEST_TYPE.TASK,
                                                 com.zimbra.service.REQUEST_STATUS.INTERNAL_ERROR);

                    this._planRunState(com.zimbra.controller.SERVICE_STATE.TASK_ENDED, 10);
                }
                break;
            }

        case com.zimbra.controller.SERVICE_STATE.TASK_ENDED:
            this._sendCallBackRefreshEvent();
            this._changeState(com.zimbra.controller.SERVICE_STATE.REFRESH_ENDED);

        // Check if we need to try again the queries
        case com.zimbra.controller.SERVICE_STATE.REFRESH_ENDED:
            this._idxLoopQuery += 1;
            // check if at least one query should be runned again
            var runagain = this._needRunReq(com.zimbra.service.REQUEST_TYPE.UNREAD_MSG);
            if (!runagain && this.getPrefs().isCalendarEnabled() &&
                this._needRunReq(com.zimbra.service.REQUEST_TYPE.CALENDAR)) {
                runagain = true;
            }
            if (!runagain && this.getPrefs().isTaskEnabled() &&
                this._needRunReq(com.zimbra.service.REQUEST_TYPE.TASK)) {
                runagain = true;
            }
            // Do we need to retry
            if (runagain === true) {
                this._planRunState(com.zimbra.controller.SERVICE_STATE.UNREAD_MSG_RUN,
                                   com.zimbra.constant.SERVICE.REFRESH_WAIT_AFTER_FAILURE);
                break;
            }
            else {
                this._changeState(com.zimbra.controller.SERVICE_STATE.WAITSET_BLOCK_RUN);
            }

        // Launch the blocking query waiting for events
        case com.zimbra.controller.SERVICE_STATE.WAITSET_BLOCK_RUN:
            this._timeStartWaitReq = new Date().getTime();

            if (!this._webservice.waitRequest(this._prefs.getRequestWaitTimeout())) {
                this._reqInfoErrors.addError(com.zimbra.service.REQUEST_TYPE.WAIT_BLOCK,
                                             com.zimbra.service.REQUEST_STATUS.INTERNAL_ERROR);

                this._planRunState(com.zimbra.controller.SERVICE_STATE.WAITSET_NO_NEW_EVT, 10);
            }
            break;

        // Launch the non blocking query waitset
        case com.zimbra.controller.SERVICE_STATE.WAITSET_NO_BLOCK_RUN:
            this._timeStartWaitReq = 0;

            if (!this._webservice.waitRequest(0)) {
                this._reqInfoErrors.addError(com.zimbra.service.REQUEST_TYPE.WAIT_NO_BLOCK,
                                             com.zimbra.service.REQUEST_STATUS.INTERNAL_ERROR);

                this._planRunState(com.zimbra.controller.SERVICE_STATE.WAITSET_NO_NEW_EVT, 10);
            }
            break;

        // We received a change event
        case com.zimbra.controller.SERVICE_STATE.WAITSET_NEW_EVT:
            this._planRunState(com.zimbra.controller.SERVICE_STATE.CONNECT_CHECK, 1);
            break;

        // The wait request failed, or the request did timeout (no new event)
        case com.zimbra.controller.SERVICE_STATE.WAITSET_NO_NEW_EVT:
            var delayAfterWaitReq = 10;
            if (this._timeStartWaitReq !== 0) {
                var timeEndW = new Date().getTime();
                var timeExpW = this._timeStartWaitReq + this._prefs.getRequestWaitTimeout() - 1000;
                if (timeExpW > timeEndW) {
                    delayAfterWaitReq = timeExpW - timeEndW;
                }
            }
            this._planRunState(com.zimbra.controller.SERVICE_STATE.CONNECT_CHECK, delayAfterWaitReq);
            break;

        // Create the waitset
        case com.zimbra.controller.SERVICE_STATE.WAITSET_CREATE_RUN:
            if (!this._webservice.createWaitRequest()) {
                this._reqInfoErrors.addError(com.zimbra.service.REQUEST_TYPE.CREATE_WAIT,
                                             com.zimbra.service.REQUEST_STATUS.INTERNAL_ERROR);

                this._planRunState(com.zimbra.controller.SERVICE_STATE.REFRESH_START, 10);
            }
            break;

        // create wait set ended
        case com.zimbra.controller.SERVICE_STATE.WAITSET_CREATE_ENDED:
            // Do not do any check here, if we failed, we will try again later
            this._planRunState(com.zimbra.controller.SERVICE_STATE.REFRESH_START, 1);
            break;

        default:
            this._logger.error("Unknown state : " + newState);
            this._planRunState(com.zimbra.controller.SERVICE_STATE.NOTHING_TO_DO, 100);
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
 * @param {Number}
 *            reqType the type of the request
 */
com.zimbra.controller.Service.prototype._needRunReq = function(reqType) {
    if (this._idxLoopQuery === 0) {
        this._reqInfoErrors.resetLoopErrorCounter(reqType);
    }
    else {
        var valCounter = this._reqInfoErrors.getLoopErrorCounter(reqType);
        if (valCounter === 0) {
            return false;
        }
        else if (valCounter >= com.zimbra.constant.SERVICE.NB_RETRY_QUERY) {
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
com.zimbra.controller.Service.prototype._doConnect = function(password) {

    if (!password || password === '') {
        password = this._prefs.getUserPassword();
        if (!password || password === '') {
            // No password, cannot login
            this._planRunState(com.zimbra.controller.SERVICE_STATE.DISCONNECTED, 100);
            return false;
        }
    }

    if (this._checkExpectedState(com.zimbra.controller.SERVICE_STATE.CONNECT_RUN)) {

        this._sendCallBackRefreshEvent(true);

        if (!this._webservice.authRequest(this._prefs.getUserServer(), this._prefs.getUserLogin(),
                                          password, this)) {

            this._reqInfoErrors.addError(com.zimbra.service.REQUEST_TYPE.OPEN_SESSION,
                                         com.zimbra.service.REQUEST_STATUS.INTERNAL_ERROR);
            // Try again later
            this._planRunState(com.zimbra.controller.SERVICE_STATE.CONNECT_ERR, 100);
        }
        else {
            return true;
        }
    }
    return false;
};

/* *********************** Public function called from UI ************************ */

/**
 * Initialize Connection
 * Call from the UI or when launching this app if the autologin is enabled
 *
 * @this {Service}
 * @return {Boolean} True if we did launch the connect query
 */
com.zimbra.controller.Service.prototype.initializeConnection = function(password) {

    if (this._currentState === com.zimbra.controller.SERVICE_STATE.CONNECT_RUN) {
        this._logger.warning("Already trying to connect, stop and try again...");
    }
    this._dateConnection = new Date();
    this._firstCallbackNewMsg = true;
    this._delayWaitConnect = 0;

    this._webservice.abortRunningReq();
    this._stopStateTimer();
    this._changeState(com.zimbra.controller.SERVICE_STATE.CONNECT_RUN);

    this._reqInfoErrors.clearAllErrors();

    return this._doConnect(password);
};

/**
 * Close Connection
 *
 * @this {Service}
 */
com.zimbra.controller.Service.prototype.closeConnection = function() {
    this._webservice.disconnect();
};

/**
 * Check now
 *
 * @this {Service}
 */
com.zimbra.controller.Service.prototype.checkNow = function() {
    this._reqInfoErrors.clearAllErrors();
    this._changeRunningState(com.zimbra.controller.SERVICE_STATE.REFRESH_START, 100);
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
com.zimbra.controller.Service.prototype.observe = function(subject, topic, data) {
    if (topic === com.zimbra.constant.OBSERVER.PREF_SAVED) {
        this._prefs.load();
        // Clear some errors to handle the case of a previous error on the calendar/task request
        // and the user just desactivated the calendar/task
        this._reqInfoErrors.clearError(com.zimbra.service.REQUEST_TYPE.CALENDAR);
        this._reqInfoErrors.clearError(com.zimbra.service.REQUEST_TYPE.TASK);
        // Inform that the prefs changed
        this._sendCallBackRefreshEvent();

        if (this._prefs.isAutoConnectEnabled() && this._prefs.isSavePasswordEnabled() &&
            !this.isConnected() && this._currentState !== com.zimbra.controller.SERVICE_STATE.CONNECT_RUN) {

            this.initializeConnection();
        }
    }
};

/* ************************** Callback for Webservice *************************** */

/**
 * callbackError
 *
 * @this {Service}
 * @param {Number}
 *            typeReq The type of request
 * @param {Number}
 *            statusReq The error code
 */
com.zimbra.controller.Service.prototype.callbackError = function(typeReq, statusReq) {

    if (statusReq === com.zimbra.service.REQUEST_STATUS.AUTH_REQUIRED) {
        this._planRunState(com.zimbra.controller.SERVICE_STATE.CONNECT_CHECK, 500);
        return;
    }

    switch (typeReq) {
        case com.zimbra.service.REQUEST_TYPE.OPEN_SESSION:
            this._reqInfoErrors.addError(typeReq, statusReq);
            if (this._checkExpectedState(com.zimbra.controller.SERVICE_STATE.CONNECT_RUN)) {
                if (statusReq === com.zimbra.service.REQUEST_STATUS.LOGIN_INVALID) {
                    this._changeAndRunState(com.zimbra.controller.SERVICE_STATE.CONNECT_INV_LOGIN);
                }
                else {
                    this._changeAndRunState(com.zimbra.controller.SERVICE_STATE.CONNECT_ERR);
                }
            }
            break;

        case com.zimbra.service.REQUEST_TYPE.CREATE_WAIT:
            this._reqInfoErrors.addError(typeReq, statusReq);
            if (this._checkExpectedState(com.zimbra.controller.SERVICE_STATE.WAITSET_CREATE_RUN)) {
                this._changeAndRunState(com.zimbra.controller.SERVICE_STATE.WAITSET_CREATE_ENDED);
            }
            break;

        case com.zimbra.service.REQUEST_TYPE.WAIT_BLOCK:
        case com.zimbra.service.REQUEST_TYPE.WAIT_NO_BLOCK:
            if (statusReq === com.zimbra.service.REQUEST_STATUS.TIMEOUT) {
                // If the request timeout or the waitset id is invalid, do not add error
                this._reqInfoErrors.clearError(com.zimbra.service.REQUEST_TYPE.WAIT_BLOCK);
            }
            else if (statusReq !== com.zimbra.service.REQUEST_STATUS.WAITSET_INVALID) {
                this._reqInfoErrors.addError(typeReq, statusReq);
            }
            if (this._checkExpectedStates([com.zimbra.controller.SERVICE_STATE.WAITSET_BLOCK_RUN,
                                           com.zimbra.controller.SERVICE_STATE.WAITSET_NO_BLOCK_RUN])) {
                if (statusReq === com.zimbra.service.REQUEST_STATUS.WAITSET_INVALID) {
                    this._planRunState(com.zimbra.controller.SERVICE_STATE.WAITSET_CHECK, 500);
                }
                else {
                    this._changeAndRunState(com.zimbra.controller.SERVICE_STATE.WAITSET_NO_NEW_EVT);
                }
            }
            break;

        case com.zimbra.service.REQUEST_TYPE.UNREAD_MSG:
            this._reqInfoErrors.addError(typeReq, statusReq);
            if (this._checkExpectedState(com.zimbra.controller.SERVICE_STATE.UNREAD_MSG_RUN)) {
                this._changeAndRunState(com.zimbra.controller.SERVICE_STATE.UNREAD_MSG_ENDED);
            }
            break;

        case com.zimbra.service.REQUEST_TYPE.CALENDAR:
            this._reqInfoErrors.addError(typeReq, statusReq);
            if (this._checkExpectedState(com.zimbra.controller.SERVICE_STATE.CALENDAR_RUN)) {
                this._changeAndRunState(com.zimbra.controller.SERVICE_STATE.CALENDAR_ENDED);
            }
            break;

        case com.zimbra.service.REQUEST_TYPE.TASK:
            this._reqInfoErrors.addError(typeReq, statusReq);
            if (this._checkExpectedState(com.zimbra.controller.SERVICE_STATE.TASK_RUN)) {
                this._changeAndRunState(com.zimbra.controller.SERVICE_STATE.TASK_ENDED);
            }
            break;

        default:
            this._logger.error("Unexpected request type: " + typeReq);
            this._planRunState(com.zimbra.controller.SERVICE_STATE.NOTHING_TO_DO, 10);
            break;
    }
};

/**
 * callback Login Success
 *
 * @this {Service}
 */
com.zimbra.controller.Service.prototype.callbackLoginSuccess = function() {
    this._delayWaitConnect = 0;
    this._reqInfoErrors.clearError(com.zimbra.service.REQUEST_TYPE.OPEN_SESSION);
    if (this._checkExpectedState(com.zimbra.controller.SERVICE_STATE.CONNECT_RUN)) {
        this._changeAndRunState(com.zimbra.controller.SERVICE_STATE.CONNECT_OK);
    }
};

/**
 * callback logout
 *
 * @this {Service}
 */
com.zimbra.controller.Service.prototype.callbackDisconnect = function() {
    this._loadDefault();
    this._changeRunningState(com.zimbra.controller.SERVICE_STATE.DISCONNECTED, 10);
    this._sendCallBackRefreshEvent();
};

/**
 * callback when information about session changed
 *
 * @this {Service}
 * @param {Session}
 *             session  The session object
 */
com.zimbra.controller.Service.prototype.callbackSessionInfoChanged = function(session) {
    this._prefs.saveWaitSet(session.waitId(), session.waitSeq(), session.buildUrl(''), session.user());
};

/**
 * callback create Wait Set
 *
 * @this {Service}
 */
com.zimbra.controller.Service.prototype.callbackCreateWaitSet = function() {
    this._reqInfoErrors.clearError(com.zimbra.service.REQUEST_TYPE.CREATE_WAIT);
    if (this._checkExpectedState(com.zimbra.controller.SERVICE_STATE.WAITSET_CREATE_RUN)) {
        this._changeAndRunState(com.zimbra.controller.SERVICE_STATE.WAITSET_CREATE_ENDED);
    }
};

/**
 * callback Wait Set blocking request
 *
 * @this {Service}
 * @param {Boolean}
 *            newEvent indicate if it is necessary to refresh
 */
com.zimbra.controller.Service.prototype.callbackWaitBlock = function(newEvent) {
    this._reqInfoErrors.clearError(com.zimbra.service.REQUEST_TYPE.WAIT_BLOCK);
    if (this._checkExpectedState(com.zimbra.controller.SERVICE_STATE.WAITSET_BLOCK_RUN)) {
        if (newEvent) {
            this._changeAndRunState(com.zimbra.controller.SERVICE_STATE.WAITSET_NEW_EVT);
        }
        else {
            this._changeAndRunState(com.zimbra.controller.SERVICE_STATE.WAITSET_NO_NEW_EVT);
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
com.zimbra.controller.Service.prototype.callbackWaitNoBlock = function(newEvent) {
    this._reqInfoErrors.clearError(com.zimbra.service.REQUEST_TYPE.WAIT_NO_BLOCK);
    if (this._checkExpectedState(com.zimbra.controller.SERVICE_STATE.WAITSET_NO_BLOCK_RUN)) {
        if (newEvent) {
            this._changeAndRunState(com.zimbra.controller.SERVICE_STATE.WAITSET_NEW_EVT);
        }
        else {
            this._changeAndRunState(com.zimbra.controller.SERVICE_STATE.WAITSET_NO_NEW_EVT);
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
com.zimbra.controller.Service.prototype.callbackNewMessages = function(messages) {
    try {
        var notify = true;

        if (this._firstCallbackNewMsg) {
            this._firstCallbackNewMsg = false;

            if ((this._dateConnection.getTime() + com.zimbra.constant.SERVICE.DELAY_NOTIFY_FIRST_UNREAD) >
                (new Date().getTime())) {
                notify = false;
            }
        }

        if (notify) {
            var title = '';
            var msg = '';
            var nbMail = 0;

            // Find new unread messages
            for ( var index = 0; index < messages.length; index++) {
                var newMessage = messages[index];
                var nbNewUnReadMail = newMessage.getNbNewUnReadMail(this._currentMessageUnRead);
                if (nbNewUnReadMail > 0) {
                    nbMail += nbNewUnReadMail;
                    if (nbMail > 1) {
                        title = this._util.getBundleString("connector.notification.nbUnreadMessages");
                        title = title.replace("%NB%", nbMail);
                        msg += newMessage.subject + "\n";
                    }
                    else if (nbMail === 1) {
                        title = this._util.getBundleString("connector.notification.NewMessage");
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
                            this._util.openURL(data);
                        }
                    }
                };
                if (this.getPrefs().isSoundEnabled()) {
                    this._util.playSound();
                }
                if (this.getPrefs().isSystemNotificationEnabled()) {
                    this._util.showNotificaton(title, msg, this.getPrefs().getUserServer(), listener);
                }
            }
        }
    }
    catch (e) {
        this._logger.error("Failed to notify new messages: " + e);
    }
    this._currentMessageUnRead = messages;

    this._reqInfoErrors.clearError(com.zimbra.service.REQUEST_TYPE.UNREAD_MSG);
    if (this._checkExpectedState(com.zimbra.controller.SERVICE_STATE.UNREAD_MSG_RUN)) {
        this._changeAndRunState(com.zimbra.controller.SERVICE_STATE.UNREAD_MSG_ENDED);
    }
};

/**
 * Generate and notify new event
 *
 * @this {Service}
 * @param {CalEvent[]}
 *            events
 */
com.zimbra.controller.Service.prototype.callbackCalendar = function(events) {
    try {
        var index, indexC;

        for (index = 0; index < events.length; index++) {
            var currentEvent = events[index];
            var found = false;
            for (indexC = 0; indexC < this._currentEvents.length; indexC++) {
                if (this._currentEvents[indexC].id === currentEvent.id) {
                    // refresh event
                    currentEvent.notifier = this._currentEvents[indexC].notifier;
                    this._currentEvents[indexC] = currentEvent;
                    // refresh notifier
                    currentEvent.notifier.update(currentEvent, this.getPrefs().getCalendarReminderTimeConf(),
                                                 this.getPrefs().getCalendarReminderNbRepeat(),
                                                 this.getPrefs().isCalendarSoundNotificationEnabled(),
                                                 this.getPrefs().isCalendarSystemNotificationEnabled());
                    found = true;
                    break;
                }
            }
            if (!found) {
                currentEvent.notifier = new com.zimbra.service.Notifier(
                        events[index], this.getPrefs().getCalendarReminderTimeConf(),
                        this.getPrefs().getCalendarReminderNbRepeat(),
                        this.getPrefs().isCalendarSoundNotificationEnabled(),
                        this.getPrefs().isCalendarSystemNotificationEnabled());
                this._currentEvents.push(currentEvent);
            }
        }

        var updateTime = new Date();
        for (indexC = this._currentEvents.length - 1; indexC >= 0; indexC--) {
            if (this._currentEvents[indexC].notifier.getUpdateTime() < updateTime) {
                this._currentEvents[indexC].notifier.stop();
                this._currentEvents.splice(indexC, 1);
            }
        }
        this._currentEvents.sort(function(a, b) {
            return a.startDate - b.startDate;
        });
    }
    catch (e) {
        this._logger.error("Failed to add event for notification: " + e);
    }

    this._reqInfoErrors.clearError(com.zimbra.service.REQUEST_TYPE.CALENDAR);
    if (this._checkExpectedState(com.zimbra.controller.SERVICE_STATE.CALENDAR_RUN)) {
        this._changeAndRunState(com.zimbra.controller.SERVICE_STATE.CALENDAR_ENDED);
    }
};

/**
 * Generate and notify new task
 *
 * @this {Service}
 * @param {Task[]}
 *            tasks
 */
com.zimbra.controller.Service.prototype.callbackTask = function(tasks) {

    tasks.sort(function(a, b) {
        if (a.priority === b.priority) {
            return a.date - b.date;
        } else {
            return a.priority - b.priority;
        }
    });
    this._currentTasks = tasks;

    this._reqInfoErrors.clearError(com.zimbra.service.REQUEST_TYPE.TASK);
    if (this._checkExpectedState(com.zimbra.controller.SERVICE_STATE.TASK_RUN)) {
        this._changeAndRunState(com.zimbra.controller.SERVICE_STATE.TASK_ENDED);
    }
};

/* ************************** Callback refresh *************************** */

/**
 * Add CallBack to Refresh
 *
 * @this {Service}
 * @param {Object}
 *            callback Object which has this function : refresh(startRequest)
 */
com.zimbra.controller.Service.prototype.addCallBackRefresh = function(callback) {
    this._callbackList.push(callback);
};

/**
 * Remove CallBack to Refresh
 *
 * @this {Service}
 * @param {Object}
 *            callback Object which has this function : refresh(startRequest)
 */
com.zimbra.controller.Service.prototype.removeCallBackRefresh = function(callback) {
    for ( var index = 0; index < this._callbackList.length; index++) {
        if (this._callbackList[index] === callback) {
            this._callbackList.splice(index, 1);
            break;
        }
    }
};

/**
 * Send CallBack Refresh Event
 *
 * @private
 * @this {Service}
 * @param {Boolean}
 *            startRequest true indicate that a query is started
 *                         false if there is new information
 */
com.zimbra.controller.Service.prototype._sendCallBackRefreshEvent = function(startRequest) {
    for ( var index = 0; index < this._callbackList.length; index++) {
        var callback = this._callbackList[index];
        if (callback !== null) {
            callback.refresh(startRequest);
        }
    }
};

/* ************************** Getter *************************** */

/**
 * Get prefs
 *
 * @this {Service}
 * @return {Prefs} prefs
 */
com.zimbra.controller.Service.prototype.getPrefs = function() {
    return this._prefs;
};

/**
 * Indicate if connected
 *
 * @this {Service}
 * @return {Boolean} true if connected
 */
com.zimbra.controller.Service.prototype.isConnected = function() {
    return this._webservice.isConnected();
};

/**
 * Get nb of unread messages
 *
 * @this {Service}
 * @return {Number} nb of unread messages
 */
com.zimbra.controller.Service.prototype.getNbMessageUnread = function() {
    var nbMessage = 0;
    for ( var index = 0; index < this._currentMessageUnRead.length; index++) {
        nbMessage += this._currentMessageUnRead[index].nbMail;
    }
    return nbMessage;
};

/**
 * Get events
 *
 * @this {Service}
 * @return {CalEvent[]} events
 */
com.zimbra.controller.Service.prototype.getEvents = function() {
    return this._currentEvents;
};

/**
 * Get tasks
 *
 * @this {Service}
 * @return {Task[]} tasks
 */
com.zimbra.controller.Service.prototype.getTasks = function() {
    return this._currentTasks;
};

/**
 * Get last error message
 *
 * @this {Service}
 * @return {String} the last server error message
 */
com.zimbra.controller.Service.prototype.getLastErrorMessage = function() {
    var message = "";
    var reason = "";
    var lastErr = this._reqInfoErrors.getLastError();

    if (lastErr !== null) {
        switch (lastErr.requestType) {
            case com.zimbra.service.REQUEST_TYPE.OPEN_SESSION:
                message = this._util.getBundleString("connector.error.authentification");
                break;
            case com.zimbra.service.REQUEST_TYPE.CREATE_WAIT:
                message = this._util.getBundleString("connector.error.createwait");
                break;
            case com.zimbra.service.REQUEST_TYPE.WAIT_NO_BLOCK:
            case com.zimbra.service.REQUEST_TYPE.WAIT_BLOCK:
                message = this._util.getBundleString("connector.error.wait");
                break;
            case com.zimbra.service.REQUEST_TYPE.UNREAD_MSG:
                message = this._util.getBundleString("connector.error.unreadmsg");
                break;
            case com.zimbra.service.REQUEST_TYPE.CALENDAR:
                message = this._util.getBundleString("connector.error.calendar");
                break;
            case com.zimbra.service.REQUEST_TYPE.TASK:
                message = this._util.getBundleString("connector.error.task");
                break;
            default:
                message = this._util.getBundleString("connector.error.req.internal");
        }

        switch (lastErr.lastReqStatus) {
            case com.zimbra.service.REQUEST_STATUS.REQUEST_INVALID:
                reason = this._util.getBundleString("connector.error.req.invalid");
                break;
            case com.zimbra.service.REQUEST_STATUS.TIMEOUT:
                reason = this._util.getBundleString("connector.error.req.timeout");
                break;
            case com.zimbra.service.REQUEST_STATUS.SERVER_ERROR:
                reason = this._util.getBundleString("connector.error.req.server");
                break;
            case com.zimbra.service.REQUEST_STATUS.NETWORK_ERROR:
                reason = this._util.getBundleString("connector.error.req.network");
                break;
            case com.zimbra.service.REQUEST_STATUS.AUTH_REQUIRED:
                reason = this._util.getBundleString("connector.error.req.authreq");
                break;
            case com.zimbra.service.REQUEST_STATUS.LOGIN_INVALID:
                reason = this._util.getBundleString("connector.error.req.logininvalid");
                break;
            default:
                reason = this._util.getBundleString("connector.error.req.internal");
                break;
        }
        message = message.replace("%REASON%", reason);
    }
    return message;
};

