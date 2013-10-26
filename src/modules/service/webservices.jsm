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
Components.utils.import("resource://zimbra_mail_notifier/domain/calevent.jsm");
Components.utils.import("resource://zimbra_mail_notifier/domain/message.jsm");
Components.utils.import("resource://zimbra_mail_notifier/domain/task.jsm");
Components.utils.import("resource://zimbra_mail_notifier/domain/session.jsm");
Components.utils.import("resource://zimbra_mail_notifier/service/logger.jsm");
Components.utils.import("resource://zimbra_mail_notifier/service/request.jsm");
Components.utils.import("resource://zimbra_mail_notifier/service/util.jsm");

var EXPORTED_SYMBOLS = ["zimbra_notifier_REQUEST_TYPE", "zimbra_notifier_Webservice"];

/**
 *
 * Request ID
 *
 * @constant
 *
 */
var zimbra_notifier_REQUEST_TYPE = {
    NONE           : 'NONE',
    CONNECT        : 'CONNECT',
    CREATE_WAIT    : 'CREATE_WAIT',
    WAIT_BLOCK     : 'WAIT_BLOCK',
    WAIT_NO_BLOCK  : 'WAIT_NO_BLOCK',
    UNREAD_MSG     : 'UNREAD_MSG',
    CALENDAR       : 'CALENDAR',
    TASK           : 'TASK'
};

/**
 * Creates an instance of zimbra_notifier_Webservice.
 *
 * @constructor
 * @this {Webservice}
 *
 * @param {Number}
 *            timeout the default timeout for query
 * @param {Service}
 *            parent the parent object which must implement callbacks...
 */
var zimbra_notifier_Webservice = function(timeoutQuery, timeoutWait, parent) {
    this._logger = new zimbra_notifier_Logger("Webservice");
    this._session = this.createSession();
    this._timeoutQuery = timeoutQuery;
    this._timeoutWait = timeoutWait;
    this._parent = parent;
    this._runningReq = null;
    this._timerLaunchCallback = null;

    this._parent.callbackSessionInfoChanged(this._session);
};

/**
 * Destroy and cleanup webservice
 *
 * @this {Webservice}
 */
zimbra_notifier_Webservice.prototype.release = function() {

};

/**
 * Create a new session object
 *
 * @this {Webservice}
 */
zimbra_notifier_Webservice.prototype.createSession = function() {
    return new zimbra_notifier_Session();
};

/**
 * Get the timeout in ms of the blocking wait request
 *
 * @this {Webservice}
 */
zimbra_notifier_Webservice.prototype.getWaitSetTimeout = function() {
    return this._timeoutWait;
};

/**
 * Get the running request type id, NONE if no request is running
 *
 * @this {Webservice}
 * @return {REQUEST_TYPE} The type of request
 */
zimbra_notifier_Webservice.prototype.getRunningReqType = function() {
    if (this._runningReq !== null) {
        return this._runningReq.typeRequest;
    }
    return zimbra_notifier_REQUEST_TYPE.NONE;
};

/**
 * Abort the running request, no callback will be runned
 *
 * @this {Webservice}
 */
zimbra_notifier_Webservice.prototype.abortRunningReq = function() {
    if (this._runningReq !== null) {
        var req = this._runningReq;
        this._runningReq = null;
        req.abort();
    }
    if (this._timerLaunchCallback !== null) {
        this._timerLaunchCallback.cancel();
        this._timerLaunchCallback = null;
    }
};

/**
 * Check if we are connected / the authentication token is still valid
 *
 * @this {Webservice}
 * @return {Boolean} true if connected
 */
zimbra_notifier_Webservice.prototype.isConnected = function() {
    return this._session.isTokenValid();
};

/**
 * Check if we need to connect
 *
 * @this {Webservice}
 * @return {Boolean} true if the creation of a new token is needed
 */
zimbra_notifier_Webservice.prototype.needConnect = function() {
    return !this._session.isTokenValid() || this._session.isTokenGoingToExp();
};

/**
 * Check if the WaitSet is valid
 *
 * @this {Webservice}
 * @return {Boolean} true the WaitSet is valid
 */
zimbra_notifier_Webservice.prototype.isWaitSetValid = function() {
    return this._session.isWaitSetValid();
};

/**
 * Restore from previous session the used waitset
 *
 * @this {Webservice}
 * @param {String}
 *            id The wait set id
 * @param {String}
 *            seq The wait set sequence
 * @param {String}
 *            urlWebService the URL of the webservice
 * @param {String}
 *            login the user login
 */
