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
    this._initialized = true;
    this._util = new com.zimbra.service.Util();
    this._service = new com.zimbra.controller.Service();
    if (!this._service.initialize(this)) {
        window.openDialog('chrome://zimbra_mail_notifier/content/options.xul', "", 'chrome, modal, dialog, centerscreen', this,
                com.zimbra.constant.com.zimbra.constant.OPTION_SELECT_TAB.IDENTIFICATION);
    }
    this.refresh();
    // add listener to release
    window.addEventListener("unload", function() {
        com.zimbra.Main.release();
    }, false);
};

/**
 * release Main.
 * 
 * @this {Main}
 */

com.zimbra.Main.release = function() {
    this._service.release();
};

/**
 * refresh interface.
 * 
 * @this {Main}
 */
com.zimbra.Main.refresh = function(status) {
    if (!status) {
        var nbUnreadMessages = "";
        if (this._service.isConnected()) {
            nbUnreadMessages = this._service.getNBMessageUnread();

            this._util.setAttribute("zimbra_mail_notifier-mainToolsConnect", "hidden", "true");
            this._util.removeAttribute("zimbra_mail_notifier-mainToolsCheckNow", "hidden");
            this._util.removeAttribute("zimbra_mail_notifier-mainToolsDisconnect", "hidden");
            this._util.setAttribute("zimbra_mail_notifier-mainConnect", "hidden", "true");
            this._util.removeAttribute("zimbra_mail_notifier-mainCheckNow", "hidden");
            this._util.removeAttribute("zimbra_mail_notifier-mainDisconnect", "hidden");
            this._util.setAttribute("zimbra_mail_notifier-status-icon", "status", "1");
            this._util.setAttribute("zimbra_mail_notifier-toolbar-button", "status", "1");
        } else {
            this._util.removeAttribute("zimbra_mail_notifier-mainToolsConnect", "hidden");
            this._util.setAttribute("zimbra_mail_notifier-mainToolsCheckNow", "hidden", "true");
            this._util.setAttribute("zimbra_mail_notifier-mainToolsDisconnect", "hidden", "true");
            this._util.removeAttribute("zimbra_mail_notifier-mainConnect", "hidden");
            this._util.setAttribute("zimbra_mail_notifier-mainCheckNow", "hidden", "true");
            this._util.setAttribute("zimbra_mail_notifier-mainDisconnect", "hidden", "true");
            this._util.setAttribute("zimbra_mail_notifier-status-icon", "status", "0");
            this._util.setAttribute("zimbra_mail_notifier-toolbar-button", "status", "0");
        }
        // StatusBar
        if (this._service.getPrefs().isStatusBarEnabled()) {
            this._util.setVisibility("zimbra_mail_notifier-status-icon", "visible");
            this._util.setAttribute("zimbra_mail_notifier-status-icon", "label", nbUnreadMessages);
        } else {
            this._util.setVisibility("zimbra_mail_notifier-status-icon", "collapse");
        }
        // ToolBar
        if (nbUnreadMessages > 0) {
            this._util.setAttribute("zimbra_mail_notifier-toolbar-button-label", "value", nbUnreadMessages);
        } else {
            this._util.setAttribute("zimbra_mail_notifier-toolbar-button-label", "value", "");
        }
    } else {
        this._util.setAttribute("zimbra_mail_notifier-status-icon", "status", "2");
        this._util.setAttribute("zimbra_mail_notifier-toolbar-button", "status", "2");
    }
};

/**
 * get prefs.
 * 
 * @this {Main}
 * @return {Service} the service
 */
com.zimbra.Main.getService = function() {
    return this._service;
};

/**
 * Show Option Menu
 * 
 */
com.zimbra.Main.openOptionsDialog = function() {
    window.openDialog('chrome://zimbra_mail_notifier/content/options.xul', "", 'chrome, modal, dialog, centerscreen', this);
};

/**
 * Show About Menu
 */
com.zimbra.Main.openAboutDialog = function() {
    window.openDialog('chrome://zimbra_mail_notifier/content/about.xul', "", 'chrome, modal, dialog, centerscreen');
};

/**
 * call on check now event
 */
com.zimbra.Main.onCheckNowClick = function() {
    this._service.checkNow();
};

/**
 * call on connect event
 */
com.zimbra.Main.onConnectClick = function() {
    if (this._service.getPrefs().isSavePasswordEnabled()) {
        this._service.initializeConnection();
    } else {
        window.openDialog('chrome://zimbra_mail_notifier/content/options.xul', "", 'chrome, modal, dialog, centerscreen', this, com.zimbra.constant.OPTION_SELECT_TAB.IDENTIFICATION);
    }
};

/**
 * call on disconnect event
 */
com.zimbra.Main.onDisconnectClick = function() {
    this._service.closeConnection();
};

/**
 * call on statusBar event
 * 
 * @param evt
 *            event of the element
 */
com.zimbra.Main.onStatusBarClick = function(evt) {
    if (evt === undefined || evt.button === 0) {
        if ((this._service.getPrefs().getUserServer() !== "") && this._service.isConnected()) {
            this._util.openURL(this._service.getPrefs().getUserServer());
        } else {
            window.openDialog('chrome://zimbra_mail_notifier/content/options.xul', "", 'chrome, modal, dialog, centerscreen', this, com.zimbra.constant.OPTION_SELECT_TAB.IDENTIFICATION);
        }
    }
};

/**
 * Initiliaze tooltip
 * 
 */
