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
 * Benjamin ROBIN
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

Components.utils.import("resource://zimbra_mail_notifier/service/logger.jsm");

const EXPORTED_SYMBOLS = ["zimbra_notifier_REQUEST_STATUS", "zimbra_notifier_Request"];

/**
 *
 * Request status
 *
 * @constant
 *
 */
const zimbra_notifier_REQUEST_STATUS = {
    NOT_STARTED : -2,
    RUNNING : -1,
    NO_ERROR : 0,
    INTERNAL_ERROR : 1,
    CANCELED : 2,
    TIMEOUT : 3,
    SERVER_ERROR : 4,
    NETWORK_ERROR : 5,
    AUTH_REQUIRED : 6,
    LOGIN_INVALID : 7,
    WAITSET_INVALID : 8,
    REQUEST_INVALID : 9
};

/**
 * Creates an instance of zimbra_notifier_Request.
 *
 * @constructor
 * @this {Request}
 * @param {Number}
 *            typeRequest The type of the request
 * @param {Number}
 *            timeout The timeout in ms
 * @param {String}
 *            url The url of the server with the scheme and hostname
 * @param {Object}
 *            objCallback The object to use as the context of the callback
 * @param {Function}
 *            callback function to call at the end of the request
 */
const zimbra_notifier_Request = function(typeRequest, timeout, url, objCallback, callback, anonymous) {
    this._logger = new zimbra_notifier_Logger("Request");
    this.status = zimbra_notifier_REQUEST_STATUS.NOT_STARTED;
    this.errorInfo = null;
    this.typeRequest = typeRequest;
    this._timeout = timeout;
    this._url = url;
    this._objCallback = objCallback;
    this._callback = callback;
    this._anonymous = anonymous;
    this._dataToSend = null;
    this._dataRcv = null;
    this._request = null;
};

/**
 * Set the timeout of the request
 *
 * @this {Request}
 * @param {Number}
 *            timeoutMs The timeout in ms of the request
 */
zimbra_notifier_Request.prototype.setTimeout = function(timeoutMs) {
    if (this.status === zimbra_notifier_REQUEST_STATUS.NOT_STARTED) {
        this._timeout = timeoutMs;
    }
    else {
        this._logger.error("Trying to change the timeout of a already started request");
    }
};

/**
 * Set the data sent
 *
 * @this {Request}
 * @param {String}
 *            data The raw data sent to the server
 */
zimbra_notifier_Request.prototype.setDataRequest = function(data) {
    this._dataToSend = data;
};

/**
 * Build the SOAP message and set the data as a result
 *
 * @this {Request}
 * @param {String}
 *            dataHeader The data to add inside the SOAP header
 * @param {String}
 *            dataBody The data to add inside the SOAP body
 */
zimbra_notifier_Request.prototype.setSoapMessage = function(dataHeader, dataBody) {
    var soapMsg = '';
    soapMsg += '{';
    soapMsg +=    '"Header":{';
    soapMsg +=       '"context":{';
    soapMsg +=          '"_jsns":"urn:zimbra",';
    soapMsg +=          '"format":{';
    soapMsg +=             '"type":"js"';
    soapMsg +=          '},';
    soapMsg +=          '"nosession":{';
    soapMsg +=          '}';
    soapMsg +=          dataHeader;
    soapMsg +=       '}';
    soapMsg +=    '},';
    soapMsg +=    '"Body":{';
    soapMsg +=        dataBody;
    soapMsg +=    '}';
    soapMsg += '}';

    this.setDataRequest(soapMsg);
};

/**
 * Build the SOAP message with a valid session and set the data as a result
 *
 * @this {Request}
 * @param {Session}
 *            session The session information
 * @param {String}
 *            dataBody The data to add inside the SOAP body
 */
zimbra_notifier_Request.prototype.setQueryRequest = function(session, dataBody) {
    var dataHeader = ',';
    dataHeader += '"account":{';
    dataHeader +=     '"_content":' + JSON.stringify(session.user()) + ',';
    dataHeader +=     '"by":"name"';
    if (session.token()) {
        dataHeader += '},';
        dataHeader += '"authToken":{';
        dataHeader +=     '"_content":' + JSON.stringify(session.token());
    }
    dataHeader += '}';

    this.setSoapMessage(dataHeader, dataBody);
};

/**
 * Build the SOAP message to login and set the data as a result
 *
 * @this {Request}
 * @param {String}
 *            login The username/login
 * @param {String}
 *            password The password
 */
