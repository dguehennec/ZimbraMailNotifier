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

var EXPORTED_SYMBOLS = ["zimbra_notifier_Prefs"];

/**
 * Creates an instance of Prefs.
 *
 * @constructor
 * @this {Prefs}
 */
var zimbra_notifier_Prefs = {
    _prefs: null,
    _is_first_launch: false,
    _previous_version: 0
};

/**
 * pref identifiers
 *
 * @constant
 */
zimbra_notifier_Prefs.PREF = {
    // email + general
    CURRENT_VERSION                 : "currentVersion",
    AUTOCONNECT                     : "autoConnect",
    EMAIL_NOTIFICATION_ENABLED      : "systemNotificationEnabled",
    EMAIL_SOUND_ENABLED             : "soundEnabled",
    EMAIL_SOUND_SELECTED            : "emailSoundSelected",
    EMAIL_SOUND_FILE                : "emailSoundFile",
    EMAIL_SOUND_VOLUME              : "emailSoundVolume",
    EMAIL_NOTIFICATION_DURATION     : "emailNotificationDuration",
    // Browser
    BROWSER_SET_COOKIES             : "browserSetCookies",
    BROWSER_COOKIE_HTTP_ONLY        : "browserCookieHttpOnly",
    // popup
    POPUP_COLOR                     : "popupColor",
    POPUP_WIDTH                     : "popupWidth",
    // Message
    MESSAGE_ENABLED                 : "messageEnabled",
    MESSAGE_NB_DISPLAYED            : "messageNbDisplayed",
    MESSAGE_NB_CHARACTERS_DISPLAYED : "messageNbCharactersDisplayed",
    // calendar
    CALENDAR_ENABLED                : "calendarEnabled",
    CALENDAR_PERIOD_DISPLAYED       : "calendarPeriodDisplayed",
    CALENDAR_NB_DISPLAYED           : "calendarNbDisplayed",
    CALENDAR_NOTIFICATION_ENABLED   : "calendarSystemNotificationEnabled",
    CALENDAR_SOUND_ENABLED          : "calendarSoundEnabled",
    CALENDAR_SOUND_SELECTED         : "calendarSoundSelected",
    CALENDAR_SOUND_FILE             : "calendarSoundFile",
    CALENDAR_SOUND_VOLUME           : "calendarSoundVolume",
    CALENDAR_REMINDER_TIME_CONF     : "calendarReminderTimeConf",
    CALENDAR_REMINDER_NB_REPEAT     : "calendarReminderRepeatNb",
    // task
    TASK_ENABLED                    : "taskEnabled",
    TASK_NB_DISPLAYED               : "taskNbDisplayed",
    TASK_PRIORITIES                 : "taskPriorities",
    // account
    ACCOUNTS                        : "accounts",
    // user
    USER_ALIAS                      : "userAlias",
    USER_LOGIN                      : "userLogin",
    USER_PASSWORD                   : "userPassword",
    USER_URL_WEB_SERVICE            : "userServer",
    USER_URL_WEB_INTERFACE          : "userUrlWebInteface",
    USER_SAVEPASSWORD               : "userSavePassword",
    DEVICE_TRUSTED_INFOS            : "deviceTrustedInfos",
    // About Wait set
    WAITSET_INFO                    : "waitSetInfo",
    REQUEST_QUERY_TIMEOUT           : "requestQueryTimeout",
    REQUEST_WAIT_TIMEOUT            : "requestWaitTimeout",
    REQUEST_WAIT_LOOP_TIME          : "requestWaitLoopTime",

    USER_PASSWORD_KEY               : "ZimDguBro"
};
zimbra_notifier_Util.deepFreeze(zimbra_notifier_Prefs.PREF);

/**
 * Load preferences
 *
 * @this {Prefs}
 */
