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

/**
 * Creates an instance of popup.
 * 
 * @constructor
 * @this {Popup}
 */
var zimbra_notifier_popup = {};

/**
 * init
 * 
 * @this {Popup}
 */
zimbra_notifier_popup.init = function(background) {
    // add event listener on button
    $('#zimbra_mail_notifier_tooltipCheckNow').on('click', $.proxy(function() {
        this.checkNowClick();
    }, this));
    $('#zimbra_mail_notifier_tooltipHome').on('click', $.proxy(function() {
        this._zimbra_notifier_Controller.openZimbraWebInterface();
    }, this));
    $('#zimbra_mail_notifier_tooltipConnect').on('click', $.proxy(function() {
        this.connectClick();
    }, this));
    $('#zimbra_mail_notifier_tooltipDisconnect').on('click', $.proxy(function() {
        this.disconnectClick();
    }, this));
    $('#zimbra_mail_notifier_tooltipOption').on('click', $.proxy(function() {
        this.optionClick();
    }, this));

    // initialize background objects
    if (!background || !background['zimbra_notifier_Controller'] || !background['zimbra_notifier_Prefs'] || !background['zimbra_notifier_Util']) {
        $('#zimbra_mail_notifier_tooltipTitle').text(chrome.i18n.getMessage("tooltip_errorInitPage_title"));
        $('#zimbra_mail_notifier_tooltipCalendarGroup').hide();
        $('#zimbra_mail_notifier_tooltipTaskGroup').hide();
        return;
    }
    this._zimbra_notifier_Controller = background['zimbra_notifier_Controller'];
    this._zimbra_notifier_Prefs = background['zimbra_notifier_Prefs'];
    this._zimbra_notifier_Util = background['zimbra_notifier_Util'];

    // Register
    this._zimbra_notifier_Controller.addCallBackRefresh(this);

    this.refresh();
};

/**
 * Call when the window is closed
 * 
 * @this {Popup}
 */
zimbra_notifier_popup.release = function() {
    this._zimbra_notifier_Controller.removeCallBackRefresh(this);
};

/**
 * Initiliaze tooltip
 * 
 * @this {Popup}
 */
