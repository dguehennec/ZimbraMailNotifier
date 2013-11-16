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

Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("resource://zimbra_mail_notifier/constant/zimbrahelper.jsm");
Components.utils.import("resource://zimbra_mail_notifier/service/util.jsm");
Components.utils.import("resource://zimbra_mail_notifier/service/request.jsm");
Components.utils.import("resource://zimbra_mail_notifier/service/webservices.jsm");
Components.utils.import("resource://zimbra_mail_notifier/service/prefs.jsm");
Components.utils.import("resource://zimbra_mail_notifier/service/browser.jsm");
Components.utils.import("resource://zimbra_mail_notifier/controller/service.jsm");

XPCOMUtils.defineLazyServiceGetter(
  Services,
  "res",
  "@mozilla.org/network/protocol;1?name=resource",
  "nsIResProtocolHandler"
);
XPCOMUtils.defineLazyServiceGetter(
  Services,
  "appstartup",
  "@mozilla.org/toolkit/app-startup;1",
  "nsIAppStartup"
);


var EXPORTED_SYMBOLS = ["zimbra_notifier_Controller"];

/* ***************** Private object used by Controller ********************* */

/**
 * Creates an instance of private data associated with the public Controller.
 *
 * @constructor
 * @this {ControllerData}
 */
var zimbra_notifier_ControllerData = {
    _service: null,
    _browser: new zimbra_notifier_Browser(),
    _callbackList: []
};

/**
 * Get the service singleton
 *
 * @this {ControllerData}
 */
zimbra_notifier_ControllerData.getService = function(create) {
    if (this._service === null && create) {
        this._service = new zimbra_notifier_Service(this);
    }
    return this._service;
};

/**
 * Get the browser singleton
 *
 * @this {ControllerData}
 */
zimbra_notifier_ControllerData.getBrowser = function() {
    return this._browser;
};

/**
 * Called when application closes
 *
 * @this {ControllerData}
 */
zimbra_notifier_ControllerData._shutdown = function() {
    if (this._service !== null) {
        this._service.shutdown();
        this._service = null;
    }
    this._callbackList = [];
    zimbra_notifier_Prefs.release();
};

/**
 * @see zimbra_notifier_Controller.addCallBackRefresh
 * @this {ControllerData}
 */
zimbra_notifier_ControllerData._addCallBackRefresh = function(callback) {
    this._callbackList.push(callback);
};

/**
 * @see zimbra_notifier_Controller.removeCallBackRefresh
 * @this {ControllerData}
 */
