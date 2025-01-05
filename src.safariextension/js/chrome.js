
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
 * Portions created by the Initial Developer are Copyright (C) 2014
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

 if(typeof chrome === "undefined") {
    chrome = {
        _callbacksCookie: [],
        _notifications: [],
        _callbacksNotification: [],
        action: {
            setIcon: function(details, callback) {
                if (!details || !details.path) {
                    return;
                }
                safari.extension.toolbarItems.forEach(function(item) {
                    if (item.identifier === 'zimbraMailNotifierTab') {
                        item.image = safari.extension.baseURI + details.path;
                    }
                });
                if(callback) {
                    callback();
                }
            },
            setBadgeText: function(details, callback) {
                if (!details) {
                    return;
                }
                safari.extension.toolbarItems.forEach(function(item) {
                    if (item.identifier === 'zimbraMailNotifierTab') {
                        if(details.text !== '') {
                            item.badge = details.text;
                        } else {
                            item.badge = 0;
                        }
                    }
                });
                if(callback) {
                    callback();
                }
            }
        },
        cookies: {
            callbackResult: function(details) {
                for(var index = (chrome._callbacksCookie.length - 1); index >= 0 ; index--) {
                    if(chrome._callbacksCookie[index].id = details.id) {
                        if(chrome._callbacksCookie[index].callback) {
                            chrome._callbacksCookie[index].callback(details);
                        }
                        chrome._callbacksCookie.splice(index, 1);
                    }
                }
            },
            remove: function(details, callback) {
                var tab = chrome.tabs.getTab(details.url);
                if(tab && details) {
                    details.id = (new Date()).getTime();
                    tab.page.dispatchMessage("zimbraMailNotifier_removeCookie", details);
                    chrome._callbacksCookie.push({id: details.id, callback: callback});
                } else if(callback) {
                    callback(null);
                }
            },
            get: function(details, callback) {
                var tab = chrome.tabs.getTab(details.url);
                if(tab && details) {
                    details.id = (new Date()).getTime();
                    tab.page.dispatchMessage("zimbraMailNotifier_getCookie", details);
                    chrome._callbacksCookie.push({id: details.id, callback: callback});
                }
                else if(callback) {
                    callback(null);
                }
            },
            set: function(details, callback) {
                var tab = chrome.tabs.getTab(details.url);
                if(tab && details) {
                    details.id = (new Date()).getTime();
                    tab.page.dispatchMessage("zimbraMailNotifier_setCookie", details);
                    chrome._callbacksCookie.push({id: details.id, callback: callback});
                }
                else if(callback) {
                    callback(null);
                }
            }
        },
        storage: {
            local: {
                get: function(defaultPrefs, callback) {
                    if (callback) {
                        var prefs = localStorage.getItem('prefs')
                        if (prefs) {
                            try {
                                prefs = JSON.parse(prefs);
                            }
                            catch(e) {
                                
                            }
                            callback(prefs);
                        } else {
                            callback(defaultPrefs);
                        }
                    }
                },
                set: function(prefs) {
                    if (prefs) {
                        localStorage.setItem('prefs', JSON.stringify(prefs));
                    } else {
                        localStorage.setItem('prefs', null);
                    }
                }
            }
        },
        tabs: {
            getTab: function(url) {
                var browserWindows = safari.application.browserWindows;
                for(var indexWindow = 0; indexWindow < browserWindows.length; indexWindow++) {
                    var tabs = browserWindows[indexWindow].tabs;
                    for(var indexTab = 0; indexTab < tabs.length; indexTab++) {
                        var currentTab = tabs[indexTab];
                        if(currentTab.url && currentTab.url.indexOf(url)===0) {
                            return currentTab;
                        }
                    }
                }
                return null;
            },
            create: function (obj, callback) {
                if(!obj.url) {
                    return;
                }

                if(obj.url.indexOf('://')<0) {
                    safari.extension.toolbarItems.forEach(function(item) {
                        if (item.identifier === 'zimbraMailNotifierTab') {
                            var url = chrome.runtime.getURL(obj.url);
                            if(item.popover) {
                                var identifier = item.popover.identifier;
                                item.popover.hide();
                                setTimeout(function() {
                                    item.popover = null;
                                    safari.extension.removePopover(identifier);
                                    var popup = safari.extension.createPopover("ZimbraMailNotifierOption", url, 760, 530);
                                    item.popover = popup;
                                    item.showPopover();
                                }, 100);            
                            } else {
                                var popup = safari.extension.createPopover("ZimbraMailNotifierOption", url, 760, 530);
                                item.popover=popup;
                                item.showPopover();
                            }
                        }
                    });
                } else {
                    var newTab = safari.application.activeBrowserWindow.openTab();
                    newTab.url = obj.url;
                    newTab.id = newTab.url + (new Date()).getTime();
                    if(obj.active) {
                        newTab.activate();
                    }
                    if(callback) {
                        callback(newTab);
                    }
                }
            },
            get: function (tabId, callback) {
                var tab;
                safari.application.browserWindows.forEach(function (brWindow, wI) {
                    brWindow.tabs.forEach(function (brTab, tabI) {
                        if(tabId === brTab.id) {
                            tab = brTab;
                            tab.index = tabI;
                            tab.windowId = wI;
                        }
                    })
                });
                if(callback) {
                    callback(tab);
                }
            },
            update: function(tabId, updateProperties, callback) {
                chrome.tabs.get(tabId, function(tab) {
                    if(tab) {
                        if(updateProperties.url) {
                            tab.url = updateProperties.url;
                        }
                        if(updateProperties.selected) {
                            tab.activate();
                        }
                    }
                    if (callback) {
                        callback(tab);
                    }
                });
            },
            reload: function(tabId, callback) {
                chrome.tabs.get(tabId, function(tab) {
                    if(tab) {
                        tab.page.dispatchMessage("zimbraMailNotifier_reload");
                    }
                    if (callback) {
                        callback(tab);
                    }
                });
            },
            query: function(queryInfo, callback) {
                if (callback) {
                    var tabs = [];
                    safari.application.browserWindows.forEach(function(win, winIndex) {
                        win.tabs.forEach(function(tab, tabIndex) {
                            if(!tab.id) {
                                tab.id = tab.url + (new Date()).getTime();
                            }
                            tab.index = tabIndex;
                            tab.windowId = winIndex;
                            tabs.push(tab);
                        });
                    });
                    callback(tabs);
                }
            }
        },
        runtime: {
            onUpdateAvailable: {
                addListener: function () {              // TODO dummy function for now

                }
            },
            onMessage: {
                addListener: function (callBack) {

                    var msgHandler = (function (cb) {
                        return function (event) {
                            var msgTarget = event.target.page ? event.target.page : safari.self.tab;

                            var sender = {}, sendResponse;
                            if (event.name.indexOf("callBack") > -1) {
                                sendResponse = function (msg) {
                                    msgTarget.dispatchMessage(event.name, msg);       //TODO find out if sendResponse can have call back
                                }
                            } else {
                                sendResponse = undefined;
                            }
                            sender.tab = event.target.page ? event.target : undefined;
                            if (sender.tab) {
                                //sender.tab.id = event.target.url;
                                sender.tab.id = event.target.id;
                            }
                            cb(event.message, sender, sendResponse);
                        }
                    })(callBack);

                    if (safari.self.addEventListener) {
                        safari.self.addEventListener("message", msgHandler, false);
                    } else {
                        safari.application.addEventListener("message", msgHandler, false);
                    }
                }
            },
            sendMessage: function (data, callBack) {
                var name = "noCallBack";
                if (callBack) {
                    name = "callBack" + new Date();
                    safari.self.addEventListener('message', function respondToMsg(msg) {
                        if (msg.name === name) {
                            safari.self.removeEventListener('message', respondToMsg, false);
                            callBack(msg.message);
                        }
                    }, false);
                }

                safari.self.tab.dispatchMessage(name, data);

            }
        },
        extension: {
            getURL: function (url) {
                return safari.extension.baseURI + url;
            },
            getBackgroundPage: function() {
                return safari.extension.globalPage.contentWindow;
            }
        },
        i18n: {
            getMessage: function(key) {
                var value = '';
                try {
                    var locale = chrome.extension.getBackgroundPage().zimbra_notifier_locale.getLocale();
                    if(locale[key]){
                        value = locale[key].message;
                    }
                } catch (e) {
                }
                return value;
            }
        },
        notifications: {
            create: function(notificationId, options, callback) {
                if (window.Notification.permission === "granted") {
                    if(!notificationId) {
                        notificationId = (new Date).getTime();
                    }
                    var notification = new window.Notification(options.title, { icon: chrome.runtime.getURL(options.iconUrl), body: options.message, tag: notificationId});
                    chrome._notifications[notificationId] = notification;
                    notification.onclick = function(event) {
                        event.preventDefault();
                        chrome._callbacksNotification.forEach(function(callback) {
                            callback(event.target.tag);
                        });
                    };
                    if(callback) {
                        callback(notificationId);
                    }
                } else {
                    window.Notification.requestPermission(callbackFunction);
                }
            },
            onClicked: {
                addListener: function(listener) {
                    chrome._callbacksNotification.push(listener);
                }
            },
            clear: function(notificationId, callback) {
                if(chrome._notifications[notificationId]) {
                    chrome._notifications[notificationId].cancel();
                    chrome._notifications[notificationId] = undefined;
                    if(callback) {
                        callback(true);
                    }
                } else if(callback) {
                    callback(false);
                }
            }
        }
    };
}