zimbra_notifier_Prefs.load = function() {

    // Get the previous version
    var previous_version = this._getPref(this.PREF.CURRENT_VERSION);

    // Check if this is the first time the extension is started
    if (previous_version===0) {
        this._is_first_launch = true;
    } else if (previous_version < 0x020000) {
        var accountId = this.addNewAccount();
        // user
        this.updatePref(this.PREF.USER_LOGIN + accountId, this._getPref(this.PREF.USER_LOGIN));
        this.updatePref(this.PREF.USER_PASSWORD + accountId, this._getPref(this.PREF.USER_PASSWORD));
        this.updatePref(this.PREF.USER_SAVEPASSWORD + accountId, this._getPref(this.PREF.USER_SAVEPASSWORD));
        this.updatePref(this.PREF.USER_URL_WEB_SERVICE + accountId, this._getPref(this.PREF.USER_URL_WEB_SERVICE));
        this.updatePref(this.PREF.USER_URL_WEB_INTERFACE + accountId, this._getPref(this.PREF.USER_URL_WEB_INTERFACE));
        // About Wait set
        this.updatePref(this.PREF.WAITSET_INFO + accountId, this._getPref(this.PREF.WAITSET_INFO));
        this.updatePref(this.PREF.REQUEST_QUERY_TIMEOUT + accountId, this._getPref(this.PREF.REQUEST_QUERY_TIMEOUT));
        this.updatePref(this.PREF.REQUEST_WAIT_TIMEOUT + accountId, this._getPref(this.PREF.REQUEST_WAIT_TIMEOUT));
        this.updatePref(this.PREF.REQUEST_WAIT_LOOP_TIME + accountId, this._getPref(this.PREF.REQUEST_WAIT_LOOP_TIME));
    }

    // Set the current version
    this.pref_current_version = zimbra_notifier_Constant.VERSION;
    this._prefs.setPref(this.PREF.CURRENT_VERSION, this.pref_current_version);

    // email + general
    this.pref_autoConnect                  = this._getPref(this.PREF.AUTOCONNECT);
    this.pref_email_notification_enabled   = this._getPref(this.PREF.EMAIL_NOTIFICATION_ENABLED);
    this.pref_email_sound_enabled          = this._getPref(this.PREF.EMAIL_SOUND_ENABLED);
    this.pref_email_sound_selected         = this._getPref(this.PREF.EMAIL_SOUND_SELECTED);
    this.pref_email_sound_file             = this._getPref(this.PREF.EMAIL_SOUND_FILE);
    this.pref_email_sound_volume           = this._getPref(this.PREF.EMAIL_SOUND_VOLUME);
    this.pref_email_notification_duration  = this._getPref(this.PREF.EMAIL_NOTIFICATION_DURATION);
    // Browser
    this.pref_browser_set_cookies          = this._getPref(this.PREF.BROWSER_SET_COOKIES);
    this.pref_browser_cookie_http_only     = this._getPref(this.PREF.BROWSER_COOKIE_HTTP_ONLY);
    // Popup
    this.pref_popup_color                  = this._getPref(this.PREF.POPUP_COLOR);
    this.pref_popup_width                  = this._getPref(this.PREF.POPUP_WIDTH);
    // message
    this.pref_message_enabled                 = this._getPref(this.PREF.MESSAGE_ENABLED);
    this.pref_message_nb_displayed            = this._getPref(this.PREF.MESSAGE_NB_DISPLAYED);
    this.pref_message_nb_characters_displayed = this._getPref(this.PREF.MESSAGE_NB_CHARACTERS_DISPLAYED);
    // calendar
    this.pref_calendar_enabled               = this._getPref(this.PREF.CALENDAR_ENABLED);
    this.pref_calendar_period_displayed      = this._getPref(this.PREF.CALENDAR_PERIOD_DISPLAYED);
    this.pref_calendar_nb_displayed          = this._getPref(this.PREF.CALENDAR_NB_DISPLAYED);
    this.pref_calendar_notification_enabled  = this._getPref(this.PREF.CALENDAR_NOTIFICATION_ENABLED);
    this.pref_calendar_sound_enabled         = this._getPref(this.PREF.CALENDAR_SOUND_ENABLED);
    this.pref_calendar_sound_selected        = this._getPref(this.PREF.CALENDAR_SOUND_SELECTED);
    this.pref_calendar_sound_file            = this._getPref(this.PREF.CALENDAR_SOUND_FILE);
    this.pref_calendar_sound_volume           = this._getPref(this.PREF.CALENDAR_SOUND_VOLUME);
    this.pref_calendar_reminder_time_conf    = this._getPref(this.PREF.CALENDAR_REMINDER_TIME_CONF);
    this.pref_calendar_reminder_nb_repeat    = this._getPref(this.PREF.CALENDAR_REMINDER_NB_REPEAT);
    // task
    this.pref_task_enabled            = this._getPref(this.PREF.TASK_ENABLED);
    this.pref_task_nb_displayed       = this._getPref(this.PREF.TASK_NB_DISPLAYED);
    this.pref_task_priorities         = this._getPref(this.PREF.TASK_PRIORITIES);
};

/**
 * Init preference object, listen for preference change
 *
 * @this {Prefs}
 */
zimbra_notifier_Prefs.init = function(callback) {
    if (!this._prefs) {
        this._prefs = PrefsService;
    this._prefs.init( function() {
        zimbra_notifier_Prefs.load();
        if(callback) {
            callback();
        }
    });
    }
    else {
        this.load();
        if(callback) {
            callback();
        }
    }
};

/**
 * Remove observer, called from shutdown
 *
 * @this {Prefs}
 */
zimbra_notifier_Prefs.release = function() {
    if (this._prefs) {
        // synchronize before release
        this._prefs.synchronize(true);
        this._prefs = null;
    }
};

/**
 * Add new Account
 *
 * @this {Prefs}
 * @return {String} accountId
 */
zimbra_notifier_Prefs.addNewAccount = function() {
    var accountId = "-" + Math.floor(Math.random() * 9999);
    var accounts = this.getPref(this.PREF.ACCOUNTS);
    accounts.push(accountId);
    this.updatePref(this.PREF.ACCOUNTS, accounts);
    return accountId;
}

/**
 * Remove account
 *
 * @this {Prefs}
 * @param {String} accountId
 */