zimbra_notifier_Webservice.prototype.restoreWaitSet = function(id, seq, urlWebService, login) {
    var upLogin = this._session.updateLoginInfo(urlWebService, login, true);
    var upWaitS = this._session.updateWaitSet(id, seq);
    if (upLogin || upWaitS) {
        this._parent.callbackSessionInfoChanged(this._session);
    }
};

/**
 * Inform that user and/or the url of the webservice may have changed
 *
 * @this {Webservice}
 * @param {String}
 *            urlWebService the URL of the webservice
 * @param {String}
 *            login the user login
 */
zimbra_notifier_Webservice.prototype.infoAuthUpdated = function(urlWebService, login) {
    if (this._session.updateLoginInfo(urlWebService, login, true)) {
        this._parent.callbackSessionInfoChanged(this._session);
        return true;
    }
    return false;
};

/**
 * Get authentication.
 *
 * @this {Webservice}
 * @param {String}
 *            urlWebService the URL of the webservice
 * @param {String}
 *            login the user login
 * @param {String}
 *            password the user password
 */
zimbra_notifier_Webservice.prototype.authRequest = function(urlWebService, login, password) {
    var typeReq = zimbra_notifier_REQUEST_TYPE.CONNECT;
    this._launchQuery(typeReq, false, false, function() {

        this.infoAuthUpdated(urlWebService, login);
        this._runningReq = this._buildQueryReq(typeReq, "/service/soap/AuthRequest",
                                               this._callbackAuthRequest);
        this._runningReq.setAuthRequest(login, password);
        return true;
    });
};

/**
 * callbackAuthRequest.
 *
 * @private
 * @this {Webservice}
 * @param {Request}
 *            object request
 */
zimbra_notifier_Webservice.prototype._callbackAuthRequest = function(request) {
    var isOk = false;
    try {
        if (request !== this._runningReq) {
            this._logger.error("The running auth request != callback object");
        }
        if (request.isSuccess()) {
            var jsonResponse = request.jsonResponse();
            if (jsonResponse && jsonResponse.Header && jsonResponse.Body &&
                jsonResponse.Body.AuthResponse) {

                this._session.updateToken(jsonResponse.Body.AuthResponse.authToken[0]._content,
                                          jsonResponse.Body.AuthResponse.lifetime);
                this._parent.callbackSessionInfoChanged(this._session);
                isOk = this._session.isTokenValid();
            }
        }
    }
    catch (e) {
        this._logger.error("Callback Auth request error: " + e);
    }
    finally {
        this._runningReq = null;
        if (!isOk) {
            this._callbackFailed(request);
        }
        else {
            this._parent.callbackLoginSuccess();
        }
    }
};

/**
 * Delete the token and keep all other informations about the session
 *
 * @this {Webservice}
 * @return {Boolean} true if disconnected
 */
zimbra_notifier_Webservice.prototype.disconnect = function() {
    try {
        this.abortRunningReq();
        this._session.updateToken('', 0);
        this._parent.callbackSessionInfoChanged(this._session);
        this._parent.callbackDisconnect();
        return true;
    }
    catch (e) {
        this._logger.error("Disconnect failed: " + e);
    }
    return false;
};

/**
 * Create the 'object' to wait for change : messages, appointments and tasks
 *
 * @this {Webservice}
 */
zimbra_notifier_Webservice.prototype.createWaitRequest = function() {
    var typeReq = zimbra_notifier_REQUEST_TYPE.CREATE_WAIT;
    this._launchQuery(typeReq, true, false, function() {

        this._runningReq = this._buildQueryReq(typeReq, "/service/soap/CreateWaitSetRequest",
                                               this._callbackCreateWaitRequest);
        var dataBody = '';
        dataBody += '"CreateWaitSetRequest":{';
        dataBody +=    '"_jsns":"urn:zimbraMail",';
        dataBody +=    '"defTypes":"' + zimbra_notifier_Constant.WEBSERVICE.WAITSET_WATCH_TYPES + '",';
        dataBody +=    '"add":{';
        dataBody +=       '"a":{';
        dataBody +=          '"name":' + JSON.stringify(this._session.user());
        dataBody +=       '}';
        dataBody +=    '}';
        dataBody += '}';
        this._runningReq.setQueryRequest(this._session, dataBody);
        return true;
    });
};

/**
 * callbackCreateWaitRequest.
 *
 * @private
 * @this {Webservice}
 * @param {Request}
 *            object request
 */
