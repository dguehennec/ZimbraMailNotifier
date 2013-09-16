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
 * Creates an instance of com.zimbra.service.Prefs.
 *
 * @constructor
 * @this {Prefs}
 */
com.zimbra.service.Prefs = function() {
    this.pref_current_version = 0;
};

/**
 * pref identifiers
 *
 * @constant
 */
com.zimbra.service.Prefs.prototype.PREF = {
    CURRENT_VERSION : "extensions.zimbra_mail_notifier.currentVersion",
    ACCESS_STATUSBAR : "extensions.zimbra_mail_notifier.accessStatusBar",
    AUTOCONNECT : "extensions.zimbra_mail_notifier.autoConnect",
    SYSTEM_NOTIFICATION_ENABLED : "extensions.zimbra_mail_notifier.systemNotificationEnabled",
    SOUND_ENABLED : "extensions.zimbra_mail_notifier.soundEnabled",
    CALENDAR_ENABLED : "extensions.zimbra_mail_notifier.calendarEnabled",
    CALENDAR_PERIOD_DISPLAYED : "extensions.zimbra_mail_notifier.calendarPeriodDisplayed",
    CALENDAR_NB_DISPLAYED : "extensions.zimbra_mail_notifier.calendarNbDisplayed",
    CALENDAR_SYSTEM_NOTIFICATION_ENABLED : "extensions.zimbra_mail_notifier.calendarSystemNotificationEnabled",
    CALENDAR_SOUND_ENABLED : "extensions.zimbra_mail_notifier.calendarSoundEnabled",
    CALENDAR_REMINDER_TIME_CONF : "extensions.zimbra_mail_notifier.calendarReminderTimeConf",
    CALENDAR_REMINDER_NB_REPEAT : "extensions.zimbra_mail_notifier.calendarReminderRepeatNb",
    TASK_ENABLED : "extensions.zimbra_mail_notifier.taskEnabled",
    TASK_NB_DISPLAYED : "extensions.zimbra_mail_notifier.taskNbDisplayed",
    TASK_PRIORITIES : "extensions.zimbra_mail_notifier.taskPriorities",
    USER_LOGIN : "extensions.zimbra_mail_notifier.userlogin",
    USER_PASSWORD_HOSTNAME : "chrome://zimbra_mail_notifier/",
    USER_PASSWORD_ACTIONURL : "defaultPassword",
    USER_SAVEPASSWORD : "extensions.zimbra_mail_notifier.userSavePassword",
    USER_SERVER : "extensions.zimbra_mail_notifier.userServer",
    WAITSET_INFO : "extensions.zimbra_mail_notifier.waitSetInfo",
    REQUEST_QUERY_TIMEOUT : "extensions.zimbra_mail_notifier.requestQueryTimeout",
    REQUEST_WAIT_TIMEOUT : "extensions.zimbra_mail_notifier.requestWaitTimeout"
};

/**
 * load preferences
 *
 * @this {Prefs}
 */
com.zimbra.service.Prefs.prototype.load = function() {
    // check version
    this.initDefaultValuesIfNecessary();
    // default
    this.pref_current_version = this._getPref(this.PREF.CURRENT_VERSION);
    this.pref_autoConnect = this._getPref(this.PREF.AUTOCONNECT);
    this.pref_system_notification_enabled = this._getPref(this.PREF.SYSTEM_NOTIFICATION_ENABLED);
    this.pref_sound_enabled = this._getPref(this.PREF.SOUND_ENABLED);
    this.pref_access_statusBar = this._getPref(this.PREF.ACCESS_STATUSBAR);
    // calendar
    this.pref_calendar_enabled = this._getPref(this.PREF.CALENDAR_ENABLED);
    this.pref_calendar_period_displayed = this._getPref(this.PREF.CALENDAR_PERIOD_DISPLAYED);
    this.pref_calendar_nb_displayed = this._getPref(this.PREF.CALENDAR_NB_DISPLAYED);
    this.pref_calendar_system_notification_enabled = this._getPref(this.PREF.CALENDAR_SYSTEM_NOTIFICATION_ENABLED);
    this.pref_calendar_sound_notification_enabled = this._getPref(this.PREF.CALENDAR_SOUND_ENABLED);
    this.pref_calendar_reminder_time_conf = this._getPref(this.PREF.CALENDAR_REMINDER_TIME_CONF);
    this.pref_calendar_reminder_nb_repeat = this._getPref(this.PREF.CALENDAR_REMINDER_NB_REPEAT);
    // task
    this.pref_task_enabled = this._getPref(this.PREF.TASK_ENABLED);
    this.pref_task_nb_displayed = this._getPref(this.PREF.TASK_NB_DISPLAYED);
    this.pref_task_priorities = this._getPref(this.PREF.TASK_PRIORITIES);
    // user
    this.pref_user_login = this._getPref(this.PREF.USER_LOGIN);
    this.pref_user_password = this._getPassword(this.PREF.USER_PASSWORD_HOSTNAME,
                                                this.PREF.USER_PASSWORD_ACTIONURL, this.pref_user_login);
    this.pref_user_server = this._getPref(this.PREF.USER_SERVER);
    this.pref_user_savePassword = this._getPref(this.PREF.USER_SAVEPASSWORD);
    // Last Wait set
    this.pref_waitset_info = this._getComplexPref(this.PREF.WAITSET_INFO);
    // Request
    this.pref_request_queryTimeout = this._getPref(this.PREF.REQUEST_QUERY_TIMEOUT);
    this.pref_request_waitTimeout = this._getPref(this.PREF.REQUEST_WAIT_TIMEOUT);
};

