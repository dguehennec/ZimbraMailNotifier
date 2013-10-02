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

const EXPORTED_SYMBOLS = ["zimbra_notifier_Prefs"];

/**
 * Creates an instance of Prefs.
 *
 * @constructor
 * @this {Prefs}
 */
const zimbra_notifier_Prefs = {
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
    CURRENT_VERSION                       : "currentVersion",
    AUTOCONNECT                           : "autoConnect",
    SYSTEM_NOTIFICATION_ENABLED           : "systemNotificationEnabled",
    SOUND_ENABLED                         : "soundEnabled",
    ACCESS_STATUSBAR                      : "accessStatusBar",
    CALENDAR_ENABLED                      : "calendarEnabled",
    CALENDAR_PERIOD_DISPLAYED             : "calendarPeriodDisplayed",
    CALENDAR_NB_DISPLAYED                 : "calendarNbDisplayed",
    CALENDAR_SYSTEM_NOTIFICATION_ENABLED  : "calendarSystemNotificationEnabled",
    CALENDAR_SOUND_ENABLED                : "calendarSoundEnabled",
    CALENDAR_REMINDER_TIME_CONF           : "calendarReminderTimeConf",
    CALENDAR_REMINDER_NB_REPEAT           : "calendarReminderRepeatNb",
    TASK_ENABLED                          : "taskEnabled",
    TASK_NB_DISPLAYED                     : "taskNbDisplayed",
    TASK_PRIORITIES                       : "taskPriorities",
    USER_LOGIN                            : "userlogin",
    USER_SAVEPASSWORD                     : "userSavePassword",
    USER_SERVER                           : "userServer",
    WAITSET_INFO                          : "waitSetInfo",
    REQUEST_QUERY_TIMEOUT                 : "requestQueryTimeout",
    REQUEST_WAIT_TIMEOUT                  : "requestWaitTimeout",

    USER_PASSWORD_HOSTNAME   : "chrome://zimbra_mail_notifier/",
    USER_PASSWORD_ACTIONURL  : "defaultPassword"
};

/**
 * Load preferences
 *
 * @this {Prefs}
 */
zimbra_notifier_Prefs.load = function() {
    // default
    this.pref_autoConnect                  = this._getPref(this.PREF.AUTOCONNECT);
    this.pref_system_notification_enabled  = this._getPref(this.PREF.SYSTEM_NOTIFICATION_ENABLED);
    this.pref_sound_enabled                = this._getPref(this.PREF.SOUND_ENABLED);
    this.pref_access_statusBar             = this._getPref(this.PREF.ACCESS_STATUSBAR);
    // calendar
    this.pref_calendar_enabled                     = this._getPref(this.PREF.CALENDAR_ENABLED);
    this.pref_calendar_period_displayed            = this._getPref(this.PREF.CALENDAR_PERIOD_DISPLAYED);
    this.pref_calendar_nb_displayed                = this._getPref(this.PREF.CALENDAR_NB_DISPLAYED);
    this.pref_calendar_system_notification_enabled = this._getPref(this.PREF.CALENDAR_SYSTEM_NOTIFICATION_ENABLED);
    this.pref_calendar_sound_notification_enabled  = this._getPref(this.PREF.CALENDAR_SOUND_ENABLED);
    this.pref_calendar_reminder_time_conf          = this._getPref(this.PREF.CALENDAR_REMINDER_TIME_CONF);
    this.pref_calendar_reminder_nb_repeat          = this._getPref(this.PREF.CALENDAR_REMINDER_NB_REPEAT);
    // task
    this.pref_task_enabled         = this._getPref(this.PREF.TASK_ENABLED);
    this.pref_task_nb_displayed    = this._getPref(this.PREF.TASK_NB_DISPLAYED);
    this.pref_task_priorities      = this._getPref(this.PREF.TASK_PRIORITIES);
    // user
    this.pref_user_login           = this._getPref(this.PREF.USER_LOGIN);
    this.pref_user_server          = this._getPref(this.PREF.USER_SERVER);
    this.pref_user_savePassword    = this._getPref(this.PREF.USER_SAVEPASSWORD);
    // Last Wait set
    this.pref_waitset_info         = this._getComplexPref(this.PREF.WAITSET_INFO);
    // Request
    this.pref_request_queryTimeout = this._getPref(this.PREF.REQUEST_QUERY_TIMEOUT);
    this.pref_request_waitTimeout  = this._getPref(this.PREF.REQUEST_WAIT_TIMEOUT);

    // Get the previous version
    this._previous_version = this._getPref(this.PREF.CURRENT_VERSION);

    // Check if this is the first time the extension is started
    if (!this._previous_version) {
        this._is_first_launch = true;
    }
    // Set the current version
    this.pref_current_version = zimbra_notifier_Constant.VERSION;
    this._prefs.setIntPref(this.PREF.CURRENT_VERSION, this.pref_current_version);
};

