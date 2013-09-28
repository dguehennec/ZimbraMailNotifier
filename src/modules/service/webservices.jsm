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
if (!com.zimbra.service) {
    com.zimbra.service = {};
}

/**
 *
 * Request ID
 *
 * @constant
 *
 */
com.zimbra.service.REQUEST_TYPE = {
    NONE : 0,
    OPEN_SESSION : 1,
    CREATE_WAIT : 2,
    WAIT_BLOCK : 3,
    WAIT_NO_BLOCK : 4,
    UNREAD_MSG : 5,
    CALENDAR : 6,
    TASK : 7
};

/**
 * Creates an instance of com.zimbra.service.Webservice.
 *
 * @constructor
 * @this {Webservice}
 *
 * @param {Number}
 *            timeout the default timeout for query
 * @param {Service}
 *            parent the parent object which must implement callbacks...
 */
com.zimbra.service.Webservice = function(timeout, parent) {
    this._logger = new com.zimbra.service.Logger("Webservice");
    this._timeoutQuery = timeout;
    this._parent = parent;
    this._session = new com.zimbra.domain.Session();
    this._runningReq = null;
};

/**
 * Get the running request type id, NONE if no request is running
 *
 * @this {Webservice}
 */
com.zimbra.service.Webservice.prototype.getRunningReqType = function() {
    if (this._runningReq !== null) {
        return this._runningReq.typeRequest;
    }
    return com.zimbra.service.REQUEST_TYPE.NONE;
};

/**
 * Abort the running request, no callback will be runned
 *
 * @this {Webservice}
 */
com.zimbra.service.Webservice.prototype.abortRunningReq = function() {
    if (this._runningReq !== null) {
        var req = this._runningReq;
        this._runningReq = null;
        req.abort();
    }
};

/**
 * Check if we are connected / the authentication token is still valid
 *
 * @this {Webservice}
 * @return {Boolean} true if connected
 */
com.zimbra.service.Webservice.prototype.isConnected = function() {
    return this._session.isTokenValid();
};

/**
 * Check if we need to connect
 *
 * @this {Webservice}
 * @return {Boolean} true if the creation of a new token is needed
 */
com.zimbra.service.Webservice.prototype.needConnect = function() {
    return !this._session.isTokenValid() || this._session.isTokenGoingToExp();
};

/**
 * Check if the WaitSet is valid
 *
 * @this {Webservice}
 * @return {Boolean} true the WaitSet is valid
 */