/**
 * init Default Values
 *
 * @this {Prefs}
 */
com.zimbra.service.Prefs.prototype.initDefaultValuesIfNecessary = function() {
	
	var current_version = this._getPref(this.PREF.CURRENT_VERSION);
	if(current_version === null) {
	    // default
	    this._setPref(this.PREF.CURRENT_VERSION, 0x20000);
	    this._addPref(this.PREF.AUTOCONNECT, false);
	    this._addPref(this.PREF.SYSTEM_NOTIFICATION_ENABLED, true);
	    this._addPref(this.PREF.SOUND_ENABLED, true);
	    this._addPref(this.PREF.ACCESS_STATUSBAR, true);
	    // calendar
	    this._addPref(this.PREF.CALENDAR_ENABLED, false);
	    this._addPref(this.PREF.CALENDAR_PERIOD_DISPLAYED, 14);
	    this._addPref(this.PREF.CALENDAR_NB_DISPLAYED, 5);
	    this._addPref(this.PREF.CALENDAR_SYSTEM_NOTIFICATION_ENABLED, true);
	    this._addPref(this.PREF.CALENDAR_SOUND_ENABLED, true);
	    this._addPref(this.PREF.CALENDAR_REMINDER_TIME_CONF, -1);
	    this._addPref(this.PREF.CALENDAR_REMINDER_NB_REPEAT, 0);
	    // task
	    this._addPref(this.PREF.TASK_ENABLED, false);
	    this._addPref(this.PREF.TASK_NB_DISPLAYED, 5);
	    this._addPref(this.PREF.TASK_PRIORITIES, 0);
	    // user
	    this._addPref(this.PREF.USER_LOGIN, '');
	    this._addPref(this.PREF.USER_SAVEPASSWORD, false);
	    this._addPref(this.PREF.USER_SERVER, '');
	    // Last Wait set
	    this._addPref(this.PREF.WAITSET_INFO, '');
	    // Request
	    this._addPref(this.PREF.REQUEST_QUERY_TIMEOUT, 15000);
	    this._addPref(this.PREF.REQUEST_WAIT_TIMEOUT, 300000);
	    // toolbar install
        var util = new com.zimbra.service.Util();
	    util.installButton("nav-bar", "zimbra_mail_notifier-toolbar-button");
	}
	else if(current_version < 0x20000) {
		alert("alors");
		//Just set new parameters
		this._setPref(this.PREF.CURRENT_VERSION, 0x20000);
		// Last Wait set
	    this._addPref(this.PREF.WAITSET_INFO, '');
	    // Request
	    this._addPref(this.PREF.REQUEST_QUERY_TIMEOUT, 15000);
	    this._addPref(this.PREF.REQUEST_WAIT_TIMEOUT, 300000);
	}
};

/**
 * Save preferences
 *
 * @this {Prefs}
 * @returns {Boolean} true if success
 */
