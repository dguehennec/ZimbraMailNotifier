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
 * Creates an instance of com.zimbra.service.Webservice.
 * 
 * @constructor
 * @this {Webservice}
 * 
 */
com.zimbra.service.Webservice = function() {
    this.logger = new com.zimbra.service.Logger("Webservice");
};

/**
 * refresh Webservice informations.
 * 
 * @private
 * @this {Webservice}
 * @param {String}
 *            url url of the server
 * @param {String}
 *            data data to send to the server
 * @param {Function}
 *            callbackSuccess function to call on success
 * @param {Function}
 *            callbackError function to call on error
 */
com.zimbra.service.Webservice.prototype.post = function(url, data, callbackSuccess, callbackError) {
    this.logger.trace(url + "->" + data);
    this.url = url;
    this.data = data;

    var object = this;
    try {
        var request = new XMLHttpRequest();
        request.open("POST", url, true);
        request.withCredentials = true;
        request.timeout = 30000;
        request.onreadystatechange = function() {
            if (request.readyState === 4) {
                if (request.status === 200) {
                    if (object.isFunction(callbackSuccess)) {
                        callbackSuccess(object, request.responseText);
                    }
                } else {
                    if (object.isFunction(callbackError)) {
                        if (request.status === 0) {
                            object.logger.error(object.url + "->" + object.data + " error:request status 0");
                            callbackError(object, com.zimbra.constant.SERVER_ERROR.REQUEST);
                        } else {
                            object.logger.error(object.url + "->" + object.data + " error:request status " + request.status);
                            callbackError(object, com.zimbra.constant.SERVER_ERROR.AUTHENTIFICATION, request.status);
                        }
                    }
                }
            }
        };
        if (this.isFunction(callbackError)) {
            request.onerror = function() {
                object.logger.error(object.url + "->" + object.data + " error:request error");
                callbackError(object, com.zimbra.constant.SERVER_ERROR.REQUEST);
            };
            request.ontimeout = function() {
                object.logger.error(object.url + "->" + object.data + " error:request timeout");
                callbackError(object, com.zimbra.constant.SERVER_ERROR.TIMEOUT);
            };
        }
        request.setRequestHeader("Content-type", "application/soap+xml; charset=utf-8");
        request.setRequestHeader("Content-length", data.length);

        request.send(data);
    } catch (e) {
        this.logger.error(url + "->" + data + " error:" + e);
        callbackError(object, com.zimbra.constant.SERVER_ERROR.REQUEST, e);
    }
};

/**
 * indicate if the object is a function
 * 
 * @private
 * @this {Webservice}
 * 
 * @param {Object}
 *            object the object to test
 * @return {Boolean} true if object is a function
 */
com.zimbra.service.Webservice.prototype.isFunction = function(object) {
    return Object.prototype.toString.call(object) === '[object Function]';
};

/**
 * get authentication.
 * 
 * @this {Webservice}
 * @param {String}
 *            hostname the server hostname
 * @param {String}
 *            login the user login
 * @param {String}
 *            password the user password
 * @param {Function}
 *            parent the parent
 */
com.zimbra.service.Webservice.prototype.authRequest = function(hostname, login, password, parent) {
    this.hostname = hostname;
    this.login = login;
    this.parent = parent;
    var soapMessage = '<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">';
    soapMessage += '<soap:Header>';
    soapMessage += '<context xmlns="urn:zimbra">';
    soapMessage += '<userAgent xmlns="" name="ZimbraWebClient - FF3.0" version="7.2.0"/>';
    soapMessage += '<format xmlns="" type="js"/>';
    soapMessage += '<session/>';
    soapMessage += '</context>';
    soapMessage += '</soap:Header>';
    soapMessage += '<soap:Body>';
    soapMessage += '<AuthRequest xmlns="urn:zimbraAccount">';
    soapMessage += '<account xmlns="" by="name">' + this.xmlEscape(login) + '</account>';
    soapMessage += '<password>' + this.xmlEscape(password) + '</password>';
    soapMessage += '<prefs>';
    soapMessage += '</prefs>';
    soapMessage += '<attrs>';
    soapMessage += '</attrs>';
    soapMessage += '</AuthRequest>';
    soapMessage += '</soap:Body>';
    soapMessage += '</soap:Envelope>';
    var object = this;
    this.post(hostname + "/service/soap/AuthRequest", soapMessage, object.callbackLoginSuccess, object.callbackLoginError);
};

/**
 * callbackLoginSuccess.
 * 
 * @private
 * @this {Webservice}
 * @param {Webservice}
 *            object webservice
 * @param {String}
 *            response the response
 */
