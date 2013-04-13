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

/**
 * Creates an instance of Service.
 * 
 * @constructor
 * @this {Service}
 */
com.zimbra.controller.Service = function() {
    this._util = new com.zimbra.service.Util();
    this._prefs = new com.zimbra.service.Prefs();
    this._webservice = new com.zimbra.service.Webservice();

    this._util.addObserver(this, com.zimbra.constant.OBSERVER.PREF_SAVED);
};

/**
 * initialize Service.
 * 
 * @this {Service}
 * @param {Function}
 *            parent the parent object
 */

com.zimbra.controller.Service.prototype.initialize = function(parent) {
    this._callbackList = [];
    this._currentEvents = [];
    this._updateTime = 0;
    // load prefs
    this._prefs.load();
    // set default values
    this.setDefautValue();
    // add callback
    this.addCallBackRefresh(parent);
    // start auto-connect if necessary
    if (this._prefs.isAutoConnectEnabled()) {
        if (this._prefs.isSavePasswordEnabled()) {
            this.initializeConnection();
        } else {
            return false;
        }
    }
    return true;
};

/**
 * release Service.
 * 
 * @this {Service}
 */

com.zimbra.controller.Service.prototype.release = function() {
    this._util.removeObserver(this, com.zimbra.constant.OBSERVER.PREF_SAVED);
    if (this._connected) {
        this.closeConnection();
    }
};

/**
 * set default values of Service.
 * 
 * @private
 * @this {Service}
 */
com.zimbra.controller.Service.prototype.setDefautValue = function() {
    this.stopTimer();
    // stop all notifiers if exist
    for ( var indexC = this._currentEvents.length - 1; indexC >= 0; indexC--) {
        this._currentEvents[indexC].notifier.stop();
        this._currentEvents.splice(indexC, 1);
    }

    this._session = null;
    this._connected = false;
    this._firstUnreadMessages = true;
    this._currentTimer = null;
    this._nbTry = 3;
    this._currentMessageUnRead = [];
    this._currentTasks = [];
    this.sendCallBackRefreshEvent();
};

/**
 * indicate if connected
 * 
 * @this {Service}
 * @return {Boolean} true if connected
 */
com.zimbra.controller.Service.prototype.isConnected = function() {
    return this._connected;
};

/**
 * Initialize Connection
 * 
 * @this {Service}
 */
com.zimbra.controller.Service.prototype.initializeConnection = function() {
    this._error = com.zimbra.constant.SERVER_ERROR.NO_ERROR;
    this.sendCallBackRefreshEvent(true);
    this._webservice.authRequest(this._prefs.getUserServer(), this._prefs.getUserLogin(), this._prefs.getUserPassword(), this);
};

/**
 * Close Connection
 * 
 * @this {Service}
 */
com.zimbra.controller.Service.prototype.closeConnection = function() {
    this._webservice.endSession(this._session, this);
    this.setDefautValue();
};

/**
 * get prefs
 * 
 * @this {Service}
 * @return {Prefs} prefs
 */
com.zimbra.controller.Service.prototype.getPrefs = function() {
    return this._prefs;
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
        this.sendCallBackRefreshEvent();
        if (this._connected) {
            this.callbackNoOp(true);
        }
    }
};

/**
 * callbackError
 * 
 * @private
 * @this {Service}
 * @param {String}
 *            serverError error generate by the webservice
 * @param {String}
 *            error the error description
 */
com.zimbra.controller.Service.prototype.callbackError = function(serverError, error) {
    if (this._error < serverError) {
        this._error = serverError;
    }
    // stop connection if not noop request
    if (serverError !== com.zimbra.constant.SERVER_ERROR.NOOP_REQUEST) {
        this.setDefautValue();
    } else {
        // try x time before stop connection
        this._nbTry--;
        if (this._nbTry === 0) {
            this.setDefautValue();
        }
    }
};

/**
 * get last error
 * 
 * @this {Service}
 * @return {Number} the last server error
 */
com.zimbra.controller.Service.prototype.getLastError = function() {
    return this._error;
};

/**
 * get last error message
 * 
 * @this {Service}
 * @return {String} the last server error message
 */
