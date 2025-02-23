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

'use strict';

/**
 * The Class Main.
 *
 * @constructor
 * @this {Main}
 */
var zimbra_notifier_main = {
    _logger: new zimbra_notifier_Logger('Background'),
    creatingOffscreenDocumentPromise: undefined,
    keepAliveTimer: undefined,
};

/**
 * Init module.
 *
 * @this {Main}
 */
zimbra_notifier_main.init = function () {
    try {
        chrome.action.setIcon({path: '../skin/images/icon_disabled.png'});
        chrome.action.setBadgeText({text: ''});
        // Register
        zimbra_notifier_SuperController.addCallBackRefresh(this);
        // Enable messaging between scripts
        chrome.runtime.onMessage.addListener(this.onMessage);
        // Keep the service worker alive
        zimbra_notifier_main.keepAlive();
        chrome.alarms.create({periodInMinutes: 2});
        chrome.alarms.onAlarm.addListener(zimbra_notifier_main.keepAlive);
    } catch (e) {
        console.error('FATAL in zimbra_notifier_main.init: ' + e);
    }
};

/**
 * release Main.
 *
 * @this {Main}
 */
zimbra_notifier_main.release = function () {
    zimbra_notifier_SuperController.removeCallBackRefresh(this);
    // Disable messaging between scripts
    chrome.runtime.onMessage.removeListener(this.onMessage);
    // Remove keepAlive
    clearTimeout(zimbra_notifier_main.keepAliveTimer);
};

/**
 * keepAlive
 * @return {Promise}
 */
zimbra_notifier_main.keepAlive = async function () {
    const platformInfo = await chrome.runtime.getPlatformInfo();
    zimbra_notifier_main.log('KeepAlive on ' + platformInfo.os + ' (' + platformInfo.arch + ')');
    // Create offscreen document if not started
    return zimbra_notifier_main.createOffscreenDocument();
};

/**
 * createOffscreenDocument
 */
zimbra_notifier_main.createOffscreenDocument = async function () {
    const offscreenDocument = await chrome.offscreen.hasDocument();
    if (offscreenDocument) {
        return;
    }
    // create offscreen document
    if (zimbra_notifier_main.creatingOffscreenDocumentPromise) {
        await zimbra_notifier_main.creatingOffscreenDocumentPromise;
    } else {
        zimbra_notifier_main.creatingOffscreenDocumentPromise = chrome.offscreen.createDocument({
            url: 'offscreen.html',
            reasons: ['AUDIO_PLAYBACK'],
            justification: 'Needed to play sound',
        });
        await zimbra_notifier_main.creatingOffscreenDocumentPromise;
        zimbra_notifier_main.creatingOffscreenDocumentPromise = null;
    }
};

/**
 * refresh interface.
 *
 * @this {Main}
 */
zimbra_notifier_main.refresh = function (event, data) {
    if (event === zimbra_notifier_SERVICE_EVENT.NEED_PLAY_SOUND) {
        // Create offscreen document if not started
        zimbra_notifier_main.createOffscreenDocument();
        // send notification to offscreen after 200 ms (time needed in rder to create this page)
        clearTimeout(zimbra_notifier_main._refreshTimer);
        zimbra_notifier_main._refreshTimer = setTimeout(function () {
            chrome.runtime.sendMessage({
                source: 'background.js',
                func: 'playSound',
                args: [data.selected, data.customSound, data.volumeSound],
            });
        }, 200);
        return;
    } else if (event && event.startingReq) {
        chrome.action.setIcon({path: '../skin/images/icon_refresh.png'});
    } else {
        var nbUnreadMessages = -1;
        if (zimbra_notifier_SuperController.hasConnectionActivated()) {
            var hasError = zimbra_notifier_SuperController.getLastErrorMessage() !== '';
            nbUnreadMessages = zimbra_notifier_SuperController.getNbMessageUnread();
            if (hasError) {
                chrome.action.setIcon({path: '../skin/images/icon_warning.png'});
            } else {
                chrome.action.setIcon({path: '../skin/images/icon_default.png'});
            }
        } else {
            chrome.action.setIcon({path: '../skin/images/icon_disabled.png'});
        }
        // ToolBar
        if (nbUnreadMessages > 0) {
            chrome.action.setBadgeText({text: String(nbUnreadMessages)});
        } else {
            chrome.action.setBadgeText({text: ''});
        }
    }
    // send notification to option.js and popup.js
    chrome.runtime.sendMessage({
        source: 'background.js',
        func: 'needRefresh',
        args: [],
    });
};

/**
 * getControllers
 * @return {Array<Object>}
 */
zimbra_notifier_main.getControllers = function () {
    return zimbra_notifier_SuperController.getControllers().map((controller) => {
        return {
            id: controller.id,
            accountId: controller._accountId,
            isConnected: controller.isConnected(),
            isConnecting: controller.isConnecting(),
            needTwoFactorAuth: controller.needTwoFactorAuth(),
            unreadMessages: controller.getUnreadMessages(),
            lastErrorMessage: controller.getLastErrorMessage(),
            mailBoxInfo: controller.getMailBoxInfo(),
        };
    });
};

