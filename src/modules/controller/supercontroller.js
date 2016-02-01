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

var EXPORTED_SYMBOLS = ["zimbra_notifier_SuperController"];

/* ************************* Controller ****************************** */

/**
 * Creates an instance of SuperController.
 *
 * @constructor
 * @this {SuperController}
 */
var zimbra_notifier_SuperController = { 
    _controllers: [],
    _callbackList: []
};

/**
 * initialize super controller
 *
 * @public
 * @this {SuperController}
 */
zimbra_notifier_SuperController.init = function() {
    // Load preferences before started controllers
    zimbra_notifier_Prefs.init( function() {
        zimbra_notifier_Prefs.getAccounts().forEach(function(accountId){
            var controller = new zimbra_notifier_Controller(accountId);
            zimbra_notifier_SuperController._controllers.push(controller);
            // Add callback to the controller if already added to the superController
            zimbra_notifier_SuperController._callbackList.forEach(function(callback) {
                if (callback !== null) {
                    controller.addCallBackRefresh(callback);
                }
            });
            controller.autoConnect();
        });
    });
}

/**
 * Called when application closes
 *
 * @public
 * @this {SuperController}
 */
zimbra_notifier_SuperController.shutdown = function() {
    this._controllers.forEach(function(controller) {
        controller.shutdown();
    });
    zimbra_notifier_Prefs.release();
};


/**
 * Add CallBack to Refresh
 *
  * @public
 * @this {SuperController}
 * @param {Object}
 *            callback Object which has this function : refresh(startRequest)
 */
zimbra_notifier_SuperController.addCallBackRefresh = function(callback) {
    this._controllers.forEach(function(controller) {
        controller.addCallBackRefresh(callback);
    });
    this._callbackList.push(callback);
};

/**
 * Remove CallBack to Refresh
 *
 * @public
 * @this {SuperController}
 * @param {Object}
 *            callback Object which has this function : refresh(startRequest)
 */
zimbra_notifier_SuperController.removeCallBackRefresh = function(callback) {
    this._controllers.forEach(function(controller) {
        controller.removeCallBackRefresh(callback);
    });

    for (var index = 0; index < this._callbackList.length; index++) {
        if (this._callbackList[index] === callback) {
            this._callbackList.splice(index, 1);
            break;
        }
    }
};

/**
 * create new controller
 *
 * @public
 * @this {SuperController}
 */
zimbra_notifier_SuperController.addNewIdentifier = function() {
    var accountId = zimbra_notifier_Prefs.addNewAccount();
    var controller = new zimbra_notifier_Controller(accountId);
    zimbra_notifier_SuperController._controllers.push(controller);
    // Add callback to the controller if already added to the superController
    for (var index = 0; index < this._callbackList.length; index++) {
        var callback = this._callbackList[index];
        if (callback !== null) {
            controller.addCallBackRefresh(callback);
            // Notify the UI of the change
            callback.refresh();
        }
    }
};

/**
 * remove controller
 *
 * @public
 * @this {SuperController}
 * @param {zimbra_notifier_Controller} controller
 */
zimbra_notifier_SuperController.removeController = function(controller) {
    for (var index = 0; index < this._controllers.length; index++) {
        if (this._controllers[index] === controller) {
            this._controllers.splice(index, 1);
            zimbra_notifier_Prefs.removeAccount(controller.getAccountId())
            controller.shutdown();
            // Notify the UI of the change
            for (var index = 0; index < this._callbackList.length; index++) {
                var callback = this._callbackList[index];
                if (callback !== null) {
                    callback.refresh();
                }
            }
            break;
        }
    }    
};

/**
 * Indicate if a connection is activated
 *
 * @public
 * @this {SuperController}
 * @return {Boolean} true if connected
 */
zimbra_notifier_SuperController.hasConnectionActivated = function() {
    var nbConnected = 0;
    this._controllers.forEach(function(controller) {
        if (controller.isConnected()) {
            nbConnected++;
        }
    });
    return (nbConnected > 0);
};

/**
 * get controllers for each account
 *
 * @this {SuperController}
 * @return {controller[]} controllers list
 */
zimbra_notifier_SuperController.getControllers = function() {
    return this._controllers;
};


/**
 * Get nb of unread messages
 *
 * @public
 * @this {SuperController}
 * @return {Number} nb of unread messages
 */
zimbra_notifier_SuperController.getNbMessageUnread = function() {
    var nbMessageUnread = 0;
    this._controllers.forEach(function(controller) {
        nbMessageUnread += controller.getNbMessageUnread();
    });
    return nbMessageUnread;
};


/**
 * Get unread messages
 *
 * @public
 * @this {Controller}
 * @return {Message[]} unread messages
 */
zimbra_notifier_SuperController.getUnreadMessages = function() {
    var unreadMessages = [];
    this._controllers.forEach(function(controller) {
        unreadMessages = unreadMessages.concat(controller.getUnreadMessages());
    });
    return unreadMessages;
};

/**
 * Get last error message
 *
 * @public
 * @this {SuperController}
 * @return {String} the last server error message
 */
zimbra_notifier_SuperController.getLastErrorMessage = function() {
    var message = "";
    this._controllers.forEach(function(controller) {
        if(controller.getLastErrorMessage() !== "") {
            message = controller.getLastErrorMessage(); 
        }
    });
    return message;
}


/**
 * Get events
 *
 * @public
 * @this {SuperController}
 * @return {CalEvent[]} events
 */
zimbra_notifier_SuperController.getEvents = function() {
    var events = [];
    this._controllers.forEach(function(controller) {
        events = events.concat(controller.getEvents());
    });
    // sort unread messages
    events.sort(function(a, b) {
        return a.startDate > b.startDate
    });
    return events;
};

/**
 * Get tasks
 *
 * @public
 * @this {SuperController}
 * @return {Task[]} tasks
 */
zimbra_notifier_SuperController.getTasks = function() {
    var tasks = [];
    this._controllers.forEach(function(controller) {
        tasks = tasks.concat(controller.getTasks());
    });
    return tasks;
};

/**
 * Freeze the interface
 */
Object.freeze(zimbra_notifier_SuperController);

/**
 * starting the superController
 */
zimbra_notifier_SuperController.init();