com.zimbra.service.Webservice.prototype.callbackLoginSuccess = function(object, response) {
    try {
        var jsonResponse = JSON.parse(response);
        if (jsonResponse && jsonResponse.Header && jsonResponse.Body) {
            var session = new com.zimbra.domain.Session(jsonResponse.Header.context.session.id, object.login, object.hostname, jsonResponse.Body.AuthResponse.authToken[0]._content);
            object.parent.callbackLoginSuccess(session);
            return;
        }
    } catch (e) {
        object.logger.error(object.url + "->" + object.data + " error: authentification " + e);
        object.parent.callbackError(com.zimbra.constant.SERVER_ERROR.AUTHENTIFICATION, e);
    }
};

/**
 * callbackLoginError.
 * 
 * @private
 * @this {Webservice}
 * @param {Webservice}
 *            object webservice
 * @param {String}
 *            serverError the server error
 * @param {String}
 *            error the error
 */
com.zimbra.service.Webservice.prototype.callbackLoginError = function(object, serverError, error) {
    object.parent.callbackError(serverError, error);
};

/**
 * get no operation request.
 * 
 * @this {Webservice}
 * @param {Object}
 *            session the session
 * @param {Function}
 *            parent the parent
 */
com.zimbra.service.Webservice.prototype.noOpRequest = function(session, parent) {
    this.parent = parent;

    var soapMessage = this.getTemplateRequest(session);
    var request = '<NoOpRequest xmlns="urn:zimbraMail"/>';
    soapMessage = soapMessage.replace("%REQUEST%", request);
    var object = this;
    this.post(session.hostname + "/service/soap/NoOpRequest", soapMessage, object.callbackNoOpRequestSuccess, object.callbackNoOpRequestError);
};

/**
 * callbackNoOpRequestSuccess.
 * 
 * @private
 * @this {Webservice}
 * @param {Webservice}
 *            object webservice
 * @param {String}
 *            response the response
 */
com.zimbra.service.Webservice.prototype.callbackNoOpRequestSuccess = function(object, response) {
    try {
        var jsonResponse = JSON.parse(response);
        var toRefresh = false;
        if (jsonResponse && jsonResponse.Header) {
            var notify = jsonResponse.Header.context.notify;
            if (notify && notify.length > 0) {
                toRefresh = true;
            }
        }
        object.parent.callbackNoOp(toRefresh);
    } catch (e) {
        object.logger.error(object.url + "->" + object.data + " error: noop request " + e);
        object.parent.callbackError(com.zimbra.constant.SERVER_ERROR.NOOP_REQUEST, e);
    }
};

/**
 * callbackNoOpRequestError.
 * 
 * @private
 * @this {Webservice}
 * @param {Webservice}
 *            object webservice
 * @param {String}
 *            serverError the server error
 * @param {String}
 *            error the error
 */
com.zimbra.service.Webservice.prototype.callbackNoOpRequestError = function(object, serverError, error) {
    object.parent.callbackError(com.zimbra.constant.SERVER_ERROR.NOOP_REQUEST, error);
};

/**
 * get no operation request.
 * 
 * @this {Webservice}
 * @param {Object}
 *            session the session
 * @param {Function}
 *            parent the parent
 */
com.zimbra.service.Webservice.prototype.endSession = function(session, parent) {
    this.parent = parent;
    var soapMessage = this.getTemplateRequest(session);
    var request = '<EndSessionRequest xmlns="urn:zimbraAccount"/>';
    soapMessage = soapMessage.replace("%REQUEST%", request);
    var object = this;
    this.post(session.hostname + "/service/soap/EndSessionRequest", soapMessage, object.callbackEndSessionRequestSuccess, object.callbackEndSessionRequestError);
};

/**
 * callbackNoOpRequestSuccess.
 * 
 * @private
 * @this {Webservice}
 * @param {Webservice}
 *            object webservice
 * @param {String}
 *            response the response
 */
com.zimbra.service.Webservice.prototype.callbackEndSessionRequestSuccess = function(object, response) {

};

/**
 * callbackNoOpRequestError.
 * 
 * @private
 * @this {Webservice}
 * @param {Webservice}
 *            object webservice
 * @param {String}
 *            serverError the server error
 * @param {String}
 *            error the error
 */
com.zimbra.service.Webservice.prototype.callbackEndSessionRequestError = function(object, serverError, error) {

};

/**
 * search unread message request.
 * 
 * @this {Webservice}
 * @param {Object}
 *            session the session
 * @param {Function}
 *            parent the parent
 */
