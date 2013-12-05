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
    EMAIL_NOTIFICATION_DURATION     : "emailNotificationDuration",
    // Browser
    BROWSER_SET_COOKIES             : "browserSetCookies",
    BROWSER_COOKIE_HTTP_ONLY        : "browserCookieHttpOnly",
    // calendar
    CALENDAR_ENABLED                : "calendarEnabled",
    CALENDAR_PERIOD_DISPLAYED       : "calendarPeriodDisplayed",
    CALENDAR_NB_DISPLAYED           : "calendarNbDisplayed",
    CALENDAR_NOTIFICATION_ENABLED   : "calendarSystemNotificationEnabled",
    CALENDAR_SOUND_ENABLED          : "calendarSoundEnabled",
    CALENDAR_REMINDER_TIME_CONF     : "calendarReminderTimeConf",
    CALENDAR_REMINDER_NB_REPEAT     : "calendarReminderRepeatNb",
    // task
    TASK_ENABLED                    : "taskEnabled",
    TASK_NB_DISPLAYED               : "taskNbDisplayed",
    TASK_PRIORITIES                 : "taskPriorities",
    // user
    USER_LOGIN                      : "userLogin",
    USER_PASSWORD                   : "userPassword",
    USER_URL_WEB_SERVICE            : "userServer",
    USER_URL_WEB_INTERFACE          : "userUrlWebInteface",
    USER_SAVEPASSWORD               : "userSavePassword",
    // About Wait set
    WAITSET_INFO                    : "waitSetInfo",
    REQUEST_QUERY_TIMEOUT           : "requestQueryTimeout",
    REQUEST_WAIT_TIMEOUT            : "requestWaitTimeout",
    REQUEST_WAIT_LOOP_TIME          : "requestWaitLoopTime",
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
    }
    
    // Set the current version
    this.pref_current_version = zimbra_notifier_Constant.VERSION;
    this._prefs.setPref(this.PREF.CURRENT_VERSION, this.pref_current_version);
    
    // email + general
    this.pref_autoConnect                  = this._getPref(this.PREF.AUTOCONNECT);
    this.pref_email_notification_enabled   = this._getPref(this.PREF.EMAIL_NOTIFICATION_ENABLED);
    this.pref_email_sound_enabled          = this._getPref(this.PREF.EMAIL_SOUND_ENABLED);
    this.pref_email_notification_duration  = this._getPref(this.PREF.EMAIL_NOTIFICATION_DURATION);
    // Browser
    this.pref_browser_set_cookies          = this._getPref(this.PREF.BROWSER_SET_COOKIES);
    this.pref_browser_cookie_http_only     = this._getPref(this.PREF.BROWSER_COOKIE_HTTP_ONLY);
    // calendar
    this.pref_calendar_enabled               = this._getPref(this.PREF.CALENDAR_ENABLED);
    this.pref_calendar_period_displayed      = this._getPref(this.PREF.CALENDAR_PERIOD_DISPLAYED);
    this.pref_calendar_nb_displayed          = this._getPref(this.PREF.CALENDAR_NB_DISPLAYED);
    this.pref_calendar_notification_enabled  = this._getPref(this.PREF.CALENDAR_NOTIFICATION_ENABLED);
    this.pref_calendar_sound_enabled         = this._getPref(this.PREF.CALENDAR_SOUND_ENABLED);
    this.pref_calendar_reminder_time_conf    = this._getPref(this.PREF.CALENDAR_REMINDER_TIME_CONF);
    this.pref_calendar_reminder_nb_repeat    = this._getPref(this.PREF.CALENDAR_REMINDER_NB_REPEAT);
    // task
    this.pref_task_enabled            = this._getPref(this.PREF.TASK_ENABLED);
    this.pref_task_nb_displayed       = this._getPref(this.PREF.TASK_NB_DISPLAYED);
    this.pref_task_priorities         = this._getPref(this.PREF.TASK_PRIORITIES);
    // user
    this.pref_user_login              = this._getPref(this.PREF.USER_LOGIN);
	this.pref_user_password           = this._getPref(this.PREF.USER_PASSWORD);
    this.pref_user_savePassword       = this._getPref(this.PREF.USER_SAVEPASSWORD);
    this.pref_user_url_web_service    = this._getPref(this.PREF.USER_URL_WEB_SERVICE);
    this.pref_user_url_web_interface  = this._getPref(this.PREF.USER_URL_WEB_INTERFACE);
    // About Wait set
    this.pref_waitset_info            = this._getComplexPref(this.PREF.WAITSET_INFO);
    this.pref_request_query_timeout   = this._getPref(this.PREF.REQUEST_QUERY_TIMEOUT);
    this.pref_request_wait_timeout    = this._getPref(this.PREF.REQUEST_WAIT_TIMEOUT);
    this.pref_request_wait_loop_time  = this._getPref(this.PREF.REQUEST_WAIT_LOOP_TIME);
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
        this._prefs = null;
    }
};