zimbra_notifier_Prefs.removeAccount = function(accountId) {
    var accounts = this.getPref(this.PREF.ACCOUNTS);
    for (var index = 0; index < accounts.length; index++) {
        if (accounts[index] === accountId) {
            accounts.splice(index, 1);
            break;
        }
    }
    this.updatePref(this.PREF.ACCOUNTS, accounts);
    // remove account pref of accountId
    this._removePref(this.PREF.USER_ALIAS + accountId);
    this._removePref(this.PREF.USER_LOGIN + accountId);
    this._removePref(this.PREF.USER_PASSWORD + accountId);
    this._removePref(this.PREF.USER_URL_WEB_SERVICE + accountId);
    this._removePref(this.PREF.USER_URL_WEB_INTERFACE + accountId);
    this._removePref(this.PREF.USER_SAVEPASSWORD + accountId);
    this._removePref(this.PREF.DEVICE_TRUSTED_INFOS + accountId);
    // remove wait set pref of accountId
    this._removePref(this.PREF.WAITSET_INFO + accountId);
    this._removePref(this.PREF.REQUEST_QUERY_TIMEOUT + accountId);
    this._removePref(this.PREF.REQUEST_WAIT_TIMEOUT + accountId);
    this._removePref(this.PREF.REQUEST_WAIT_LOOP_TIME + accountId);
}

/**
 * get preference
 *
 * @this {Prefs}
 * @param {String} key of the preference
 * @return {Object} value of the preference key
 */
zimbra_notifier_Prefs.getPref = function(key) {
    var value = undefined;
    var accountId = undefined;
    if(key) {
        var result = key.split("-");
        if(result.length == 2) {
            key = result[0];
            accountId = "-" + result[1];
        }
    }
    switch (key) {
        // email + general
        case this.PREF.AUTOCONNECT:
            value = this.pref_autoConnect;
            break;

        case this.PREF.EMAIL_NOTIFICATION_ENABLED:
            value = this.pref_email_notification_enabled;
            break;
        case this.PREF.EMAIL_SOUND_ENABLED:
            value = this.pref_email_sound_enabled;
            break;
        case this.PREF.EMAIL_SOUND_SELECTED:
            value = this.pref_email_sound_selected;
            break;
        case this.PREF.EMAIL_SOUND_FILE:
            value = this.pref_email_sound_file;
            break;
        case this.PREF.EMAIL_SOUND_VOLUME:
            value = this.pref_email_sound_volume;
            break;

        case this.PREF.EMAIL_NOTIFICATION_DURATION:
            value = this.pref_email_notification_duration;
            break;

        // Browser
        case this.PREF.BROWSER_SET_COOKIES:
            value = this.pref_browser_set_cookies;
            break;

        case this.PREF.BROWSER_COOKIE_HTTP_ONLY:
            value = this.pref_browser_cookie_http_only;
            break;

        // Popup
        case this.PREF.POPUP_COLOR:
            value = this.pref_popup_color;
            break;
        case this.PREF.POPUP_WIDTH:
            value = this.pref_popup_width;
            break;

        // message
        case this.PREF.MESSAGE_ENABLED:
            value = this.pref_message_enabled;
            break;

        case this.PREF.MESSAGE_NB_DISPLAYED:
            value = this.pref_message_nb_displayed;
            break;

        case this.PREF.MESSAGE_NB_CHARACTERS_DISPLAYED:
            value = this.pref_message_nb_characters_displayed;
            break;

        // calendar
        case this.PREF.CALENDAR_ENABLED:
            value = this.pref_calendar_enabled;
            break;

        case this.PREF.CALENDAR_PERIOD_DISPLAYED:
            value = this.pref_calendar_period_displayed;
            break;

        case this.PREF.CALENDAR_NB_DISPLAYED:
            value = this.pref_calendar_nb_displayed;
            break;

        case this.PREF.CALENDAR_NOTIFICATION_ENABLED:
            value = this.pref_calendar_notification_enabled;
            break;

        case this.PREF.CALENDAR_SOUND_ENABLED:
            value = this.pref_calendar_sound_enabled;
            break;

        case this.PREF.CALENDAR_SOUND_SELECTED:
            value = this.pref_calendar_sound_selected;
            break;

        case this.PREF.CALENDAR_SOUND_FILE:
            value = this.pref_calendar_sound_file;
            break;

        case this.PREF.CALENDAR_SOUND_VOLUME:
            value = this.pref_calendar_sound_volume;
            break;

        case this.PREF.CALENDAR_REMINDER_TIME_CONF:
            value = this.pref_calendar_reminder_time_conf;
            break;

        case this.PREF.CALENDAR_REMINDER_NB_REPEAT:
            value = this.pref_calendar_reminder_nb_repeat;
            break;

        // task
        case this.PREF.TASK_ENABLED:
            value = this.pref_task_enabled;
            break;

        case this.PREF.TASK_NB_DISPLAYED:
            value = this.pref_task_nb_displayed;
            break;

        case this.PREF.TASK_PRIORITIES:
            value = this.pref_task_priorities;
            break;

         // accounts
        case this.PREF.ACCOUNTS:
            value = this._getPref(this.PREF.ACCOUNTS);
            if (value === null) {
                value = [];
            }
            break;

        // user
        case this.PREF.USER_ALIAS:
            value = this._getPref(this.PREF.USER_ALIAS + accountId);
            if (value === null) {
               value = '';
            }
            break;
        case this.PREF.USER_LOGIN:
            value = this._getPref(this.PREF.USER_LOGIN + accountId);
            if (value === null) {
               value = '';
            }
            break;

        case this.PREF.USER_PASSWORD:
            value = this._getPref(this.PREF.USER_PASSWORD + accountId);
            if (value === null) {
                value = '';
            }
            break;

        case this.PREF.USER_URL_WEB_SERVICE:
            value = this._getPref(this.PREF.USER_URL_WEB_SERVICE + accountId);
            if (value === null) {
                value = '';
            }
            break;

        case this.PREF.USER_URL_WEB_INTERFACE:
            value = this._getPref(this.PREF.USER_URL_WEB_INTERFACE + accountId);
            if (value === null) {
                value = '';
            }
            break;

        case this.PREF.USER_SAVEPASSWORD:
            value = this._getPref(this.PREF.USER_SAVEPASSWORD + accountId);
            if (value === null) {
                value = true;
            }
            break;

        case this.PREF.DEVICE_TRUSTED_INFOS:
            value = this._getPref(this.PREF.DEVICE_TRUSTED_INFOS + accountId);
            break;

        // About Wait set
        case this.PREF.WAITSET_INFO:
            value = this._getPref(this.PREF.WAITSET_INFO + accountId);
            if (value === null) {
                value = '';
            }
            break;

        case this.PREF.REQUEST_QUERY_TIMEOUT:
            value = this._getPref(this.PREF.REQUEST_QUERY_TIMEOUT + accountId);
            if (value === null) {
                value = 15000;
            }
            break;

        case this.PREF.REQUEST_WAIT_TIMEOUT:
            value = this._getPref(this.PREF.REQUEST_WAIT_TIMEOUT + accountId);
            if (value === null) {
                value = 300000;
            }
            break;

        case this.PREF.REQUEST_WAIT_LOOP_TIME:
            value = this._getPref(this.PREF.REQUEST_WAIT_LOOP_TIME + accountId);
            if (value === null) {
                value = 500000;
            }
            break;

        default:
            break;
    }
    return value;
}