zimbra_notifier_Request.prototype.setAuthRequest = function(login, password) {
    var dataBody = '';
    dataBody += '"AuthRequest":{';
    dataBody +=    '"_jsns":"urn:zimbraAccount",';
    dataBody +=    '"account":{';
    dataBody +=       '"_content":' + JSON.stringify(login) + ',';
    dataBody +=       '"by":"name"';
    dataBody +=    '},';
    dataBody +=    '"password":{';
    dataBody +=       '"_content":' + JSON.stringify(password);
    dataBody +=    '},';
    dataBody +=    '"prefs":{';
    dataBody +=    '},';
    dataBody +=    '"attrs":{';
    dataBody +=    '}';
    dataBody += '}';

    this.setSoapMessage('', dataBody);
};

/**
 * Check if the request is started
 *
 * @this {Request}
 */
zimbra_notifier_Request.prototype.isStarted = function() {
    return this.status !== zimbra_notifier_REQUEST_STATUS.NOT_STARTED;
};

/**
 * Check if the request is currently running
 *
 * @this {Request}
 */
zimbra_notifier_Request.prototype.isRunning = function() {
    return this._dataRcv === null && this.status === zimbra_notifier_REQUEST_STATUS.RUNNING;
};

/**
 * Check if the request is finished : started and not currently running
 *
 * @this {Request}
 */
zimbra_notifier_Request.prototype.isFinished = function() {
    return this.status >= zimbra_notifier_REQUEST_STATUS.NO_ERROR;
};

/**
 * Check if the request is a success
 *
 * @this {Request}
 */
zimbra_notifier_Request.prototype.isSuccess = function() {
    return this.status === zimbra_notifier_REQUEST_STATUS.NO_ERROR;
};

/**
 * Parse the response and return the JSON object
 *
 * @this {Request}
 */
zimbra_notifier_Request.prototype.jsonResponse = function() {
    try {
        var jsonResponse = JSON.parse(this._dataRcv);
        if (jsonResponse) {
            return jsonResponse;
        }
    }
    catch (e) {
        this._logger.error("Invalid JSON: \n" + this._dataRcv + "\n : " + e);
    }
    return null;
};

/**
 * Send the request
 *
 * @private
 * @this {Request}
 */
zimbra_notifier_Request.prototype.send = function() {
    var object = this;

    if (this.isStarted() || this._dataRcv !== null || this._request !== null) {
        this._logger.error("The request was already sent");
        return false;
    }
    try {
        var request = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance();
        request.QueryInterface(Components.interfaces.nsIDOMEventTarget);
        request.QueryInterface(Components.interfaces.nsIXMLHttpRequest);

        request.open("POST", this._url, true);
        request.withCredentials = true;
        request.timeout = this._timeout;
        if (this._anonymous) {
            request.channel.loadFlags |= Components.interfaces.nsIRequest.LOAD_ANONYMOUS;
        }

        request.addEventListener("loadend", function() {

            if (object._request !== null) {
                object._dataRcv = request.responseText;
                object._logger.trace("Response (" + request.status + "): \n" + object._dataRcv + "\n");

                if (request.status === 200) {
                    object.status = zimbra_notifier_REQUEST_STATUS.NO_ERROR;
                }
                else if (request.status === 0) {
                    object._logger.error("Error network : " + object._url + " ->\n" + object._dataToSend + "\n");
                    object.status = zimbra_notifier_REQUEST_STATUS.NETWORK_ERROR;
                }
                else {
                    object._logger.error("Error, status: " + request.status + " : " + object._url +
                                        " ->\n" + object._dataToSend + "\n");
                    object.status = zimbra_notifier_REQUEST_STATUS.SERVER_ERROR;
                    object._setErrorInfo(request.status);
                }

                object._runCallback();
                object._request = null;
            }
        }, false);

        request.addEventListener("timeout", function() {

            if (object._request !== null) {
                object._logger.warning("Request timeout: " + object._url + " ->\n" + object._dataToSend + "\n");
                object.status = zimbra_notifier_REQUEST_STATUS.TIMEOUT;
                object._runCallback();
                object._request = null;
            }
        }, false);

        this._request = request;
        this._setInfoRequest();

        this.status = zimbra_notifier_REQUEST_STATUS.RUNNING;
        this._logger.trace("Send : " + this._url + " ->\n" + this._dataToSend + "\n");
        request.send(this._dataToSend);

        return true;
    }
    catch (e) {
        this._logger.error(this._url + " -> \n" + this._dataToSend + "\n> error: " + e);
        this.status = zimbra_notifier_REQUEST_STATUS.INTERNAL_ERROR;
        this._runCallback();
        this._request = null;
    }
    return false;
};

