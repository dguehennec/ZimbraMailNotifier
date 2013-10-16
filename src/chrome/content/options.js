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

if (!com) {
    var com = {};
}
if (!com.zimbra) {
    com.zimbra = {};
}

Components.utils.import("resource://zimbra_mail_notifier/constant/zimbrahelper.jsm", com);
Components.utils.import("resource://zimbra_mail_notifier/service/prefs.jsm", com);
Components.utils.import("resource://zimbra_mail_notifier/service/util.jsm", com);
Components.utils.import("resource://zimbra_mail_notifier/controller/service.jsm", com);
Components.utils.import("resource://zimbra_mail_notifier/controller/controller.jsm", com);

/**
 * The Class Options.
 *
 * @constructor
 * @this {Options}
 */
com.zimbra.Options = {
    _closeWhenConnected: false,
    _prefInstantApply: false,
    _previousAuthType: ''
};

/**
 * Initialize option.
 *
 * @this {Option}
 */
com.zimbra.Options.init = function() {

    var util = com.zimbra.UiUtil;
    var prefs = com.zimbra_notifier_Prefs;

    // Register
    com.zimbra_notifier_Controller.addCallBackRefresh(this);

    // identification
    util.setAttribute("zimbra_mail_notifier-optionPassword", "value", "");
    if (prefs.isSavePasswordEnabled()) {
        util.setAttribute("zimbra_mail_notifier-optionPassword", "value", prefs.getUserPassword());
    }
    var authT = util.getAttribute("zimbra_mail_notifier-textboxUrlWebService", "value") + "|" +
                util.getAttribute("zimbra_mail_notifier-textboxUrlWebInterface", "value");
    util.setMenulist("zimbra_mail_notifier-listAuthType", authT);

    // Do we have a OK/Cancel button, or modification is applied immediately
    if (Application.prefs.getValue("browser.preferences.instantApply", null) === true) {
        this._prefInstantApply = true;
    }

    // refresh screen access
    this.authTypeChanged();
};

/**
 * Refresh.
 *
 * @this {Option}
 */
com.zimbra.Options.refresh = function(event) {

    if (this._closeWhenConnected === true && com.zimbra_notifier_Controller.isConnected()) {
        try {
            document.getElementById("zimbra_mail_notifier-Preferences").acceptDialog();
        }
        catch (e) {
        }
        return;
    }

    var util = com.zimbra.UiUtil;

    if (   util.getAttribute("zimbra_mail_notifier-textboxLogin", "value") !== ''
        && util.getAttribute("zimbra_mail_notifier-optionPassword", "value") !== ''
        && util.getAttribute("zimbra_mail_notifier-textboxUrlWebService", "value") !== '') {

        util.removeAttribute("zimbra_mail_notifier-connectButton", "disabled");
    }
    else {
        util.setAttribute("zimbra_mail_notifier-connectButton", "disabled", true);
    }

    if (com.zimbra_notifier_Controller.isConnected()) {
        util.setVisibility("zimbra_mail_notifier-connectButton", "collapse");
        util.setVisibility("zimbra_mail_notifier-disconnectButton", "visible");
        util.setVisibility("zimbra_mail_notifier-connectCancelButton", "collapse");
        util.setAttribute("zimbra_mail_notifier-textboxLogin", "disabled", true);
        util.setAttribute("zimbra_mail_notifier-optionPassword", "disabled", true);
        util.setAttribute("zimbra_mail_notifier-textboxUrlWebService", "disabled", true);
        util.setAttribute("zimbra_mail_notifier-listAuthType", "disabled", true);
    }
    else if (com.zimbra_notifier_Controller.isConnecting()) {
        util.setVisibility("zimbra_mail_notifier-connectButton", "collapse");
        util.setVisibility("zimbra_mail_notifier-disconnectButton", "collapse");
        util.setVisibility("zimbra_mail_notifier-connectCancelButton", "visible");
        util.setAttribute("zimbra_mail_notifier-textboxLogin", "disabled", true);
        util.setAttribute("zimbra_mail_notifier-optionPassword", "disabled", true);
        util.setAttribute("zimbra_mail_notifier-textboxUrlWebService", "disabled", true);
        util.setAttribute("zimbra_mail_notifier-listAuthType", "disabled", true);
    }
    else {
        util.setVisibility("zimbra_mail_notifier-connectButton", "visible");
        util.setVisibility("zimbra_mail_notifier-disconnectButton", "collapse");
        util.setVisibility("zimbra_mail_notifier-connectCancelButton", "collapse");
        util.removeAttribute("zimbra_mail_notifier-textboxLogin", "disabled");
        util.removeAttribute("zimbra_mail_notifier-optionPassword", "disabled");
        if (util.getAttribute("zimbra_mail_notifier-listAuthType", "value") === "") {
            util.removeAttribute("zimbra_mail_notifier-textboxUrlWebService", "disabled");
        }
        else {
            util.setAttribute("zimbra_mail_notifier-textboxUrlWebService", "disabled", true);
        }
        util.removeAttribute("zimbra_mail_notifier-listAuthType", "disabled");
    }

    util.setTextContent("zimbra_mail_notifier-serverError",
                        com.zimbra_notifier_Controller.getLastErrorMessage());
};