/**
 * Update preference
 *
 * @this {Prefs}
 */
zimbra_notifier_Prefs.updatePref = function(key, value) {
    if(!key) {
        return;
    }
    // update pref
    if (this._prefs) {
        this._prefs.setPref(key, value);
    }
    // update memory pref
    switch (key) {
        // email + general
        case this.PREF.AUTOCONNECT:
            this.pref_autoConnect = value;
            break;

        case this.PREF.EMAIL_NOTIFICATION_ENABLED:
            this.pref_email_notification_enabled = value;
            break;

        case this.PREF.EMAIL_SOUND_ENABLED:
            this.pref_email_sound_enabled = value;
            break;

        case this.PREF.EMAIL_SOUND_SELECTED:
            this.pref_email_sound_selected = value;
            break;

        case this.PREF.EMAIL_SOUND_FILE:
            this.pref_email_sound_file = value;
            break;

        case this.PREF.EMAIL_SOUND_VOLUME:
            this.pref_email_sound_volume = value;
            break;

        case this.PREF.EMAIL_NOTIFICATION_DURATION:
            this.pref_email_notification_duration = value;
            break;

        // Browser
        case this.PREF.BROWSER_SET_COOKIES:
            this.pref_browser_set_cookies = value;
            break;

        case this.PREF.BROWSER_COOKIE_HTTP_ONLY:
            this.pref_browser_cookie_http_only = value;
            break;

        // Popup
        case this.PREF.POPUP_COLOR:
            this.pref_popup_color = value;
            break;
        case this.PREF.POPUP_WIDTH:
            this.pref_popup_width = value;
            break;

        // message
        case this.PREF.MESSAGE_ENABLED:
            this.pref_message_enabled = value;
            break;

        case this.PREF.MESSAGE_NB_DISPLAYED:
            this.pref_message_nb_displayed = value;
            break;

        case this.PREF.MESSAGE_NB_CHARACTERS_DISPLAYED:
            this.pref_message_nb_characters_displayed = value;
            break;

        // calendar
        case this.PREF.CALENDAR_ENABLED:
            this.pref_calendar_enabled = value;
            break;

        case this.PREF.CALENDAR_PERIOD_DISPLAYED:
            this.pref_calendar_period_displayed = value;
            break;

        case this.PREF.CALENDAR_NB_DISPLAYED:
            this.pref_calendar_nb_displayed = value;
            break;

        case this.PREF.CALENDAR_NOTIFICATION_ENABLED:
            this.pref_calendar_notification_enabled = value;
            break;

        case this.PREF.CALENDAR_SOUND_ENABLED:
            this.pref_calendar_sound_enabled = value;
            break;

        case this.PREF.CALENDAR_SOUND_SELECTED:
            this.pref_calendar_sound_selected = value;
            break;

        case this.PREF.CALENDAR_SOUND_FILE:
            this.pref_calendar_sound_file = value;
            break;

        case this.PREF.CALENDAR_SOUND_VOLUME:
            this.pref_calendar_sound_volume = value;
            break;

        case this.PREF.CALENDAR_REMINDER_TIME_CONF:
            this.pref_calendar_reminder_time_conf = value;
            break;

        case this.PREF.CALENDAR_REMINDER_NB_REPEAT:
            this.pref_calendar_reminder_nb_repeat = value;
            break;

        // task
        case this.PREF.TASK_ENABLED:
            this.pref_task_enabled = value;
            break;

        case this.PREF.TASK_NB_DISPLAYED:
            this.pref_task_nb_displayed = value;
            break;

        case this.PREF.TASK_PRIORITIES:
            this.pref_task_priorities = value;
            break;

        default:
            break;
    }
};