com.zimbra.service.Webservice.prototype.searchUnReadMsg = function(session, parent) {
    this.parent = parent;
    var soapMessage = this.getTemplateRequest(session);
    var request = '<SearchRequest xmlns="urn:zimbraMail">';
    request += '<query>is:unread</query>';
    request += '</SearchRequest>';
    soapMessage = soapMessage.replace("%REQUEST%", request);
    var object = this;
    this.post(session.hostname + "/service/soap/SearchRequest", soapMessage, object.callbackSearchUnreadMessageRequestSuccess, object.callbackSearchRequestError);
};

/**
 * callbackSearchUnreadMessageRequestSuccess.
 * 
 * @private
 * @this {Webservice}
 * @param {Webservice}
 *            object webservice
 * @param {String}
 *            response the response
 */
com.zimbra.service.Webservice.prototype.callbackSearchUnreadMessageRequestSuccess = function(object, response) {
    try {
        var jsonResponse = JSON.parse(response);
        if (jsonResponse && jsonResponse.Body) {
            var content = jsonResponse.Body.SearchResponse.c;
            var messages = [];
            if (content) {
                for ( var index = content.length - 1; index >= 0; index--) {
                    var currentMessage = content[index];
                    var message = new com.zimbra.domain.Message(currentMessage.id, currentMessage.d, currentMessage.su, currentMessage.fr, currentMessage.e[0].a, currentMessage.m.length);
                    messages.push(message);
                }
            }
            object.parent.callbackNewMessages(messages);
        }
    } catch (e) {
        object.logger.error(object.url + "->" + object.data + " error: search request " + e);
        object.parent.callbackError(com.zimbra.constant.SERVER_ERROR.SEARCH_REQUEST, e);
    }
};

/**
 * search calendar request.
 * 
 * @this {Webservice}
 * @param {Object}
 *            session the session
 * @param {Function}
 *            parent the parent
 * @param {Date}
 *            startDate the start date
 * @param {Date}
 *            endDate the end date
 */
com.zimbra.service.Webservice.prototype.searchCalendar = function(session, parent, startDate, endDate) {
    this.parent = parent;
    var soapMessage = this.getTemplateRequest(session);
    var request = '<SearchRequest xmlns="urn:zimbraMail" calExpandInstStart="' + startDate.getTime() + '" calExpandInstEnd="' + endDate.getTime() + '" types="appointment" sortBy="dateAsc">';
    request += '<query>inid:10</query>';
    request += '</SearchRequest>';
    soapMessage = soapMessage.replace("%REQUEST%", request);
    var object = this;
    this.post(session.hostname + "/service/soap/SearchRequest", soapMessage, object.callbackSearchCalendarRequestSuccess, object.callbackSearchRequestError);
};

/**
 * callbackSearchCalendarRequestSuccess.
 * 
 * @private
 * @this {Webservice}
 * @param {Webservice}
 *            object webservice
 * @param {String}
 *            response the response
 */
com.zimbra.service.Webservice.prototype.callbackSearchCalendarRequestSuccess = function(object, response) {
    try {
        var jsonResponse = JSON.parse(response);
        if (jsonResponse && jsonResponse.Body) {
            var content = jsonResponse.Body.SearchResponse.appt;
            var events = [];
            if (content) {
                for ( var index = content.length - 1; index >= 0; index--) {
                    if (content[index].inst && content[index].inst.length > 0) {
                        var event = new com.zimbra.domain.CalEvent(content[index].uid, content[index].name, content[index].inst[0].s, content[index].dur, 0);
                        if (content[index].alarmData && content[index].alarmData.length > 0) {
                            var currentEvent = content[index].alarmData[0];
                            // get time conf
                            if (currentEvent.alarm && currentEvent.alarm.length > 0 && currentEvent.alarm[0].trigger && currentEvent.alarm[0].trigger.length > 0
                                    && currentEvent.alarm[0].trigger[0].rel && currentEvent.alarm[0].trigger[0].rel.length > 0) {
                                event.timeConf = currentEvent.alarm[0].trigger[0].rel[0].m;
                            }
                        }
                        events.push(event);
                    }
                }
            }
            object.parent.callbackCalendar(events);
        }
    } catch (e) {
        object.logger.error(object.url + "->" + object.data + " error: search request " + e);
        object.parent.callbackError(com.zimbra.constant.SERVER_ERROR.SEARCH_REQUEST, e);
    }
};