/**
 * Init preference object, listen for preference change
 *
 * @this {Prefs}
 */
zimbra_notifier_Prefs.init = function() {
    if (!this._prefs) {
        this._prefs = Services.prefs.getBranch("extensions.zimbra_mail_notifier.");
        this._prefs.addObserver("", this, false);
    }
    this.load();
};

/**
 * Remove observer, called from shutdown
 *
 * @this {Prefs}
 */
zimbra_notifier_Prefs.release = function() {
    if (this._prefs) {
        this._prefs.removeObserver("", this);
        this._prefs = null;
    }
};

/**
 * Observe for preference change
 *
 * @this {Prefs}
 */
zimbra_notifier_Prefs.observe = function(subject, topic, data) {

    if (!this._prefs || topic !== "nsPref:changed") {
        return;
    }

    switch (data) {

        case this.PREF.AUTOCONNECT:
            this.pref_autoConnect = this._getPref(data);
            break;

        case this.PREF.SYSTEM_NOTIFICATION_ENABLED:
            this.pref_system_notification_enabled = this._getPref(data);
            break;

        case this.PREF.SOUND_ENABLED:
            this.pref_sound_enabled = this._getPref(data);
            break;

        case this.PREF.ACCESS_STATUSBAR:
            this.pref_access_statusBar = this._getPref(data);
            break;

        case this.PREF.CALENDAR_ENABLED:
            this.pref_calendar_enabled = this._getPref(data);
            break;

        case this.PREF.CALENDAR_PERIOD_DISPLAYED:
            this.pref_calendar_period_displayed = this._getPref(data);
            break;

        case this.PREF.CALENDAR_NB_DISPLAYED:
            this.pref_calendar_nb_displayed = this._getPref(data);
            break;

        case this.PREF.CALENDAR_SYSTEM_NOTIFICATION_ENABLED:
            this.pref_calendar_system_notification_enabled = this._getPref(data);
            break;

        case this.PREF.CALENDAR_SOUND_ENABLED:
            this.pref_calendar_sound_notification_enabled = this._getPref(data);
            break;

        case this.PREF.CALENDAR_REMINDER_TIME_CONF:
            this.pref_calendar_reminder_time_conf = this._getPref(data);
            break;

        case this.PREF.CALENDAR_REMINDER_NB_REPEAT:
            this.pref_calendar_reminder_nb_repeat = this._getPref(data);
            break;

        case this.PREF.TASK_ENABLED:
            this.pref_task_enabled = this._getPref(data);
            break;

        case this.PREF.TASK_NB_DISPLAYED:
            this.pref_task_nb_displayed = this._getPref(data);
            break;

        case this.PREF.TASK_PRIORITIES:
            this.pref_task_priorities = this._getPref(data);
            break;

        case this.PREF.USER_LOGIN:
            this.pref_user_login = this._getPref(data);
            break;

        case this.PREF.USER_SERVER:
            this.pref_user_server = this._getPref(data);
            break;

        case this.PREF.USER_SAVEPASSWORD:
            this.pref_user_savePassword = this._getPref(data);
            break;

        case this.PREF.REQUEST_QUERY_TIMEOUT:
            this.pref_request_queryTimeout = this._getPref(data);
            break;

        case this.PREF.REQUEST_WAIT_TIMEOUT:
            this.pref_request_waitTimeout = this._getPref(data);
            break;
    }
};

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
 * Set temporary login information.
 * Do not save the information to the preference system
 *
 * @this {Prefs}
 */
