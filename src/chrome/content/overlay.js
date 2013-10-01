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
 * The Class Main.
 *
 * @constructor
 * @this {Main}
 */
com.zimbra.Main = {};

/**
 * Init module.
 *
 * @this {Main}
 */
com.zimbra.Main.init = function() {
    try {
        com.zimbra_notifier_Controller.addCallBackRefresh(this);

        if (!com.zimbra_notifier_Controller.autoConnect()) {
            this._openPrefsDialog(com.zimbra.UiUtil.OPTION_SELECT_TAB.IDENTIFICATION);
        }
        this.refresh(com.zimbra_notifier_SERVICE_EVENT.STOPPED);

        // add listener to release
        window.addEventListener("unload", function() {
            com.zimbra.Main.release();
        }, false);
    }
    catch (e) {
        dump("FATAL in zimbra.Main.init: " + e + "\n");
    }
};

/**
 * release Main.
 *
 * @this {Main}
 */

com.zimbra.Main.release = function() {
    com.zimbra_notifier_Controller.removeCallBackRefresh(this);
};

/**
 * refresh interface.
 *
 * @this {Main}
 */
com.zimbra.Main.refresh = function(event) {
    var util = com.zimbra.UiUtil;

    switch (event) {

    case com.zimbra_notifier_SERVICE_EVENT.CONNECTING:
    case com.zimbra_notifier_SERVICE_EVENT.CHECKING_UNREAD_MSG:
    case com.zimbra_notifier_SERVICE_EVENT.CHECKING_CALENDAR:
    case com.zimbra_notifier_SERVICE_EVENT.CHECKING_TASK:
        util.setAttribute("zimbra_mail_notifier-status-icon", "status", "2");
        util.setAttribute("zimbra_mail_notifier-toolbar-button", "status", "2");
        break;

    default:
        var nbUnreadMessages = -1;
        if (com.zimbra_notifier_Controller.isConnected()) {
            nbUnreadMessages = com.zimbra_notifier_Controller.getNbMessageUnread();

            util.setAttribute("zimbra_mail_notifier-mainToolsConnect", "hidden", "true");
            util.removeAttribute("zimbra_mail_notifier-mainToolsCheckNow", "hidden");
            util.removeAttribute("zimbra_mail_notifier-mainToolsDisconnect", "hidden");
            util.setAttribute("zimbra_mail_notifier-mainConnect", "hidden", "true");
            util.removeAttribute("zimbra_mail_notifier-mainCheckNow", "hidden");
            util.removeAttribute("zimbra_mail_notifier-mainDisconnect", "hidden");
            util.setAttribute("zimbra_mail_notifier-status-icon", "status", "1");
            util.setAttribute("zimbra_mail_notifier-toolbar-button", "status", "1");
        }
        else {
            util.removeAttribute("zimbra_mail_notifier-mainToolsConnect", "hidden");
            util.setAttribute("zimbra_mail_notifier-mainToolsCheckNow", "hidden", "true");
            util.setAttribute("zimbra_mail_notifier-mainToolsDisconnect", "hidden", "true");
            util.removeAttribute("zimbra_mail_notifier-mainConnect", "hidden");
            util.setAttribute("zimbra_mail_notifier-mainCheckNow", "hidden", "true");
            util.setAttribute("zimbra_mail_notifier-mainDisconnect", "hidden", "true");
            util.setAttribute("zimbra_mail_notifier-status-icon", "status", "0");
            util.setAttribute("zimbra_mail_notifier-toolbar-button", "status", "0");
        }
        // StatusBar
        if (com.zimbra_notifier_Prefs.isStatusBarEnabled()) {
            util.setVisibility("zimbra_mail_notifier-status-icon", "visible");
            if (nbUnreadMessages >= 0) {
                util.setAttribute("zimbra_mail_notifier-status-icon", "label", nbUnreadMessages);
            }
            else {
                util.setAttribute("zimbra_mail_notifier-status-icon", "label", "");
            }
        }
        else {
            util.setVisibility("zimbra_mail_notifier-status-icon", "collapse");
        }
        // ToolBar
        if (nbUnreadMessages > 0) {
            util.setAttribute("zimbra_mail_notifier-toolbar-button-label", "value", nbUnreadMessages);
        }
        else {
            util.setAttribute("zimbra_mail_notifier-toolbar-button-label", "value", "");
        }
        break;
    }
};

/**
 * Show Option Menu
 *
 */
com.zimbra.Main.openOptionsDialog = function() {
    this._openPrefsDialog(com.zimbra.UiUtil.OPTION_SELECT_TAB.GENERAL);
};

/**
 * Show About Menu
 */
com.zimbra.Main.openAboutDialog = function() {
    window.openDialog('chrome://zimbra_mail_notifier/content/about.xul', "",
                      'chrome, modal, dialog, centerscreen');
};

/**
 * call on check now event
 */
com.zimbra.Main.onCheckNowClick = function() {
    com.zimbra_notifier_Controller.checkNow();
};

/**
 * call on connect event
 */