/**
 * search task request.
 * 
 * @this {Webservice}
 * @param {Object}
 *            session the session
 * @param {Function}
 *            parent the parent
 */
com.zimbra.service.Webservice.prototype.searchTask = function(session, parent) {
    this.parent = parent;
    var soapMessage = this.getTemplateRequest(session);
    var request = '<SearchRequest xmlns="urn:zimbraMail" allowableTaskStatus="NEED,INPR,WAITING,DEFERRED" types="task" sortBy="taskDueAsc">';
    request += '<query>in:tasks</query>';
    request += '</SearchRequest>';
    soapMessage = soapMessage.replace("%REQUEST%", request);
    var object = this;
    this.post(session.hostname + "/service/soap/SearchRequest", soapMessage, object.callbackSearchTaskRequestSuccess, object.callbackSearchRequestError);
};

/**
 * callbackSearchTaskRequestSuccess.
 * 
 * @private
 * @this {Webservice}
 * @param {Webservice}
 *            object webservice
 * @param {String}
 *            response the response
 */
com.zimbra.service.Webservice.prototype.callbackSearchTaskRequestSuccess = function(object, response) {
    try {
        var jsonResponse = JSON.parse(response);
        if (jsonResponse && jsonResponse.Body) {
            var content = jsonResponse.Body.SearchResponse.task;
            var tasks = [];
            if (content) {
                for ( var index = content.length - 1; index >= 0; index--) {
                    if (content[index].inst && content[index].inst.length > 0) {
                        var currentTask = content[index];
                        var task = new com.zimbra.domain.Task(currentTask.name, currentTask.d, currentTask.percentComplete, currentTask.priority);
                        tasks.push(task);
                    }
                }
            }
            tasks.sort(function(a, b) {
                if (a.priority === b.priority) {
                    return a.date - b.date;
                } else {
                    return a.priority - b.priority;
                }
            });
            object.parent.callbackTask(tasks);
        }
    } catch (e) {
        object.logger.error(object.url + "->" + object.data + " error: search request " + e);
        object.parent.callbackError(com.zimbra.constant.SERVER_ERROR.SEARCH_REQUEST, e);
    }
};

/**
 * callbackSearchRequestError.
 * 
 * @private
 * @this {Webservice}
 * @param {Webservice}
 *            object webservice
 * @param {String}
 *            serverError the server error
 * @param {String}
 *            error the error
 */
com.zimbra.service.Webservice.prototype.callbackSearchRequestError = function(object, serverError, error) {
    object.parent.callbackError(com.zimbra.constant.SERVER_ERROR.SEARCH_REQUEST, error);
};

/**
 * getTemplateRequest.
 * 
 * @private
 * @this {Webservice}
 * @param {Webservice}
 *            session the session
 * @return {String} the request template
 */
com.zimbra.service.Webservice.prototype.getTemplateRequest = function(session) {
    var soapMessage = '<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">';
    soapMessage += '<soap:Header>';
    soapMessage += '<context xmlns="urn:zimbra">';
    soapMessage += '<userAgent xmlns="" name="ZimbraWebClient - FF3.0" version="7.2.0"/>';
    soapMessage += '<session xmlns="" id="' + this.xmlEscape(session.id) + '"/>';
    soapMessage += '<account xmlns="" by="name">' + this.xmlEscape(session.user) + '</account>';
    soapMessage += '<format xmlns="" type="js"/>';
    soapMessage += '<authToken xmlns="">' + this.xmlEscape(session.token) + '</authToken>';
    soapMessage += '</context>';
    soapMessage += '</soap:Header>';
    soapMessage += '<soap:Body>';
    soapMessage += '%REQUEST%';
    soapMessage += '</soap:Body>';
    soapMessage += '</soap:Envelope>';
    return soapMessage;
};

/**
 * xmlEscape. escape SGML/XML metacharacters
 * 
 * @private
 * @this {Webservice}
 * @param {String}
 *            parameter the parameter to escape
 * @return {String} the parameter escaped
 */
com.zimbra.service.Webservice.prototype.xmlEscape = function(parameter) {
    if (parameter && parameter.length > 0) {
        var entities = {
            "&" : "&amp;",
            '"' : "&quot;",
            "'" : "&apos;",
            ">" : "&gt;",
            "<" : "&lt;"
        };
        var escape_parameter = "";
        for ( var index = 0; index < parameter.length; index++) {
            var currentChar = parameter[index];
            if (entities[currentChar]) {
                escape_parameter += entities[currentChar];
            } else {
                escape_parameter += currentChar;
            }
        }
        return escape_parameter;
    }
    return parameter;
};