zimbra_notifier_Prefs.setTemporaryLogin = function(server, user) {
    if (!server) {
        server = '';
    }
    this.pref_user_server = server;

    if (!user) {
        user = '';
    }
    this.pref_user_login = user;
};

/**
 * Load from preferences the login information (server + user)
 *
 * @this {Prefs}
 */
zimbra_notifier_Prefs.reloadLogin = function() {
    this.pref_user_login  = this._getPref(this.PREF.USER_LOGIN);
    this.pref_user_server = this._getPref(this.PREF.USER_SERVER);
};

/**
 * Save user password
 * @see _setPassword
 *
 * @this {Prefs}
 */
zimbra_notifier_Prefs.savePassword = function(password, savePwd) {
    this._setPassword(this.PREF.USER_PASSWORD_HOSTNAME, this.PREF.USER_PASSWORD_ACTIONURL,
                      this.pref_user_login, password, savePwd);
};

/**
 * Get the information about the previous wait set
 *
 * @this {Prefs}
 * @return {Object} The wait set information
 */
zimbra_notifier_Prefs.getPreviousWaitSet = function() {
    try {
        if (this.pref_waitset_info &&
            this.pref_waitset_info.id && this.pref_waitset_info.id.length > 0 &&
            this.pref_waitset_info.seq && this.pref_waitset_info.seq.length > 0 &&
            parseInt(this.pref_waitset_info.seq, 10) >= 0 &&
            this.pref_waitset_info.hostname && this.pref_waitset_info.hostname.length > 0 &&
            this.pref_waitset_info.user && this.pref_waitset_info.user.length > 0) {

            return {
                id: this.pref_waitset_info.id,
                seq: this.pref_waitset_info.seq,
                hostname : this.pref_waitset_info.hostname,
                user : this.pref_waitset_info.user
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
 * @param {String}
 *            id The wait set id
 * @param {String}
 *            seq The wait set sequence, must be a string
 * @param {String}
 *            hostname The hostname used with this wait set
 * @param {String}
 *            user The user used with this wait set
 */
zimbra_notifier_Prefs.saveWaitSet = function(id, seq, hostname, user) {
    if (!id || !seq || !(parseInt(seq, 10) >= 0)) {
        id  = '';
        seq = '';
    }
    if (hostname && hostname.length > 0 && user && user.length > 0) {
        this.pref_waitset_info = { id: id, seq: seq, hostname: hostname, user: user };
        this._prefs.setCharPref(this.PREF.WAITSET_INFO, JSON.stringify(this.pref_waitset_info));
    }
};

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
 * indicate the server
 *
 * @this {Prefs}
 * @return {String} the server
 */
zimbra_notifier_Prefs.getUserServer = function() {
    return this.pref_user_server;
};

/**
 * indicate the login
 *
 * @this {Prefs}
 * @return {String} the login
 */
zimbra_notifier_Prefs.getUserLogin = function() {
    return this.pref_user_login;
};

/**
 * indicate the password
 *
 * @this {Prefs}
 * @return {String} the password
 */
zimbra_notifier_Prefs.getUserPassword = function() {
    return this._getPassword(this.PREF.USER_PASSWORD_HOSTNAME,
                             this.PREF.USER_PASSWORD_ACTIONURL, this.pref_user_login);
};

/**
 * indicate if statusBar is enabled
 *
 * @this {Prefs}
 * @return {Boolean} true if enabled
 */
zimbra_notifier_Prefs.isStatusBarEnabled = function() {
    return this.pref_access_statusBar;
};

/**
 * indicate if SavePassword is enabled
 *
 * @this {Prefs}
 * @return {Boolean} true if enabled
 */
zimbra_notifier_Prefs.isSavePasswordEnabled = function() {
    return this.pref_user_savePassword;
};

/**
 * indicate if sound is enabled
 *
 * @this {Prefs}
 * @return {Boolean} true if enabled
 */
zimbra_notifier_Prefs.isSoundEnabled = function() {
    return this.pref_sound_enabled;
};

/**
 * indicate if system notification is enabled
 *
 * @this {Prefs}
 * @return {Boolean} true if enabled
 */
zimbra_notifier_Prefs.isSystemNotificationEnabled = function() {
    return this.pref_system_notification_enabled;
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
zimbra_notifier_Prefs.isCalendarSystemNotificationEnabled = function() {
    return this.pref_calendar_system_notification_enabled;
};

/**
 * indicate if Calendar Sound Notification is enabled
 *
 * @this {Prefs}
 * @return {Boolean} true if enabled
 */
zimbra_notifier_Prefs.isCalendarSoundNotificationEnabled = function() {
    return this.pref_calendar_sound_notification_enabled;
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

/**
 * Get the timeout (ms) for query
 *
 * @this {Prefs}
 * @return {Number}
 */
zimbra_notifier_Prefs.getRequestQueryTimeout = function() {
    return this.pref_request_queryTimeout;
};

/**
 * Get the timeout (ms) for the wait request
 *
 * @this {Prefs}
 * @return {Number}
 */
zimbra_notifier_Prefs.getRequestWaitTimeout = function() {
    return this.pref_request_waitTimeout;
};


/**
 * get preference
 *
 * @private
 *
 * @this {Prefs}
 *
 * @param {String}
 *            pref the preference name
 * @return {Object} the preference value
 */
zimbra_notifier_Prefs._getPref = function(pref) {
    var value = null;
    if (this._prefs) {
        if (this._prefs.getPrefType(pref) === this._prefs.PREF_BOOL) {
            value = this._prefs.getBoolPref(pref);
        }
        else if (this._prefs.getPrefType(pref) === this._prefs.PREF_INT) {
            value = this._prefs.getIntPref(pref);
        }
        else if (this._prefs.getPrefType(pref) === this._prefs.PREF_STRING) {
            value = this._prefs.getCharPref(pref);
        }
    }
    return value;
};

/**
 * get a complex preference
 *
 * @private
 * @this {Prefs}
 *
 * @param {String}
 *            pref the preference name
 * @return {Object} the preference value
 */
zimbra_notifier_Prefs._getComplexPref = function(pref) {
    var value = null;
    try {
        var strVal = null;
        if (this._prefs.getPrefType(pref) === this._prefs.PREF_STRING) {
            strVal = this._prefs.getCharPref(pref);
        }
        if (strVal && strVal.length > 0) {
            value = JSON.parse(strVal);
        }
    }
    catch (e) {
    }
    return value;
};

/**
 * get password
 *
 * @private
 *
 * @this {Prefs}
 * @param {String}
 *            hostname
 * @param {String}
 *            actionURL
 * @param {String}
 *            username
 * @return {String} password
 */
zimbra_notifier_Prefs._getPassword = function(hostname, actionURL, username) {
    try {
        var logins = Services.logins.findLogins({}, hostname, actionURL, null);
        var password = "";
        for ( var i = 0; i < logins.length; i++) {
            if (logins[i].username === username) {
                password = logins[i].password;
                break;
            }
        }
        return password;
    }
    catch (e) {
        return "";
    }
};

/**
 * set password
 *
 * @private
 *
 * @this {Prefs}
 * @param {String}
 *            hostname
 * @param {String}
 *            actionURL
 * @param {String}
 *            username
 * @param {String}
 *            password
 * @param {Boolean}
 *            withSave
 * @return {Boolean} true if success.
 */
zimbra_notifier_Prefs._setPassword = function(hostname, actionURL, username, password, withSave) {
    try {
        var logins = Services.logins.findLogins({}, hostname, actionURL, null);
        var currentLoginInfo = null;
        for ( var i = 0; i < logins.length; i++) {
            if (logins[i].username === username) {
                currentLoginInfo = logins[i];
            }
        }
        var nsLoginInfo = new Components.Constructor("@mozilla.org/login-manager/loginInfo;1",
                                                     Components.interfaces.nsILoginInfo, "init");
        if (withSave) {
            var newLogin = new nsLoginInfo(hostname, actionURL, null, username, password, "", "");
            if (currentLoginInfo !== null) {
                Services.logins.modifyLogin(currentLoginInfo, newLogin);
            }
            else {
                Services.logins.addLogin(newLogin);
            }
        }
        else if (currentLoginInfo !== null) {
            Services.logins.removeLogin(currentLoginInfo);
        }
    }
    catch (e) {
        return false;
    }
    return true;
};

/**
 * Initialize the preference
 */
zimbra_notifier_Prefs.init();