/**
 * initializeConnection
 * @param {String} id
 * @param {String} password
 * @return {Boolean}
 */
zimbra_notifier_main.initializeConnection = function (id, password) {
    const controller = zimbra_notifier_SuperController
        .getControllers()
        .find((controller) => controller.id === id);
    if (controller) {
        zimbra_notifier_Prefs.load();
        return controller.initializeConnection(password);
    }
    return false;
};

/**
 * sendTwoFactorToken
 * @param {String} id
 * @param {String} token
 * @return {Boolean}
 */
zimbra_notifier_main.sendTwoFactorToken = function (id, token) {
    const controller = zimbra_notifier_SuperController
        .getControllers()
        .find((controller) => controller.id === id);
    if (controller) {
        return controller.sendTwoFactorToken(token);
    }
    return false;
};

/**
 * closeConnection
 * @param {String} id
 * @return {Boolean}
 */
zimbra_notifier_main.closeConnection = function (id) {
    const controller = zimbra_notifier_SuperController
        .getControllers()
        .find((controller) => controller.id === id);
    if (controller) {
        return controller.closeConnection();
    }
    return false;
};

/**
 * checkNow
 * @param {String} id
 * @return {Boolean}
 */
zimbra_notifier_main.checkNow = function (id) {
    const controller = zimbra_notifier_SuperController
        .getControllers()
        .find((controller) => controller.id === id);
    if (controller) {
        return controller.checkNow();
    }
    return false;
};

/**
 * removeController
 * @param {String} id
 * @return {Boolean}
 */
zimbra_notifier_main.removeController = function (id) {
    const controller = zimbra_notifier_SuperController
        .getControllers()
        .find((controller) => controller.id === id);
    if (controller) {
        return zimbra_notifier_SuperController.removeController(controller);
    }
    return false;
};

/**
 * addNewIdentifier
 * @return {Boolean}
 */
zimbra_notifier_main.addNewIdentifier = function () {
    return zimbra_notifier_SuperController.addNewIdentifier();
};

/**
 * getEvents
 * @return {Array<Object>}
 */
zimbra_notifier_main.getEvents = function () {
    return zimbra_notifier_SuperController.getEvents().map((event) => {
        return {
            id: event.id,
            name: event.name,
            duration: event.duration,
            startDate: event.startDate,
            endDate: event.endDate,
            startWeek: event.startWeek,
        };
    });
};

/**
 * getTasks
 * @return {Array<Object>}
 */
zimbra_notifier_main.getTasks = function () {
    return zimbra_notifier_SuperController.getTasks();
};

/**
 * updatePref
 * @param {String} key
 * @param {Any} value
 * @return {Boolean}
 */
zimbra_notifier_main.updatePref = function (key, value) {
    return zimbra_notifier_Prefs.updatePref(key, value);
};

/**
 * openZimbraWebInterface
 * @param {String} accountId
 * @return {Boolean}
 */
zimbra_notifier_main.openZimbraWebInterface = function (accountId) {
    const controller = zimbra_notifier_SuperController
        .getControllers()
        .find((controller) => controller.getAccountId() === accountId);
    if (controller) {
        return controller.openZimbraWebInterface();
    }
    return false;
};

/**
 * Log debug messages to the console
 * @param {String} message
 * @param {String} source
 * @param {String} type
 */
zimbra_notifier_main.log = function (message, source = 'background.js', type = 'trace') {
    switch (type) {
        case 'error':
            this._logger.error(message);
            break;
        case 'warning':
            this._logger.warning(message);
            break;
        case 'info':
            this._logger.info(message);
            break;
        default:
            this._logger.trace(message);
    }
};

/**
 * Log errors to the console
 * @param {String} error
 * @param {String} source
 */
zimbra_notifier_main.error = function (error, source) {
    zimbra_notifier_main.log(error, source, 'error');
};

/**
 * Enable scripts to call background functions through messaging
 * @param {Object} message
 * @param {Object} sender
 * @param {Function} callback
 */
zimbra_notifier_main.onMessage = function ({source, func, args}, sender, callback) {
    if (!func) {
        return false;
    }

    if (func === 'log') {
        zimbra_notifier_main.log(args[0], source, args[1]);
        return false;
    }

    if (func === 'needKeepAlive') {
        clearTimeout(zimbra_notifier_main.keepAliveTimer);
        zimbra_notifier_main.keepAliveTimer = setTimeout(() => {
            zimbra_notifier_main.keepAlive();
        }, 5000);
        return false;
    }

    if (!zimbra_notifier_main[func]) {
        zimbra_notifier_main.error(
            new Error(`Method does not exist: zimbra_notifier_main.${func}`),
            source,
        );
        return false;
    }

    // eslint-disable-next-line no-async-promise-executor
    new Promise(async (resolve) => {
        resolve(zimbra_notifier_main[func].call(zimbra_notifier_main[func], ...(args || [])));
    })
        .then(callback)
        .catch(zimbra_notifier_main.error);

    return !!callback;
};

// starting initial process
zimbra_notifier_main.init();
