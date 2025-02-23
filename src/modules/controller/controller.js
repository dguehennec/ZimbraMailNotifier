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

'use strict';

/* ************************* Controller ****************************** */

/**
 * Creates an instance of Controller.
 *
 * @constructor
 * @this {Controller}
 */
var zimbra_notifier_Controller = function (accountId) {
    this.id = 'C' + accountId;
    this._accountId = accountId;
    this._service = null;
    this._browser = new zimbra_notifier_Browser();
    this._callbackList = [];
};

/**
 * Called when controller closes
 *
 * @this {Controller}
 */
zimbra_notifier_Controller.prototype.shutdown = function () {
    if (this._service !== null) {
        this._service.shutdown();
        this._service = null;
    }
    this._callbackList = [];
};

/**
 * Get the service singleton
 *
 * @this {Controller}
 */
zimbra_notifier_Controller.prototype.getService = function (create) {
    if (this._service === null && create) {
        this._service = new zimbra_notifier_Service(this);
    }
    return this._service;
};

/**
 * Get the browser singleton
 *
 * @this {Controller}
 */
zimbra_notifier_Controller.prototype.getBrowser = function () {
    return this._browser;
};

/**
 * Get the accountId
 *
 * @this {Controller}
 */
zimbra_notifier_Controller.prototype.getAccountId = function () {
    return this._accountId;
};

/**
 * Add CallBack to Refresh
 *
 * @this {Controller}
 * @param {Object}
 *            callback Object which has this function : refresh(startRequest)
 */
zimbra_notifier_Controller.prototype.addCallBackRefresh = function (callback) {
    this._callbackList.push(callback);
};

/**
 * Remove CallBack to Refresh
 *
 * @this {Controller}
 * @param {Object}
 *            callback Object which has this function : refresh(startRequest)
 */
zimbra_notifier_Controller.prototype.removeCallBackRefresh = function (callback) {
    for (var index = 0; index < this._callbackList.length; index++) {
        if (this._callbackList[index] === callback) {
            this._callbackList.splice(index, 1);
            break;
        }
    }
};

/**
 * Send CallBack Refresh Event
 *
 * @this {Controller}
 * @param {SERVICE_EVENT}
 *            event  The type of event
 * @param {Object}
 *            data  The data associated with the event, can be undefined
 */
zimbra_notifier_Controller.prototype.event = function (event, data) {
    for (var index = 0; index < this._callbackList.length; index++) {
        var callback = this._callbackList[index];
        if (callback !== null) {
            callback.refresh(event, data);
        }
    }
};

/**
 * Start auto-connect if necessary
 *
 * @this {Controller}
 * @return {Boolean} False if we need to ask the password
 */
zimbra_notifier_Controller.prototype.autoConnect = function () {
    if (!this.isConnected() && zimbra_notifier_Prefs.isAutoConnectEnabled()) {
        return this.initializeConnection();
    }
    return true;
};

/**
 * Initialize Connection
 *
 * @this {Controller}
 * @param {String}
 *            password Optional, can be null
 *
 * @return {Boolean} True if we did launch the connect query
 */
zimbra_notifier_Controller.prototype.initializeConnection = function (password) {
    if (!this.isConnected()) {
        return this.getService(true).initializeConnection(password);
    }
    return false;
};

/**
 * send two factor token
 *
 * @this {Controller}
 * @param {String}
 *            token
 *
 * @return {Boolean} True if we did launch the two factor authentication query
 */
zimbra_notifier_Controller.prototype.sendTwoFactorToken = function (token) {
    if (this.isConnecting() && this.needTwoFactorAuth()) {
        return this.getService(true).sendTwoFactorToken(token);
    }
    return false;
};

/**
 * Close Connection
 *
 * @this {Controller}
 */
zimbra_notifier_Controller.prototype.closeConnection = function () {
    var srv = this.getService();
    if (srv) {
        srv.closeConnection();
    }
};

/**
 * Check now
 *
 * @this {Controller}
 */
zimbra_notifier_Controller.prototype.checkNow = function () {
    this.getService(true).checkNow();
};

/**
 * Indicate if connected
 *
 * @this {Controller}
 * @return {Boolean} true if connected
 */
zimbra_notifier_Controller.prototype.isConnected = function () {
    var srv = this.getService();
    return srv ? srv.isConnected() : false;
};

/**
 * Indicate if we need two factor token
 *
 * @this {Controller}
 * @return {Boolean} true if need two factor authentication
 */
zimbra_notifier_Controller.prototype.needTwoFactorAuth = function () {
    var srv = this.getService();
    return srv ? srv.isTwoFactorAuthRequired() : false;
};

/**
 * Indicate if is connecting
 *
 * @this {Controller}
 * @return {Boolean} true if connecting
 */