zimbra_notifier_Webservice.prototype._callbackCreateWaitRequest = function(request) {
    var isOk = false;
    try {
        if (request !== this._runningReq) {
            this._logger.error("The running createWait request != callback object");
        }
        if (request.isSuccess()) {
            var jsonR = request.jsonResponse();
            if (jsonR && jsonR.Body && jsonR.Body.CreateWaitSetResponse) {
                this._session.updateWaitSet(jsonR.Body.CreateWaitSetResponse.waitSet,
                                            jsonR.Body.CreateWaitSetResponse.seq);
                this._parent.callbackSessionInfoChanged(this._session);
                isOk = true;
            }
        }
    }
    catch (e) {
        this._logger.error("Callback CreateWait request error: " + e);
    }
    finally {
        this._runningReq = null;
        if (!isOk) {
            this._callbackFailed(request);
        }
        else {
            this._parent.callbackCreateWaitSet();
        }
    }
};

/**
 * Wait for events
 *
 * @this {Webservice}
 *
 * @param {Boolean}
 *            blocking  True if the query is a blocking request
 */
zimbra_notifier_Webservice.prototype.waitRequest = function(blocking) {
    var typeReq = blocking ? zimbra_notifier_REQUEST_TYPE.WAIT_BLOCK :
                             zimbra_notifier_REQUEST_TYPE.WAIT_NO_BLOCK;

    this._launchQuery(typeReq, true, true, function() {

        var timeoutS = Math.ceil(this._timeoutQuery / 1000);
        if (blocking) {
            timeoutS = Math.round((this.getWaitSetTimeout() - 1000) / 1000);
            if (timeoutS < 1) {
                timeoutS = 1;
            }
        }

        this._runningReq = this._buildQueryReq(typeReq, "/service/soap/WaitSetRequest",
                                               this._callbackWaitRequest);
        if (blocking === true) {
            this._runningReq.setTimeout((timeoutS + 10) * 1000);
        }
        var dataBody = '';
        dataBody += '"WaitSetRequest":{';
        dataBody +=    '"_jsns":"urn:zimbraMail",';
        dataBody +=    '"waitSet":' + JSON.stringify(this._session.waitId()) + ',';
        dataBody +=    '"seq":' + JSON.stringify(this._session.waitSeq()) + ',';
        dataBody +=    '"block":' + ((blocking === true) ? '1' : '0') + ',';
        dataBody +=    '"timeout":' + timeoutS + ',';
        dataBody +=    '"add":{';
        dataBody +=    '},';
        dataBody +=    '"update":{';
        dataBody +=    '},';
        dataBody +=    '"remove":{';
        dataBody +=    '}';
        dataBody += '}';
        this._runningReq.setQueryRequest(this._session, dataBody);
        return true;
    });
};

/**
 * callbackWaitRequest.
 *
 * @private
 * @this {Webservice}
 * @param {Request}
 *            object request
 */
zimbra_notifier_Webservice.prototype._callbackWaitRequest = function(request) {
    var isOk = false;
    var newEvent = false;
    var blockingReq = true;
    try {
        if (request !== this._runningReq) {
            this._logger.error("The running Wait request != callback object");
        }
        if (request.typeRequest === zimbra_notifier_REQUEST_TYPE.WAIT_NO_BLOCK) {
            blockingReq = false;
        }
        if (request.isSuccess()) {
            var jsonR = request.jsonResponse();
            if (jsonR && jsonR.Body && jsonR.Body.WaitSetResponse) {
                if (this._session.waitId() !== jsonR.Body.WaitSetResponse.waitSet) {
                    this._logger.error("Unexpected WaitSet Id...");
                }
                this._session.updateWaitSet(jsonR.Body.WaitSetResponse.waitSet,
                                            jsonR.Body.WaitSetResponse.seq);
                if (jsonR.Body.WaitSetResponse.a) {
                    newEvent = true;
                }
                isOk = true;
            }
        }
    }
    catch (e) {
        this._logger.error("Callback Wait request error: " + e);
    }
    finally {
        this._runningReq = null;
        if (!isOk) {
            this._callbackFailed(request);
        }
        else if (!blockingReq) {
            this._parent.callbackWaitNoBlock(newEvent);
        }
        else {
            this._parent.callbackWaitBlock(newEvent);
        }
    }
};

/**
 * Search unread message request.
 *
 * @this {Webservice}
 * @param {Number}
 *            offset The start index of the returned query
 * @param {Number}
 *            limit  The maximum number of result
 * @param {Boolean}
 *            onlyId Only message id should be retrieved
 */
