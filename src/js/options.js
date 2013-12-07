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
 * Creates an instance of options.
 * 
 * @constructor
 * @this {Options}
 */
var zimbra_notifier_options = {};

/**
 * init
 * 
 * @this {Options}
 */
zimbra_notifier_options.init = function(background) {
    if (!background || !background['zimbra_notifier_Controller'] || !background['zimbra_notifier_Prefs']) {
        return;
    }
    this._zimbra_notifier_Controller = background['zimbra_notifier_Controller'];
    this._zimbra_notifier_Prefs = background['zimbra_notifier_Prefs'];

    // select tab
    if(location.href.split("#").length>1) {
        this.showContent(location.href.split("#")[1], 0);
    }
    else {
        this.showContent(0, 0);
    }
    
    // Register
    this._zimbra_notifier_Controller.addCallBackRefresh(this);

    // Add button event
    $(".menu a").click(function() {
        var contentID = $(this).attr("contentID");
        zimbra_notifier_options.showContent(contentID, 200);
    });
    $('#zimbra_mail_notifier-connectButton').on('click', $.proxy(function() {
        this.connect();
    }, this));
    $('#zimbra_mail_notifier-connectCancelButton').on('click', $.proxy(function() {
        this.disconnect();
    }, this));
    $('#zimbra_mail_notifier-disconnectButton').on('click', $.proxy(function() {
        this.disconnect();
    }, this));

    //initialize values
    $("*").each(function() {
        var attr = $(this).attr("pref");
        if (attr) {
            // Initialize value
            if ($(this).attr("id") === "zimbra_mail_notifier-listAuthType") {
                $(this).val(zimbra_notifier_options._zimbra_notifier_Prefs.getPref("userServer") + "|" + zimbra_notifier_options._zimbra_notifier_Prefs.getPref("userUrlWebInteface"));
                if (!$(this).val()) {
                    $(this).val("");
                }
                // add event on change
                $(this).on('change', function() {
                    var urls = $(this).val().split('|', 2);
                    if (urls.length === 2) {
                        $("#zimbra_mail_notifier-textboxUrlWebService").val(urls[0]);
                        $("#zimbra_mail_notifier-textboxUrlWebInterface").val(urls[1]);
                    } else {
                        $("#zimbra_mail_notifier-textboxUrlWebService").val("");
                        $("#zimbra_mail_notifier-textboxUrlWebInterface").val("");
                    }
                    // update prefs
                    var prefs = $(this).attr("pref").split('|', 2);
                    zimbra_notifier_options._zimbra_notifier_Prefs.updatePref(prefs[0], $("#zimbra_mail_notifier-textboxUrlWebService").val());
                    zimbra_notifier_options._zimbra_notifier_Prefs.updatePref(prefs[1], $("#zimbra_mail_notifier-textboxUrlWebInterface").val());
                    // refresh screen
                    zimbra_notifier_options.refresh();
                });
            } else {
                var value = zimbra_notifier_options._zimbra_notifier_Prefs.getPref(attr);
                if ($(this).attr("type") === "checkbox") {
                    $(this).attr("checked", value && 1);
                } else {
                    $(this).val(value);
                }
                // add event on change
                if( ($(this).attr("id") === "zimbra_mail_notifier-textboxLogin") || ($(this).attr("id") === "zimbra_mail_notifier-optionPassword") || ($(this).attr("id") === "zimbra_mail_notifier-textboxUrlWebService")) {
                    // add event on keyup
                    $(this).on('keyup', function() {
                        zimbra_notifier_options._zimbra_notifier_Prefs.updatePref($(this).attr("pref"), $(this).val());
                        // refresh screen
                        zimbra_notifier_options.refresh();
                    }); 
                }
                else {
                    $(this).on('change', function() {
                        if ($(this).attr("type") === "checkbox") {
                            zimbra_notifier_options._zimbra_notifier_Prefs.updatePref($(this).attr("pref"), $(this).is(":checked"));
                        } else {
                            zimbra_notifier_options._zimbra_notifier_Prefs.updatePref($(this).attr("pref"), $(this).val());
                        }
                    });
                }
                
            }
        }
    });

    // refresh screen
    this.refresh();
}

/**
 * Call when the window is closed
 * 
 * @this {Option}
 */
zimbra_notifier_options.release = function() {
    this._zimbra_notifier_Controller.removeCallBackRefresh(this);

    // clear password if needed
    if (!$("#zimbra_mail_notifier-checkboxSavePassword").is(":checked")) {
        this._zimbra_notifier_Prefs.clearPassword();
    }
};

/**
 * show selected content
 * 
 * @this {Options}
 */
zimbra_notifier_options.showContent = function(contentId, animationTime) {
    if(!$.isNumeric(contentId) || (Math.floor(contentId) != contentId) || (contentId<0) || (contentId>3) ) {
        contentId = 0;
    }
    $.when($(".tabContent").fadeOut("fast")).done(function() {
        $(".tabContent").eq(contentId).animate({
            opacity : 'show',
            height : 'show'
        }, animationTime);
    });

    $('.menu > li > a').each(function(index) {
        $(this).removeClass('active');
        if (index == contentId) {
            $(this).addClass('active');
            location.href = location.href.split("#")[0] + "#" + contentId;
        }
    });
}

