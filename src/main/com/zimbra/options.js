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

Components.utils.import("resource://zimbra_mail_notifier/zimbrasingleton.jsm");

if (!com) {
    var com = {};
}
if (!com.zimbra) {
    com.zimbra = {};
}
/**
 * The Class Options.
 *
 * @constructor
 * @this {Options}
 */
com.zimbra.Options = {};

/**
 * Initialize option.
 *
 * @this {Option}
 */
com.zimbra.Options.init = function() {

    var selectedTab = com.zimbra.constant.OPTION_SELECT_TAB.GENERAL;
    var util = com.zimbra.service.Util;

    this._closeWhenConnected = false;
    this._prefWereSaved = false;
    this._service = ZimbraNotifierSingleton.getService();

    // show identification tab if necessary
    if (this._service === null) {
        util.setVisibility("option.tab.identification", "collapse");
        this._prefs = new com.zimbra.service.Prefs();
    }
    else {
        util.setVisibility("option.tab.identification", "visible");
        // Register
        this._service.addCallBackRefresh(this);
        // use service pref
        this._prefs = this._service.getPrefs();
        // get the selected tab
        selectedTab = window.arguments[0];
    }

    // select tab
    document.getElementById("zimbra_mail_notifier-tabbox").selectedIndex = selectedTab;

    // load pref before set visual options (if user change manually pref in about:config)
    this._prefs.load();

    // identification
    util.setAttribute("zimbra_mail_notifier-optionLogin","value", this._prefs.getUserLogin());
    util.setAttribute("zimbra_mail_notifier-optionPassword", "value", "");
    if (this._prefs.isSavePasswordEnabled()) {
        util.setAttribute("zimbra_mail_notifier-optionPassword",
                                "value", this._prefs.getUserPassword());
    }
    util.setAttribute("zimbra_mail_notifier-optionServer",
                            "value", this._prefs.getUserServer());

    // general
    util.setAttribute("zimbra_mail_notifier-optionAutoConnect",
                            "checked", this._prefs.isAutoConnectEnabled());
    util.setAttribute("zimbra_mail_notifier-optionSystemNotification",
                            "checked", this._prefs.isSystemNotificationEnabled());
    util.setAttribute("zimbra_mail_notifier-optionSoundNotification",
                            "checked", this._prefs.isSoundEnabled());
    util.setAttribute("zimbra_mail_notifier-optionAccessStatusBar",
                            "checked", this._prefs.isStatusBarEnabled());
    util.setAttribute("zimbra_mail_notifier-optionSavePassword",
                            "checked", this._prefs.isSavePasswordEnabled());
    // calendar
    util.setAttribute("zimbra_mail_notifier-optionCalendarEnabled",
                            "checked", this._prefs.isCalendarEnabled());
    util.setAttribute("zimbra_mail_notifier-optionCalendarSystemNotification",
                            "checked", this._prefs.isCalendarSystemNotificationEnabled());
    util.setAttribute("zimbra_mail_notifier-optionCalendarSoundNotification",
                            "checked", this._prefs.isCalendarSoundNotificationEnabled());
    util.setMenulist("zimbra_mail_notifier-optionCalendarPeriodDisplayed",
                           this._prefs.getCalendarPeriodDisplayed());
    util.setMenulist("zimbra_mail_notifier-optionCalendarNbDisplayed",
                           this._prefs.getCalendarNbDisplayed());
    util.setMenulist("zimbra_mail_notifier-optionCalendarReminderTimeConf",
                           this._prefs.getCalendarReminderTimeConf());
    util.setMenulist("zimbra_mail_notifier-optionCalendarReminderNbRepeat",
                           this._prefs.getCalendarReminderNbRepeat());
    // task
    util.setAttribute("zimbra_mail_notifier-optionTaskEnabled",
                            "checked", this._prefs.isTaskEnabled());
    util.setMenulist("zimbra_mail_notifier-optionTaskNbDisplayed",
                           this._prefs.getTaskNbDisplayed());
    util.setMenulist("zimbra_mail_notifier-optionTaskPrioritiesDisplayed",
                           this._prefs.getTaskPrioritiesDisplayed());

    // refresh screen access
    this.refresh();
};

/**
 * Refresh.
 *
 * @this {Option}
 */
com.zimbra.Options.refresh = function(startRequest) {

    if (this._service && this._closeWhenConnected === true) {
        if (this._service.isConnected()) {
            this.close();
            this._closeWhenConnected = false;
            return;
        }
    }

    if (this._service && !startRequest) {
        var util = com.zimbra.service.Util;

        util.setVisibility("zimbra_mail_notifier-connectButton", "collapse");
        util.setVisibility("zimbra_mail_notifier-disconnectButton", "collapse");
        util.setVisibility("zimbra_mail_notifier-connectInProgressButton", "collapse");

        if (   util.getAttribute("zimbra_mail_notifier-optionLogin", "value") !== ''
            && util.getAttribute("zimbra_mail_notifier-optionPassword", "value") !== ''
            && util.getAttribute("zimbra_mail_notifier-optionServer", "value") !== '') {
            util.removeAttribute("zimbra_mail_notifier-connectButton", "disabled");
        }
        else {
            util.setAttribute("zimbra_mail_notifier-connectButton", "disabled", true);
        }

        if (this._service.isConnected()) {
            util.setVisibility("zimbra_mail_notifier-disconnectButton", "visible");
            util.setAttribute("zimbra_mail_notifier-optionLogin", "disabled", true);
            util.setAttribute("zimbra_mail_notifier-optionPassword", "disabled", true);
            util.setAttribute("zimbra_mail_notifier-optionServer", "disabled", true);
        }
        else {
            util.setVisibility("zimbra_mail_notifier-connectButton", "visible");
            util.removeAttribute("zimbra_mail_notifier-optionLogin", "disabled");
            util.removeAttribute("zimbra_mail_notifier-optionPassword", "disabled");
            util.removeAttribute("zimbra_mail_notifier-optionServer", "disabled");
        }
        util.setAttribute("zimbra_mail_notifier-serverError", "value",
                                this._service.getLastErrorMessage());
    }
};