zimbra_notifier_Webservice.prototype.searchUnReadMsg = function(offset, limit, onlyId) {
    var typeReq = zimbra_notifier_REQUEST_TYPE.UNREAD_MSG;
    this._launchQuery(typeReq, true, false, function() {

        this._runningReq = this._buildQueryReq(typeReq, "/service/soap/SearchRequest",
                                               this._callbackUnreadMsgRequest);
        var dataBody = '';
        dataBody += '"SearchRequest":{';
        dataBody +=    '"_jsns":"urn:zimbraMail",';
        dataBody +=    '"types":"message",';
        if (offset > 0) {
            dataBody += '"offset":' + offset + ',';
        }
        if (limit > 0) {
            dataBody += '"limit":' + limit + ',';
        }
        else {
            dataBody += '"limit":999,';
        }
        if (onlyId) {
            dataBody += '"resultMode":"IDS",';
        }
        dataBody +=    '"query":{';
        dataBody +=       '"_content":"is:unread"';
        dataBody +=    '}';
        dataBody += '}';
        this._runningReq.setQueryRequest(this._session, dataBody);
        return true;
    });
};

/**
 * callbackUnreadMsgRequest.
 *
 * @private
 * @this {Webservice}
 * @param {Request}
 *            object request
 */
zimbra_notifier_Webservice.prototype._callbackUnreadMsgRequest = function(request) {
    var isOk = false;
    var messages = [];
    try {
        if (request !== this._runningReq) {
            this._logger.error("The running UnreadMsg request != callback object");
        }
        if (request.isSuccess()) {
            var jsonResponse = request.jsonResponse();
            if (jsonResponse && jsonResponse.Body) {
                var content = jsonResponse.Body.SearchResponse.m;
                if (content) {
                    for (var iMsg = 0; iMsg < content.length; ++iMsg) {
                        var currMsg = content[iMsg];
                        var eMsg = null;
                        if (currMsg.e && currMsg.e.length > 0) {
                            eMsg = currMsg.e[0].a;
                        }
                        messages.push(new zimbra_notifier_Message(
                            currMsg.id, currMsg.d, currMsg.su, currMsg.fr, eMsg, currMsg.cid));
                    }
                }
                content = jsonResponse.Body.SearchResponse.hit;
                if (content) {
                    for (var iMsg = 0; iMsg < content.length; ++iMsg) {
                        messages.push(new zimbra_notifier_Message(
                            content[iMsg].id, 0, '', '', 0, null));
                    }
                }
                isOk = true;
            }
        }
    }
    catch (e) {
        this._logger.error("Callback UnreadMsg request error: " + e);
    }
    finally {
        this._runningReq = null;
        if (!isOk) {
            this._callbackFailed(request);
        }
        else {
            this._parent.callbackNewMessages(messages);
        }
    }
};

/**
 * Search calendar request.
 * @see http://wiki.zimbra.com/index.php?title=Search_Tips
 *
 * @this {Webservice}
 * @param {Date}
 *            startDate the start date
 * @param {Date}
 *            endDate the end date
 */
zimbra_notifier_Webservice.prototype.searchCalendar = function(startDate, endDate) {
    var typeReq = zimbra_notifier_REQUEST_TYPE.CALENDAR;
    this._launchQuery(typeReq, true, false, function() {

        this._runningReq = this._buildQueryReq(typeReq, "/service/soap/SearchRequest",
                                               this._callbackCalendarRequest);
        var dataBody = '';
        dataBody += '"SearchRequest":{';
        dataBody +=    '"_jsns":"urn:zimbraMail",';
        dataBody +=    '"calExpandInstStart":"' + startDate.getTime() + '",';
        dataBody +=    '"calExpandInstEnd":"' + endDate.getTime() + '",';
        dataBody +=    '"types":"appointment",';
        dataBody +=    '"sortBy":"dateAsc",';
        dataBody +=    '"query":{';
        dataBody +=       '"_content":"underid:1 AND NOT inid:3"';
        dataBody +=    '}';
        dataBody += '}';
        this._runningReq.setQueryRequest(this._session, dataBody);
        return true;
    });
};

/**
 * callbackSearchCalendarRequestSuccess.
 *
 * @private
 * @this {Webservice}
 * @param {Request}
 *            object request
 */
