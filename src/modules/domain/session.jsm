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

var EXPORTED_SYMBOLS = ["zimbra_notifier_Session"];

/**
 * Creates an instance of Session.
 *
 * @constructor
 * @this {Session}
 */
var zimbra_notifier_Session = function() {
    this.clear();
};

/**
 * Clear the information about this session
 *
 * @this {Session}
 */
zimbra_notifier_Session.prototype.clear = function() {
    this._user = '';
    this._urlWebService = '';

    this._token = '';
    this._tokenExpirationTime = new Date();

    this._waitId = '';
    this._waitSeq = '';
};

/**
 * Get the token
 *
 * @this {Session}
 * @return {String} The token
 */
zimbra_notifier_Session.prototype.token = function() {
    return this._token;
};

/**
 * Get the username
 *
 * @this {Session}
 * @return {String} The user to login
 */
zimbra_notifier_Session.prototype.user = function() {
    return this._user;
};

/**
 * Get the wait set id
 *
 * @this {Session}
 * @return {String} The wait set id
 */
zimbra_notifier_Session.prototype.waitId = function() {
    return this._waitId;
};

/**
 * Get the wait set sequence
 *
 * @this {Session}
 * @return {String} The wait set sequence
 */
zimbra_notifier_Session.prototype.waitSeq = function() {
    return this._waitSeq;
};

/**
 * Build the full url to query the server
 *
 * @this {Session}
 * @param {String}
 *           baseUrl  The path of the url
 * @return {String} The full url with the scheme, hostname and path
 */
zimbra_notifier_Session.prototype.buildUrl = function(baseUrl) {
    if (this._urlWebService.length > 0) {
        return this._urlWebService + baseUrl;
    }
    return '';
};

/**
 * Update the login information
 *
 * @this {Session}
 * @param {String}
 *            user  The username
 * @param {String}
 *            urlWebService The URL of the webservice to login to
 * @param {Boolean}
 *            clearSession True if we need to clear the session if the information changed
 *
 * @return {Boolean} True if changed
 */
zimbra_notifier_Session.prototype.updateLoginInfo = function(urlWebService, user, clearSession) {
    var changed = false;

    urlWebService = this._valToStr(urlWebService);
    user = this._valToStr(user);

    if (user.length > 0 && urlWebService.length > 0) {

        if (urlWebService.lastIndexOf('/') === urlWebService.length - 1) {
            urlWebService = urlWebService.slice(0, -1);
        }
        if (this._user !== user || this._urlWebService !== urlWebService) {
            changed = true;
        }
    }
    else {
        if (this._user.length > 0 || this._urlWebService.length > 0) {
            changed = true;
        }
        user = '';
        urlWebService = '';
    }

    if (changed === true && clearSession) {
        this.clear();
    }

    this._user = user;
    this._urlWebService = urlWebService;

    return changed;
};

/**
 * Check if the Session is valid
 *
 * @this {Session}
 * @return {Boolean} true if the token and the associated info are valid
 */
zimbra_notifier_Session.prototype.isTokenValid = function() {
    return this._user.length > 0 && this._urlWebService.length > 0 &&
           this._token.length > 0 && this._tokenExpirationTime > new Date();
};

/**
 * Update the authentication token
 *
 * @this {Session}
 * @param {String}
 *            token  The new authentication token
 * @param {Number}
 *            lifetime The expiration time in ms
 */
zimbra_notifier_Session.prototype.updateToken = function(token, lifetime) {

    token = this._valToStr(token);

    if (token.length > 0 && lifetime) {
        var expDate = new Date();
        expDate.setTime(expDate.getTime() + lifetime - 1000);

        this._tokenExpirationTime = expDate;
        this._token = token;
    }
    else {
        this._tokenExpirationTime = new Date(0);
        this._token = '';
    }
};

/**
 * Inform that the current token is expired, do not delete the token,
 * just change the expiration date
 *
 * @this {Session}
 */
zimbra_notifier_Session.prototype.markTokenExpired = function() {
    this._tokenExpirationTime = new Date(0);
};

/**
 * Check if the token expiration date
 *
 * @this {Session}
 * @return {Boolean} True if the token is going to be non valid soon
 */
zimbra_notifier_Session.prototype.isTokenGoingToExp = function() {
    var timeExp = this._tokenExpirationTime.getTime() - zimbra_notifier_Constant.SESSION.TOKEN_LIFETIME_EXPIR;
    if (new Date().getTime() > timeExp) {
        return true;
    }
    return false;
};

/**
 * Check if the WaitSet is valid
 *
 * @this {Session}
 * @return {Boolean} true the WaitSet is valid
 */
zimbra_notifier_Session.prototype.isWaitSetValid = function() {
    return this._waitId.length > 0 && this._waitSeq.length > 0;
};

/**
 * Update the wait set information
 *
 * @this {Session}
 * @param {String}
 *            id  The waitSet id
 * @param {Number}
 *            seq The waitSet sequence
 * @return {Boolean} True if changed
 */
zimbra_notifier_Session.prototype.updateWaitSet = function(id, seq) {
    var changed = false;

    id = this._valToStr(id);
    seq = this._valToStr(seq);

    if (id.length > 0 && seq.length > 0) {

        if (this._waitId !== id || this._waitSeq !== seq) {
            changed = true;
        }
        this._waitId = id;
        this._waitSeq = seq;
    }
    else {
        if (this._waitId.length > 0 || this._waitSeq.length > 0) {
            changed = true;
        }
        this._waitId = '';
        this._waitSeq = '';
    }
    return changed;
};

/**
 * Get an array of required authentication cookies
 *
 * @this {Session}
 * @return {Object[]} Cookies
 */
zimbra_notifier_Session.prototype.getAuthCookies = function() {
    var cookies = [];
    cookies.push({ key: 'ZM_AUTH_TOKEN', val: this._token});
    return cookies;
};

/**
 * Get the value as string
 *
 * @this {Session}
 * @param {String|Number|null}
 *            val  The value
 * @return {Boolean} True if changed
 */
zimbra_notifier_Session.prototype._valToStr = function(val) {
    if (!val && val !== 0) {
        return '';
    }
    return '' + val;
};
