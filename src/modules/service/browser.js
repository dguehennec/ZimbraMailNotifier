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

/************************** Util functions ***********************/

/**
 * Creates a global instance of zimbra_notifier_BrowserUtil
 *
 * @constructor
 * @this {Browser}
 *
 */
var zimbra_notifier_BrowserUtil = {
    _logger: new zimbra_notifier_Logger('BrowserUtil'),
};

/**
 * Find an already opened tab and get the focus on it
 *
 * @this {BrowserUtil}
 * @param {String}
 *            url url to find.
 * @param {Function} callback to send tab, null if not found
 */
zimbra_notifier_BrowserUtil.selectOpenedTab = function (url, callback) {
    try {
        chrome.tabs.query({}, function (extensionTabs) {
            var zimbraTab = null;
            for (var i = 0; i < extensionTabs.length; i++) {
                var currentTab = extensionTabs[i];
                if (currentTab.url && currentTab.url.indexOf(url) === 0) {
                    chrome.tabs.update(currentTab.id, {
                        active: true,
                    });
                    zimbraTab = currentTab;
                }
            }
            if (callback) {
                callback(zimbraTab);
            }
        });
    } catch (e) {
        this._logger.error('Fail to selected tab from url (' + url + '): ' + e);
    }
};

/**
 * open a new url
 *
 * @this {BrowserUtil}
 * @param {String}
 *            url url to open.
 */
zimbra_notifier_BrowserUtil.openNewTab = function (url) {
    chrome.tabs.create({url: url});
};

/**
 * Get the cookie value
 *
 * @this {BrowserUtil}
 * @param {String}
 *            url  The URL associated with the cookie
 * @param {String}
 *            key  The key of the cookie
 * @param {Function}
 *            callback  the callback when cookie found
 */
zimbra_notifier_BrowserUtil.getCookieValue = function (url, key, callback) {
    chrome.cookies.get({url: url, name: key}, function (cookie) {
        if (callback) {
            callback(cookie);
        }
    });
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
zimbra_notifier_BrowserUtil.addSessionCookie = function (url, key, value, httpOnly) {
    if (url && key) {
        var expir = new Date().getTime() / 1000 + 48 * 3600;
        chrome.cookies.set({
            url: url,
            name: key,
            value: value,
            httpOnly: httpOnly,
            expirationDate: expir,
        });
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
zimbra_notifier_BrowserUtil.removeCookie = function (url, key) {
    if (url && key) {
        chrome.cookies.remove({url: url, name: key});
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
var zimbra_notifier_Browser = function () {
    this._logger = new zimbra_notifier_Logger('Browser');
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
zimbra_notifier_Browser.prototype.setWebPageInfo = function (url, addCookies, httpOnly) {
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
zimbra_notifier_Browser.prototype.updateCookies = function (urlWebService, cookies) {
    // If we are just disconnected, remove the browser cookie
    if (
        this._addCookiesOnOpenUrl &&
        this._urlWebService &&
        !this._getAuthTokenFromList(cookies) &&
        this._getAuthTokenFromList(this._cookies)
    ) {
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
zimbra_notifier_Browser.prototype.openWebPage = function () {
    try {
        const urlWeb = this._urlWebPage || this._urlWebService;
        if (urlWeb) {
            var that = this;
            var openUrlFunction = function (needReload) {
                zimbra_notifier_BrowserUtil.selectOpenedTab(urlWeb, function (tab) {
                    if (tab !== null) {
                        if (tab.url.indexOf('loginOp=') >= 0) {
                            chrome.tabs.update(tab.id, {
                                url: urlWeb,
                            });
                        } else if (needReload) {
                            chrome.tabs.reload(tab.id);
                        }
                    } else {
                        zimbra_notifier_BrowserUtil.openNewTab(urlWeb);
                    }
                });
            };
            // Inject cookie if needed
            if (this._addCookiesOnOpenUrl && this._urlWebService) {
                var tokenWebServ = this._getAuthTokenFromList(this._cookies);
                if (tokenWebServ !== null) {
                    // Check if browser token cookie is the same that the token use in this app
                    zimbra_notifier_BrowserUtil.getCookieValue(
                        this._urlWebService,
                        'ZM_AUTH_TOKEN',
                        function (cookie) {
                            var needReload = false;
                            if (!cookie || cookie.value !== tokenWebServ) {
                                needReload = true;
                            }
                            // Sync cookies used in this module and the browser cookies
                            that._setAuthCookies();
                            // Open the URL
                            openUrlFunction(needReload);
                        },
                    );
                }
            } else {
                // just open the URL
                openUrlFunction(false);
            }
        }
    } catch (e) {
        this._logger.error('Fail to open zimbra web interface: ' + e);
    }
};

/**
 * Add to the cookie manager the authentication cookies of zimbra
 *
 * @this {Browser}
 * @private
 */
zimbra_notifier_Browser.prototype._setAuthCookies = function () {
    try {
        for (var idx = 0; idx < this._cookies.length; idx++) {
            var c = this._cookies[idx];
            var httpOnly = c.httpOnly;
            if (httpOnly === undefined) {
                httpOnly = this._cookiesUseHttpOnly;
            }
            zimbra_notifier_BrowserUtil.addSessionCookie(
                this._urlWebService,
                c.key,
                c.val,
                httpOnly,
            );
        }
    } catch (e) {
        this._logger.error('Fail to set authentication cookies: ' + e);
    }
};

/**
 * Find from the cookie array, the auth token value
 *
 * @this {Browser}
 * @private
 */
zimbra_notifier_Browser.prototype._getAuthTokenFromList = function (cookies) {
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