/**
 * Update pref.
 *
 * @private
 * @this {Option}
 */
com.zimbra.Options.updatePrefs = function() {
    var util = com.zimbra.service.Util;

    // general
    this._prefs.setIsAutoConnectEnabled(util.getAttribute(
        "zimbra_mail_notifier-optionAutoConnect", "checked"));
    this._prefs.setIsSystemNotificationEnabled(util.getAttribute(
        "zimbra_mail_notifier-optionSystemNotification", "checked"));
    this._prefs.setIsSoundEnabled(util.getAttribute(
        "zimbra_mail_notifier-optionSoundNotification", "checked"));
    this._prefs.setIsStatusBarEnabled(util.getAttribute(
        "zimbra_mail_notifier-optionAccessStatusBar", "checked"));

    // calendar
    this._prefs.setIsCalendarEnabled(util.getAttribute(
        "zimbra_mail_notifier-optionCalendarEnabled", "checked"));
    this._prefs.setIsCalendarSystemNotificationEnabled(util.getAttribute(
        "zimbra_mail_notifier-optionCalendarSystemNotification", "checked"));
    this._prefs.setIsCalendarSoundNotificationEnabled(util.getAttribute(
        "zimbra_mail_notifier-optionCalendarSoundNotification", "checked"));
    this._prefs.setCalendarPeriodDisplayed(Number(util.getAttribute(
        "zimbra_mail_notifier-optionCalendarPeriodDisplayed", "value")));
    this._prefs.setCalendarNbDisplayed(Number(util.getAttribute(
        "zimbra_mail_notifier-optionCalendarNbDisplayed", "value")));
    this._prefs.setCalendarReminderTimeConf(Number(util.getAttribute(
        "zimbra_mail_notifier-optionCalendarReminderTimeConf", "value")));
    this._prefs.setCalendarReminderNbRepeat(Number(util.getAttribute(
        "zimbra_mail_notifier-optionCalendarReminderNbRepeat", "value")));

    // task
    this._prefs.setIsTaskEnabled(util.getAttribute(
        "zimbra_mail_notifier-optionTaskEnabled", "checked"));
    this._prefs.setTaskNbDisplayed(Number(util.getAttribute(
        "zimbra_mail_notifier-optionTaskNbDisplayed", "value")));
    this._prefs.setTaskPrioritiesDisplayed(Number(util.getAttribute(
        "zimbra_mail_notifier-optionTaskPrioritiesDisplayed", "value")));

    // identification
    this._prefs.setIsSavePasswordEnabled(util.getAttribute(
        "zimbra_mail_notifier-optionSavePassword", "checked"));
    this._prefs.setUserLogin(util.getAttribute(
        "zimbra_mail_notifier-optionLogin", "value"));
    this._prefs.setUserServer(util.getAttribute(
        "zimbra_mail_notifier-optionServer", "value"));

    if (this._prefs.isSavePasswordEnabled()) {
        this._prefs.setUserPassword(util.getAttribute(
            "zimbra_mail_notifier-optionPassword", "value"));
    } else {
        this._prefs.setUserPassword('');
    }

    this._prefs.save();
    this._prefWereSaved = true;
};

/**
 * Save option.
 *
 * @this {Option}
 */
com.zimbra.Options.save = function() {
    // update and save prefs
    this.updatePrefs();
    window.close();
};

/**
 * Close option.
 *
 * @this {Option}
 */
com.zimbra.Options.close = function() {
    window.close();
};

/**
 * Call when the window is closed
 *
 * @this {Option}
 */
com.zimbra.Options.release = function() {
    if (this._service) {
        this._service.removeCallBackRefresh(this);
        this._service = null;
    }
    if (this._prefWereSaved === true) {
        com.zimbra.service.Util.notifyObservers(com.zimbra.constant.OBSERVER.PREF_SAVED, null);
        this._prefWereSaved = false;
    }
};

/**
 * start connection.
 *
 * @this {Option}
 */
com.zimbra.Options.connect = function() {
    if (this._service) {
        var util = com.zimbra.service.Util;
        // update and save prefs
        this.updatePrefs();
        this._closeWhenConnected = true;
        // update screen view
        util.setAttribute("zimbra_mail_notifier-optionLogin", "disabled", true);
        util.setAttribute("zimbra_mail_notifier-optionPassword", "disabled", true);
        util.setAttribute("zimbra_mail_notifier-optionServer", "disabled", true);
        util.setVisibility("zimbra_mail_notifier-connectButton", "collapse");
        util.setVisibility("zimbra_mail_notifier-connectInProgressButton", "visible");
        util.setVisibility("zimbra_mail_notifier-serverError", "value", "");
        // initialize connection
        this._service.initializeConnection(
            util.getAttribute("zimbra_mail_notifier-optionPassword", "value"));
    }
};

/**
 * disconnection.
 *
 * @this {Option}
 */
com.zimbra.Options.disconnect = function() {
    this._closeWhenConnected = false;
    if (this._service) {
        this._service.closeConnection();
    }
};