com.zimbra.Main.initiliazeTooltip = function() {

    if (this._service.isConnected()) {
        // show message informations
        var message = this._util.getBundleString("tooltip.connected.description").replace("%SERVER%", this._service.getPrefs().getUserServer()).replace("%MAJ%",
                this._util.secToTimeStr(this._service.getNextUpdate()));
        this._util.setAttribute("zimbra_mail_notifier_tooltipTitle", "value", this._util.getBundleString("tooltip.unreadMessages.title").replace("%NB%", this._service.getNBMessageUnread()));
        this._util.setTextContent("zimbra_mail_notifier_tooltipMessage", message);
        // show calendar
        if (this._service.getPrefs().isCalendarEnabled()) {
            this._util.removeAttribute("zimbra_mail_notifier_tooltipCalendarGroup", "hidden");
            this.initiliazeTooltipCalendar();
        } else {
            this._util.setAttribute("zimbra_mail_notifier_tooltipCalendarGroup", "hidden", "true");
        }
        // show tasks
        if (this._service.getPrefs().isTaskEnabled()) {
            this._util.removeAttribute("zimbra_mail_notifier_tooltipTaskGroup", "hidden");
            this.initiliazeTooltipTask();
        } else {
            this._util.setAttribute("zimbra_mail_notifier_tooltipTaskGroup", "hidden", "true");
        }
    } else {
        if (this._service.getLastErrorMessage() !== "") {
            this._util.setAttribute("zimbra_mail_notifier_tooltipTitle", "value", this._util.getBundleString("tooltip.error.title"));
            this._util.setTextContent("zimbra_mail_notifier_tooltipMessage", this._service.getLastErrorMessage());
        } else {
            this._util.setAttribute("zimbra_mail_notifier_tooltipTitle", "value", this._util.getBundleString("tooltip.notConnected.title"));
            this._util.setTextContent("zimbra_mail_notifier_tooltipMessage", this._util.getBundleString("tooltip.notConnected.description"));
        }
        this._util.setAttribute("zimbra_mail_notifier_tooltipCalendarGroup", "hidden", "true");
        this._util.setAttribute("zimbra_mail_notifier_tooltipTaskGroup", "hidden", "true");
    }

};

/**
 * Initiliaze tooltip caldendar
 * 
 */
com.zimbra.Main.initiliazeTooltipCalendar = function() {
    var index, label;

    // clean calendar
    var tooltipCalendar = document.getElementById("zimbra_mail_notifier_tooltipCalendar");
    while (tooltipCalendar.hasChildNodes()) {
        tooltipCalendar.removeChild(tooltipCalendar.firstChild);
    }

    var events = this._service.getEvents();
    if (events.length === 0) {
        label = document.createElement('label');
        label.setAttribute("flex", "1");
        label.setAttribute("class", "eventLabelDesc");
        label.setAttribute("value", this._util.getBundleString("tooltip.noEvent"));
        tooltipCalendar.appendChild(label);
    } else {
        var lastDate = "";
        var nbDisplayed = this._service.getPrefs().getCalendarNbDisplayed();
        var currentDisplayed = 0;
        for (index = 0; (index < events.length) && (currentDisplayed < nbDisplayed); index++) {
            currentDisplayed++;
            var currentEvent = events[index];
            var startDate = currentEvent.startDate;
            var starttime = startDate.toLocaleTimeString();
            starttime = starttime.substring(0, 5) + starttime.substring(8);
            var currentDate = this._util.getBundleString("tooltip.week").replace("%WEEK%", currentEvent.startWeek) + " - " + startDate.toLocaleDateString();
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
                label.setAttribute("value", starttime + "-" + endTime + "   " + this._util.maxStringLength(currentEvent.name, 40));
            } else {
                label.setAttribute("value", this._util.maxStringLength(currentEvent.name, 50));
            }
            tooltipCalendar.appendChild(label);
        }
    }
};

/**
 * Initiliaze tooltip task
 * 
 */
com.zimbra.Main.initiliazeTooltipTask = function() {
    var index, label;

    // clean task
    var tooltipTask = document.getElementById("zimbra_mail_notifier_tooltipTask");
    while (tooltipTask.hasChildNodes()) {
        tooltipTask.removeChild(tooltipTask.firstChild);
    }

    var tasks = this._service.getTasks();
    var priority = -1;
    var prioritiesDisplayed = Number(this._service.getPrefs().getTaskPrioritiesDisplayed());
    var nbDisplayed = this._service.getPrefs().getTaskNbDisplayed();
    var currentDisplayed = 0;
    for (index = 0; (index < tasks.length) && (currentDisplayed < nbDisplayed); index++) {
        var currentPriority = Number(tasks[index].priority);
        if ((prioritiesDisplayed < 1) || (prioritiesDisplayed === 1 && currentPriority < 9) || (prioritiesDisplayed === 2 && currentPriority < 5)
                || (prioritiesDisplayed === 3 && currentPriority === 5) || (prioritiesDisplayed === 4 && currentPriority > 5)) {
            currentDisplayed++;
            if (currentPriority !== priority) {
                priority = currentPriority;
                var priorityTxt = "";
                if (currentPriority < 5) {
                    priorityTxt += this._util.getBundleString("tooltip.priority.high");
                } else if (currentPriority < 9) {
                    priorityTxt += this._util.getBundleString("tooltip.priority.normal");
                } else {
                    priorityTxt += this._util.getBundleString("tooltip.priority.low");
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
            label.setAttribute("value", this._util.maxStringLength(tasks[index].name, 40));
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
        label.setAttribute("value", this._util.getBundleString("tooltip.noTask"));
        tooltipTask.appendChild(label);
    }
};

/**
 * clean tooltip
 * 
 */
com.zimbra.Main.hideTooltip = function() {
    this._util.setAttribute("zimbra_mail_notifier_tooltipTitle", "value", "");
    this._util.setTextContent("zimbra_mail_notifier_tooltipMessage", "");
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