zimbra_notifier_popup.refresh = function() {
    var errorMsg = this._zimbra_notifier_Controller.getLastErrorMessage();
    if (this._zimbra_notifier_Controller.isConnected()) {
    	$('#zimbra_mail_notifier_tooltipHome').show();
        $('#zimbra_mail_notifier_tooltipCheckNow').show();
        $('#zimbra_mail_notifier_tooltipDisconnect').show();
        $('#zimbra_mail_notifier_tooltipConnect').hide();

        if (errorMsg !== "") {
            $('#zimbra_mail_notifier_tooltipTitle').text(chrome.i18n.getMessage("tooltip_errorConnected_title"));
            $('#zimbra_mail_notifier_tooltipMessage').text(errorMsg);
        } else {
            // show title informations
            var msgTitle = chrome.i18n.getMessage("tooltip_unreadMessages_title");
            msgTitle = msgTitle.replace("%NB%", this._zimbra_notifier_Controller.getNbMessageUnread());
            $('#zimbra_mail_notifier_tooltipTitle').text(msgTitle);

            // show State and account informations
            $("#zimbra_mail_notifier_tooltipMessage").empty();
            $('<div/>', {
                text : chrome.i18n.getMessage("tooltip_connected_descriptionStatus")
            }).appendTo("#zimbra_mail_notifier_tooltipMessage");
            var msgDesc = chrome.i18n.getMessage("tooltip_connected_descriptionAccount");
            msgDesc = msgDesc.replace("%EMAIL%", this._zimbra_notifier_Prefs.getUserLogin());
            $('<div/>', {
                text : msgDesc
            }).appendTo("#zimbra_mail_notifier_tooltipMessage");

            // show mailbox informations
            var mailBoxInfo = this._zimbra_notifier_Controller.getMailBoxInfo();
            if (mailBoxInfo && mailBoxInfo.quotaSize > 0) {
                var msgQuota = chrome.i18n.getMessage("tooltip_connected_descriptionQuota");
                msgQuota = msgQuota.replace("%PERCENTAGE%", mailBoxInfo.getPercentageQuotaUsed());
                msgQuota = msgQuota.replace("%USED%", mailBoxInfo.quotaUsedString);
                msgQuota = msgQuota.replace("%SIZE%", mailBoxInfo.quotaSizeString);
                $('<div/>', {
                    text : msgQuota
                }).appendTo("#zimbra_mail_notifier_tooltipMessage");
            }
        }

        // show calendar
        if (this._zimbra_notifier_Prefs.isCalendarEnabled()) {
            $('#zimbra_mail_notifier_tooltipCalendarGroup').show();
            this.initializeTooltipCalendar();
        } else {
            $('#zimbra_mail_notifier_tooltipCalendarGroup').hide();
        }

        // show tasks
        if (this._zimbra_notifier_Prefs.isTaskEnabled()) {
            $('#zimbra_mail_notifier_tooltipTaskGroup').show();
            this.initializeTooltipTask();
        } else {
            $('#zimbra_mail_notifier_tooltipTaskGroup').hide();
        }
    } else {
        $('#zimbra_mail_notifier_tooltipCheckNow').hide();
        $('#zimbra_mail_notifier_tooltipDisconnect').hide();
        $('#zimbra_mail_notifier_tooltipHome').hide();
        $('#zimbra_mail_notifier_tooltipConnect').show();

        if (errorMsg !== "") {
            $('#zimbra_mail_notifier_tooltipTitle').text(chrome.i18n.getMessage("tooltip_errorNotConnected_title"));
            $('#zimbra_mail_notifier_tooltipMessage').text(errorMsg);
        } else {
            $('#zimbra_mail_notifier_tooltipTitle').text(chrome.i18n.getMessage("tooltip_notConnected_title"));
            $('#zimbra_mail_notifier_tooltipMessage').text(chrome.i18n.getMessage("tooltip_notConnected_description"));
        }
        $('#zimbra_mail_notifier_tooltipCalendarGroup').hide();
        $('#zimbra_mail_notifier_tooltipTaskGroup').hide();
    }
};

/**
 * Initiliaze tooltip calendar
 * 
 * @private
 */
zimbra_notifier_popup.initializeTooltipCalendar = function() {
    var index, label;

    // clean calendar
    $("#zimbra_mail_notifier_tooltipCalendar").empty();

    var events = this._zimbra_notifier_Controller.getEvents();
    if (events.length === 0) {
        $('<div/>', {
            class : 'eventLabelDesc',
            text : chrome.i18n.getMessage("tooltip_noEvent")
        }).appendTo("#zimbra_mail_notifier_tooltipCalendar");
    } else {
        var lastDate = "";
        var nbDisplayed = this._zimbra_notifier_Prefs.getCalendarNbDisplayed();
        var currentDisplayed = 0;
        for (index = 0; (index < events.length) && (currentDisplayed < nbDisplayed); index++) {
            currentDisplayed++;
            var currentEvent = events[index];
            var startDate = currentEvent.startDate;
            var starttime = startDate.toLocaleTimeString();
            starttime = starttime.substring(0, 5) + starttime.substring(8);
            var currentDate = chrome.i18n.getMessage("tooltip_week").replace("%WEEK%", currentEvent.startWeek) + " - " + startDate.toLocaleDateString();
            if (lastDate !== currentDate) {
                lastDate = currentDate;
                $('<div/>', {
                    class : 'eventLabelDate',
                    text : currentDate
                }).appendTo("#zimbra_mail_notifier_tooltipCalendar");
            }
            var endDate = currentEvent.endDate;
            var endTime = endDate.toLocaleTimeString();
            endTime = endTime.substring(0, 5) + endTime.substring(8);
            var text = "";
            if (currentEvent.duration < 86400000) {
                text = starttime + "-" + endTime + "   " + this._zimbra_notifier_Util.maxStringLength(currentEvent.name, 40);
            } else {
                text = this._zimbra_notifier_Util.maxStringLength(currentEvent.name, 50);
            }
            $('<div/>', {
                class : 'eventLabelDesc',
                text : text
            }).appendTo("#zimbra_mail_notifier_tooltipCalendar");
        }
    }
};