com.zimbra.service.Webservice.prototype.isWaitSetValid = function() {
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
 *            hostname the server hostname
 * @param {String}
 *            login the user login
 */
com.zimbra.service.Webservice.prototype.restoreWaitSet = function(id, seq, hostname, login) {
    var upLogin = this._session.updateLoginInfo(hostname, login, true);
    var upWaitS = this._session.updateWaitSet(id, seq);
    if (upLogin || upWaitS) {
        this._parent.callbackSessionInfoChanged(this._session);
    }
};

/**
 * Inform that user and/or hostname may have changed
 *
 * @this {Webservice}
 * @param {String}
 *            hostname the server hostname
 * @param {String}
 *            login the user login
 */
com.zimbra.service.Webservice.prototype.infoAuthUpdated = function(hostname, login) {
    if (this._session.updateLoginInfo(hostname, login, true)) {
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
 *            hostname the server hostname
 * @param {String}
 *            login the user login
 * @param {String}
 *            password the user password
 * @return {Boolean} true if the request was launched
 */
com.zimbra.service.Webservice.prototype.authRequest = function(hostname, login, password) {
    try {
        if (this._runningReq !== null) {
            return false;
        }
        this.infoAuthUpdated(hostname, login);
        this._runningReq = this._buildQueryReq(com.zimbra.service.REQUEST_TYPE.OPEN_SESSION,
                                               "/service/soap/AuthRequest",
                                               this._callbackAuthRequest);
        this._runningReq.setAuthRequest(login, password);
        return this._runningReq.send();
    }
    catch (e) {
        this._logger.error("Auth request error: " + e);
    }
    return false;
};

/**
 * callbackAuthRequest.
 *
 * @private
 * @this {Webservice}
 * @param {Request}
 *            object request
 */
com.zimbra.service.Webservice.prototype._callbackAuthRequest = function(request) {
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
                if (this._session.isTokenValid()) {
                    this._parent.callbackSessionInfoChanged(this._session);
                    isOk = true;
                }
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
com.zimbra.service.Webservice.prototype.disconnect = function() {
    try {
        this._session.updateToken('', '');
        this._parent.callbackDisconnect();
        this._parent.callbackSessionInfoChanged(this._session);
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
 * @return {Boolean} true if the request was launched
 */
com.zimbra.service.Webservice.prototype.createWaitRequest = function() {
    try {
        if (!this._canRunQuery()) {
            return false;
        }
        this._runningReq = this._buildQueryReq(com.zimbra.service.REQUEST_TYPE.CREATE_WAIT,
                                               "/service/soap/CreateWaitSetRequest",
                                               this._callbackCreateWaitRequest);
        var dataBody = '';
        dataBody += '"CreateWaitSetRequest":{';
        dataBody +=    '"_jsns":"urn:zimbraMail",';
        dataBody +=    '"defTypes":"' + com.zimbra.constant.WEBSERVICE.WAITSET_WATCH_TYPES + '",';
        dataBody +=    '"add":{';
        dataBody +=       '"a":{';
        dataBody +=          '"name":' + JSON.stringify(this._session.user());
        dataBody +=       '}';
        dataBody +=    '}';
        dataBody += '}';
        this._runningReq.setQueryRequest(this._session, dataBody);
        return this._runningReq.send();
    }
    catch (e) {
        this._logger.error("CreateWait request error: " + e);
    }
    return false;
};

/**
 * callbackCreateWaitRequest.
 *
 * @private
 * @this {Webservice}
 * @param {Request}
 *            object request
 */
com.zimbra.service.Webservice.prototype._callbackCreateWaitRequest = function(request) {
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
 * @param {Number}
 *            timeout The timeout in second of the request
 *            If non 0, do a blocking request
 *            If equals to 0, run as a normal query
 *
 * @return {Boolean} true if the request was launched
 */
com.zimbra.service.Webservice.prototype.waitRequest = function(timeout) {
    try {
        if (!this._canRunQuery() || !this.isWaitSetValid()) {
            return false;
        }
        var typeReq = com.zimbra.service.REQUEST_TYPE.WAIT_NO_BLOCK;
        var block = false;
        var timeoutS = Math.ceil(this._timeoutQuery / 1000);

        if (timeout > 0) {
            typeReq = com.zimbra.service.REQUEST_TYPE.WAIT_BLOCK;
            block = true;
            timeoutS = Math.round((timeout - 1000) / 1000);
            if (timeoutS < 1) {
                timeoutS = 1;
            }
        }

        this._runningReq = this._buildQueryReq(typeReq, "/service/soap/WaitSetRequest",
                                               this._callbackWaitRequest);
        if (block === true) {
            this._runningReq.setTimeout((timeoutS + 8) * 1000);
        }
        var dataBody = '';
        dataBody += '"WaitSetRequest":{';
        dataBody +=    '"_jsns":"urn:zimbraMail",';
        dataBody +=    '"waitSet":' + JSON.stringify(this._session.waitId()) + ',';
        dataBody +=    '"seq":' + JSON.stringify(this._session.waitSeq()) + ',';
        dataBody +=    '"block":' + ((block === true) ? '1' : '0') + ',';
        dataBody +=    '"timeout":' + timeoutS + ',';
        dataBody +=    '"add":{';
        dataBody +=    '},';
        dataBody +=    '"update":{';
        dataBody +=    '},';
        dataBody +=    '"remove":{';
        dataBody +=    '}';
        dataBody += '}';
        this._runningReq.setQueryRequest(this._session, dataBody);
        return this._runningReq.send();
    }
    catch (e) {
        this._logger.error("Wait request error: " + e);
    }
    return false;
};

/**
 * callbackWaitRequest.
 *
 * @private
 * @this {Webservice}
 * @param {Request}
 *            object request
 */
com.zimbra.service.Webservice.prototype._callbackWaitRequest = function(request) {
    var isOk = false;
    var newEvent = false;
    var blockingReq = true;
    try {
        if (request !== this._runningReq) {
            this._logger.error("The running Wait request != callback object");
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
                if (request.typeRequest === com.zimbra.service.REQUEST_TYPE.WAIT_NO_BLOCK) {
                    blockingReq = false;
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
 */
com.zimbra.service.Webservice.prototype.searchUnReadMsg = function() {
    try {
        if (!this._canRunQuery()) {
            return false;
        }
        this._runningReq = this._buildQueryReq(com.zimbra.service.REQUEST_TYPE.UNREAD_MSG,
                                               "/service/soap/SearchRequest",
                                               this._callbackUnreadMsgRequest);
        var dataBody = '';
        dataBody += '"SearchRequest":{';
        dataBody +=    '"_jsns":"urn:zimbraMail",';
        dataBody +=    '"query":{';
        dataBody +=       '"_content":"is:unread"';
        dataBody +=    '}';
        dataBody += '}';
        this._runningReq.setQueryRequest(this._session, dataBody);
        return this._runningReq.send();
    }
    catch (e) {
        this._logger.error("UnreadMsg request error: " + e);
    }
    return false;
};

/**
 * callbackUnreadMsgRequest.
 *
 * @private
 * @this {Webservice}
 * @param {Request}
 *            object request
 */
com.zimbra.service.Webservice.prototype._callbackUnreadMsgRequest = function(request) {
    var isOk = false;
    var messages = [];
    try {
        if (request !== this._runningReq) {
            this._logger.error("The running UnreadMsg request != callback object");
        }
        if (request.isSuccess()) {
            var jsonResponse = request.jsonResponse();
            if (jsonResponse && jsonResponse.Body) {
                var content = jsonResponse.Body.SearchResponse.c;
                if (content) {
                    for (var index = content.length - 1; index >= 0; index--) {
                        var currMsg = content[index];
                        var msg = new com.zimbra.domain.Message(currMsg.id, currMsg.d, currMsg.su,
                                                                currMsg.fr, currMsg.e[currMsg.e.length-1].a,
                                                                currMsg.m);
                        messages.push(msg);
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
 *
 * @this {Webservice}
 * @param {Date}
 *            startDate the start date
 * @param {Date}
 *            endDate the end date
 */
com.zimbra.service.Webservice.prototype.searchCalendar = function(startDate, endDate) {
    try {
        if (!this._canRunQuery()) {
            return false;
        }
        this._runningReq = this._buildQueryReq(com.zimbra.service.REQUEST_TYPE.CALENDAR,
                                               "/service/soap/SearchRequest",
                                               this._callbackCalendarRequest);
        var dataBody = '';
        dataBody += '"SearchRequest":{';
        dataBody +=    '"_jsns":"urn:zimbraMail",';
        dataBody +=    '"calExpandInstStart":"' + startDate.getTime() + '",';
        dataBody +=    '"calExpandInstEnd":"' + endDate.getTime() + '",';
        dataBody +=    '"types":"appointment",';
        dataBody +=    '"sortBy":"dateAsc",';
        dataBody +=    '"query":{';
        dataBody +=       '"_content":"inid:10"';
        dataBody +=    '}';
        dataBody += '}';
        this._runningReq.setQueryRequest(this._session, dataBody);
        return this._runningReq.send();
    }
    catch (e) {
        this._logger.error("Calendar request error: " + e);
    }
    return false;
};

/**
 * callbackSearchCalendarRequestSuccess.
 *
 * @private
 * @this {Webservice}
 * @param {Request}
 *            object request
 */
com.zimbra.service.Webservice.prototype._callbackCalendarRequest = function(request) {
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
                            var event = new com.zimbra.domain.CalEvent(
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
com.zimbra.service.Webservice.prototype.searchTask = function() {
    try {
        if (!this._canRunQuery()) {
            return false;
        }
        this._runningReq = this._buildQueryReq(com.zimbra.service.REQUEST_TYPE.TASK,
                                               "/service/soap/SearchRequest",
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
        return this._runningReq.send();
    }
    catch (e) {
        this._logger.error("Task request error: " + e);
    }
    return false;
};

/**
 * callbackSearchTaskRequestSuccess.
 *
 * @private
 * @this {Webservice}
 * @param {Request}
 *            object request
 */
com.zimbra.service.Webservice.prototype._callbackTaskRequest = function(request) {
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
                            var task = new com.zimbra.domain.Task(currTask.name, currTask.d,
                                                                  currTask.percentComplete,
                                                                  currTask.priority);
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
com.zimbra.service.Webservice.prototype._callbackFailed = function(request) {
    try {
        var status = request.status;
        switch (status)
        {
            case com.zimbra.service.REQUEST_STATUS.AUTH_REQUIRED:
                this._session.markTokenExpired();
                this._parent.callbackSessionInfoChanged(this._session);
                break;

            case com.zimbra.service.REQUEST_STATUS.WAITSET_INVALID:
                this._session.updateWaitSet('', '');
                this._parent.callbackSessionInfoChanged(this._session);
                break;

            case com.zimbra.service.REQUEST_STATUS.LOGIN_INVALID:
                this._session.updateToken('', '');
                this._parent.callbackSessionInfoChanged(this._session);
                break;

            case com.zimbra.service.REQUEST_STATUS.TIMEOUT:
            case com.zimbra.service.REQUEST_STATUS.SERVER_ERROR:
            case com.zimbra.service.REQUEST_STATUS.CANCELED:
            case com.zimbra.service.REQUEST_STATUS.NETWORK_ERROR:
            case com.zimbra.service.REQUEST_STATUS.REQUEST_INVALID:
                break;

            default:
                status = com.zimbra.service.REQUEST_STATUS.INTERNAL_ERROR;
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
 * @param {Number}
 *            typeReq The type of the request
 * @param {String}
 *            url The path of the url (no hostname)
 * @param {Function}
 *            callback The function to call at the end of the request
 */
com.zimbra.service.Webservice.prototype._buildQueryReq = function(typeReq, url, callback) {
    return new com.zimbra.service.Request(typeReq, this._timeoutQuery, this._session.buildUrl(url),
                                          this, callback);
};

/**
 * Check if the query can be runned
 *
 * @private
 * @this {Webservice}
 */
com.zimbra.service.Webservice.prototype._canRunQuery = function() {
    if (this._runningReq !== null) {
        this._logger.warning("A query is already running");
        return false;
    }
    if (!this._session.isTokenValid()) {
        this._logger.warning("The session is not valid");
        return false;
    }
    return true;
};