zimbra_notifier_Webservice.prototype._callbackCalendarRequest = function(request) {
    var isOk = false;
    var events = [];
    try {
        if (request !== this._runningReq) {
            this._logger.error("The running calendar request != callback object");
        }
        if (request.isSuccess()) {
            var jsonResponse = request.jsonResponse();
            if (jsonResponse && jsonResponse.Body) {
                var content = jsonResponse.Body.SearchResponse.appt;
                if (content) {
                    for (var index = content.length - 1; index >= 0; index--) {
                        if (content[index].inst && content[index].inst.length > 0) {
                            var event = new zimbra_notifier_CalEvent(
                                content[index].uid, content[index].name,
                                content[index].inst[0].s, content[index].dur, 0);

                            if (content[index].alarmData && content[index].alarmData.length > 0) {
                                var currentEvent = content[index].alarmData[0];
                                // get time conf
                                if (currentEvent.alarm && currentEvent.alarm.length > 0 &&
                                    currentEvent.alarm[0].trigger &&
                                    currentEvent.alarm[0].trigger.length > 0 &&
                                    currentEvent.alarm[0].trigger[0].rel &&
                                    currentEvent.alarm[0].trigger[0].rel.length > 0) {

                                    event.timeConf = currentEvent.alarm[0].trigger[0].rel[0].m;
                                }
                            }
                            events.push(event);
                        }
                    }
                }
                isOk = true;
            }
        }
    }
    catch (e) {
        this._logger.error("Callback Calendar request error:" + e);
    }
    finally {
        this._runningReq = null;
        if (!isOk) {
            this._callbackFailed(request);
        }
        else {
            this._parent.callbackCalendar(events);
        }
    }
};

/**
 * Search task request.
 *
 * @this {Webservice}
 */
zimbra_notifier_Webservice.prototype.searchTask = function() {
    var typeReq = zimbra_notifier_REQUEST_TYPE.TASK;
    this._launchQuery(typeReq, true, false, function() {

        this._runningReq = this._buildQueryReq(typeReq, "/service/soap/SearchRequest",
                                               this._callbackTaskRequest);
        var dataBody = '';
        dataBody += '"SearchRequest":{';
        dataBody +=    '"_jsns":"urn:zimbraMail",';
        dataBody +=    '"allowableTaskStatus":"NEED,INPR,WAITING,DEFERRED",';
        dataBody +=    '"types":"task",';
        dataBody +=    '"sortBy":"taskDueAsc",';
        dataBody +=    '"query":{';
        dataBody +=       '"_content":"in:tasks"';
        dataBody +=    '}';
        dataBody += '}';
        this._runningReq.setQueryRequest(this._session, dataBody);
        return true;
    });
};

/**
 * callbackSearchTaskRequestSuccess.
 *
 * @private
 * @this {Webservice}
 * @param {Request}
 *            object request
 */
zimbra_notifier_Webservice.prototype._callbackTaskRequest = function(request) {
    var isOk = false;
    var tasks = [];
    try {
        if (request !== this._runningReq) {
            this._logger.error("The running task request != callback object");
        }
        if (request.isSuccess()) {
            var jsonResponse = request.jsonResponse();
            if (jsonResponse && jsonResponse.Body) {
                var content = jsonResponse.Body.SearchResponse.task;
                if (content) {
                    for (var index = content.length - 1; index >= 0; index--) {
                        if (content[index].inst && content[index].inst.length > 0) {
                            var currTask = content[index];
                            var task = new zimbra_notifier_Task(currTask.name, currTask.d,
                                                                currTask.percentComplete, currTask.priority);
                            tasks.push(task);
                        }
                    }
                }
                isOk = true;
            }
        }
    }
    catch (e) {
        this._logger.error("Callback Task request error:" + e);
    }
    finally {
        this._runningReq = null;
        if (!isOk) {
            this._callbackFailed(request);
        }
        else {
             this._parent.callbackTask(tasks);
        }
    }
};

/**
 * Inform the parent of the failure
 *
 * @private
 * @this {Webservice}
 * @param {Request}
 *            request The information about the request
 */