/* *************************** Public *************************** */

/**
 * Check if this is the first start of the extension
 *
 * @this {Prefs}
 * @param {Boolean} True if the flag should be reseted
 */
zimbra_notifier_Prefs.isFirstStart = function(reset) {
    var ret = this._is_first_launch;
    if (reset) {
        this._is_first_launch = false;
    }
    return ret;
};

/**
 * Clear password
 *
 * @this {Prefs}
 * @param {String} accountId of the account preference
 */
zimbra_notifier_Prefs.clearPassword = function(accountId) {
    this.updatePref(this.PREF.USER_PASSWORD + accountId, "");
};

/**
 * Indicate if it is a free webmail
 *
 * @this {Prefs}
 * @param {String} accountId of the account preference
 * @return {Boolean} True if the url of the webservice contain the free domain
 */
zimbra_notifier_Prefs.isFreeWebService = function(accountId) {
    var pref_user_url_web_service = this.getPref(this.PREF.USER_URL_WEB_SERVICE + accountId)
    if (pref_user_url_web_service) {
        return (pref_user_url_web_service.search("zimbra.free.fr") > 0) ||
               (pref_user_url_web_service.search("zimbra.aliceadsl.fr") > 0);
    }
    return false;
};

/* *************************** email + general *************************** */

/**
 * indicate the current version
 *
 * @this {Prefs}
 * @return {Number} the current version
 */
zimbra_notifier_Prefs.getCurrentVersion = function() {
    return this.pref_current_version;
};

/**
 * indicate if AutoConnect is enabled
 *
 * @this {Prefs}
 * @return {Boolean} true if enabled
 */
zimbra_notifier_Prefs.isAutoConnectEnabled = function() {
    return this.pref_autoConnect;
};

/**
 * indicate color of popup
 *
 * @this {Prefs}
 * @return {String} the color
 */
zimbra_notifier_Prefs.getPopupColor = function() {
    return this.pref_popup_color;
};

/**
 * indicate width of popup
 *
 * @this {Prefs}
 * @return {Number} the width
 */
zimbra_notifier_Prefs.getPopupWidth = function() {
    return this.pref_popup_width;
};

/**
 * indicate if email notification is enabled
 *
 * @this {Prefs}
 * @return {Boolean} true if enabled
 */
zimbra_notifier_Prefs.isEmailNotificationEnabled = function() {
    return this.pref_email_notification_enabled;
};

/**
 * indicate if sound is enabled for email notification
 *
 * @this {Prefs}
 * @return {Boolean} true if enabled
 */
zimbra_notifier_Prefs.isEmailSoundEnabled = function() {
    return this.pref_email_sound_enabled;
};

/**
 * get the selected sound for email notification
 *
 * @this {Prefs}
 * @return {Number} the selected sound
 */
zimbra_notifier_Prefs.getEmailSoundSelected = function() {
    return parseInt(this.pref_email_sound_selected);
};

/**
 * get the base64 file for email notification
 *
 * @this {Prefs}
 * @return {String} the file in base64
 */
zimbra_notifier_Prefs.getEmailSoundCustom = function() {
    return this.pref_email_sound_file;
};

/**
 * get the volume for email notification
 *
 * @this {Prefs}
 * @return {Number} the volume
 */
zimbra_notifier_Prefs.getEmailSoundVolume = function() {
    return parseInt(this.pref_email_sound_volume);
};

/**
 * indicate the duration of the email notification
 *
 * @this {Prefs}
 * @return {Number} The duration of the notification in ms
 */
zimbra_notifier_Prefs.getEmailNotificationDuration = function() {
    return (this.pref_email_notification_duration * 1000);
};

/* *************************** Browser *************************** */

/**
 * Do we need to add cookie to the browser when opening the web interface
 *
 * @this {Prefs}
 * @return {Boolean}
 */
zimbra_notifier_Prefs.isSyncBrowserCookiesEnabled = function() {
    return this.pref_browser_set_cookies;
};

/**
 * Check if the created cookie need to be http only
 *
 * @this {Prefs}
 * @return {Boolean}
 */
zimbra_notifier_Prefs.isBrowserCookieHttpOnly = function() {
    return this.pref_browser_cookie_http_only;
};

/* *************************** message *************************** */

/**
 * indicate if Message is enabled
 *
 * @this {Prefs}
 * @return {Boolean} true if enabled
 */
zimbra_notifier_Prefs.isMessageEnabled = function() {
    return this.pref_message_enabled;
};

/**
 * get Message number displayed
 *
 * @this {Prefs}
 * @return {Number}
 */
zimbra_notifier_Prefs.getMessageNbDisplayed = function() {
    return this.pref_message_nb_displayed;
};

/**
 * get Message number characters displayed
 *
 * @this {Prefs}
 * @return {Number}
 */
zimbra_notifier_Prefs.getMessageNbCharactersDisplayed = function() {
    return this.pref_message_nb_characters_displayed;
};

/* *************************** calendar *************************** */

/**
 * indicate if Calendar is enabled
 *
 * @this {Prefs}
 * @return {Boolean} true if enabled
 */
zimbra_notifier_Prefs.isCalendarEnabled = function() {
    return this.pref_calendar_enabled;
};

/**
 * get Calendar Period Displayed
 *
 * @this {Prefs}
 * @return {Number}
 */
