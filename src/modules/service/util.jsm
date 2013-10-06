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

Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://zimbra_mail_notifier/constant/zimbrahelper.jsm");

const EXPORTED_SYMBOLS = ["zimbra_notifier_Util"];

/**
 * Creates a global instance of zimbra_notifier_Util
 *
 * @constructor
 * @this {Util}
 *
 */
const zimbra_notifier_Util = {
    /**
     * @private bundle
     */
    _bundle: null
};

/**
 * get bundle.
 *
 * @this {Util}
 *
 * @param {String}
 *            param parameter value to get
 * @return {String} value of parameter
 */
zimbra_notifier_Util.getBundleString = function(param) {
    try {
        if (this._bundle === null) {
            var appLocale = Services.locale.getApplicationLocale();
            this._bundle = Services.strings.createBundle(
                zimbra_notifier_Constant.STRING_BUNDLE.DEFAULT_URL, appLocale);
        }
        return this._bundle.GetStringFromName(param);
    }
    catch (e) {
        return '';
    }
};

/**
 * Create and launch a timer
 *
 * @this {Util}
 *
 * @param {nsITimer}
 *            timer  A previous instance of a timer to reuse, can be null: create a new one
 * @param {Function}
 *            func   The callback to be fired when the timer timeout
 * @param {Number}
 *            delay  The number of ms
 *
 * @return {nsITimer} The created timer
 */