com.zimbra.service.Prefs.prototype.save = function() {
    // default
    this._setPref(this.PREF.AUTOCONNECT, this.pref_autoConnect);
    this._setPref(this.PREF.SYSTEM_NOTIFICATION_ENABLED, this.pref_system_notification_enabled);
    this._setPref(this.PREF.SOUND_ENABLED, this.pref_sound_enabled);
    this._setPref(this.PREF.ACCESS_STATUSBAR, this.pref_access_statusBar);
    // calendar
    this._setPref(this.PREF.CALENDAR_ENABLED, this.pref_calendar_enabled);
    this._setPref(this.PREF.CALENDAR_PERIOD_DISPLAYED, this.pref_calendar_period_displayed);
    this._setPref(this.PREF.CALENDAR_NB_DISPLAYED, this.pref_calendar_nb_displayed);
    this._setPref(this.PREF.CALENDAR_SYSTEM_NOTIFICATION_ENABLED, this.pref_calendar_system_notification_enabled);
    this._setPref(this.PREF.CALENDAR_SOUND_ENABLED, this.pref_calendar_sound_notification_enabled);
    this._setPref(this.PREF.CALENDAR_REMINDER_TIME_CONF, this.pref_calendar_reminder_time_conf);
    this._setPref(this.PREF.CALENDAR_REMINDER_NB_REPEAT, this.pref_calendar_reminder_nb_repeat);
    // task
    this._setPref(this.PREF.TASK_ENABLED, this.pref_task_enabled);
    this._setPref(this.PREF.TASK_NB_DISPLAYED, this.pref_task_nb_displayed);
    this._setPref(this.PREF.TASK_PRIORITIES, this.pref_task_priorities);
    // user
    this._setPref(this.PREF.USER_LOGIN, this.pref_user_login);
    this._setPref(this.PREF.USER_SERVER, this.pref_user_server);
    this._setPassword(this.PREF.USER_PASSWORD_HOSTNAME, this.PREF.USER_PASSWORD_ACTIONURL,
                      this.pref_user_login, this.pref_user_password, this.pref_user_savePassword);
    this._setPref(this.PREF.USER_SAVEPASSWORD, this.pref_user_savePassword);
    // Request
    this._setPref(this.PREF.REQUEST_QUERY_TIMEOUT, this.pref_request_queryTimeout);
    this._setPref(this.PREF.REQUEST_WAIT_TIMEOUT, this.pref_request_waitTimeout);

    return true;
};

/**
 * Get the information about the previous wait set
 *
 * @this {Prefs}
 * @return {Object} The wait set information
 */
