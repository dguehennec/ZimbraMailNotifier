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
if (!com.zimbra.domain) {
    com.zimbra.domain = {};
}

/**
 * Creates an instance of Session.
 *
 * @constructor
 * @this {Session}
 */
com.zimbra.domain.Session = function() {
    this.clear();
};

/**
 * Clear the information about this session
 *
 * @this {Session}
 */
com.zimbra.domain.Session.prototype.clear = function() {
    this._user = '';
    this._hostname = '';

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
com.zimbra.domain.Session.prototype.token = function() {
    return this._token;
};

/**
 * Get the username
 *
 * @this {Session}
 * @return {String} The user to login
 */
com.zimbra.domain.Session.prototype.user = function() {
    return this._user;
};

/**
 * Get the wait set id
 *
 * @this {Session}
 * @return {String} The wait set id
 */
com.zimbra.domain.Session.prototype.waitId = function() {
    return this._waitId;
};

/**
 * Get the wait set sequence
 *
 * @this {Session}
 * @return {String} The wait set sequence
 */
com.zimbra.domain.Session.prototype.waitSeq = function() {
    return this._waitSeq;
};

/**
 * Build the full url to query the server
 *
 * @this {Session}
 * @param {String}
 *           baseUrl  The path of the url
 * @return {String} The full url with the hostname
 */
com.zimbra.domain.Session.prototype.buildUrl = function(baseUrl) {
    if (this._hostname.length > 0) {
        return this._hostname + baseUrl;
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
 *            hostname The hostname to login to
 * @param {Boolean}
 *            clearSession True if we need to clear the session if the information changed
 *
 * @return {Boolean} True if changed
 */
com.zimbra.domain.Session.prototype.updateLoginInfo = function(hostname, user, clearSession) {
    var changed = false;
    hostname = this._valToStr(hostname);
    user = this._valToStr(user);

    if (user.length > 0 && hostname.length > 0) {

        if (hostname.lastIndexOf('/') === hostname.length - 1) {
            hostname = hostname.slice(0, -1);
        }
        if (this._user !== user || this._hostname !== hostname) {
            changed = true;
        }
    }
    else {
        if (this._user.length > 0 || this._hostname.length > 0) {
            changed = true;
        }
        user = '';
        hostname = '';
    }

    if (changed === true && clearSession) {
        this.clear();
    }

    this._user = user;
    this._hostname = hostname;

    return changed;
};

/**
 * Check if the Session is valid
 *
 * @this {Session}
 * @return {Boolean} true if the token and the associated info are valid
 */
com.zimbra.domain.Session.prototype.isTokenValid = function() {
    return this._user.length > 0 && this._hostname.length > 0 &&
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
com.zimbra.domain.Session.prototype.updateToken = function(token, lifetime) {

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
com.zimbra.domain.Session.prototype.markTokenExpired = function() {
    this._tokenExpirationTime = new Date(0);
};

/**
 * Check if the token expiration date
 *
 * @this {Session}
 * @return {Boolean} True if the token is going to be non valid soon
 */
com.zimbra.domain.Session.prototype.isTokenGoingToExp = function() {
    var timeExp = this._tokenExpirationTime.getTime() - com.zimbra.constant.SESSION.TOKEN_LIFETIME_EXPIR;
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
com.zimbra.domain.Session.prototype.isWaitSetValid = function() {
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
com.zimbra.domain.Session.prototype.updateWaitSet = function(id, seq) {
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
 * Get the value as string
 *
 * @this {Session}
 * @param {String|Number|null}
 *            val  The value
 * @return {Boolean} True if changed
 */
com.zimbra.domain.Session.prototype._valToStr = function(val) {
    if (!val && val !== 0) {
        return '';
    }
    return '' + val;
};

