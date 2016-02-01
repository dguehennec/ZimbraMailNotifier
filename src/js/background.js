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

/**
 * The Class Main.
 *
 * @constructor
 * @this {Main}
 */
var zimbra_notifier_main = {};

/**
 * Init module.
 *
 * @this {Main}
 */
zimbra_notifier_main.init = function() {
    try {
        chrome.browserAction.setIcon({path : "skin/images/icon_disabled.png"});
        chrome.browserAction.setBadgeText({text:String("")});
        // Register
        zimbra_notifier_SuperController.addCallBackRefresh(this);
    } catch (e) {
        console.error("FATAL in zimbra_notifier_main.init: " + e + "\n");
    }
};

/**
 * release Main.
 *
 * @this {Main}
 */
zimbra_notifier_main.release = function() {
    zimbra_notifier_SuperController.removeCallBackRefresh(this);
};

/**
 * refresh interface.
 *
 * @this {Main}
 */
zimbra_notifier_main.refresh = function(event) {
    if (event && event.startingReq) {
        chrome.browserAction.setIcon({path:"skin/images/icon_refresh.png"});
    }
    else {
        var nbUnreadMessages = -1;
        if (zimbra_notifier_SuperController.hasConnectionActivated()) {
            var hasError = (zimbra_notifier_SuperController.getLastErrorMessage() !== '');
            nbUnreadMessages = zimbra_notifier_SuperController.getNbMessageUnread();
            if(hasError) {
                chrome.browserAction.setIcon({path:"skin/images/icon_warning.png"});
            }
            else {
                chrome.browserAction.setIcon({path:"skin/images/icon_default.png"});
            } 
        }
        else {
            chrome.browserAction.setIcon({path:"skin/images/icon_disabled.png"});
        }
        // ToolBar
        if (nbUnreadMessages > 0) {
            chrome.browserAction.setBadgeText({text:String(nbUnreadMessages)});
        }
        else {
            chrome.browserAction.setBadgeText({text:String("")});
        }
    }
};

/**
 * add event listener to notify when content is loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    zimbra_notifier_main.init();
});

/**
 * add event listener to notify when content is unloaded
 */
document.addEventListener('onbeforeunload', function() {
    zimbra_notifier_main.release();
});