zimbra_notifier_Prefs.getCalendarPeriodDisplayed = function() {
    return this.pref_calendar_period_displayed;
};

/**
 * get Calendar Number Displayed
 *
 * @this {Prefs}
 * @return {Number}
 */
zimbra_notifier_Prefs.getCalendarNbDisplayed = function() {
    return this.pref_calendar_nb_displayed;
};

/**
 * indicate if Calendar System Notification is enabled
 *
 * @this {Prefs}
 * @return {Boolean} true if enabled
 */
zimbra_notifier_Prefs.isCalendarNotificationEnabled = function() {
    return this.pref_calendar_notification_enabled;
};

/**
 * indicate if Calendar Sound Notification is enabled
 *
 * @this {Prefs}
 * @return {Boolean} true if enabled
 */
zimbra_notifier_Prefs.isCalendarSoundEnabled = function() {
    return this.pref_calendar_sound_enabled;
};

/**
 * get the selected sound for calendar notification
 *
 * @this {Prefs}
 * @return {Number} the selected sound
 */
zimbra_notifier_Prefs.getCalendarSoundSelected = function() {
    return parseInt(this.pref_calendar_sound_selected);
};

/**
 * get the base64 file for calendar notification
 *
 * @this {Prefs}
 * @return {String} the file in base64
 */
zimbra_notifier_Prefs.getCalendarSoundCustom = function() {
    return this.pref_calendar_sound_file;
};

/**
 * get the volume for calendar notification
 *
 * @this {Prefs}
 * @return {Number} the volume
 */
zimbra_notifier_Prefs.getCalendarSoundVolume = function() {
    return parseInt(this.pref_calendar_sound_volume);
};

/**
 * get Calendar Reminder Time Configuration
 *
 * @this {Prefs}
 * @return {Number}
 */
zimbra_notifier_Prefs.getCalendarReminderTimeConf = function() {
    return this.pref_calendar_reminder_time_conf;
};

/**
 * get Calendar Reminder number repeat
 *
 * @this {Prefs}
 * @return {Number}
 */
zimbra_notifier_Prefs.getCalendarReminderNbRepeat = function() {
    return this.pref_calendar_reminder_nb_repeat;
};

/* *************************** task *************************** */

/**
 * indicate if Task is enabled
 *
 * @this {Prefs}
 * @return {Boolean} true if enabled
 */
zimbra_notifier_Prefs.isTaskEnabled = function() {
    return this.pref_task_enabled;
};

/**
 * get Task number Displayed
 *
 * @this {Prefs}
 * @return {Number}
 */
zimbra_notifier_Prefs.getTaskNbDisplayed = function() {
    return this.pref_task_nb_displayed;
};

/**
 * get Task Priorities Displayed
 *
 * @this {Prefs}
 * @return {Number}
 */
zimbra_notifier_Prefs.getTaskPrioritiesDisplayed = function() {
    return this.pref_task_priorities;
};
/* *************************** account *************************** */

/**
 * indicate accounts list
 *
 * @this {Prefs}
 * @return {Array} account list
 */
zimbra_notifier_Prefs.getAccounts = function() {
    return this.getPref(this.PREF.ACCOUNTS);
};

/* *************************** user *************************** */

/**
 * indicate the alias
 *
 * @this {Prefs}
 * @param {Integer} accountId of the account preference
 * @return {String} the alias
 */
zimbra_notifier_Prefs.getUserAlias = function(accountId) {
    var alias = this.getPref(this.PREF.USER_ALIAS + accountId);
    if (!alias || alias === '') {
        alias = this.getPref(this.PREF.USER_LOGIN + accountId);
    }

    return alias && alias[0].toUpperCase() + alias.slice(1);
};

/**
 * indicate the login
 *
 * @this {Prefs}
 * @param {Integer} accountId of the account preference
 * @return {String} the login
 */
zimbra_notifier_Prefs.getUserLogin = function(accountId) {
    return this.getPref(this.PREF.USER_LOGIN + accountId);
};

/**
 * indicate the URL of the webservice. May contain a trailling slash
 *
 * @this {Prefs}
 * @param {Integer} accountId of the account preference
 * @return {String} the URL
 */
zimbra_notifier_Prefs.getUrlWebService = function(accountId) {
    return this.getPref(this.PREF.USER_URL_WEB_SERVICE + accountId);
};

/**
 * indicate the URL of the Web interface
 * If not set, return the URl of the webservice
 *
 * @this {Prefs}
 * @param {Integer} accountId of the account preference
 * @return {String} the URL
 */
zimbra_notifier_Prefs.getUrlUserInterface = function(accountId) {
    var pref_user_url_web_interface = this.getPref(this.PREF.USER_URL_WEB_INTERFACE + accountId);
    if (pref_user_url_web_interface && (pref_user_url_web_interface!=="")) {
        return pref_user_url_web_interface;
    }
    return this.getPref(this.PREF.USER_URL_WEB_SERVICE + accountId);
};

/**
 * indicate if SavePassword is enabled
 *
 * @this {Prefs}
 * @param {Integer} accountId of the account preference
 * @return {Boolean} true if enabled
 */
zimbra_notifier_Prefs.isSavePasswordEnabled = function(accountId) {
    return this.getPref(this.PREF.USER_SAVEPASSWORD + accountId);
};