com.zimbra.controller.Service.prototype.getLastErrorMessage = function() {
    var message = "";
    switch (this.getLastError()) {
    case com.zimbra.constant.SERVER_ERROR.REQUEST:
        message = this._util.getBundleString("connector.error.request");
        break;
    case com.zimbra.constant.SERVER_ERROR.AUTHENTIFICATION:
        message = this._util.getBundleString("connector.error.authentification");
        break;
    case com.zimbra.constant.SERVER_ERROR.NOOP_REQUEST:
        message = this._util.getBundleString("connector.error.noop");
        break;
    case com.zimbra.constant.SERVER_ERROR.SEARCH_REQUEST:
        message = this._util.getBundleString("connector.error.search");
        break;
    case com.zimbra.constant.SERVER_ERROR.TIMEOUT:
        message = this._util.getBundleString("connector.error.timeout");
        break;
    default:
        message = "";
    }
    return message;
};

/**
 * get next update time
 * 
 * @this {Service}
 * @return {Number} the next update time in seconde
 */
com.zimbra.controller.Service.prototype.getNextUpdate = function() {
    return Math.ceil((this._updateTime - new Date().getTime()) / 1000);
};

/**
 * callback Login Success
 * 
 * @private
 * @this {Service}
 * @param {Session}
 *            session of the current authentication
 */
com.zimbra.controller.Service.prototype.callbackLoginSuccess = function(session) {
    this._session = session;
    this.callbackNoOp(true);
    // start the timer to the next check
    this.startTimer();
};

/**
 * check now
 * 
 * @this {Service}
 */
com.zimbra.controller.Service.prototype.checkNow = function() {
    this.stopTimer();
    this._error = com.zimbra.constant.SERVER_ERROR.NO_ERROR;
    this.sendCallBackRefreshEvent(true);
    this._webservice.noOpRequest(this._session, this);
    this.startTimer();
};

/**
 * start timer
 * 
 * @private
 * @this {Service}
 */
com.zimbra.controller.Service.prototype.startTimer = function() {
    var object = this;
    this._currentTimer = window.setTimeout(function() {
        object.checkNow();
    }, com.zimbra.constant.CHECK_TIME);
    this._updateTime = new Date().getTime() + com.zimbra.constant.CHECK_TIME;
};

/**
 * stop timer
 * 
 * @private
 * @this {Service}
 */
com.zimbra.controller.Service.prototype.stopTimer = function() {
    if (this._currentTimer) {
        window.clearTimeout(this._currentTimer);
        this._currentTimer = null;
    }
};

/**
 * add CallBack to Refresh
 * 
 * @private
 * @this {Service}
 * @param {Function}
 *            callback function to add to the refresh event
 */
com.zimbra.controller.Service.prototype.addCallBackRefresh = function(callback) {
    this._callbackList.push(callback);
};

/**
 * remove CallBack to Refresh
 * 
 * @private
 * @this {Service}
 * @param {Function}
 *            callback function to remove to the refresh event
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
 * send CallBack Refresh Event
 * 
 * @private
 * @this {Service}
 */
com.zimbra.controller.Service.prototype.sendCallBackRefreshEvent = function(status) {
    for ( var index = 0; index < this._callbackList.length; index++) {
        var callback = this._callbackList[index];
        if (callback !== null) {
            callback.refresh(status);
        }
    }
};

/**
 * generate and notify new message
 * 
 * @private
 * @this {Service}
 * @param {Message[]}
 *            messages messages unread
 */