/**
 * Refresh.
 * 
 * @this {Option}
 */
zimbra_notifier_options.refresh = function(event) {

    if ($("#zimbra_mail_notifier-textboxLogin").val() !== '' && $("#zimbra_mail_notifier-optionPassword").val() !== '' && $("#zimbra_mail_notifier-textboxUrlWebService").val() !== '') {
        $("#zimbra_mail_notifier-connectButton").removeAttr('disabled');
    } else {
        $("#zimbra_mail_notifier-connectButton").attr('disabled', 'disabled');
    }

    if (this._zimbra_notifier_Controller.isConnected()) {
        $("#zimbra_mail_notifier-connectButton").hide();
        $("#zimbra_mail_notifier-disconnectButton").show()
        $("#zimbra_mail_notifier-connectCancelButton").hide();
        $("#zimbra_mail_notifier-textboxLogin").attr('disabled', 'disabled');
        $("#zimbra_mail_notifier-optionPassword").attr('disabled', 'disabled');
        $("#zimbra_mail_notifier-textboxUrlWebService").attr('disabled', 'disabled');
        $("#zimbra_mail_notifier-listAuthType").attr('disabled', 'disabled');
    } else if (this._zimbra_notifier_Controller.isConnecting()) {
        $("#zimbra_mail_notifier-connectButton").hide();
        $("#zimbra_mail_notifier-disconnectButton").hide();
        $("#zimbra_mail_notifier-connectCancelButton").show()
        $("#zimbra_mail_notifier-textboxLogin").attr('disabled', 'disabled');
        $("#zimbra_mail_notifier-optionPassword").attr('disabled', 'disabled');
        $("#zimbra_mail_notifier-textboxUrlWebService").attr('disabled', 'disabled');
        $("#zimbra_mail_notifier-listAuthType").attr('disabled', 'disabled');
    } else {
        $("#zimbra_mail_notifier-connectButton").show()
        $("#zimbra_mail_notifier-disconnectButton").hide();
        $("#zimbra_mail_notifier-connectCancelButton").hide();
        $("#zimbra_mail_notifier-textboxLogin").removeAttr('disabled');
        $("#zimbra_mail_notifier-optionPassword").removeAttr('disabled');
        if ($("#zimbra_mail_notifier-listAuthType").val() === "") {
            $("#zimbra_mail_notifier-textboxUrlWebService").removeAttr('disabled');
        } else {
            $("#zimbra_mail_notifier-textboxUrlWebService").attr('disabled', 'disabled');
        }
        $("#zimbra_mail_notifier-listAuthType").removeAttr('disabled');
    }
    $("#zimbra_mail_notifier-serverError").html(this._zimbra_notifier_Controller.getLastErrorMessage());
};

/**
 * Called when the authentication changed
 * 
 * @this {Option}
 */
zimbra_notifier_options.authTypeChanged = function() {

    var newAuthType = $("#zimbra_mail_notifier-listAuthType").val();

    if (this._previousAuthType !== newAuthType) {

        if (newAuthType !== '') {
            var urls = newAuthType.split('|', 2);
            $("#zimbra_mail_notifier-textboxUrlWebService").attr('disabled', 'disabled');
            $("#zimbra_mail_notifier-textboxUrlWebService").val(urls[0]);

            $("#zimbra_mail_notifier-textboxUrlWebInterface").attr('disabled', 'disabled');
            $("#zimbra_mail_notifier-textboxUrlWebInterface").val(urls[1]);
        } else {
            $("#zimbra_mail_notifier-textboxUrlWebService").val("");
            $("#zimbra_mail_notifier-textboxUrlWebInterface").val("");
            $("#zimbra_mail_notifier-textboxUrlWebInterface").removeAttr('disabled');
        }
        this._previousAuthType = newAuthType;
    }

    this.refresh();
};

/**
 * start connection.
 * 
 * @this {Option}
 */
zimbra_notifier_options.connect = function() {
    // update screen view
    $("#zimbra_mail_notifier-connectButton").hide();
    $("#zimbra_mail_notifier-disconnectButton").hide();
    $("#zimbra_mail_notifier-connectCancelButton").show()
    $("#zimbra_mail_notifier-textboxLogin").attr('disabled', 'disabled');
    $("#zimbra_mail_notifier-optionPassword").attr('disabled', 'disabled');
    $("#zimbra_mail_notifier-textboxUrlWebService").attr('disabled', 'disabled');
    $("#zimbra_mail_notifier-listAuthType").attr('disabled', 'disabled');
    $("#zimbra_mail_notifier-serverError").val("");

    // initialize connection
    this._closeWhenConnected = true;
    this._zimbra_notifier_Controller.initializeConnection($("#zimbra_mail_notifier-optionPassword").val());
};

/**
 * disconnection.
 *
 * @this {Option}
 */
zimbra_notifier_options.disconnect = function() {
    this._closeWhenConnected = false;
    this._zimbra_notifier_Controller.closeConnection();
};

/**
 * add event listener to notify when content is loaded or unloaded
 */
document.addEventListener('DOMContentLoaded', function() {
    chrome.runtime.getBackgroundPage(function(bg) {
        zimbra_notifier_options.init(bg);
    });
});

$(window).on('unload', function() {
    zimbra_notifier_options.release();
});
