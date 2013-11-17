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
Components.utils.import("resource://zimbra_mail_notifier/service/util.jsm");
Components.utils.import("resource://zimbra_mail_notifier/service/logger.jsm");

var EXPORTED_SYMBOLS = ["zimbra_notifier_Browser", "zimbra_notifier_BrowserUtil"];

/************************** Util functions ***********************/

/**
 * Creates a global instance of zimbra_notifier_BrowserUtil
 *
 * @constructor
 * @this {Browser}
 *
 */
var zimbra_notifier_BrowserUtil = {
    _logger: new zimbra_notifier_Logger("BrowserUtil")
};

/**
 * Find an already opened tab and get the focus on it
 *
 * @this {BrowserUtil}
 * @param {String}
 *            url url to find.
 * @return {XULbrowser} null if not found
 */
zimbra_notifier_BrowserUtil.selectOpenedTab = function(url) {
    try {
        var browserEnumerator = Services.wm.getEnumerator("navigator:browser");
        var uriToMatch = Services.io.newURI(url, null, null);
        var hostToMatch = uriToMatch.asciiHost;
        var pathToMatch = uriToMatch.path.match(/^[^?&#]*/)[0];

        while (browserEnumerator.hasMoreElements()) {
            var browserInstance = browserEnumerator.getNext().getBrowser();
            var numTabs = browserInstance.mPanelContainer.childNodes.length;
            for ( var index = 0; index < numTabs; index++) {
                // browserInstance <=> https://developer.mozilla.org/en/docs/XUL/tabbrowser
                // currentTab      <=> https://developer.mozilla.org/en/docs/XUL/browser
                var currentTab = browserInstance.getBrowserAtIndex(index);
                if ((currentTab.currentURI.asciiHost === hostToMatch) &&
                    (currentTab.currentURI.path.indexOf(pathToMatch) === 0)) {

                    browserInstance.selectedTab = browserInstance.tabContainer.childNodes[index];
                    try {
                        browserInstance.contentWindow.focus();
                        browserInstance.focus();
                    }
                    catch (e) {
                        this._logger.warning("Fail to get focus on selected tab: " + e);
                    }
                    return currentTab;
                }
            }
        }
    }
    catch (e) {
        this._logger.error("Fail to selected tab from url (" + url + "): " + e);
    }
    return null;
};

/**
 * open a new url
 *
 * @this {BrowserUtil}
 * @param {String}
 *            url url to open.
 * @return {Boolean} true if success
 */
zimbra_notifier_BrowserUtil.openNewTab = function(url) {
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
            catch (e) {
                this._logger.warning("Fail to get focus on active window: " + e);
            }
        }
        try {
            win.focus();
        }
        catch (e) {
            this._logger.warning("Fail to get focus on opened window: " + e);
        }
    }
    catch (e) {
        this._logger.error("Fail to open new tab, url (" + url + "): " + e);
        return false;
    }
    return true;
};

/**
 * Get the cookie value
 *
 * @this {BrowserUtil}
 * @param {String}
 *            url  The URL associated with the cookie
 * @param {String}
 *            key  The key of the cookie
 */