com.zimbra.Main.onConnectClick = function() {
    if (!com.zimbra_notifier_Prefs.isSavePasswordEnabled() ||
        !com.zimbra_notifier_Controller.initializeConnection()) {

        this._openPrefsDialog(com.zimbra.UiUtil.OPTION_SELECT_TAB.IDENTIFICATION);
    }
};

/**
 * call on disconnect event
 */
com.zimbra.Main.onDisconnectClick = function() {
    com.zimbra_notifier_Controller.closeConnection();
};

/**
 * call on statusBar event
 *
 * @param evt
 *            event of the element
 */
com.zimbra.Main.onStatusBarClick = function(evt) {

    if (evt === undefined || evt.button === 0) {
        var urlServer = com.zimbra_notifier_Prefs.getUserServer();

        if ((urlServer !== "") && com.zimbra_notifier_Controller.isConnected()) {
            com.zimbra_notifier_Util.openURL(urlServer);
        }
        else {
            this._openPrefsDialog(com.zimbra.UiUtil.OPTION_SELECT_TAB.IDENTIFICATION);
        }
    }
};

/**
 * Show Option Menu and select the desired tab
 * @see com.zimbra.UiUtil.OPTION_SELECT_TAB
 *
 * @private
 */
com.zimbra.Main._openPrefsDialog = function(tab) {
    window.openDialog('chrome://zimbra_mail_notifier/content/options.xul', "",
                      "chrome,titlebar,toolbar,centerscreen,modal", tab);
};


/**
 * Initiliaze tooltip
 *
 */
com.zimbra.Main.initializeTooltip = function() {
    var util = com.zimbra.UiUtil;

    if (com.zimbra_notifier_Controller.isConnected()) {

        // show message informations
        var msgTitle = com.zimbra_notifier_Util.getBundleString("tooltip.unreadMessages.title");
        msgTitle = msgTitle.replace("%NB%", com.zimbra_notifier_Controller.getNbMessageUnread());
        util.setAttribute("zimbra_mail_notifier_tooltipTitle", "value", msgTitle);

        var msgDesc = com.zimbra_notifier_Util.getBundleString("tooltip.connected.description");
        msgDesc = msgDesc.replace("%EMAIL%", com.zimbra_notifier_Prefs.getUserLogin());
        util.setTextContent("zimbra_mail_notifier_tooltipMessage", msgDesc);

        // show calendar
        if (com.zimbra_notifier_Prefs.isCalendarEnabled()) {
            util.removeAttribute("zimbra_mail_notifier_tooltipCalendarGroup", "hidden");
            this.initializeTooltipCalendar();
        }
        else {
            util.setAttribute("zimbra_mail_notifier_tooltipCalendarGroup", "hidden", "true");
        }

        // show tasks
        if (com.zimbra_notifier_Prefs.isTaskEnabled()) {
            util.removeAttribute("zimbra_mail_notifier_tooltipTaskGroup", "hidden");
            this.initializeTooltipTask();
        }
        else {
            util.setAttribute("zimbra_mail_notifier_tooltipTaskGroup", "hidden", "true");
        }
    }
    else {
        var errorMsg = com.zimbra_notifier_Controller.getLastErrorMessage();
        if (errorMsg !== "") {
            util.setAttribute("zimbra_mail_notifier_tooltipTitle", "value",
                              com.zimbra_notifier_Util.getBundleString("tooltip.error.title"));
            util.setTextContent("zimbra_mail_notifier_tooltipMessage", errorMsg);
        }
        else {
            util.setAttribute("zimbra_mail_notifier_tooltipTitle", "value",
                              com.zimbra_notifier_Util.getBundleString("tooltip.notConnected.title"));
            util.setTextContent("zimbra_mail_notifier_tooltipMessage",
                                com.zimbra_notifier_Util.getBundleString("tooltip.notConnected.description"));
        }
        util.setAttribute("zimbra_mail_notifier_tooltipCalendarGroup", "hidden", "true");
        util.setAttribute("zimbra_mail_notifier_tooltipTaskGroup", "hidden", "true");
    }
};

/**
 * Initiliaze tooltip caldendar
 * @private
 */