/**
 * indicate the password
 *
 * @this {Prefs}
 * @param {Integer} accountId of the account preference
 * @return {String} the password
 */
zimbra_notifier_Prefs.getUserPassword = function(accountId) {
    return this.getPref(this.PREF.USER_PASSWORD + accountId);
};

/**
 * Get the information about the previous device trusted infos
 *
 * @this {Prefs}
 * @param {String} accountId of the account preference
 * @return {Object} The device trusted information
 */
zimbra_notifier_Prefs.getPreviousDeviceTrustedInfos = function (accountId) {
    try {
        var pref_deviceTrusted_info = this.getPref(this.PREF.DEVICE_TRUSTED_INFOS + accountId);
        return {
            deviceId: pref_deviceTrusted_info.deviceId,
            trustedToken: pref_deviceTrusted_info.trustedToken,
            trustedTokenExpirationTime: pref_deviceTrusted_info.trustedTokenExpirationTime
        };
    }
    catch (e) {
    }
    return null;
};


/**
 * Save the currently used trusted informations
 *
 * @this {Prefs}
 * @param {String} accountId of the account preference
 * @param {String}
 *           deviceId The device id trusted
 * @param {String}
 *            trustedToken The trusted Token
 * @param {Date}
 *            trustedTokenExpirationTime The trusted Token Expiration Time
 */
zimbra_notifier_Prefs.saveDeviceTrustedInfos = function (accountId, deviceId = '', trustedToken = '', trustedTokenExpirationTime = new Date(0)) {
    this._prefs.setPref(this.PREF.DEVICE_TRUSTED_INFOS + accountId, { deviceId, trustedToken, trustedTokenExpirationTime });
};

/* *************************** About Wait set *************************** */

/**
 * Get the information about the previous wait set
 *
 * @this {Prefs}
 * @param {String} accountId of the account preference
 * @return {Object} The wait set information
 */
zimbra_notifier_Prefs.getPreviousWaitSet = function(accountId) {
    try {
        var pref_waitset_info = this.getPref(this.PREF.WAITSET_INFO + accountId);
        if (pref_waitset_info &&
            pref_waitset_info.id && pref_waitset_info.id.length > 0 &&
            pref_waitset_info.seq && pref_waitset_info.seq.length > 0 &&
            parseInt(pref_waitset_info.seq, 10) >= 0 &&
            pref_waitset_info.urlWebService && pref_waitset_info.urlWebService.length > 0 &&
            pref_waitset_info.user && pref_waitset_info.user.length > 0) {

            return {
                id: pref_waitset_info.id,
                seq: pref_waitset_info.seq,
                urlWebService : pref_waitset_info.urlWebService,
                user : pref_waitset_info.user
            };
        }
    }
    catch (e) {
    }
    return null;
};

/**
 * Save the currently used wait set information
 *
 * @this {Prefs}
 * @param {String} accountId of the account preference
 * @param {String}
 *            id The wait set id
 * @param {String}
 *            seq The wait set sequence, must be a string
 * @param {String}
 *            urlWebService The URL of the webservice used with this wait set
 * @param {String}
 *            user The user used with this wait set
 */
zimbra_notifier_Prefs.saveWaitSet = function(accountId, id, seq, urlWebService, user) {
    if (!id || !seq || !(parseInt(seq, 10) >= 0)) {
        id  = '';
        seq = '';
    }
    if (urlWebService && urlWebService.length > 0 && user && user.length > 0) {
        this._prefs.setPref(this.PREF.WAITSET_INFO + accountId, { id: id, seq: seq, urlWebService: urlWebService, user: user });
    }
};

/**
 * Get the timeout (ms) for query
 *
 * @this {Prefs}
 * @param {String} accountId of the account preference
 * @return {Number}
 */
zimbra_notifier_Prefs.getRequestQueryTimeout = function(accountId) {
    return this.getPref(this.PREF.REQUEST_QUERY_TIMEOUT + accountId);
};

/**
 * Get the timeout (ms) for the wait request
 *
 * @this {Prefs}
 * @param {String} accountId of the account preference
 * @return {Number}
 */
zimbra_notifier_Prefs.getRequestWaitTimeout = function(accountId) {
    return this.getPref(this.PREF.REQUEST_WAIT_TIMEOUT + accountId);
};

/**
 * Get the maximum duration (ms) of consecutive Wait Set requests
 *
 * @this {Prefs}
 * @param {String} accountId of the account preference
 * @return {Number}
 */
zimbra_notifier_Prefs.getRequestWaitLoopTime = function(accountId) {
    return this.getPref(this.PREF.REQUEST_WAIT_LOOP_TIME + accountId);
};

/* *************************** Private *************************** */

/**
 * get preference
 *
 * @private
 * @this {Prefs}
 * @param {String}
 *            pref the preference name
 * @return {Object} the preference value
 */
zimbra_notifier_Prefs._getPref = function(pref) {
    if (this._prefs) {
        return this._prefs.getPref(pref);
    }
    return null;
};

/**
 * remove preference
 *
 * @private
 * @this {Prefs}
 * @param {String}
 *            pref the preference name
 */
zimbra_notifier_Prefs._removePref = function(pref) {
    if (this._prefs) {
        this._prefs.removePref(pref);
    }
};

