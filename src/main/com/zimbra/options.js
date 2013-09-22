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

    this._closeWhenConnected = false;
    this._util = new com.zimbra.service.Util();
    this._main = null;

    // show identification tab if necessary
    if (!window.arguments || !window.arguments[0].getService) {
        this._util.setVisibility("option.tab.identification", "collapse");
        this._prefs = new com.zimbra.service.Prefs();
    }
    else {
        this._util.setVisibility("option.tab.identification", "visible");
        // get parent
        this._main = window.arguments[0];
        this._main.getService().addCallBackRefresh(this);
        // use service pref
        this._prefs = this._main.getService().getPrefs();
        // get the selected tab
        selectedTab = window.arguments[1];
    }

    // select tab
    document.getElementById("zimbra_mail_notifier-tabbox").selectedIndex = selectedTab;

    // load pref before set visual options (if user change manually pref in about:config)
    this._prefs.load();

    // identification
    this._util.setAttribute("zimbra_mail_notifier-optionLogin","value", this._prefs.getUserLogin());
    this._util.setAttribute("zimbra_mail_notifier-optionPassword", "value", "");
    if (this._prefs.isSavePasswordEnabled()) {
        this._util.setAttribute("zimbra_mail_notifier-optionPassword",
                                "value", this._prefs.getUserPassword());
    }
    this._util.setAttribute("zimbra_mail_notifier-optionServer",
                            "value", this._prefs.getUserServer());

    // general
    this._util.setAttribute("zimbra_mail_notifier-optionAutoConnect",
                            "checked", this._prefs.isAutoConnectEnabled());
    this._util.setAttribute("zimbra_mail_notifier-optionSystemNotification",
                            "checked", this._prefs.isSystemNotificationEnabled());
    this._util.setAttribute("zimbra_mail_notifier-optionSoundNotification",
                            "checked", this._prefs.isSoundEnabled());
    this._util.setAttribute("zimbra_mail_notifier-optionAccessStatusBar",
                            "checked", this._prefs.isStatusBarEnabled());
    this._util.setAttribute("zimbra_mail_notifier-optionSavePassword",
                            "checked", this._prefs.isSavePasswordEnabled());
    // calendar
    this._util.setAttribute("zimbra_mail_notifier-optionCalendarEnabled",
                            "checked", this._prefs.isCalendarEnabled());
    this._util.setAttribute("zimbra_mail_notifier-optionCalendarSystemNotification",
                            "checked", this._prefs.isCalendarSystemNotificationEnabled());
    this._util.setAttribute("zimbra_mail_notifier-optionCalendarSoundNotification",
                            "checked", this._prefs.isCalendarSoundNotificationEnabled());
    this._util.setMenulist("zimbra_mail_notifier-optionCalendarPeriodDisplayed",
                           this._prefs.getCalendarPeriodDisplayed());
    this._util.setMenulist("zimbra_mail_notifier-optionCalendarNbDisplayed",
                           this._prefs.getCalendarNbDisplayed());
    this._util.setMenulist("zimbra_mail_notifier-optionCalendarReminderTimeConf",
                           this._prefs.getCalendarReminderTimeConf());
    this._util.setMenulist("zimbra_mail_notifier-optionCalendarReminderNbRepeat",
                           this._prefs.getCalendarReminderNbRepeat());
    // task
    this._util.setAttribute("zimbra_mail_notifier-optionTaskEnabled",
                            "checked", this._prefs.isTaskEnabled());
    this._util.setMenulist("zimbra_mail_notifier-optionTaskNbDisplayed",
                           this._prefs.getTaskNbDisplayed());
    this._util.setMenulist("zimbra_mail_notifier-optionTaskPrioritiesDisplayed",
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

    if (this._main && this._closeWhenConnected === true) {
        if (this._main.getService().isConnected()) {
            this.close();
            this._closeWhenConnected = false;
            return;
        }
    }

    if (this._main && !startRequest) {

        this._util.setVisibility("zimbra_mail_notifier-connectButton", "collapse");
        this._util.setVisibility("zimbra_mail_notifier-disconnectButton", "collapse");
        this._util.setVisibility("zimbra_mail_notifier-connectInProgressButton", "collapse");

        if (   this._util.getAttribute("zimbra_mail_notifier-optionLogin", "value") !== ''
            && this._util.getAttribute("zimbra_mail_notifier-optionPassword", "value") !== ''
            && this._util.getAttribute("zimbra_mail_notifier-optionServer", "value") !== '') {
            this._util.removeAttribute("zimbra_mail_notifier-connectButton", "disabled");
        }
        else {
            this._util.setAttribute("zimbra_mail_notifier-connectButton", "disabled", true);
        }

        if (this._main.getService().isConnected()) {
            this._util.setVisibility("zimbra_mail_notifier-disconnectButton", "visible");
            this._util.setAttribute("zimbra_mail_notifier-optionLogin", "disabled", true);
            this._util.setAttribute("zimbra_mail_notifier-optionPassword", "disabled", true);
            this._util.setAttribute("zimbra_mail_notifier-optionServer", "disabled", true);
        }
        else {
            this._util.setVisibility("zimbra_mail_notifier-connectButton", "visible");
            this._util.removeAttribute("zimbra_mail_notifier-optionLogin", "disabled");
            this._util.removeAttribute("zimbra_mail_notifier-optionPassword", "disabled");
            this._util.removeAttribute("zimbra_mail_notifier-optionServer", "disabled");
        }
        this._util.setAttribute("zimbra_mail_notifier-serverError", "value",
                                this._main.getService().getLastErrorMessage());
    }
};

