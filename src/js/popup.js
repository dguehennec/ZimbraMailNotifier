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
 * Creates an instance of zimbra_notifier_popup.
 *
 * @constructor
 * @this {zimbra_notifier_popup}
 */
var zimbra_notifier_popup = {};

/**
 * Initialize zimbra_notifier_popup
 *
 * @public
 * @this {zimbra_notifier_popup}
 */
zimbra_notifier_popup.init = function(background) {
    // add event listener on button
    $('#zimbra_mail_notifier_tooltipOption').on('click', $.proxy(function() {
        this.optionClick();
    }, this));


    $('#zimbra_mail_notifier_tooltipCheckNow').on('click', $.proxy(function() {
        this.checkNowClick();
    }, this));

    // initialize background objects
    if (!background || !background['zimbra_notifier_SuperController'] || !background['zimbra_notifier_Prefs'] || !background['zimbra_notifier_Util']) {
        $('#zimbra_mail_notifier_tooltipTitle').text(chrome.i18n.getMessage("tooltip_errorInitPage_title"));
        $('#zimbra_mail_notifier_tooltipCalendarGroup').hide();
        $('#zimbra_mail_notifier_tooltipTaskGroup').hide();
        return;
    }
    this._zimbra_notifier_SuperController = background['zimbra_notifier_SuperController'];
    this._zimbra_notifier_Prefs = background['zimbra_notifier_Prefs'];
    this._zimbra_notifier_Util = background['zimbra_notifier_Util'];

    Object.assign(document.body.style, {
      'background-color': this._zimbra_notifier_Prefs.getPopupColor(),
      'width': this._zimbra_notifier_Prefs.getPopupWidth() + 'px',
    });

    // Register
    this._zimbra_notifier_SuperController.addCallBackRefresh(this);

    this.refresh();
};

/**
 * Call when the window is closed
 *
 * @public
 * @this {zimbra_notifier_popup}
 */
zimbra_notifier_popup.release = function() {
    if(!this._zimbra_notifier_SuperController) {
        return;
    }

    this._zimbra_notifier_SuperController.removeCallBackRefresh(this);
};

/**
 * Initialize tooltip
 *
 * @public
 * @this {zimbra_notifier_popup}
 */