/**
 * Initiliaze tooltip task
 * 
 * @private
 */
zimbra_notifier_popup.initializeTooltipTask = function() {
    var index, label;

    // clean task
    $("#zimbra_mail_notifier_tooltipTask").empty();

    var tasks = this._zimbra_notifier_Controller.getTasks();
    var priority = -1;
    var prioritiesDisplayed = Number(this._zimbra_notifier_Prefs.getTaskPrioritiesDisplayed());
    var nbDisplayed = this._zimbra_notifier_Prefs.getTaskNbDisplayed();
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
                    priorityTxt += chrome.i18n.getMessage("tooltip_priority_high");
                } else if (currentPriority < 9) {
                    priorityTxt += chrome.i18n.getMessage("tooltip_priority_normal");
                } else {
                    priorityTxt += chrome.i18n.getMessage("tooltip_priority_low");
                }
                $('<div/>', {
                    class : 'taskLabelPriority',
                    status : currentPriority,
                    text : priorityTxt + " :"
                }).appendTo("#zimbra_mail_notifier_tooltipTask");
            }
            var content = $('<div/>');
            $('<label/>', {
                class : 'taskLabelDesc',
                text : this._zimbra_notifier_Util.maxStringLength(tasks[index].name, 40)
            }).appendTo(content);
            $('<label/>', {
                class : 'taskLabelPurcent',
                text : tasks[index].percentComplete + "%"
            }).appendTo(content);
            content.appendTo("#zimbra_mail_notifier_tooltipTask");

        }
    }
    if (currentDisplayed === 0) {
        $('<div/>', {
            class : 'taskLabelDesc',
            text : chrome.i18n.getMessage("tooltip_noTask")
        }).appendTo("#zimbra_mail_notifier_tooltipTask");
    }
};

/**
 * call on check now event
 */

zimbra_notifier_popup.openOptionPage = function(tab) {
    var selectedTab = "";
    if(tab) {
        selectedTab = "#"+tab;
    }
    var optionsUrl = chrome.extension.getURL("options.html");
    chrome.tabs.query({}, function(extensionTabs) {
        var found = false;
        for ( var i = 0; i < extensionTabs.length; i++) {
            if (optionsUrl == extensionTabs[i].url.split("#")[0]) {
                found = true;
                chrome.tabs.update(extensionTabs[i].id, {
                    "selected" : true,
                    "url" : "options.html"+selectedTab
                });
            }
        }
        if (found == false) {
            chrome.tabs.create({
                url : "options.html"+selectedTab
            });
        }
    });
};

/**
 * call on check now event
 */
zimbra_notifier_popup.checkNowClick = function() {
    this._zimbra_notifier_Controller.checkNow();
};

/**
 * call on connect event
 */
zimbra_notifier_popup.connectClick = function() {
    if (!this._zimbra_notifier_Prefs.isSavePasswordEnabled() || !this._zimbra_notifier_Controller.initializeConnection()) {
        this.openOptionPage(zimbra_notifier_UiUtil.OPTION_SELECT_TAB.IDENTIFICATION);
    }
};

/**
 * call on disconnect event
 */
zimbra_notifier_popup.disconnectClick = function() {
    this._zimbra_notifier_Controller.closeConnection();
};

/**
 * call on option event
 */
zimbra_notifier_popup.optionClick = function() {
    this.openOptionPage();
}

/**
 * add event listener to notify when content is loaded or unloaded
 */
document.addEventListener("DOMContentLoaded", function() {
    chrome.runtime.getBackgroundPage(function(bg) {
        zimbra_notifier_popup.init(bg);
    });
});

$(window).on("unload", function() {
    zimbra_notifier_popup.release();
});
