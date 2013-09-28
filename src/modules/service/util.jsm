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
if (!com.zimbra.service) {
    com.zimbra.service = {};
}

/**
 * Creates a global instance of com.zimbra.service.Util
 *
 * @constructor
 * @this {Util}
 *
 */
com.zimbra.service.Util = {
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
com.zimbra.service.Util.getBundleString = function(param) {
    try {
        if (this._bundle === null) {
            this._bundle = window.document.getElementById("zimbra_mail_notifier-bundle").stringBundle;
        }
        return this._bundle.GetStringFromName(param);
    } catch (e) {
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
 *            func   The callback fired withe the timer timeout
 * @param {Number}
 *            delay  The number of ms
 *
 * @return {nsITimer} The created timer
 */
com.zimbra.service.Util.setTimer = function(timer, func, delay) {
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
com.zimbra.service.Util.secToTimeStr = function(time) {
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
com.zimbra.service.Util.formatDateTime = function(date) {
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
com.zimbra.service.Util.maxStringLength = function(text, length) {
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
com.zimbra.service.Util.openURL = function(UrlToGoTo) {
    try {
        var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].
            getService(Components.interfaces.nsIWindowMediator);

        var browserEnumerator = wm.getEnumerator("navigator:browser");
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
        var recentWindow = wm.getMostRecentWindow("navigator:browser");
        if (recentWindow) {
            recentWindow.delayedOpenTab(UrlToGoTo, null, null, null, null);
            recentWindow.focus();
        } else {
            window.open(UrlToGoTo);
            window.focus();
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
com.zimbra.service.Util.showNotificaton = function(title, text, callbackData, callback) {
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
com.zimbra.service.Util.playSound = function() {
    try {
        var sound = Components.classes["@mozilla.org/sound;1"].createInstance(Components.interfaces.nsISound);
        var os = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULRuntime).OS;
        if (os === "Darwin") {
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
 * install button.
 *
 * @this {Util}
 * @param {String}
 *            toolbarid
 * @param {String}
 *            id
 * @param {String}
 *            afterId indicate after the object Id
 */
com.zimbra.service.Util.installButton = function(toolbarId, id, afterId) {
    if (!window.document.getElementById(id)) {
        var toolbar = window.document.getElementById(toolbarId);
        var before = null;
        if (afterId) {
            var elem = window.document.getElementById(afterId);
            if (elem && elem.parentNode === toolbar) {
                before = elem.nextElementSibling;
            }
        }

        toolbar.insertItem(id, before);
        toolbar.setAttribute("currentset", toolbar.currentSet);
        window.document.persist(toolbar.id, "currentset");

        if (toolbarId === "addon-bar") {
            toolbar.collapsed = false;
        }
    }
};

/**
 * set menulist
 *
 * @this {Util}
 */
com.zimbra.service.Util.setMenulist = function(id, value) {
    var object = document.getElementById(id);
    var popup = object.menupopup;
    if (popup) {
        var children = popup.childNodes;
        for ( var index = 0; index < children.length; index++) {
            if (Number(children[index].value) === value) {
                object.selectedIndex = index;
                return;

            }
        }
    }
};

/**
 * set visibility.
 *
 * @this {Util}
 * @param {String}
 *            id
 * @param {String}
 *            visibility visibility of the object
 */
com.zimbra.service.Util.setVisibility = function(id, visibility) {
    if (window.document.getElementById(id)) {
        window.document.getElementById(id).style.visibility = visibility;
    }
};

/**
 * set attribute.
 *
 * @this {Util}
 * @param {String}
 *            id
 * @param {String}
 *            attribute attribute to set
 * @param {String}
 *            value value of the attribute
 */
com.zimbra.service.Util.setAttribute = function(id, attribute, value) {
    if (window.document.getElementById(id)) {
        window.document.getElementById(id).setAttribute(attribute, value);
    }
};

/**
 * set textContent.
 *
 * @this {Util}
 * @param {String}
 *            id
 * @param {String}
 *            attribute attribute to set
 * @param {String}
 *            value value of the attribute
 */
com.zimbra.service.Util.setTextContent = function(id, value) {
    if (window.document.getElementById(id)) {
        window.document.getElementById(id).textContent = value;
    }
};
/**
 * get attribute.
 *
 * @this {Util}
 * @param {String}
 *            id
 * @param {String}
 *            attribute attribute to get
 * @return {Object} value of the attribute
 */
com.zimbra.service.Util.getAttribute = function(id, attribute) {
    if (window.document.getElementById(id)) {
        return window.document.getElementById(id)[attribute];
    }
    return undefined;
};

/**
 * remove attribute.
 *
 * @this {Util}
 * @param {String}
 *            id
 * @param {String}
 *            attribute attribute to remove
 */
com.zimbra.service.Util.removeAttribute = function(id, attribute) {
    if (window.document.getElementById(id)) {
        window.document.getElementById(id).removeAttribute(attribute);
    }
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
com.zimbra.service.Util.addObserver = function(observer, topic) {
    var observerService = Components.classes["@mozilla.org/observer-service;1"].
        getService(Components.interfaces.nsIObserverService);
    observerService.addObserver(observer, topic, false);
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
com.zimbra.service.Util.removeObserver = function(observer, topic) {
    var observerService = Components.classes["@mozilla.org/observer-service;1"].
        getService(Components.interfaces.nsIObserverService);
    observerService.removeObserver(observer, topic);
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
com.zimbra.service.Util.notifyObservers = function(topic, data) {
    var observerService = Components.classes["@mozilla.org/observer-service;1"].
        getService(Components.interfaces.nsIObserverService);
    observerService.notifyObservers(null, topic, data);
};
