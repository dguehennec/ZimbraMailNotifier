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

Components.utils.import("resource://zimbra_mail_notifier/constant/zimbrahelper.jsm");
Components.utils.import("resource://zimbra_mail_notifier/service/logger.jsm");
Components.utils.import("resource://zimbra_mail_notifier/service/util.jsm");
Components.utils.import("resource://zimbra_mail_notifier/domain/session.jsm");
Components.utils.import("resource://zimbra_mail_notifier/service/request.jsm");
Components.utils.import("resource://zimbra_mail_notifier/service/webservices.jsm");

const EXPORTED_SYMBOLS = ["zimbra_notifier_WebserviceFree"];

/********************** Session **********************/

/**
 * Creates an instance of a Free Session.
 *
 * @constructor
 * @this {SessionFree}
 */
const zimbra_notifier_SessionFree = function() {
    this.clear();
};
zimbra_notifier_Util.extend(zimbra_notifier_Session, zimbra_notifier_SessionFree);

/**
 * Clear the session
 *
 * @this {SessionFree}
 */
zimbra_notifier_SessionFree.prototype.clear = function() {
    this._super.clear.call(this);
    this._sid = '';
};

/**
 * Check if the Session is valid
 *
 * @this {SessionFree}
 */
zimbra_notifier_SessionFree.prototype.isTokenValid = function() {
    return this._super.isTokenValid.call(this) && this._sid.length > 0;
};

/**
 * Update the authentication token
 *
 * @this {SessionFree}
 */
zimbra_notifier_SessionFree.prototype.updateToken = function(token, lifetime, sid) {
    token = this._valToStr(token);
    if (token === 'null') {
        token = '';
    }
    this._super.updateToken.call(this, token, lifetime);

    if (this._token.length > 0) {
        this._sid = this._valToStr(sid);
        if (this._sid === 'null') {
            this._sid = '';
        }
    }
    else {
        this._sid = '';
    }
};

/**
 * Get an array of required authentication cookies
 *
 * @this {SessionFree}
 * @return {Object[]} Cookies
 */
zimbra_notifier_SessionFree.prototype.getAuthCookies = function() {
    var cookies = [];
    cookies.push({ key: 'ZM_AUTH_TOKEN', val: this._token});
    cookies.push({ key: 'SID', val: this._sid});
    return cookies;
};


/********************** Request **********************/

/**
 * Creates an instance of a Free Request.
 *
 * @constructor
 * @this {RequestFree}
 */
const zimbra_notifier_RequestFree = function(typeRequest, timeout, url, objCallback, callback, anonymous) {
    this._super.constructor.call(this, typeRequest, timeout, url, objCallback, callback, anonymous);
};
zimbra_notifier_Util.extend(zimbra_notifier_Request, zimbra_notifier_RequestFree);

/**
 * Find the error from HTML source code
 *
 * @private
 * @this {RequestFree}
 */
zimbra_notifier_RequestFree.prototype._setErrorInfoFree = function(reqStatus) {
    if (this._dataRcv) {
        if (this._dataRcv.search("mot de passe incorrect") > 0 ||
            this._dataRcv.search("CONNEXION AU WEBMAIL ZIMBRA") > 0) {

            this.status = zimbra_notifier_REQUEST_STATUS.LOGIN_INVALID;
            this.errorInfo =  "Free: LOGIN_INVALID (" + reqStatus + ")";
            this._logger.error("Reason: " + this.errorInfo);
            return true;
        }
        else if (reqStatus === 404 || this._dataRcv.search("S'identifier") > 0) {

            this.status = zimbra_notifier_REQUEST_STATUS.AUTH_REQUIRED;
            this.errorInfo =  "Free: AUTH_REQUIRED (" + reqStatus + ")";
            this._logger.error("Reason: " + this.errorInfo);
            return true;
        }
    }
    return false;
};

/**
 * Find the error code and get the description of the error
 *
 * @private
 * @this {RequestFree}
 */
zimbra_notifier_RequestFree.prototype._setErrorInfo = function(reqStatus) {
    if (this._super._setErrorInfo.call(this, reqStatus)) {
        return true;
    }
    return this._setErrorInfoFree(reqStatus);
};

/**
 * Set the cookies
 *
 * @private
 * @this {RequestFree}
 */
zimbra_notifier_RequestFree.prototype._setInfoRequest = function() {
    this._super._setInfoRequest.call(this);
    var session = this._objCallback._session;
    this.addCookieToRequestHeader('ZM_AUTH_TOKEN', session.token());
    this.addCookieToRequestHeader('SID', session._sid);
};

/********************** Webservice **********************/

/**
 * Creates an instance of WebserviceFree.
 *
 * @constructor
 * @this {WebserviceFree}
 */
const zimbra_notifier_WebserviceFree = function(timeoutQuery, timeoutWait, parent) {
    this._super.constructor.call(this, timeoutQuery, timeoutWait, parent);
    this._logger._name += 'Free';
};
zimbra_notifier_Util.extend(zimbra_notifier_Webservice, zimbra_notifier_WebserviceFree);

/**
 * Create a new session object
 *
 * @this {WebserviceFree}
 */
zimbra_notifier_WebserviceFree.prototype.createSession = function() {
    return new zimbra_notifier_SessionFree();
};

/**
 * Get authentication.
 *
 * @this {WebserviceFree}
 */
zimbra_notifier_WebserviceFree.prototype.authRequest = function(urlWebService, login, password) {
    var typeReq = zimbra_notifier_REQUEST_TYPE.CONNECT;
    this._launchQuery(typeReq, false, false, function() {

        this.infoAuthUpdated(urlWebService, login);
        this._runningReq = this._buildQueryReq(typeReq, "/zimbra.pl", this._callbackAuthRequest);

        this._runningReq._expectedStatus = 0;
        this._runningReq._setInfoRequest = function() {
            this._request.channel.redirectionLimit = 1;
            this._request.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        };

        var dataReq = "actionID=105&url=&mailbox=INBOX";
        dataReq += "&login=" + encodeURIComponent(login);
        dataReq += "&password=" + encodeURIComponent(password);
        dataReq += "&Envoyer=S%27identifier";

        this._runningReq.setDataRequest(dataReq);
        return true;
    });
};

/**
 * callbackAuthRequest.
 *
 * @private
 * @this {Webservice}
 */
zimbra_notifier_WebserviceFree.prototype._callbackAuthRequest = function(request) {
    var isOk = false;
    try {
        if (request !== this._runningReq) {
            this._logger.error("The running auth request != callback object");
        }
        if (request.isSuccess()) {
            var cookies = request.getCookieFromResponseHeader();
            this._session.updateToken(cookies['ZM_AUTH_TOKEN'], 43200000, cookies['SID']);
            this._parent.callbackSessionInfoChanged(this._session);
            isOk = this._session.isTokenValid();
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
 * Inform the parent of the failure
 *
 * @private
 * @this {WebserviceFree}
 */
zimbra_notifier_WebserviceFree.prototype._callbackFailed = function(request) {
    if (request.status === zimbra_notifier_REQUEST_STATUS.NO_ERROR) {
        request._setErrorInfoFree(200);
    }
    this._super._callbackFailed.call(this, request);
};

/**
 * Create the request
 *
 * @private
 * @this {WebserviceFree}
 */
zimbra_notifier_WebserviceFree.prototype._buildQueryReq = function(typeReq, url, callback) {
    return new zimbra_notifier_RequestFree(typeReq, this._timeoutQuery,
                                           this._session.buildUrl(url), this, callback);
};