zimbra_notifier_popup.refresh = function() {
    if(!this._zimbra_notifier_SuperController) {
        return;
    }

    if(this._zimbra_notifier_SuperController.hasConnectionActivated()) {
        $('#zimbra_mail_notifier_tooltipCheckNow').show();
    } else {
        $('#zimbra_mail_notifier_tooltipCheckNow').hide();
    }
    $('#zimbra_mail_notifier_tooltipContent').empty();

    this._zimbra_notifier_SuperController.getControllers().forEach(function(controller) {
        zimbra_notifier_popup.initializeTooltipIdentifier(controller);
    });

    if(this._zimbra_notifier_SuperController.hasConnectionActivated()) {
        // show message
        if (this._zimbra_notifier_Prefs.isMessageEnabled()) {
            $('#zimbra_mail_notifier_tooltipMessageGroup').show();
            this.initializeTooltipMessage();
        } else {
            $('#zimbra_mail_notifier_tooltipMessageGroup').hide();
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
    }
    else {
        $('#zimbra_mail_notifier_tooltipMessageGroup').hide();
        $('#zimbra_mail_notifier_tooltipCalendarGroup').hide();
        $('#zimbra_mail_notifier_tooltipTaskGroup').hide();
    }

    if(this._zimbra_notifier_SuperController.getControllers().length==0){
        $('<div/>', {
            class : 'tooltipDescription',
            text : chrome.i18n.getMessage("tooltip_configuration_description")
        }).appendTo('#zimbra_mail_notifier_tooltipContent');
    }
};

/**
 * Initialize tooltip identifier
 *
 * @private
 * @this {zimbra_notifier_popup}
 * @param {zimbra_notifier_Controller} controller
 */
zimbra_notifier_popup.initializeTooltipIdentifier = function(controller) {
    var accountId = controller.getAccountId();
    var errorMsg = controller.getLastErrorMessage();
    $('<div/>', {
        id : 'zimbra_mail_notifier_tooltipIdentifier_'+ accountId,
        class : 'tooltipIdentifier'
    }).appendTo('#zimbra_mail_notifier_tooltipContent');
    if (controller.isConnected()) {
        $('#zimbra_mail_notifier_tooltipIdentifier_'+ accountId).append('<div id="zimbra_mail_notifier_tooltipTitle_' + accountId + '" class="tooltipTitle"></div><div id="zimbra_mail_notifier_tooltipMessage_' + accountId + '"  class="tooltipMessage"></div><div class="action actionidentifier" ><img id="zimbra_mail_notifier_tooltipHome_' + accountId + '" src="skin/images/button_home.png" msgTitle="main_homepage_label"/><img id="zimbra_mail_notifier_tooltipDisconnect_' + accountId + '" src="skin/images/button_disconnect.png" msgTitle="main_disconnect" /></div>');
        $('#zimbra_mail_notifier_tooltipHome_' + accountId).on('click', function() {
            controller.openZimbraWebInterface();
            window.close();
        });
        $('#zimbra_mail_notifier_tooltipDisconnect_' + accountId).on('click', function() {
            controller.closeConnection();
        });

        // show title informations
        $('<div/>', {
            text : chrome.i18n.getMessage("tooltip_connected_descriptionAccount").replace("%EMAIL%", zimbra_notifier_popup._zimbra_notifier_Prefs.getUserAlias(accountId))
        }).appendTo('#zimbra_mail_notifier_tooltipTitle_' + accountId);

        // show message informations
        if (errorMsg !== "") {
            // show error informations
            $('<div/>', {
                text : chrome.i18n.getMessage("tooltip_errorConnected_title")
            }).appendTo("#zimbra_mail_notifier_tooltipMessage_" + accountId);
            $('<div/>', {
                text : errorMsg
            }).appendTo("#zimbra_mail_notifier_tooltipMessage_" + accountId);
        } else {
            // show State and account informations
            $('<div/>', {
                text : chrome.i18n.getMessage("tooltip_connected_descriptionStatus")
            }).appendTo("#zimbra_mail_notifier_tooltipMessage_" + accountId);

            var msgDesc = chrome.i18n.getMessage("tooltip_unreadMessages_title");
            msgDesc = msgDesc.replace("%NB%", controller.getNbMessageUnread());
            $('<div/>', {
                text : msgDesc
            }).appendTo("#zimbra_mail_notifier_tooltipMessage_" + accountId);

            // show mailbox informations
            var mailBoxInfo = controller.getMailBoxInfo();
            if (mailBoxInfo && mailBoxInfo.quotaSize > 0) {
                var msgQuota = chrome.i18n.getMessage("tooltip_connected_descriptionQuota");
                msgQuota = msgQuota.replace("%PERCENTAGE%", mailBoxInfo.getPercentageQuotaUsed());
                msgQuota = msgQuota.replace("%USED%", mailBoxInfo.quotaUsedString);
                msgQuota = msgQuota.replace("%SIZE%", mailBoxInfo.quotaSizeString);
                $('<div/>', {
                    text : msgQuota
                }).appendTo("#zimbra_mail_notifier_tooltipMessage_" + accountId);
            }
        }
    }
    else {
        $('#zimbra_mail_notifier_tooltipIdentifier_'+ accountId).append('<div id="zimbra_mail_notifier_tooltipTitle_' + accountId + '" class="tooltipTitle"></div><div id="zimbra_mail_notifier_tooltipMessage_' + accountId + '" class="tooltipMessage"></div><div class="action actionidentifier"><img id="zimbra_mail_notifier_tooltipConnect_' + accountId + '" src="skin/images/button_connect.png" msgTitle="main_connect" /></div>');
        $('#zimbra_mail_notifier_tooltipConnect_' + accountId).on('click', function() {
            if (!zimbra_notifier_popup._zimbra_notifier_Prefs.isSavePasswordEnabled(accountId) || !controller.initializeConnection()) {
                zimbra_notifier_popup.openOptionPage(zimbra_notifier_UiUtil.OPTION_SELECT_TAB.IDENTIFICATION);
            }
        });
        // show title informations
        $('<div/>', {
            text : chrome.i18n.getMessage("tooltip_connected_descriptionAccount").replace("%EMAIL%", zimbra_notifier_popup._zimbra_notifier_Prefs.getUserAlias(accountId))
        }).appendTo('#zimbra_mail_notifier_tooltipTitle_' + accountId);
        $('<div/>', {
            text : chrome.i18n.getMessage("tooltip_disconnected_descriptionStatus")
        }).appendTo("#zimbra_mail_notifier_tooltipMessage_" + accountId);
        // show error informations
        if (errorMsg === "") {
            errorMsg = chrome.i18n.getMessage("tooltip_notConnected_description");
        }
        $('<div/>', {
            text : errorMsg
        }).appendTo("#zimbra_mail_notifier_tooltipMessage_" + accountId);
    }
}
/**
 * Initialize tooltip messages
 *
 * @private
 * @this {zimbra_notifier_popup}
 */
zimbra_notifier_popup.initializeTooltipMessage = function() {
    var index, label;

    // clean message
    $("#zimbra_mail_notifier_tooltipMessage").empty();

    var unreadMessages = [];
    var nbControllers = this._zimbra_notifier_SuperController.getControllers().length;
    this._zimbra_notifier_SuperController.getControllers().forEach(function(controller) {
        var alias = "";
        if (nbControllers > 1) {
            alias = " (" + zimbra_notifier_popup._zimbra_notifier_Prefs.getUserAlias(controller.getAccountId()) + ")";
        }
        controller.getUnreadMessages().forEach(function(message) {
            var content = message.subject;
            if(message.content !== "") {
                if(content !== "") {
                    content += " - " + message.content;
                } else {
                    content = message.content;
                }
            }
            if(content === "") {
                content = chrome.i18n.getMessage("tooltip_noEmailContent")
            }
            unreadMessages.push({date: message.date, content: content, alias: alias, controller: controller});
        });
    });
    // sort unread messages
    unreadMessages.sort(function(a, b) {
        return b.date - a.date
    });
    // display messages
    if (unreadMessages.length === 0) {
        $('<div/>', {
            class : 'eventLabelDesc',
            text : chrome.i18n.getMessage("tooltip_noUnreadMessage")
        }).appendTo("#zimbra_mail_notifier_tooltipMessage");
    } else {
        var nbDisplayed = this._zimbra_notifier_Prefs.getMessageNbDisplayed();
        var nbCharactersDisplayed = this._zimbra_notifier_Prefs.getMessageNbCharactersDisplayed();
        var currentDisplayed = 0;
        for (index = 0; (index < unreadMessages.length) && (currentDisplayed < nbDisplayed); index++) {
            currentDisplayed++;
            $('<div/>', {
                class : 'eventLabelDate',
                text : unreadMessages[index].date.toLocaleString() + unreadMessages[index].alias
            }).appendTo("#zimbra_mail_notifier_tooltipMessage");
            $('<div/>', {
                id : 'zimbra_mail_notifier_tooltipMessage' + index,
                accountId : unreadMessages[index].controller.getAccountId(),
                class : 'eventLabelDesc tooltipMessageAbstract',
                text : this._zimbra_notifier_Util.maxStringLength(unreadMessages[index].content, nbCharactersDisplayed)
            }).appendTo("#zimbra_mail_notifier_tooltipMessage");
            $('#zimbra_mail_notifier_tooltipMessage' + index).on('click', function() {
                var accountId = $(this).attr("accountId");
                zimbra_notifier_popup._zimbra_notifier_SuperController.getControllers().forEach(function(controller) {
                    if(controller.getAccountId() === accountId) {
                        controller.openZimbraWebInterface();
                        window.close();
                    }
                });

            });
        }
    }
};
/**
 * Initialize tooltip calendar
 *
 * @private
 * @this {zimbra_notifier_popup}
 */
zimbra_notifier_popup.initializeTooltipCalendar = function() {
    var index, label;

    // clean calendar
    $("#zimbra_mail_notifier_tooltipCalendar").empty();

    var events = this._zimbra_notifier_SuperController.getEvents();
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
 * Initialize tooltip task
 *
 * @private
 * @this {zimbra_notifier_popup}
 */
zimbra_notifier_popup.initializeTooltipTask = function() {
    var index, label;

    // clean task
    $("#zimbra_mail_notifier_tooltipTask").empty();

    var tasks = this._zimbra_notifier_SuperController.getTasks();
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
 * open option page
 *
 * @private
 * @this {zimbra_notifier_popup}
 * @param {Number} the tab to display
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
            if (extensionTabs[i].url && (optionsUrl == extensionTabs[i].url.split("#")[0])) {
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
 * call on option event
 *
 * @private
 * @this {zimbra_notifier_popup}
 */
zimbra_notifier_popup.optionClick = function() {
    this.openOptionPage();
}

/**
 * call on check now event
 *
 * @private
 * @this {zimbra_notifier_popup}
 */
zimbra_notifier_popup.checkNowClick = function() {
    if(!this._zimbra_notifier_SuperController) {
        return;
    }

    this._zimbra_notifier_SuperController.getControllers().forEach(function(controller) {
        if(controller.isConnected()) {
            controller.checkNow();
        }
    });
}

/**
 * add event listener to notify when content is loaded
 */
document.addEventListener("DOMContentLoaded", function() {
    var backgroundPage = chrome.extension.getBackgroundPage();
    zimbra_notifier_popup.init(backgroundPage);
});

/**
 * add event listener to notify when content is unloaded
 */
$(window).on("unload", function() {
    zimbra_notifier_popup.release();
});
