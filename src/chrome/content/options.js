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
    _prefWereSaved: false,

};

/**
 * Initialize option.
 *
 * @this {Option}
 */
com.zimbra.Options.init = function() {

    var selectedTab = 0; // TODO com.zimbra.constant.OPTION_SELECT_TAB.GENERAL;
    var util = com.zimbra.UiUtil;
    var prefs = com.zimbra_notifier_Prefs;

    // Register
    com.zimbra_notifier_Controller.addCallBackRefresh(this);

    // Select the tab
    if (window.arguments.length > 0) {
        selectedTab = window.arguments[0];
    }
    document.getElementById("zimbra_mail_notifier-tabbox").selectedIndex = selectedTab;

    // FIXME
    //com.zimbra_notifier_Prefs.savePassword("", true);

    // identification
    //util.setAttribute("zimbra_mail_notifier-optionLogin","value", prefs.getUserLogin());
    util.setAttribute("zimbra_mail_notifier-optionPassword", "value", "");
    if (prefs.isSavePasswordEnabled()) {
        util.setAttribute("zimbra_mail_notifier-optionPassword", "value", prefs.getUserPassword());
    }
    /*util.setAttribute("zimbra_mail_notifier-optionServer", "value", prefs.getUserServer());
    util.setAttribute("zimbra_mail_notifier-optionSavePassword",       "checked", prefs.isSavePasswordEnabled());*/

    // refresh screen access
    this.refresh();
};

/**
 * Refresh.
 *
 * @this {Option}
 */
com.zimbra.Options.refresh = function(event) {

    if (this._closeWhenConnected === true && com.zimbra_notifier_Controller.isConnected()) {
        this._closeWhenConnected = false;
        window.close();
        return;
    }

    var util = com.zimbra.UiUtil;

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

    if (com.zimbra_notifier_Controller.isConnected()) {
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
                      com.zimbra_notifier_Controller.getLastErrorMessage());
};

/**
 * Call when the window is closed
 *
 * @this {Option}
 */
com.zimbra.Options.release = function() {
    com.zimbra_notifier_Controller.removeCallBackRefresh(this);

    if (this._prefWereSaved === true) {
        //com.zimbra.service.Util.notifyObservers(com.zimbra.constant.OBSERVER.PREF_SAVED, null);
        this._prefWereSaved = false;
    }
};

/**
 * start connection.
 *
 * @this {Option}
 */
com.zimbra.Options.connect = function() {
    var util = com.zimbra.UiUtil;
    // update and save prefs
    // TODO save password
    this._closeWhenConnected = true;
    // update screen view
    util.setAttribute("zimbra_mail_notifier-optionLogin", "disabled", true);
    util.setAttribute("zimbra_mail_notifier-optionPassword", "disabled", true);
    util.setAttribute("zimbra_mail_notifier-optionServer", "disabled", true);
    util.setVisibility("zimbra_mail_notifier-connectButton", "collapse");
    util.setVisibility("zimbra_mail_notifier-connectInProgressButton", "visible");
    util.setVisibility("zimbra_mail_notifier-serverError", "value", "");
    // initialize connection
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