com.zimbra.controller.Service.prototype.callbackNewMessages = function(messages) {
    if (this._firstUnreadMessages) {
        this._firstUnreadMessages = false;
        this._connected = true;
    } else {
        for ( var index = 0; index < messages.length; index++) {
            var newMessage = messages[index];
            var found = false;
            for ( var indexC = 0; indexC < this._currentMessageUnRead.length; indexC++) {
                if (newMessage.id === this._currentMessageUnRead[indexC].id) {
                    found = true;
                }
            }
            if (!found) {
                var title = this._util.getBundleString("connector.notification.NewMessage").replace("%EMAIL%", newMessage.senderEmail);
                var msg = newMessage.subject;
                if (newMessage.nbMail > 1) {
                    title = this._util.getBundleString("connector.notification.nbUnreadMessages").replace("%NB%", newMessage.nbMail);
                    msg = newMessage.subject;
                }
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
    this._currentMessageUnRead = messages;
    // send refresh event
    this.sendCallBackRefreshEvent();
};

/**
 * generate and notify new event
 * 
 * @private
 * @this {Service}
 * @param {CalEvent[]}
 *            events
 */
com.zimbra.controller.Service.prototype.callbackCalendar = function(events) {
    var index, indexC;
    var updateTime = new Date();
    for (index = 0; index < events.length; index++) {
        var currentEvent = events[index];
        var found = false;
        for (indexC = 0; indexC < this._currentEvents.length; indexC++) {
            if (this._currentEvents[indexC].id === currentEvent.id) {
                // refresh event
                currentEvent.notifier = this._currentEvents[indexC].notifier;
                this._currentEvents[indexC] = currentEvent;
                // refresh notifier
                currentEvent.notifier.update(currentEvent, this.getPrefs().getCalendarReminderTimeConf(), this.getPrefs().getCalendarReminderNbRepeat(), this.getPrefs()
                        .isCalendarSoundNotificationEnabled(), this.getPrefs().isCalendarSystemNotificationEnabled());
                found = true;
                break;
            }
        }
        if (!found) {
            currentEvent.notifier = new com.zimbra.service.Notifier(events[index], this.getPrefs().getCalendarReminderTimeConf(), this.getPrefs().getCalendarReminderNbRepeat(), this.getPrefs()
                    .isCalendarSoundNotificationEnabled(), this.getPrefs().isCalendarSystemNotificationEnabled());
            this._currentEvents.push(currentEvent);
        }
    }
    for (indexC = this._currentEvents.length - 1; indexC >= 0; indexC--) {
        if (this._currentEvents[indexC].notifier.getUpdateTime() < updateTime) {
            this._currentEvents[indexC].notifier.stop();
            this._currentEvents.splice(indexC, 1);
        }
    }
    this._currentEvents.sort(function(a, b) {
        return a.startDate - b.startDate;
    });
};

/**
 * generate and notify new task
 * 
 * @private
 * @this {Service}
 * @param {Task[]}
 *            tasks
 */
com.zimbra.controller.Service.prototype.callbackTask = function(tasks) {
    this._currentTasks = tasks;
};

/**
 * indicate if it is necessary to refresh data
 * 
 * @private
 * @this {Service}
 * @param {Boolean}
 *            toRefresh indicate if it is necessary to refresh
 */
com.zimbra.controller.Service.prototype.callbackNoOp = function(toRefresh) {
    if (toRefresh) {
        // get new messages
        this._webservice.searchUnReadMsg(this._session, this);
        // get task
        if (this.getPrefs().isTaskEnabled()) {
            this._webservice.searchTask(this._session, this);
        }
        // get calendar
        if (this.getPrefs().isCalendarEnabled()) {
            var date = new Date();
            var startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
            var endDate = new Date(startDate.getTime() + 86400000 * this.getPrefs().getCalendarPeriodDisplayed());
            this._webservice.searchCalendar(this._session, this, startDate, endDate);
        }
    } else {
        // send refresh event
        this.sendCallBackRefreshEvent();
    }
};

/**
 * get nb of unread messages
 * 
 * @this {Service}
 * @return {Number} nb of unread messages
 */
com.zimbra.controller.Service.prototype.getNBMessageUnread = function() {
    var nbMessage = 0;
    for ( var index = 0; index < this._currentMessageUnRead.length; index++) {
        nbMessage += this._currentMessageUnRead[index].nbMail;
    }
    return nbMessage;
};

/**
 * get events
 * 
 * @this {Service}
 * @return {CalEvent[]} events
 */
com.zimbra.controller.Service.prototype.getEvents = function() {
    return this._currentEvents;
};

/**
 * get tasks
 * 
 * @this {Service}
 * @return {Task[]} tasks
 */
com.zimbra.controller.Service.prototype.getTasks = function() {
    return this._currentTasks;
};