zimbra_notifier_Webservice.prototype._callbackFailed = function(request) {
    try {
        var status = request.status;
        switch (status)
        {
            case zimbra_notifier_REQUEST_STATUS.AUTH_REQUIRED:
                this._session.markTokenExpired();
                this._parent.callbackSessionInfoChanged(this._session);
                break;

            case zimbra_notifier_REQUEST_STATUS.WAITSET_INVALID:
                this._session.updateWaitSet('', '');
                this._parent.callbackSessionInfoChanged(this._session);
                break;

            case zimbra_notifier_REQUEST_STATUS.LOGIN_INVALID:
                this._session.updateToken('', 0);
                this._parent.callbackSessionInfoChanged(this._session);
                break;

            case zimbra_notifier_REQUEST_STATUS.TIMEOUT:
            case zimbra_notifier_REQUEST_STATUS.SERVER_ERROR:
            case zimbra_notifier_REQUEST_STATUS.CANCELED:
            case zimbra_notifier_REQUEST_STATUS.NETWORK_ERROR:
            case zimbra_notifier_REQUEST_STATUS.REQUEST_INVALID:
                break;

            default:
                status = zimbra_notifier_REQUEST_STATUS.INTERNAL_ERROR;
                break;
        }
        this._logger.warning("Failed run request: " + request.typeRequest + " error: " + status);
        this._parent.callbackError(request.typeRequest, status);
    }
    catch (e) {
        this._logger.error("Callback: Fail run callbackError: " + e);
    }
};

/**
 * Create the request
 *
 * @private
 * @this {Webservice}
 * @param {REQUEST_TYPE}
 *            typeReq The type of the request
 * @param {String}
 *            url The path of the url (no scheme or hostname)
 * @param {Function}
 *            callback The function to call at the end of the request
 */
zimbra_notifier_Webservice.prototype._buildQueryReq = function(typeReq, url, callback) {
    return new zimbra_notifier_Request(typeReq, this._timeoutQuery, this._session.buildUrl(url),
                                       this, callback);
};

/**
 * Launch a query
 *
 * @private
 * @this {Webservice}
 * @param {REQUEST_TYPE}
 *            typeReq The type of the request
 * @param {Boolean}
 *            connectRequired True if we need to be connected to launch the query
 * @param {Boolean}
 *            waitSetRequired True if we need a valid WaitSet to launch the query
 * @param {Function}
 *            func  Function to launch, must return true if the query was sent successfully
 */
zimbra_notifier_Webservice.prototype._launchQuery = function(typeReq, connectRequired, waitSetRequired, func) {
    var needRunFailFunc = true;
    try {
        if (this._canRunQuery(typeReq, connectRequired, waitSetRequired)) {

            if (func.call(this) && this._runningReq && this._runningReq.send()) {
                needRunFailFunc = false;
            }
        }
        else {
            needRunFailFunc = false;
        }
    }
    catch (e) {
        this._logger.error("Request " + typeReq + " error: " + e);
    }
    finally {
        if (needRunFailFunc) {
            this._runCallbackFailLaunch(typeReq, zimbra_notifier_REQUEST_STATUS.INTERNAL_ERROR);
        }
    }
};

/**
 * Check if the query can be runned
 *
 * @private
 * @this {Webservice}
 * @param {REQUEST_TYPE}
 *            typeReq The type of the request
 * @param {Boolean}
 *            connectRequired True if we need to be connected to launch the query
 * @param {Boolean}
 *            waitSetRequired True if we need a valid WaitSet to launch the query
 */
zimbra_notifier_Webservice.prototype._canRunQuery = function(typeReq, connectRequired, waitSetRequired) {
    if (this._timerLaunchCallback) {
        this._logger.error("A timer is running");
        // Do nothing, do not inform the parent, this should never happen
        return false;
    }
    if (this._runningReq !== null) {
        this._logger.error("A query is already running");
        // Do nothing, do not inform the parent, this should never happen
        return false;
    }
    if (connectRequired && !this.isConnected()) {
        this._logger.warning("Can not run query: Not connected");
        this._runCallbackFailLaunch(typeReq, zimbra_notifier_REQUEST_STATUS.AUTH_REQUIRED);
        return false;
    }
    if (waitSetRequired && !this.isWaitSetValid()) {
        this._logger.warning("Can not run query: WaitSet invalid");
        this._runCallbackFailLaunch(typeReq, zimbra_notifier_REQUEST_STATUS.WAITSET_INVALID);
        return false;
    }
    return true;
};

/**
 * Inform the parent of the failure
 *
 * @private
 * @this {Webservice}
 * @param {String}
 *            typeReq The type of the request
 * @param {REQUEST_STATUS}
 *            status  The request status
 */
zimbra_notifier_Webservice.prototype._runCallbackFailLaunch = function(typeReq, status) {
    var object = this;
    this._timerLaunchCallback = zimbra_notifier_Util.setTimer(this._timerLaunchCallback, function() {
        object._logger.warning("Failed launch request: " + typeReq + " error: " + status);
        object._timerLaunchCallback = null;
        object._parent.callbackError(typeReq, status);
    }, 1000);
};