/**
 * get preference
 *
 * @this {Prefs}
 * @param {String} key of the preference
 * @return {Object} value of the preference key
 */
zimbra_notifier_Prefs.getPref = function(key) {
    var value = undefined;
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

        // user
        case this.PREF.USER_LOGIN:
            value = this.pref_user_login;
            break;

	case this.PREF.USER_PASSWORD:
            value = this.pref_user_password;
            break;
			
        case this.PREF.USER_URL_WEB_SERVICE:
            value = this.pref_user_url_web_service;
            break;

        case this.PREF.USER_URL_WEB_INTERFACE:
            value = this.pref_user_url_web_interface;
            break;

        case this.PREF.USER_SAVEPASSWORD:
            value = this.pref_user_savePassword;
            break;

        // About Wait set
        case this.PREF.REQUEST_QUERY_TIMEOUT:
            value = this.pref_request_query_timeout;
            break;

        case this.PREF.REQUEST_WAIT_TIMEOUT:
            value = this.pref_request_wait_timeout;
            break;

        case this.PREF.REQUEST_WAIT_LOOP_TIME:
            value = this.pref_request_wait_loop_time;
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

    if (this._prefs) {
        this._prefs.setPref(key, value);
    }

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

        // user
        case this.PREF.USER_LOGIN:
            this.pref_user_login = value;
            break;

		case this.PREF.USER_PASSWORD:
            this.pref_user_password = value;
            break;
			
        case this.PREF.USER_URL_WEB_SERVICE:
            this.pref_user_url_web_service = value;
            break;

        case this.PREF.USER_URL_WEB_INTERFACE:
            this.pref_user_url_web_interface = value;
            break;

        case this.PREF.USER_SAVEPASSWORD:
            this.pref_user_savePassword = value;
            break;

        // About Wait set
        case this.PREF.REQUEST_QUERY_TIMEOUT:
            this.pref_request_query_timeout = value;
            break;

        case this.PREF.REQUEST_WAIT_TIMEOUT:
            this.pref_request_wait_timeout = value;
            break;

        case this.PREF.REQUEST_WAIT_LOOP_TIME:
            this.pref_request_wait_loop_time = value;
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
 * Set temporary login information.
 * Do not save the information to the preference system
 *
 * @this {Prefs}
 */
zimbra_notifier_Prefs.setTemporaryLogin = function(urlServ, user) {
    if (!urlServ) {
        urlServ = '';
    }
    this.pref_user_url_web_service = urlServ.trim();

    if (!user) {
        user = '';
    }
    this.pref_user_login = user.trim();
};

/**
 * Load from preferences the login information (url of webservice + user)
 *
 * @this {Prefs}
 */
zimbra_notifier_Prefs.reloadLogin = function() {
    this.pref_user_login  = this._getPref(this.PREF.USER_LOGIN);
    this.pref_user_url_web_service = this._getPref(this.PREF.USER_URL_WEB_SERVICE);
};

/**
 * Indicate if it is a free webmail
 *
 * @this {Prefs}
 * @return {Boolean} True if the url of the webservice contain the free domain
 */
zimbra_notifier_Prefs.isFreeWebService = function() {
    if (this.pref_user_url_web_service) {
        return (this.pref_user_url_web_service.search("zimbra.free.fr") > 0) ||
               (this.pref_user_url_web_service.search("zimbra.aliceadsl.fr") > 0);
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

/* *************************** user *************************** */

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
 * indicate the URL of the webservice. May contain a trailling slash
 *
 * @this {Prefs}
 * @return {String} the URL
 */
zimbra_notifier_Prefs.getUrlWebService = function() {
    return this.pref_user_url_web_service;
};

/**
 * indicate the URL of the Web interface
 * If not set, return the URl of the webservice
 *
 * @this {Prefs}
 * @return {String} the URL
 */
zimbra_notifier_Prefs.getUrlUserInterface = function() {
    if (this.pref_user_url_web_interface) {
        return this.pref_user_url_web_interface;
    }
    return this.pref_user_url_web_service;
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
 * indicate the password
 *
 * @this {Prefs}
 * @return {String} the password
 */
zimbra_notifier_Prefs.getUserPassword = function() {
    return this.pref_user_password;
};

/* *************************** About Wait set *************************** */

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
            this.pref_waitset_info.urlWebService && this.pref_waitset_info.urlWebService.length > 0 &&
            this.pref_waitset_info.user && this.pref_waitset_info.user.length > 0) {

            return {
                id: this.pref_waitset_info.id,
                seq: this.pref_waitset_info.seq,
                urlWebService : this.pref_waitset_info.urlWebService,
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
 *            urlWebService The URL of the webservice used with this wait set
 * @param {String}
 *            user The user used with this wait set
 */
zimbra_notifier_Prefs.saveWaitSet = function(id, seq, urlWebService, user) {
    if (!id || !seq || !(parseInt(seq, 10) >= 0)) {
        id  = '';
        seq = '';
    }
    if (urlWebService && urlWebService.length > 0 && user && user.length > 0) {
        this.pref_waitset_info = { id: id, seq: seq, urlWebService: urlWebService, user: user };
        this._prefs.setPref(this.PREF.WAITSET_INFO, JSON.stringify(this.pref_waitset_info));
    }
};

/**
 * Get the timeout (ms) for query
 *
 * @this {Prefs}
 * @return {Number}
 */
zimbra_notifier_Prefs.getRequestQueryTimeout = function() {
    return this.pref_request_query_timeout;
};

/**
 * Get the timeout (ms) for the wait request
 *
 * @this {Prefs}
 * @return {Number}
 */
zimbra_notifier_Prefs.getRequestWaitTimeout = function() {
    return this.pref_request_wait_timeout;
};

/**
 * Get the maximum duration (ms) of consecutive Wait Set requests
 *
 * @this {Prefs}
 * @return {Number}
 */
zimbra_notifier_Prefs.getRequestWaitLoopTime = function() {
    return this.pref_request_wait_loop_time;
};

/* *************************** Private *************************** */

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
    if (this._prefs) {
        return this._prefs.getPref(pref);
    }
    return null;
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
        var strVal = this._prefs.getPref(pref);
        if (strVal && strVal.length > 0) {
            value = JSON.parse(strVal);
        }
    }
    catch (e) {
    }
    return value;
};


var PrefsService = {
    _defaultsPref : { 
	prefs: {
		'currentVersion': 0,
		'autoConnect': true,
                'systemNotificationEnabled': true,
		'soundEnabled': true,
		'emailNotificationDuration': 16,
		'calendarEnabled': true,
		'calendarPeriodDisplayed': 14,
		'calendarNbDisplayed': 5,
		'calendarSystemNotificationEnabled': true,
		'calendarSoundEnabled': true,
		'calendarReminderTimeConf': -1,
		'calendarReminderRepeatNb': 0,
		'taskEnabled': true,
		'taskNbDisplayed': 5,
		'taskPriorities': 0,
		'userLogin': '',
		'userPassword': '',
		'userServer': '',
		'userUrlWebInteface': '',
		'userSavePassword': true,
		'waitSetInfo': '',
		'requestQueryTimeout': 15000,
		'requestWaitTimeout': 300000,
		'requestWaitLoopTime': 500000,
		'browserSetCookies': true,
		'browserCookieHttpOnly': false
        }
    },
    _currentPref : undefined
};

PrefsService.init = function(callback) {
    chrome.storage.sync.get(this._defaultsPref,
        function (storage) {
            PrefsService._currentPref = storage;
	    if(callback) {
	    	callback();
	    }
        }
    );
};

PrefsService.getPref = function(key) {
    if(this._currentPref) {
        return this._currentPref.prefs[key];
    }
};

PrefsService.setPref = function(key, value) {
    chrome.storage.sync.get(this._currentPref,
        function (storage) {
            storage.prefs[key] = value;
            chrome.storage.sync.set(storage);
        }
    );
};