zimbra_notifier_BrowserUtil.getCookieValue = function(url, key) {
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
 * @this {BrowserUtil}
 * @param {String}
 *            url  The URL associated with the cookie
 * @param {String}
 *            key  The key of the cookie
 * @param {String}
 *            value  The value of the cookie
 * @param {Boolean}
 *            httpOnly  True if the cookie is httpOnly
 */
zimbra_notifier_BrowserUtil.addSessionCookie = function(url, key, value, httpOnly) {
    if (url && key) {
        var cookieUri = Services.io.newURI(url, null, null);
        var expir = ((new Date().getTime()) / 1000) + (48 * 3600);
        Services.cookies.add(cookieUri.host, cookieUri.path, key, value,
                             cookieUri.schemeIs("https"), httpOnly, true, expir);
    }
};

/**
 * Remove a cookie
 *
 * @this {BrowserUtil}
 * @param {String}
 *            url  The URL associated with the cookie
 * @param {String}
 *            key  The key of the cookie
 */
zimbra_notifier_BrowserUtil.removeCookie = function(url, key) {
    if (url && key) {
        var cookieUri = Services.io.newURI(url, null, null);
        Services.cookies.remove(cookieUri.host, key, cookieUri.path, false);
    }
};

/**
 * Freeze the interface
 */
Object.freeze(zimbra_notifier_BrowserUtil);

/************************** Browser controller ***********************/

/**
 * Creates a instance of zimbra_notifier_Browser
 *
 * @constructor
 * @this {Browser}
 *
 */
var zimbra_notifier_Browser = function() {
    this._logger = new zimbra_notifier_Logger("Browser");
    this._urlWebService = null;
    this._cookies = [];
    this._urlWebPage = null;
    this._addCookiesOnOpenUrl = false;
    this._cookiesUseHttpOnly = false;
};

/**
 * Update information to open the web interface
 *
 * @this {Browser}
 * @param {String}
 *            url  The url of the web interface
 * @param {Boolean[]}
 *            addCookies True if cookies should be added to the web browser before opening the web page
 * @param {Boolean}
 *            httpOnly True to create httpOnly cookies
 */
zimbra_notifier_Browser.prototype.setWebPageInfo = function(url, addCookies, httpOnly) {
    this._urlWebPage = url;
    this._addCookiesOnOpenUrl = addCookies;
    this._cookiesUseHttpOnly = httpOnly;
};

/**
 * Update required cookies
 *
 * @this {Browser}
 * @param {String}
 *            urlWebService  The url of the webservice associated with the cookies
 * @param {Object[]}
 *            cookies  Array of cookies (object: key, val) needed for authentication
 */
zimbra_notifier_Browser.prototype.updateCookies = function(urlWebService, cookies) {

    // If we are just disconnected, remove the browser cookie
    if (this._addCookiesOnOpenUrl && this._urlWebService &&
        !this._getAuthTokenFromList(cookies) && this._getAuthTokenFromList(this._cookies)) {

        zimbra_notifier_BrowserUtil.removeCookie(this._urlWebService, 'ZM_AUTH_TOKEN');
    }
    this._urlWebService = urlWebService;
    this._cookies = cookies;
};

/**
 * Open the zimbra web interface
 *
 * @this {Browser}
 */
zimbra_notifier_Browser.prototype.openWebPage = function() {
    try {
        var needReload = false;
        if (this._urlWebPage) {

            // Inject cookie if needed
            if (this._addCookiesOnOpenUrl && this._urlWebService) {

                var tokenWebServ = this._getAuthTokenFromList(this._cookies);
                if (tokenWebServ !== null) {
                    // Check if browser token cookie is the same that the token use in this app
                    var tokenBrowser = zimbra_notifier_BrowserUtil.getCookieValue(
                                            this._urlWebService, 'ZM_AUTH_TOKEN');
                    if (tokenBrowser !== tokenWebServ) {
                        needReload = true;
                    }
                    // Sync cookies used in this module and the browser cookies
                    this._setAuthCookies();
                }
            }
            // Open the URL
            var tab = zimbra_notifier_BrowserUtil.selectOpenedTab(this._urlWebPage);
            if (tab !== null) {
                if (tab.currentURI.path.indexOf("loginOp=") >= 0) {
                    tab.loadURI(this._urlWebPage);
                }
                else if (needReload) {
                    tab.reload();
                }
            }
            else {
                zimbra_notifier_BrowserUtil.openNewTab(this._urlWebPage);
            }
        }
    }
    catch (e) {
        this._logger.error("Fail to open zimbra web interface: " + e);
    }
};

/**
 * Add to the cookie manager the authentication cookies of zimbra
 *
 * @this {Browser}
 * @private
 */
zimbra_notifier_Browser.prototype._setAuthCookies = function() {
    try {
        for (var idx = 0; idx < this._cookies.length; idx++) {
            var c = this._cookies[idx];
            var httpOnly = c.httpOnly;
            if (httpOnly === undefined) {
                httpOnly = this._cookiesUseHttpOnly;
            }
            zimbra_notifier_BrowserUtil.addSessionCookie(
                this._urlWebService, c.key, c.val, httpOnly);
        }
    }
    catch (e) {
        this._logger.error("Fail to set authentication cookies: " + e);
    }
};

/**
 * Find from the cookie array, the auth token value
 *
 * @this {Browser}
 * @private
 */
zimbra_notifier_Browser.prototype._getAuthTokenFromList = function(cookies) {
    if (cookies) {
        for (var idx = 0; idx < cookies.length; idx++) {
            if (cookies[idx].key === 'ZM_AUTH_TOKEN') {
                return cookies[idx].val;
            }
        }
    }
    return null;
};

/**
 * Freeze the interface
 */
Object.freeze(zimbra_notifier_Browser);