zimbra_notifier_ControllerData._removeCallBackRefresh = function(callback) {
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
 * @this {ControllerData}
 * @param {SERVICE_EVENT}
 *            event  The type of event
 */
zimbra_notifier_ControllerData.event = function(event) {
    for (var index = 0; index < this._callbackList.length; index++) {
        var callback = this._callbackList[index];
        if (callback !== null) {
            callback.refresh(event);
        }
    }
};

/**
 * Update the browser information
 *
 * @this {ControllerData}
 */
zimbra_notifier_ControllerData._updateBrowserInfo = function() {
    this._browser.setWebPageInfo(zimbra_notifier_Prefs.getUrlUserInterface(),
                                 zimbra_notifier_Prefs.isSyncBrowserCookiesEnabled(),
                                 zimbra_notifier_Prefs.isBrowserCookieHttpOnly());
};

/* ************************* Controller ****************************** */

/**
 * Creates an instance of Controller.
 *
 * @constructor
 * @this {Controller}
 */
var zimbra_notifier_Controller = { };

/**
 * Add CallBack to Refresh
 *
 * @this {Controller}
 * @param {Object}
 *            callback Object which has this function : refresh(startRequest)
 */
zimbra_notifier_Controller.addCallBackRefresh = function(callback) {
    zimbra_notifier_ControllerData._addCallBackRefresh(callback);
};

/**
 * Remove CallBack to Refresh
 *
 * @this {Controller}
 * @param {Object}
 *            callback Object which has this function : refresh(startRequest)
 */
zimbra_notifier_Controller.removeCallBackRefresh = function(callback) {
    zimbra_notifier_ControllerData._removeCallBackRefresh(callback);
};

/**
 * Start auto-connect if necessary
 *
 * @this {Controller}
 * @return {Boolean} False if we need to ask the password
 */
zimbra_notifier_Controller.autoConnect = function() {
    if (!this.isConnected() && zimbra_notifier_Prefs.isAutoConnectEnabled()) {
        if (zimbra_notifier_Prefs.isSavePasswordEnabled()) {
            return this.initializeConnection();
        }
        else {
            return false;
        }
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
zimbra_notifier_Controller.initializeConnection = function(password) {
    return zimbra_notifier_ControllerData.getService(true).initializeConnection(password);
};

/**
 * Close Connection
 *
 * @this {Controller}
 */
zimbra_notifier_Controller.closeConnection = function() {
    var srv = zimbra_notifier_ControllerData.getService();
    if (srv) {
        srv.closeConnection();
    }
};

/**
 * Check now
 *
 * @this {Controller}
 */
zimbra_notifier_Controller.checkNow = function() {
    zimbra_notifier_ControllerData.getService(true).checkNow();
};

/**
 * Indicate if connected
 *
 * @this {Controller}
 * @return {Boolean} true if connected
 */
zimbra_notifier_Controller.isConnected = function() {
    var srv = zimbra_notifier_ControllerData.getService();
    return srv ? srv.isConnected() : false;
};

/**
 * Indicate if is connecting
 *
 * @this {Controller}
 * @return {Boolean} true if connecting
 */
zimbra_notifier_Controller.isConnecting = function() {
    var srv = zimbra_notifier_ControllerData.getService();
    var cSt = srv ? srv.getCurrentState() : zimbra_notifier_SERVICE_STATE.NOTHING_TO_DO;

    return cSt === zimbra_notifier_SERVICE_STATE.CONNECT_RUN ||
           cSt === zimbra_notifier_SERVICE_STATE.CONNECT_ERR ||
           cSt === zimbra_notifier_SERVICE_STATE.CONNECT_WAIT;
};

/**
 * Get MailBox Info
 *
 * @this {Controller}
 * @return {MailBoxInfo} mailBoxInfo
 */
zimbra_notifier_Controller.getMailBoxInfo = function() {
    var srv = zimbra_notifier_ControllerData.getService();
    return srv ? srv.getMailBoxInfo() : null;
};

/**
 * Get nb of unread messages
 *
 * @this {Controller}
 * @return {Number} nb of unread messages
 */
zimbra_notifier_Controller.getNbMessageUnread = function() {
    var srv = zimbra_notifier_ControllerData.getService();
    return srv ? srv.getMessageManager().nbMessages() : 0;
};

/**
 * Get events
 *
 * @this {Controller}
 * @return {CalEvent[]} events
 */
zimbra_notifier_Controller.getEvents = function() {
    var srv = zimbra_notifier_ControllerData.getService();
    return srv ? srv.getEvents() : [];
};

/**
 * Get tasks
 *
 * @this {Controller}
 * @return {Task[]} tasks
 */
zimbra_notifier_Controller.getTasks = function() {
    var srv = zimbra_notifier_ControllerData.getService();
    return srv ? srv.getTasks() : [];
};

/**
 * Get last error message
 *
 * @this {Controller}
 * @return {String} the last server error message
 */
zimbra_notifier_Controller.getLastErrorMessage = function() {
    var message = "";
    var reason = "";
    var util = zimbra_notifier_Util;
    var srv = zimbra_notifier_ControllerData.getService();
    var lastErr = srv ? srv.getLastError() : null;

    if (lastErr !== null) {
        switch (lastErr.requestType) {
            case zimbra_notifier_REQUEST_TYPE.CONNECT:
                message = util.getBundleString("connector.error.authentification");
                break;
            case zimbra_notifier_REQUEST_TYPE.CREATE_WAIT:
                message = util.getBundleString("connector.error.createwait");
                break;
            case zimbra_notifier_REQUEST_TYPE.WAIT_NO_BLOCK:
            case zimbra_notifier_REQUEST_TYPE.WAIT_BLOCK:
                message = util.getBundleString("connector.error.wait");
                break;
            case zimbra_notifier_REQUEST_TYPE.MAILBOX_INFO:
                message = util.getBundleString("connector.error.mailboxinfo");
                break;
            case zimbra_notifier_REQUEST_TYPE.UNREAD_MSG:
                message = util.getBundleString("connector.error.unreadmsg");
                break;
            case zimbra_notifier_REQUEST_TYPE.CALENDAR:
                message = util.getBundleString("connector.error.calendar");
                break;
            case zimbra_notifier_REQUEST_TYPE.TASK:
                message = util.getBundleString("connector.error.task");
                break;
            default:
                message = util.getBundleString("connector.error.req.internal");
        }

        switch (lastErr.lastReqStatus) {
            case zimbra_notifier_REQUEST_STATUS.REQUEST_INVALID:
                reason = util.getBundleString("connector.error.req.invalid");
                break;
            case zimbra_notifier_REQUEST_STATUS.TIMEOUT:
                reason = util.getBundleString("connector.error.req.timeout");
                break;
            case zimbra_notifier_REQUEST_STATUS.SERVER_ERROR:
                reason = util.getBundleString("connector.error.req.server");
                break;
            case zimbra_notifier_REQUEST_STATUS.NETWORK_ERROR:
                reason = util.getBundleString("connector.error.req.network");
                break;
            case zimbra_notifier_REQUEST_STATUS.AUTH_REQUIRED:
                reason = util.getBundleString("connector.error.req.authreq");
                break;
            case zimbra_notifier_REQUEST_STATUS.LOGIN_INVALID:
                reason = util.getBundleString("connector.error.req.logininvalid");
                break;
            default:
                reason = util.getBundleString("connector.error.req.internal");
                break;
        }
        message = message.replace("%REASON%", reason);
    }
    return message;
};

/**
 * Open the web interface
 *
 * @this {Controller}
 */
zimbra_notifier_Controller.openZimbraWebInterface = function() {
    zimbra_notifier_ControllerData.getBrowser().openWebPage();
};

/**
 * Freeze the interface
 */
Object.freeze(zimbra_notifier_Controller);

/* ******************* Detect application events *********************** */

var zimbra_notifier_Observer = {
    register: function() {
        Services.obs.addObserver(zimbra_notifier_Observer, "quit-application", false);
        Services.obs.addObserver(zimbra_notifier_Observer, "quit-application-granted", false);
        Services.obs.addObserver(zimbra_notifier_Observer,
                                 zimbra_notifier_Constant.OBSERVER.PREF_SAVED, false);
    },
    unregister: function() {
        Services.obs.removeObserver(zimbra_notifier_Observer, zimbra_notifier_Constant.OBSERVER.PREF_SAVED);
        Services.obs.removeObserver(zimbra_notifier_Observer, "quit-application-granted");
        Services.obs.removeObserver(zimbra_notifier_Observer, "quit-application");
    },
    observe: function(s, topic, data) {
        if (topic === "quit-application-granted" || topic === "quit-application") {

            this.unregister();
            Services.appstartup.enterLastWindowClosingSurvivalArea();
            try {
                zimbra_notifier_ControllerData._shutdown();
            }
            finally {
                Services.appstartup.exitLastWindowClosingSurvivalArea();
            }
        }
        else if (topic === zimbra_notifier_Constant.OBSERVER.PREF_SAVED) {

            zimbra_notifier_ControllerData._updateBrowserInfo();
            var srv = zimbra_notifier_ControllerData.getService();
            if (srv) {
                srv.prefUpdated(data);
            }
        }
    }
};

zimbra_notifier_Observer.register();
zimbra_notifier_ControllerData._updateBrowserInfo();