zimbra_notifier_Util.setTimer = function(timer, func, delay) {
    if (!timer) {
        timer = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
    }
    timer.initWithCallback(func, delay, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
    return timer;
};

/**
 * convert seconds to time string hh:mm:ss
 *
 * @this {Util}
 * @param {Number}
 *            time in seconds.
 * @return {String} time in format hh:mm:ss.
 */
zimbra_notifier_Util.secToTimeStr = function(time) {
    if (time === null || time < 0) {
        return "";
    }
    var tmp = time;
    var h = Math.floor(tmp / 3600);
    tmp = tmp - (h * 3600);
    var m = Math.floor(tmp / 60);
    tmp = tmp - (m * 60);
    var s = Math.floor(tmp);
    return ((h < 10) ? "0" + h : h) + ":" + ((m < 10) ? "0" + m : m) + ":" + ((s < 10) ? "0" + s : s);
};

/**
 * convert seconds to datetime string jj.mm.aaaa hh:mm
 *
 * @this {Util}
 * @param {Date}
 *            date to convert in seconds
 * @return {String} date in format jj.mm.aaaa hh:mm
 */
zimbra_notifier_Util.formatDateTime = function(date) {
    if (date === null) {
        return "";
    }
    var h = date.getHours();
    var m = date.getMinutes();
    return date.toLocaleDateString() + " " + ((h < 10) ? "0" + h : h) + ":" + ((m < 10) ? "0" + m : m);
};

/**
 * return max length string
 *
 * @this {Util}
 * @param {String}
 *            text text to limit.
 * @param {Number}
 *            length max text length.
 * @return {String} text limited with ....
 */
zimbra_notifier_Util.maxStringLength = function(text, length) {
    if (text === null || (text.length < length)) {
        return text;
    }
    if (length <= 0) {
        return '';
    }
    if (length < 6) {
        return text.substring(0, length);
    }
    return text.substring(0, length - 3) + "...";
};

/**
 * open url in a new browser tab
 *
 * @this {Util}
 * @param {String}
 *            UrlToGoTo url to open.
 * @return {Boolean} true if success
 */
zimbra_notifier_Util.openURL = function(UrlToGoTo) {
    try {
        var browserEnumerator = Services.wm.getEnumerator("navigator:browser");
        var exp = /(\b(https|http):\/\/)/gi;
        var url = UrlToGoTo.replace(exp, "");

        while (browserEnumerator.hasMoreElements()) {
            var browserInstance = browserEnumerator.getNext().getBrowser();
            var numTabs = browserInstance.mPanelContainer.childNodes.length;
            for ( var index = 0; index < numTabs; index++) {
                var currentTab = browserInstance.getBrowserAtIndex(index);
                if (currentTab.currentURI.spec.indexOf(url) >= 0) {
                    browserInstance.selectedTab = browserInstance.tabContainer.childNodes[index];
                    browserInstance.contentWindow.focus();
                    browserInstance.focus();
                    return true;
                }
            }
        }
        var recentWindow = Services.wm.getMostRecentWindow("navigator:browser");
        if (recentWindow) {
            recentWindow.delayedOpenTab(UrlToGoTo, null, null, null, null);
            recentWindow.focus();
        }
        else {
            var win = Services.ww.openWindow(Services.ww.activeWindow, UrlToGoTo, null, null, null);
            if (Services.ww.activeWindow) {
                Services.ww.activeWindow.focus();
            }
            win.focus();
        }
    }
    catch (e) {
        return false;
    }
    return true;
};

/**
 * Show notification
 *
 * @param {String}
 *            title
 * @param {String}
 *            text
 * @param {String}
 *            callbackData
 * @param {Function}
 *            callback
 *
 * @return {Boolean} true if success
 */
zimbra_notifier_Util.showNotificaton = function(title, text, callbackData, callback) {
    try {
        var textClickable = false;
        if (callback) {
            textClickable = true;
        }
        var alertsService = Components.classes['@mozilla.org/alerts-service;1'].
                             getService(Components.interfaces.nsIAlertsService);

        alertsService.showAlertNotification('chrome://zimbra_mail_notifier/skin/images/zimbra_mail_notifier.png',
                                            title, text, textClickable, callbackData, callback, "");
    } catch (e) {
        return false;
    }
    return true;
};

/**
 * play new mail sound
 *
 * @return {Boolean} true if success
 */
zimbra_notifier_Util.playSound = function() {
    try {
        var sound = Components.classes["@mozilla.org/sound;1"].createInstance(Components.interfaces.nsISound);
        if (Services.appinfo.OS === "Darwin") {
            sound.beep();
        } else {
            sound.playEventSound(Components.interfaces.nsISound.EVENT_NEW_MAIL_RECEIVED);
        }
    } catch (e) {
        return false;
    }
    return true;
};

/**
 * addObserver.
 *
 * @this {Util}
 * @param {Observer}
 *            observer the observer
 * @param {String}
 *            topic the topic
 */
zimbra_notifier_Util.addObserver = function(observer, topic) {
    Services.obs.addObserver(observer, topic, false);
};

/**
 * removeObserver.
 *
 * @this {Util}
 * @param {Observer}
 *            observer the observer
 * @param {String}
 *            topic the topic
 */
zimbra_notifier_Util.removeObserver = function(observer, topic) {
    Services.obs.removeObserver(observer, topic);
};

/**
 * notifyObservers.
 *
 * @this {Util}
 * @param {String}
 *            topic the topic
 * @param {String}
 *            data the data
 */
zimbra_notifier_Util.notifyObservers = function(topic, data) {
    Services.obs.notifyObservers(null, topic, data);
};

/**
 * Get the cookie value
 *
 * @this {Util}
 * @param {String}
 *            url  The URL associated with the cookie
 * @param {String}
 *            key  The key of the cookie
 */
zimbra_notifier_Util.getCookieValue = function(url, key) {
    if (url && key) {
        var cookieUri = Services.io.newURI(url, null, null);
        var enumCookies = Services.cookies.getCookiesFromHost(cookieUri.host);

        while (enumCookies.hasMoreElements()) {
            var cookie = enumCookies.getNext().QueryInterface(Components.interfaces.nsICookie);
            if (cookie.name === key) {
                return cookie.value;
            }
        }
    }
    return null;
};

/**
 * Set a new session cookie
 *
 * @this {Util}
 * @param {String}
 *            url  The URL associated with the cookie
 * @param {String}
 *            key  The key of the cookie
 * @param {String}
 *            value  The value of the cookie
 */
zimbra_notifier_Util.addSessionCookie = function(url, key, value) {
    if (url && key) {
        var cookieUri = Services.io.newURI(url, null, null);
        Services.cookies.add(cookieUri.host, cookieUri.path, key, value,
                             cookieUri.schemeIs("https"), false, true, 0);
    }
};

/**
 * Remove a cookie
 *
 * @this {Util}
 * @param {String}
 *            url  The URL associated with the cookie
 * @param {String}
 *            key  The key of the cookie
 */
zimbra_notifier_Util.removeCookie = function(url, key) {
    if (url && key) {
        var cookieUri = Services.io.newURI(url, null, null);
        Services.cookies.remove(cookieUri.host, key, cookieUri.path, false);
    }
};

/**
 * Extend the Object properties
 *
 * @param {Object}
 *            base The base object
 * @param {Object}
 *            sub  The sub object
 */
zimbra_notifier_Util.extend = function(base, sub) {
    var tmp = function() {};
    // Copy the prototype from the base to setup inheritance
    tmp.prototype = base.prototype;
    sub.prototype = new tmp();
    // The constructor property was set wrong, let's fix it
    sub.prototype.constructor = sub;
};