com.zimbra.Main.initializeTooltipCalendar = function() {
    var index, label;

    // clean calendar
    var tooltipCalendar = document.getElementById("zimbra_mail_notifier_tooltipCalendar");
    while (tooltipCalendar.hasChildNodes()) {
        tooltipCalendar.removeChild(tooltipCalendar.firstChild);
    }

    var events = com.zimbra_notifier_Controller.getEvents();
    if (events.length === 0) {
        label = document.createElement('label');
        label.setAttribute("flex", "1");
        label.setAttribute("class", "eventLabelDesc");
        label.setAttribute("value", com.zimbra_notifier_Util.getBundleString("tooltip.noEvent"));
        tooltipCalendar.appendChild(label);
    }
    else {
        var lastDate = "";
        var nbDisplayed = com.zimbra_notifier_Prefs.getCalendarNbDisplayed();
        var currentDisplayed = 0;
        for (index = 0; (index < events.length) && (currentDisplayed < nbDisplayed); index++) {
            currentDisplayed++;
            var currentEvent = events[index];
            var startDate = currentEvent.startDate;
            var starttime = startDate.toLocaleTimeString();
            starttime = starttime.substring(0, 5) + starttime.substring(8);
            var currentDate = com.zimbra_notifier_Util.getBundleString("tooltip.week").
                replace("%WEEK%", currentEvent.startWeek) + " - " + startDate.toLocaleDateString();
            if (lastDate !== currentDate) {
                lastDate = currentDate;
                label = document.createElement('label');
                label.setAttribute("flex", "1");
                label.setAttribute("class", "eventLabelDate");
                label.setAttribute("value", currentDate);
                tooltipCalendar.appendChild(label);
            }
            var endDate = currentEvent.endDate;
            var endTime = endDate.toLocaleTimeString();
            endTime = endTime.substring(0, 5) + endTime.substring(8);
            label = document.createElement('label');
            label.setAttribute("class", "eventLabelDesc");
            label.setAttribute("flex", "1");
            if (currentEvent.duration < 86400000) {
                label.setAttribute("value", starttime + "-" + endTime + "   " +
                                   com.zimbra_notifier_Util.maxStringLength(currentEvent.name, 40));
            } else {
                label.setAttribute("value", com.zimbra_notifier_Util.maxStringLength(currentEvent.name, 50));
            }
            tooltipCalendar.appendChild(label);
        }
    }
};

/**
 * Initiliaze tooltip task
 * @private
 */
com.zimbra.Main.initializeTooltipTask = function() {
    var index, label;

    // clean task
    var tooltipTask = document.getElementById("zimbra_mail_notifier_tooltipTask");
    while (tooltipTask.hasChildNodes()) {
        tooltipTask.removeChild(tooltipTask.firstChild);
    }

    var tasks = com.zimbra_notifier_Controller.getTasks();
    var priority = -1;
    var prioritiesDisplayed = Number(com.zimbra_notifier_Prefs.getTaskPrioritiesDisplayed());
    var nbDisplayed = com.zimbra_notifier_Prefs.getTaskNbDisplayed();
    var currentDisplayed = 0;
    for (index = 0; (index < tasks.length) && (currentDisplayed < nbDisplayed); index++) {

        var currentPriority = Number(tasks[index].priority);
        if (   (prioritiesDisplayed < 1)
            || (prioritiesDisplayed === 1 && currentPriority < 9)
            || (prioritiesDisplayed === 2 && currentPriority < 5)
            || (prioritiesDisplayed === 3 && currentPriority === 5)
            || (prioritiesDisplayed === 4 && currentPriority > 5)) {

            currentDisplayed++;
            if (currentPriority !== priority) {

                priority = currentPriority;
                var priorityTxt = "";
                if (currentPriority < 5) {
                    priorityTxt += com.zimbra_notifier_Util.getBundleString("tooltip.priority.high");
                } else if (currentPriority < 9) {
                    priorityTxt += com.zimbra_notifier_Util.getBundleString("tooltip.priority.normal");
                } else {
                    priorityTxt += com.zimbra_notifier_Util.getBundleString("tooltip.priority.low");
                }
                label = document.createElement('label');
                label.setAttribute("class", "taskLabelPriority");
                label.setAttribute("status", currentPriority);
                label.setAttribute("value", priorityTxt + " :");
                tooltipTask.appendChild(label);
            }
            var taskHBox = document.createElement('hbox');
            taskHBox.setAttribute("flex", "1");
            label = document.createElement('label');
            label.setAttribute("flex", "1");
            label.setAttribute("class", "taskLabelDesc");
            label.setAttribute("value", com.zimbra_notifier_Util.maxStringLength(tasks[index].name, 40));
            taskHBox.appendChild(label);

            label = document.createElement('label');
            taskHBox.setAttribute("width", "80");
            label.setAttribute("class", "taskLabelPurcent");
            label.setAttribute("value", tasks[index].percentComplete + "%");
            taskHBox.appendChild(label);
            tooltipTask.appendChild(taskHBox);
        }
    }
    if (currentDisplayed === 0) {
        label = document.createElement('label');
        label.setAttribute("flex", "1");
        label.setAttribute("class", "taskLabelDesc");
        label.setAttribute("value", com.zimbra_notifier_Util.getBundleString("tooltip.noTask"));
        tooltipTask.appendChild(label);
    }
};

/**
 * clean tooltip
 *
 */
com.zimbra.Main.hideTooltip = function() {
    com.zimbra.UiUtil.setAttribute("zimbra_mail_notifier_tooltipTitle", "value", "");
    com.zimbra.UiUtil.setTextContent("zimbra_mail_notifier_tooltipMessage", "");
};

/**
 * add event listener to notify when content is loaded
 *
 */
window.addEventListener("load", function() {
    window.setTimeout(function() {
        com.zimbra.Main.init();
    }, 100);
}, false);