/**
 * Creates an instance of PrefsService.
 *
 * @constructor
 * @this {PrefsService}
 */
var PrefsService = {
    _defaultsPref : {
        prefs : {
            'currentVersion' : 0,
            'autoConnect' : true,
            'systemNotificationEnabled' : true,
            'popupColor' : '#ffffff',
            'popupWidth' : 300,
            'soundEnabled' : true,
            'emailSoundSelected' : 1,
            'emailSoundVolume' : 100,
            'emailNotificationDuration' : 14,
            'messageEnabled' : true,
            'messageNbDisplayed' : 5,
            'messageNbCharactersDisplayed' : 80,
            'calendarEnabled' : true,
            'calendarPeriodDisplayed' : 14,
            'calendarNbDisplayed' : 5,
            'calendarSystemNotificationEnabled' : true,
            'calendarSoundEnabled' : true,
            'calendarSoundSelected' : 1,
            'calendarSoundVolume' : 100,
            'calendarReminderTimeConf' : -1,
            'calendarReminderRepeatNb' : 0,
            'taskEnabled' : true,
            'taskNbDisplayed' : 5,
            'taskPriorities' : 0,
            'browserSetCookies' : true,
            'browserCookieHttpOnly' : false,
        }
    },
    _currentPref : undefined,
    _saveTimerDelay : undefined
};

/**
 * initialize the PrefsService.
 *
 * @this {PrefsService}
 * @param {Function} the callback when initialized
 */
PrefsService.init = function(callback) {
    var loadFunction = function(syncStorage) {
        Object.assign(PrefsService._currentPref.prefs, syncStorage && syncStorage.prefs ? syncStorage.prefs : {});
        if (callback) {
            callback();
        }
    };
    // get local storage and overwrite by the synchronize storage
    chrome.storage.local.get(this._defaultsPref, function(localStorage) {
        PrefsService._currentPref = Object.assign({}, PrefsService._defaultsPref);
        Object.assign(PrefsService._currentPref.prefs, localStorage && localStorage.prefs ? localStorage.prefs : {});
        if(chrome.storage.sync) {
            chrome.storage.sync.get(localStorage, loadFunction);
        } else {
            loadFunction(localStorage);
        }
    });
};

/**
 * get the value of the key.
 *
 * @this {PrefsService}
 * @param {String} the key
 * @return {Object} the value
 */
PrefsService.getPref = function(key) {
    var value = null;
    if(this._currentPref && this._currentPref.prefs[key] !== undefined) {
        if(key.indexOf(zimbra_notifier_Prefs.PREF.USER_PASSWORD) == 0) {
            if(this._currentPref.prefs[key]) {
                value = AesCtr.decrypt(this._currentPref.prefs[key], zimbra_notifier_Prefs.PREF.USER_PASSWORD_KEY , 128);
            } else {
                value = '';
            }
        }
        else if((key.indexOf(zimbra_notifier_Prefs.PREF.ACCOUNTS) == 0) || (key.indexOf(zimbra_notifier_Prefs.PREF.WAITSET_INFO) == 0)) {
            var value = null;
            try {
                var strVal = this._currentPref.prefs[key];
                if (strVal && strVal.length > 0) {
                    value = JSON.parse(strVal);
                }
            }
            catch (e) {
            }
        }
        else {
            value = this._currentPref.prefs[key];
        }
    }
    return value;
};

/**
 * set the value of the key.
 *
 * @this {PrefsService}
 * @param {String} the key
 * @param {Object} the value
 */
PrefsService.setPref = function(key, value) {
    if(key.indexOf(zimbra_notifier_Prefs.PREF.USER_PASSWORD) == 0) {
        this._currentPref.prefs[key] = AesCtr.encrypt(value, zimbra_notifier_Prefs.PREF.USER_PASSWORD_KEY , 128);
    }
    else if((key.indexOf(zimbra_notifier_Prefs.PREF.ACCOUNTS) == 0) || (key.indexOf(zimbra_notifier_Prefs.PREF.WAITSET_INFO) == 0)) {
        this._currentPref.prefs[key] = JSON.stringify(value);
    }
    else {
        this._currentPref.prefs[key] = value;
    }
    this.synchronize();
};

/**
 * remove the key.
 *
 * @this {PrefsService}
 * @param {String} the key
 */
PrefsService.removePref = function(key) {
    if(this._currentPref.prefs[key] !== undefined) {
        delete this._currentPref.prefs[key];
        this.synchronize();
    }
};

/**
 * synchronize preferences
 *
 * @private
 * @this {PrefsService}
 * @param {String} the key
 */
PrefsService.synchronize = function(forced) {
    //synchronise preference after 1 seconds no change delay if not forced
    clearTimeout(this._saveTimerDelay);
    var that = this;
    var saveFunction = function() {
        chrome.storage.local.set(that._currentPref);
        if(chrome.storage.sync) {
            // not save file in synchro storage because the size is limited
            var synchroPrefs = JSON.parse(JSON.stringify(that._currentPref));
            delete synchroPrefs.prefs.emailSoundFile;
            delete synchroPrefs.prefs.calendarSoundFile;
            chrome.storage.sync.set(synchroPrefs);
        }
    };
    if(forced) {
        saveFunction();
    } else {
        this._saveTimerDelay = setTimeout(function() {
            saveFunction();
        }, 1000);
    }
};
