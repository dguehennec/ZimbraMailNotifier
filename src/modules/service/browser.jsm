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
Components.utils.import("resource://zimbra_mail_notifier/service/prefs.jsm");

const EXPORTED_SYMBOLS = ["zimbra_notifier_Browser"];

/**
 * Creates a global instance of zimbra_notifier_Browser
 *
 * @constructor
 * @this {Browser}
 *
 */
const zimbra_notifier_Browser = {
    _urlWebService: null,
    _cookies: []
};

/**
 * Update required cookies
 *
 * @this {Browser}
 * @param {String}
 *            urlWebService  The url of the webservice associated with the cookies
 * @param {Object}
 *            cookies  Array of cookies (object: key, val) needed for authentication
 */
zimbra_notifier_Browser.updateCookies = function(urlWebService, cookies) {
    this._urlWebService = urlWebService;
    this._cookies = cookies;
};

/**
 * Find an already opened tab and get the focus on it
 *
 * @this {Browser}
 * @param {String}
 *            url url to find.
 * @return {browser} null if not found
 */
zimbra_notifier_Browser.selectOpenedTab = function(url) {
    try {
        var browserEnumerator = Services.wm.getEnumerator("navigator:browser");
        // Clean url
        var exp = /(\b(https|http):\/\/)/gi;
        url = url.replace(exp, "");
        if (url.lastIndexOf('/') === url.length - 1) {
            url = url.slice(0, -1);
        }

        while (browserEnumerator.hasMoreElements()) {
            var browserInstance = browserEnumerator.getNext().getBrowser();
            var numTabs = browserInstance.mPanelContainer.childNodes.length;
            for ( var index = 0; index < numTabs; index++) {
                var currentTab = browserInstance.getBrowserAtIndex(index);
                if (currentTab.currentURI.spec.indexOf(url) >= 0) {
                    browserInstance.selectedTab = browserInstance.tabContainer.childNodes[index];
                    try {
                        // browserInstance <=> https://developer.mozilla.org/en-US/docs/XUL/browser
                        browserInstance.contentWindow.focus();
                        browserInstance.focus();
                    }
                    catch (e) { }
                    return browserInstance;
                }
            }
        }
    }
    catch (e) { }
    return null;
};

/**
 * open a new url
 *
 * @this {Browser}
 * @param {String}
 *            url url to open.
 * @return {Boolean} true if success
 */
zimbra_notifier_Browser.openNewTab = function(url) {
    try {
        var win = Services.wm.getMostRecentWindow("navigator:browser");
        if (win) {
            win.delayedOpenTab(url, null, null, null, null);
        }
        else {
            win = Services.ww.openWindow(Services.ww.activeWindow, url, null, null, null);
            try {
                if (Services.ww.activeWindow) {
                    Services.ww.activeWindow.focus();
                }
            }
            catch (e) { }
        }
        try {
            win.focus();
        }
        catch (e) { }
    }
    catch (e) {
        return false;
    }
    return true;
};

/**
 * Open the zimbra web interface
 *
 * @this {Browser}
 */
zimbra_notifier_Browser.openZimbraWebInterface = function() {
    try {
        var needReload = false;
        var urlWebInterface = zimbra_notifier_Prefs.getUrlUserInterface();
        if (urlWebInterface && this._urlWebService) {

            // Inject cookie if needed
            if (true) { // TODO
                // Check if browser token cookie is the same that the token use in this app
                var tokenBrowser = this.getCookieValue(this._urlWebService, 'ZM_AUTH_TOKEN');
                var tokenWebServ = this._getTokenCookieValue();
                if (tokenBrowser !== tokenWebServ) {
                    needReload = true;
                }
                // Sync cookies used in this module and the browser cookies
                this._setAuthCookies();
            }
            var browserInstance = this.selectOpenedTab(urlWebInterface);
            if (browserInstance !== null) {
                if (needReload) {
                    browserInstance.reload();
                }
            }
            else {
                this.openNewTab(urlWebInterface);
            }
        }
    }
    catch (e) {
    }
};

/**
 * Add to the cookie manager the authentication cookies of zimbra
 *
 * @this {Browser}
 * @private
 */
zimbra_notifier_Browser._setAuthCookies = function() {
    try {
        for (var idx = 0; idx < this._cookies.length; idx++) {
            var c = this._cookies[idx];
            this.addSessionCookie(this._urlWebService, c.key, c.val);
        }
    }
    catch (e) { }
};

/**
 * Find from the cookie array the token cookie value
 *
 * @this {Browser}
 * @private
 */
zimbra_notifier_Browser._getTokenCookieValue = function() {
    try {
        for (var idx = 0; idx < this._cookies.length; idx++) {
            var c = this._cookies[idx];
            if (c.key === 'ZM_AUTH_TOKEN') {
                return c.val;
            }
        }
    }
    catch (e) { }
    return '';
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
zimbra_notifier_Browser.getCookieValue = function(url, key) {
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
zimbra_notifier_Browser.addSessionCookie = function(url, key, value) {
    if (url && key) {
        var cookieUri = Services.io.newURI(url, null, null);
        var expir = ((new Date().getTime()) / 1000) + (48 * 3600);
        Services.cookies.add(cookieUri.host, cookieUri.path, key, value,
                             cookieUri.schemeIs("https"), false, true, expir);
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
zimbra_notifier_Browser.removeCookie = function(url, key) {
    if (url && key) {
        var cookieUri = Services.io.newURI(url, null, null);
        Services.cookies.remove(cookieUri.host, key, cookieUri.path, false);
    }
};