com.zimbra.service.Prefs.prototype.getPreviousWaitSet = function() {
    try {
        if (this.pref_waitset_info &&
            this.pref_waitset_info.id && this.pref_waitset_info.id.length > 0 &&
            this.pref_waitset_info.seq && this.pref_waitset_info.seq.length > 0 &&
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
 *            seq The wait set sequence
 * @param {String}
 *            hostname The hostname used with this wait set
 * @param {String}
 *            user The user used with this wait set
 */
com.zimbra.service.Prefs.prototype.saveWaitSet = function(id, seq, hostname, user) {
    if (id === null || id === '' || seq === null || seq === '') {
        id  = '';
        seq = '';
    }
    if (hostname && hostname.length > 0 && user && user.length > 0) {
        this.pref_waitset_info = { id: id, seq: seq, hostname: hostname, user: user };
        this._setPref(this.PREF.WAITSET_INFO, JSON.stringify(this.pref_waitset_info));
    }
};

/**
 * indicate the current version
 *
 * @this {Prefs}
 * @return {Number} the current version
 */
com.zimbra.service.Prefs.prototype.getCurrentVersion = function() {
    return this.pref_current_version;
};

/**
 * indicate the server
 *
 * @this {Prefs}
 * @return {String} the server
 */
com.zimbra.service.Prefs.prototype.getUserServer = function() {
    return this.pref_user_server;
};

/**
 * set the server
 *
 * @this {Prefs}
 * @param {String}
 *            server the server
 */
com.zimbra.service.Prefs.prototype.setUserServer = function(server) {
    if (server.lastIndexOf("/") === server.length - 1) {
        this.pref_user_server = server.slice(0, -1);
    } else {
        this.pref_user_server = server;
    }
};

/**
 * indicate the login
 *
 * @this {Prefs}
 * @return {String} the login
 */
com.zimbra.service.Prefs.prototype.getUserLogin = function() {
    return this.pref_user_login;
};

/**
 * set the login
 *
 * @this {Prefs}
 * @param {String}
 *            login the login
 */
com.zimbra.service.Prefs.prototype.setUserLogin = function(login) {
    this.pref_user_login = login;
};

/**
 * indicate the password
 *
 * @this {Prefs}
 * @return {String} the password
 */
com.zimbra.service.Prefs.prototype.getUserPassword = function() {
    return this.pref_user_password;
};

/**
 * set the password
 *
 * @this {Prefs}
 * @param {String}
 *            password the password
 */
com.zimbra.service.Prefs.prototype.setUserPassword = function(password) {
    this.pref_user_password = password;
};

/**
 * indicate if statusBar is enabled
 *
 * @this {Prefs}
 * @return {Boolean} true if enabled
 */
com.zimbra.service.Prefs.prototype.isStatusBarEnabled = function() {
    return this.pref_access_statusBar;
};

/**
 * set if StatusBar is enabled
 *
 * @this {Prefs}
 * @param {Boolean}
 *            enabled true to enabled
 */
com.zimbra.service.Prefs.prototype.setIsStatusBarEnabled = function(enabled) {
    this.pref_access_statusBar = enabled;
};

/**
 * indicate if SavePassword is enabled
 *
 * @this {Prefs}
 * @return {Boolean} true if enabled
 */
com.zimbra.service.Prefs.prototype.isSavePasswordEnabled = function() {
    return this.pref_user_savePassword;
};

/**
 * set if SavePassword is enabled
 *
 * @this {Prefs}
 * @param {Boolean}
 *            enabled true to enabled
 */
com.zimbra.service.Prefs.prototype.setIsSavePasswordEnabled = function(enabled) {
    this.pref_user_savePassword = enabled;
};

/**
 * indicate if sound is enabled
 *
 * @this {Prefs}
 * @return {Boolean} true if enabled
 */
com.zimbra.service.Prefs.prototype.isSoundEnabled = function() {
    return this.pref_sound_enabled;
};

/**
 * set if sound is enabled
 *
 * @this {Prefs}
 * @param {Boolean}
 *            enabled true to enabled
 */
com.zimbra.service.Prefs.prototype.setIsSoundEnabled = function(enabled) {
    this.pref_sound_enabled = enabled;
};

/**
 * indicate if system notification is enabled
 *
 * @this {Prefs}
 * @return {Boolean} true if enabled
 */
com.zimbra.service.Prefs.prototype.isSystemNotificationEnabled = function() {
    return this.pref_system_notification_enabled;
};

/**
 * set if system notification is enabled
 *
 * @this {Prefs}
 * @param {Boolean}
 *            enabled true to enabled
 */
com.zimbra.service.Prefs.prototype.setIsSystemNotificationEnabled = function(enabled) {
    this.pref_system_notification_enabled = enabled;
};

/**
 * indicate if AutoConnect is enabled
 *
 * @this {Prefs}
 * @return {Boolean} true if enabled
 */
com.zimbra.service.Prefs.prototype.isAutoConnectEnabled = function() {
    return this.pref_autoConnect;
};

/**
 * set if AutoConnect is enabled
 *
 * @this {Prefs}
 * @param {Boolean}
 *            enabled true to enabled
 */
com.zimbra.service.Prefs.prototype.setIsAutoConnectEnabled = function(enabled) {
    this.pref_autoConnect = enabled;
};

/**
 * indicate if Calendar is enabled
 *
 * @this {Prefs}
 * @return {Boolean} true if enabled
 */
com.zimbra.service.Prefs.prototype.isCalendarEnabled = function() {
    return this.pref_calendar_enabled;
};

/**
 * set if Calendar is enabled
 *
 * @this {Prefs}
 * @param {Boolean}
 *            enabled true to enabled
 */
com.zimbra.service.Prefs.prototype.setIsCalendarEnabled = function(enabled) {
    this.pref_calendar_enabled = enabled;
};

/**
 * get Calendar Period Displayed
 *
 * @this {Prefs}
 * @return {Number}
 */
com.zimbra.service.Prefs.prototype.getCalendarPeriodDisplayed = function() {
    return this.pref_calendar_period_displayed;
};

/**
 * set Calendar Period Displayed
 *
 * @this {Prefs}
 * @param {Number}
 *            number
 */
com.zimbra.service.Prefs.prototype.setCalendarPeriodDisplayed = function(number) {
    this.pref_calendar_period_displayed = number;
};

/**
 * get Calendar Number Displayed
 *
 * @this {Prefs}
 * @return {Number}
 */
com.zimbra.service.Prefs.prototype.getCalendarNbDisplayed = function() {
    return this.pref_calendar_nb_displayed;
};

/**
 * set Calendar Number Displayed
 *
 * @this {Prefs}
 * @param {Number}
 *            number
 */
com.zimbra.service.Prefs.prototype.setCalendarNbDisplayed = function(number) {
    this.pref_calendar_nb_displayed = number;
};

/**
 * indicate if Calendar System Notification is enabled
 *
 * @this {Prefs}
 * @return {Boolean} true if enabled
 */
com.zimbra.service.Prefs.prototype.isCalendarSystemNotificationEnabled = function() {
    return this.pref_calendar_system_notification_enabled;
};

/**
 * set if Calendar System Notification is enabled
 *
 * @this {Prefs}
 * @param {Boolean}
 *            enabled true to enabled
 */
com.zimbra.service.Prefs.prototype.setIsCalendarSystemNotificationEnabled = function(enabled) {
    this.pref_calendar_system_notification_enabled = enabled;
};

/**
 * indicate if Calendar Sound Notification is enabled
 *
 * @this {Prefs}
 * @return {Boolean} true if enabled
 */
com.zimbra.service.Prefs.prototype.isCalendarSoundNotificationEnabled = function() {
    return this.pref_calendar_sound_notification_enabled;
};

/**
 * set if Calendar System Sound is enabled
 *
 * @this {Prefs}
 * @param {Boolean}
 *            enabled true to enabled
 */
com.zimbra.service.Prefs.prototype.setIsCalendarSoundNotificationEnabled = function(enabled) {
    this.pref_calendar_sound_notification_enabled = enabled;
};

/**
 * get Calendar Reminder Time Configuration
 *
 * @this {Prefs}
 * @return {Number}
 */
com.zimbra.service.Prefs.prototype.getCalendarReminderTimeConf = function() {
    return this.pref_calendar_reminder_time_conf;
};

/**
 * set Calendar Reminder Time Configuration
 *
 * @this {Prefs}
 * @param {Number}
 *            number
 */
com.zimbra.service.Prefs.prototype.setCalendarReminderTimeConf = function(number) {
    this.pref_calendar_reminder_time_conf = number;
};

/**
 * get Calendar Reminder number repeat
 *
 * @this {Prefs}
 * @return {Number}
 */
com.zimbra.service.Prefs.prototype.getCalendarReminderNbRepeat = function() {
    return this.pref_calendar_reminder_nb_repeat;
};

/**
 * set Calendar Reminder number repeat
 *
 * @this {Prefs}
 * @param {Number}
 *            number
 */
com.zimbra.service.Prefs.prototype.setCalendarReminderNbRepeat = function(number) {
    this.pref_calendar_reminder_nb_repeat = number;
};

/**
 * indicate if Task is enabled
 *
 * @this {Prefs}
 * @return {Boolean} true if enabled
 */
com.zimbra.service.Prefs.prototype.isTaskEnabled = function() {
    return this.pref_task_enabled;
};

/**
 * set if Task is enabled
 *
 * @this {Prefs}
 * @param {Boolean}
 *            enabled true to enabled
 */
com.zimbra.service.Prefs.prototype.setIsTaskEnabled = function(enabled) {
    this.pref_task_enabled = enabled;
};

/**
 * get Task number Displayed
 *
 * @this {Prefs}
 * @return {Number}
 */
com.zimbra.service.Prefs.prototype.getTaskNbDisplayed = function() {
    return this.pref_task_nb_displayed;
};

/**
 * set Task number Displayed
 *
 * @this {Prefs}
 * @param {Number}
 *            number
 */
com.zimbra.service.Prefs.prototype.setTaskNbDisplayed = function(number) {
    this.pref_task_nb_displayed = number;
};

/**
 * get Task Priorities Displayed
 *
 * @this {Prefs}
 * @return {Number}
 */
com.zimbra.service.Prefs.prototype.getTaskPrioritiesDisplayed = function() {
    return this.pref_task_priorities;
};

/**
 * set Task Priorities Displayed
 *
 * @this {Prefs}
 * @param {Number}
 *            number
 */
com.zimbra.service.Prefs.prototype.setTaskPrioritiesDisplayed = function(number) {
    this.pref_task_priorities = number;
};

/**
 * Get the timeout (ms) for query
 *
 * @this {Prefs}
 * @return {Number}
 */
com.zimbra.service.Prefs.prototype.getRequestQueryTimeout = function() {
    return this.pref_request_queryTimeout;
};

/**
 * Get the timeout (ms) for the wait request
 *
 * @this {Prefs}
 * @return {Number}
 */
com.zimbra.service.Prefs.prototype.getRequestWaitTimeout = function() {
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
com.zimbra.service.Prefs.prototype._getPref = function(pref) {
    var prefManager = Components.classes["@mozilla.org/preferences-service;1"].
                        getService(Components.interfaces.nsIPrefBranch);
    var value = null;
    if (prefManager.getPrefType(pref) === prefManager.PREF_BOOL) {
        value = prefManager.getBoolPref(pref);
    } else if (prefManager.getPrefType(pref) === prefManager.PREF_INT) {
        value = prefManager.getIntPref(pref);
    } else if (prefManager.getPrefType(pref) === prefManager.PREF_STRING) {
        value = prefManager.getCharPref(pref);
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
com.zimbra.service.Prefs.prototype._getComplexPref = function(pref) {
    var prefManager = Components.classes["@mozilla.org/preferences-service;1"].
                        getService(Components.interfaces.nsIPrefBranch);
    var value = null;
    try {
        var strVal = null;
        if (prefManager.getPrefType(pref) === prefManager.PREF_STRING) {
            strVal = prefManager.getCharPref(pref);
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
 * set char preference
 *
 * @private
 *
 * @this {Prefs}
 *
 * @param {String}
 *            pref the preference name
 * @param {Object}
 *            value the preference value
 */
com.zimbra.service.Prefs.prototype._setPref = function(pref, value) {
    var prefManager = Components.classes["@mozilla.org/preferences-service;1"].
                        getService(Components.interfaces.nsIPrefBranch);
    dump("_setPref="+pref+", vaue="+value);
    if (typeof value === 'number') {
        prefManager.setIntPref(pref, value);
    } else if (typeof value === 'boolean') {
        prefManager.setBoolPref(pref, value);
    } else {
        prefManager.setCharPref(pref, value);
    }
};

/**
 * Add a preference if doesn't already exist
 *
 * @private
 *
 * @this {Prefs}
 *
 * @param {String}
 *            pref the preference name
 * @param {Object}
 *            value The preference initial/default value
 */
com.zimbra.service.Prefs.prototype._addPref = function(pref, value) {
    var prefManager = Components.classes["@mozilla.org/preferences-service;1"].
                        getService(Components.interfaces.nsIPrefBranch);

    if (prefManager.getPrefType(pref) === prefManager.PREF_INVALID) {
        if (typeof value === 'number') {
            prefManager.setIntPref(pref, value);
        } else if (typeof value === 'boolean') {
            prefManager.setBoolPref(pref, value);
        } else {
            prefManager.setCharPref(pref, value);
        }
    }
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
com.zimbra.service.Prefs.prototype._getPassword = function(hostname, actionURL, username) {
    try {
        var loginManager = Components.classes["@mozilla.org/login-manager;1"].
                            getService(Components.interfaces.nsILoginManager);
        var logins = loginManager.findLogins({}, hostname, actionURL, null);
        var password = "";
        for ( var i = 0; i < logins.length; i++) {
            if (logins[i].username === username) {
                password = logins[i].password;
                break;
            }
        }
        return password;
    } catch (e) {
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
com.zimbra.service.Prefs.prototype._setPassword = function(hostname, actionURL, username, password, withSave) {
    try {
        var loginManager = Components.classes["@mozilla.org/login-manager;1"].
                            getService(Components.interfaces.nsILoginManager);
        var logins = loginManager.findLogins({}, hostname, actionURL, null);
        var currentLoginInfo = null;
        for ( var i = 0; i < logins.length; i++) {
            if (logins[i].username === username) {
                currentLoginInfo = logins[i];
            }
        }
        var nsLoginInfo = new Components.Constructor("@mozilla.org/login-manager/loginInfo;1",
                                                     Components.interfaces.nsILoginInfo, "init");
        var newLogin = new nsLoginInfo(hostname, actionURL, null, username, password, "", "");
        if (currentLoginInfo !== null) {
            if (withSave) {
                loginManager.modifyLogin(currentLoginInfo, newLogin);
            } else {
                loginManager.removeLogin(currentLoginInfo);
            }
        } else if (withSave) {
            loginManager.addLogin(newLogin);
        }
    } catch (e) {
        return false;
    }
    return true;
};