/**
 * Set the header of the request.
 * Separate funtion to be able to override it
 *
 * @private
 * @this {Request}
 */
zimbra_notifier_Request.prototype._setInfoRequest = function() {

    this._request.setRequestHeader("Content-type", "application/soap+xml; charset=utf-8");
    this._request.setRequestHeader("Content-length", this._dataToSend.length);
};

/**
 * Abort/cancel the request
 *
 * @private
 * @this {Request}
 */
zimbra_notifier_Request.prototype.abort = function() {
    if (this._request !== null) {
        this.status = zimbra_notifier_REQUEST_STATUS.CANCELED;
        var req = this._request;
        this._request = null;
        req.abort();
    }
};

/**
 * Run the registered callback
 *
 * @private
 * @this {Request}
 */
zimbra_notifier_Request.prototype._runCallback = function() {
    try {
        if (this._callback !== null && this._objCallback !== null) {
            this._callback.call(this._objCallback, this);
        }
    }
    catch (e) {
        this._logger.error("Fail to run callback: " + e);
    }
};

/**
 * Find the error code and get the description of the error
 *
 * @private
 * @this {Request}
 * @param {Number}
 *            reqStatus The request status code
 */
zimbra_notifier_Request.prototype._setErrorInfo = function(reqStatus) {
    try {
        var jsonR = this.jsonResponse();
        if (jsonR && jsonR.Body && jsonR.Body.Fault && jsonR.Body.Fault.Detail) {
            var zimbraErrCode = jsonR.Body.Fault.Detail.Error.Code;
            this.status = this._findStatusFromZimbraErrorCode(zimbraErrCode);
            this.errorInfo = zimbraErrCode + " : " + jsonR.Body.Fault.Reason.Text + " (" + reqStatus + ")";
            this._logger.error("Reason: " + this.errorInfo);
            return true;
        }
    }
    catch (e) {
        this._logger.error("Fail set error info: " + e);
    }
    return false;
};

/**
 * Find the request status code from the zimbra error code
 *
 * @private
 * @this {Request}
 * @return {Number} Status request code
 */
zimbra_notifier_Request.prototype._findStatusFromZimbraErrorCode = function(zimbraCode) {
    if (!zimbraCode) {
        zimbraCode = '';
    }
    switch (zimbraCode) {
        // Network
        case 'service.TOO_MANY_HOPS':
        case 'service.WRONG_HOST': // operation is sent to a wrong host
        case 'service.PROXY_ERROR': // unable to proxy operation
        case 'mail.TRY_AGAIN':
            return zimbra_notifier_REQUEST_STATUS.NETWORK_ERROR;

        // Auth required
        case 'service.PERM_DENIED': // permission denied
        case 'service.AUTH_REQUIRED': // an authtoken is required
        case 'service.AUTH_EXPIRED': // authentication creds have expired
            return zimbra_notifier_REQUEST_STATUS.AUTH_REQUIRED;

        // Login invalid
        case 'account.AUTH_FAILED': // bad account/password
        case 'account.CHANGE_PASSWORD': // password must be changed
        case 'account.NO_SUCH_ACCOUNT':
        case 'account.NO_SUCH_ALIAS':
        case 'account.MULTIPLE_ACCOUNTS_MATCHED':
            return zimbra_notifier_REQUEST_STATUS.LOGIN_INVALID;

        // Wait set invalid
        case 'mail.NO_SUCH_WAITSET':
        case 'admin.NO_SUCH_WAITSET':
            return zimbra_notifier_REQUEST_STATUS.WAITSET_INVALID;

        // Invalid request
        case 'service.INVALID_REQUEST': // bad request (missing args, etc)
        case 'service.UNKNOWN_DOCUMENT': // no handler for specified document
        case 'service.PARSE_ERROR': // XML parsing error
        case 'mail.QUERY_PARSE_ERROR': // couldn't parse search query
        case 'mail.INVALID_ID':
        case 'mail.INVALID_SYNC_TOKEN':
        case 'mail.INVALID_NAME':
        case 'mail.INVALID_TYPE':
        case 'mail.INVALID_CONTENT_TYPE':
        case 'mail.WRONG_MAILBOX':
            return zimbra_notifier_REQUEST_STATUS.REQUEST_INVALID;

        // Server error
        case 'service.FAILURE': // generic system failure
        case 'mail.MAINTENANCE': // in maintenance
        default:
            return zimbra_notifier_REQUEST_STATUS.SERVER_ERROR;
    }
    return zimbra_notifier_REQUEST_STATUS.INTERNAL_ERROR;
};