/**
 * Update pref.
 *
 * @private
 * @this {Option}
 */
com.zimbra.Options.updatePrefs = function() {
    // general
    this._prefs.setIsAutoConnectEnabled(this._util.getAttribute(
        "zimbra_mail_notifier-optionAutoConnect", "checked"));
    this._prefs.setIsSystemNotificationEnabled(this._util.getAttribute(
        "zimbra_mail_notifier-optionSystemNotification", "checked"));
    this._prefs.setIsSoundEnabled(this._util.getAttribute(
        "zimbra_mail_notifier-optionSoundNotification", "checked"));
    this._prefs.setIsStatusBarEnabled(this._util.getAttribute(
        "zimbra_mail_notifier-optionAccessStatusBar", "checked"));

    // calendar
    this._prefs.setIsCalendarEnabled(this._util.getAttribute(
        "zimbra_mail_notifier-optionCalendarEnabled", "checked"));
    this._prefs.setIsCalendarSystemNotificationEnabled(this._util.getAttribute(
        "zimbra_mail_notifier-optionCalendarSystemNotification", "checked"));
    this._prefs.setIsCalendarSoundNotificationEnabled(this._util.getAttribute(
        "zimbra_mail_notifier-optionCalendarSoundNotification", "checked"));
    this._prefs.setCalendarPeriodDisplayed(Number(this._util.getAttribute(
        "zimbra_mail_notifier-optionCalendarPeriodDisplayed", "value")));
    this._prefs.setCalendarNbDisplayed(Number(this._util.getAttribute(
        "zimbra_mail_notifier-optionCalendarNbDisplayed", "value")));
    this._prefs.setCalendarReminderTimeConf(Number(this._util.getAttribute(
        "zimbra_mail_notifier-optionCalendarReminderTimeConf", "value")));
    this._prefs.setCalendarReminderNbRepeat(Number(this._util.getAttribute(
        "zimbra_mail_notifier-optionCalendarReminderNbRepeat", "value")));

    // task
    this._prefs.setIsTaskEnabled(this._util.getAttribute(
        "zimbra_mail_notifier-optionTaskEnabled", "checked"));
    this._prefs.setTaskNbDisplayed(Number(this._util.getAttribute(
        "zimbra_mail_notifier-optionTaskNbDisplayed", "value")));
    this._prefs.setTaskPrioritiesDisplayed(Number(this._util.getAttribute(
        "zimbra_mail_notifier-optionTaskPrioritiesDisplayed", "value")));

    // identification
    this._prefs.setIsSavePasswordEnabled(this._util.getAttribute(
        "zimbra_mail_notifier-optionSavePassword", "checked"));
    this._prefs.setUserLogin(this._util.getAttribute(
        "zimbra_mail_notifier-optionLogin", "value"));
    this._prefs.setUserServer(this._util.getAttribute(
        "zimbra_mail_notifier-optionServer", "value"));

    if (this._prefs.isSavePasswordEnabled()) {
        this._prefs.setUserPassword(this._util.getAttribute(
            "zimbra_mail_notifier-optionPassword", "value"));
    } else {
        this._prefs.setUserPassword('');
    }
};

/**
 * Save option.
 *
 * @this {Option}
 */
com.zimbra.Options.save = function() {
    if (this._main) {
        this._main.getService().removeCallBackRefresh(this);
    }
    // update and save prefs
    this.updatePrefs();
    this._prefs.save();
    this._util.notifyObservers(com.zimbra.constant.OBSERVER.PREF_SAVED, null);
    window.close();
};

/**
 * Close option.
 *
 * @this {Option}
 */
com.zimbra.Options.close = function() {
    if (this._main) {
        this._main.getService().removeCallBackRefresh(this);
    }
    if (this._closeWhenConnected === true) {
        this._util.notifyObservers(com.zimbra.constant.OBSERVER.PREF_SAVED, null);
    }
    window.close();
};

/**
 * start connection.
 *
 * @this {Option}
 */
com.zimbra.Options.connect = function() {
    if (this._main) {
        // update and save prefs
        this.updatePrefs();
        this._prefs.save();
        this._closeWhenConnected = true;
        // update screen view
        this._util.setAttribute("zimbra_mail_notifier-optionLogin", "disabled", true);
        this._util.setAttribute("zimbra_mail_notifier-optionPassword", "disabled", true);
        this._util.setAttribute("zimbra_mail_notifier-optionServer", "disabled", true);
        this._util.setVisibility("zimbra_mail_notifier-connectButton", "collapse");
        this._util.setVisibility("zimbra_mail_notifier-connectInProgressButton", "visible");
        this._util.setVisibility("zimbra_mail_notifier-serverError", "value", "");
        // initialize connection
        this._main.getService().initializeConnection(
            this._util.getAttribute("zimbra_mail_notifier-optionPassword", "value"));
    }
};

/**
 * disconnection.
 *
 * @this {Option}
 */
com.zimbra.Options.disconnect = function() {
    this._closeWhenConnected = false;
    if (this._main) {
        this._main.getService().closeConnection();
    }
};