/**
 * Called when the authentication changed
 *
 * @this {Option}
 */
com.zimbra.Options.authTypeChanged = function() {

    var util = com.zimbra.UiUtil;
    var newAuthType = util.getAttribute("zimbra_mail_notifier-listAuthType", "value");

    if (this._previousAuthType !== newAuthType) {

        if (newAuthType !== '') {
            var urls = newAuthType.split('|', 2);
            util.setAttribute("zimbra_mail_notifier-textboxUrlWebService", "disabled", true);
            util.setTextboxPref("zimbra_mail_notifier-textboxUrlWebService", urls[0], "option-tab-identifiant");

            util.setAttribute("zimbra_mail_notifier-textboxUrlWebInterface", "disabled", true);
            util.setTextboxPref("zimbra_mail_notifier-textboxUrlWebInterface", urls[1], "option-tab-identifiant");
        }
        else {
            util.setTextboxPref("zimbra_mail_notifier-textboxUrlWebService", "", "option-tab-identifiant");
            util.setTextboxPref("zimbra_mail_notifier-textboxUrlWebInterface", "", "option-tab-identifiant");
            util.removeAttribute("zimbra_mail_notifier-textboxUrlWebInterface", "disabled");
        }
        this._previousAuthType = newAuthType;
    }

    this.refresh();
};

/**
 * Call when the window is closed
 *
 * @this {Option}
 */
com.zimbra.Options.release = function() {
    com.zimbra_notifier_Controller.removeCallBackRefresh(this);
    com.zimbra_notifier_Prefs.reloadLogin();

    if (this._prefInstantApply) {
        this.validated();
    }
};

/**
 * Call when the window is validated
 *
 * @this {Option}
 */
com.zimbra.Options.validated = function() {
    var wasConnecting = this._closeWhenConnected;
    var util = com.zimbra.UiUtil;

    // Do not call this function again
    this._prefInstantApply = false;
    this._closeWhenConnected = false;

    // Save password
    if (util.getAttribute("zimbra_mail_notifier-checkboxSavePassword", "checked")) {
        com.zimbra_notifier_Prefs.savePassword(
            util.getAttribute("zimbra_mail_notifier-optionPassword", "value"), true);
    }
    else {
        com.zimbra_notifier_Prefs.savePassword("", false);
    }

    // Inform that the preferences may have changed
    com.zimbra_notifier_Controller.removeCallBackRefresh(this);
    com.zimbra_notifier_Util.notifyObservers(com.zimbra_notifier_Constant.OBSERVER.PREF_SAVED,
                                             wasConnecting);
    return true;
};

/**
 * start connection.
 *
 * @this {Option}
 */
com.zimbra.Options.connect = function() {
    var util = com.zimbra.UiUtil;

    // update and save login info
    com.zimbra_notifier_Prefs.setTemporaryLogin(util.getAttribute("zimbra_mail_notifier-textboxUrlWebService", "value"),
                                                util.getAttribute("zimbra_mail_notifier-textboxLogin", "value"));
    // update screen view
    util.setVisibility("zimbra_mail_notifier-connectButton", "collapse");
    util.setVisibility("zimbra_mail_notifier-disconnectButton", "collapse");
    util.setVisibility("zimbra_mail_notifier-connectCancelButton", "visible");
    util.setAttribute("zimbra_mail_notifier-textboxLogin", "disabled", true);
    util.setAttribute("zimbra_mail_notifier-optionPassword", "disabled", true);
    util.setAttribute("zimbra_mail_notifier-textboxUrlWebService", "disabled", true);
    util.setAttribute("zimbra_mail_notifier-listAuthType", "disabled", true);
    util.setTextContent("zimbra_mail_notifier-serverError", "");

    // initialize connection
    this._closeWhenConnected = true;
    com.zimbra_notifier_Controller.initializeConnection(
        util.getAttribute("zimbra_mail_notifier-optionPassword", "value"));
};

/**
 * disconnection.
 *
 * @this {Option}
 */
com.zimbra.Options.disconnect = function() {
    this._closeWhenConnected = false;
    com.zimbra_notifier_Controller.closeConnection();
};