zimbra_notifier_Controller.prototype.isConnecting = function () {
    var srv = this.getService();
    var cSt = srv ? srv.getCurrentState() : zimbra_notifier_SERVICE_STATE.NOTHING_TO_DO;

    return (
        cSt === zimbra_notifier_SERVICE_STATE.CONNECT_RUN ||
        cSt === zimbra_notifier_SERVICE_STATE.CONNECT_ERR ||
        cSt === zimbra_notifier_SERVICE_STATE.CONNECT_WAIT
    );
};

/**
 * Get MailBox Info
 *
 * @this {Controller}
 * @return {MailBoxInfo} mailBoxInfo
 */
zimbra_notifier_Controller.prototype.getMailBoxInfo = function () {
    var srv = this.getService();
    return srv ? srv.getMailBoxInfo() : null;
};

/**
 * Get nb of unread messages
 *
 * @this {Controller}
 * @return {Number} nb of unread messages
 */
zimbra_notifier_Controller.prototype.getNbMessageUnread = function () {
    var srv = this.getService();
    return srv ? srv.getMessageManager().nbMessages() : 0;
};

/**
 * Get unread messages
 *
 * @this {Controller}
 * @return unread messages
 */
zimbra_notifier_Controller.prototype.getUnreadMessages = function () {
    var srv = this.getService();
    return srv ? srv.getMessageManager().getMessages() : [];
};

/**
 * Get events
 *
 * @this {Controller}
 * @return {CalEvent[]} events
 */
zimbra_notifier_Controller.prototype.getEvents = function () {
    var srv = this.getService();
    return srv ? srv.getEvents() : [];
};

/**
 * Get tasks
 *
 * @this {Controller}
 * @return {Task[]} tasks
 */
zimbra_notifier_Controller.prototype.getTasks = function () {
    var srv = this.getService();
    return srv ? srv.getTasks() : [];
};

/**
 * Get last error message
 *
 * @this {Controller}
 * @return {String} the last server error message
 */
zimbra_notifier_Controller.prototype.getLastErrorMessage = function () {
    var message = '';
    var reason = '';
    var util = zimbra_notifier_Util;
    var srv = this.getService();
    var lastErr = srv ? srv.getLastError() : null;

    if (lastErr !== null) {
        switch (lastErr.requestType) {
            case zimbra_notifier_REQUEST_TYPE.CONNECT:
                message = util.getBundleString('connector.error.authentification');
                break;
            case zimbra_notifier_REQUEST_TYPE.CREATE_WAIT:
                message = util.getBundleString('connector.error.createwait');
                break;
            case zimbra_notifier_REQUEST_TYPE.WAIT_NO_BLOCK:
            case zimbra_notifier_REQUEST_TYPE.WAIT_BLOCK:
                message = util.getBundleString('connector.error.wait');
                break;
            case zimbra_notifier_REQUEST_TYPE.MAILBOX_INFO:
                message = util.getBundleString('connector.error.mailboxinfo');
                break;
            case zimbra_notifier_REQUEST_TYPE.UNREAD_MSG:
                message = util.getBundleString('connector.error.unreadmsg');
                break;
            case zimbra_notifier_REQUEST_TYPE.CALENDAR:
                message = util.getBundleString('connector.error.calendar');
                break;
            case zimbra_notifier_REQUEST_TYPE.TASK:
                message = util.getBundleString('connector.error.task');
                break;
            default:
                message = util.getBundleString('connector.error.req.internal');
        }

        switch (lastErr.lastReqStatus) {
            case zimbra_notifier_REQUEST_STATUS.REQUEST_INVALID:
                reason = util.getBundleString('connector.error.req.invalid');
                break;
            case zimbra_notifier_REQUEST_STATUS.TIMEOUT:
                reason = util.getBundleString('connector.error.req.timeout');
                break;
            case zimbra_notifier_REQUEST_STATUS.SERVER_ERROR:
                reason = util.getBundleString('connector.error.req.server');
                break;
            case zimbra_notifier_REQUEST_STATUS.NETWORK_ERROR:
                reason = util.getBundleString('connector.error.req.network');
                break;
            case zimbra_notifier_REQUEST_STATUS.AUTH_REQUIRED:
                reason = util.getBundleString('connector.error.req.authreq');
                break;
            case zimbra_notifier_REQUEST_STATUS.LOGIN_INVALID:
                reason = util.getBundleString('connector.error.req.logininvalid');
                break;
            default:
                reason = util.getBundleString('connector.error.req.internal');
                break;
        }
        message = message.replace('%REASON%', reason);
    }
    return message;
};

/**
 * Open the web interface
 *
 * @this {Controller}
 */
zimbra_notifier_Controller.prototype.openZimbraWebInterface = function () {
    this._browser.setWebPageInfo(
        zimbra_notifier_Prefs.getUrlUserInterface(this.getAccountId()),
        zimbra_notifier_Prefs.isSyncBrowserCookiesEnabled(),
        zimbra_notifier_Prefs.isBrowserCookieHttpOnly(),
    );
    this._browser.openWebPage();
};

/**
 * Freeze the interface
 */
Object.freeze(zimbra_notifier_Controller);
