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
 * Creates an instance of offscreen.
 *
 * @constructor
 * @this {Options}
 */
var zimbra_notifier_offscreen = {};

/**
 * init
 *
 * @public
 * @this {Options}
 */
zimbra_notifier_offscreen.init = function () {
    // Enable messaging between scripts
    chrome.runtime.onMessage.addListener(this.onMessage);
    // Message to background before release offscreen screen by chrome
    setTimeout(() => {
        chrome.runtime.sendMessage({
            source: 'offscreen.js',
            func: 'needKeepAlive',
            args: [],
        });
    }, 28000);
};

/**
 * Call when the window is closed
 *
 * @public
 * @this {zimbra_notifier_popup}
 */
zimbra_notifier_offscreen.release = function () {
    // Disable messaging between scripts
    chrome.runtime.onMessage.removeListener(this.onMessage);
};

/**
 * Enable scripts to call options functions through messaging
 * @param {Object} message
 * @param {Object} sender
 * @param {Function} callback
 */
zimbra_notifier_offscreen.onMessage = function ({source, func, args}, sender, callback) {
    if (func === 'playSound') {
        zimbra_notifier_UiUtil.playSound(...args);
    }
};

/**
 * add event listener to notify when content is loaded
 */
document.addEventListener('DOMContentLoaded', async function () {
    zimbra_notifier_offscreen.init();
});
