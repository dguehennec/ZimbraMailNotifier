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
 * @public
 * @this {Options}
 * @param {background} the background extension context
 */
zimbra_notifier_options.init = function(background) {
    if (!background || !background['zimbra_notifier_Controller'] || !background['zimbra_notifier_Prefs']) {
        $('.content').text(chrome.i18n.getMessage("tooltip_errorInitPage_title"));
        return;
    }
    this._zimbra_notifier_SuperController = background['zimbra_notifier_SuperController'];
    this._zimbra_notifier_Prefs = background['zimbra_notifier_Prefs'];
    this._zimbra_notifier_Util = background['zimbra_notifier_Util'];

    // select tab
    if(location.href.split("#").length>1) {
        this.showContent(location.href.split("#")[1], 0);
    }
    else {
        this.showContent(0, 0);
    }

    // Register
    this._zimbra_notifier_SuperController.addCallBackRefresh(this);

    // Add button event
    $(".menu a").click(function(evt) {
        evt.preventDefault();
        var contentID = $(this).attr("contentID");
        zimbra_notifier_options.showContent(contentID, 200);
    });

    var updateSoundFileButton = function(type, value) {
        $('#zimbra_mail_notifier-' + type + 'NotificationFile').hide();
        if(value === 5) {
            $('#zimbra_mail_notifier-' + type + 'NotificationFile').show();
        }
    }
    // manage email sound notification
    $('#zimbra_mail_notifier-optionMailSoundSelected').on('change', function(evt) {
        var value = parseInt($(evt.target).val());
        updateSoundFileButton('email', value);
    });
    $('#zimbra_mail_notifier-emailNotificationFile').on('change', function(evt) {
        zimbra_notifier_options._zimbra_notifier_Util.loadFile(evt.target.files[0], function(base64file) {
            zimbra_notifier_options._zimbra_notifier_Prefs.updatePref(zimbra_notifier_options._zimbra_notifier_Prefs.PREF.EMAIL_SOUND_FILE, base64file)
        }, window.alert);
    });
    $('#zimbra_mail_notifier-emailNotificationTestPlay').on('click', function() {
        var selected = zimbra_notifier_options._zimbra_notifier_Prefs.getEmailSoundSelected();
        var customSound = zimbra_notifier_options._zimbra_notifier_Prefs.getEmailSoundCustom();
        var volumeSound = zimbra_notifier_options._zimbra_notifier_Prefs.getEmailSoundVolume();
        zimbra_notifier_options._zimbra_notifier_Util.playSound(selected, customSound, volumeSound);
    });
    updateSoundFileButton('email', zimbra_notifier_options._zimbra_notifier_Prefs.getEmailSoundSelected());

    // manage calendar sound notification
    $('#zimbra_mail_notifier-optionCalendarSoundSelected').on('change', function(evt) {
        var value = parseInt($(evt.target).val());
        updateSoundFileButton('calendar', value);
    });
    $('#zimbra_mail_notifier-calendarNotificationFile').on('change', function(evt) {
        zimbra_notifier_options._zimbra_notifier_Util.loadFile(evt.target.files[0], function(base64file) {
            zimbra_notifier_options._zimbra_notifier_Prefs.updatePref(zimbra_notifier_options._zimbra_notifier_Prefs.PREF.CALENDAR_SOUND_FILE, base64file)
        }, window.alert);
    });
    $('#zimbra_mail_notifier-calendarNotificationTestPlay').on('click', function() {
        var selected = zimbra_notifier_options._zimbra_notifier_Prefs.getCalendarSoundSelected();
        var customSound = zimbra_notifier_options._zimbra_notifier_Prefs.getCalendarSoundCustom();
        var volumeSound = zimbra_notifier_options._zimbra_notifier_Prefs.getCalendarSoundVolume();
        zimbra_notifier_options._zimbra_notifier_Util.playSound(selected, customSound, volumeSound);
    });
    updateSoundFileButton('calendar', zimbra_notifier_options._zimbra_notifier_Prefs.getCalendarSoundSelected());


    $('#zimbra_mail_notifier-addNewIdentifier').on('click', function() {
        zimbra_notifier_options._zimbra_notifier_SuperController.addNewIdentifier();
    });
    // refresh screen
    this.refresh(undefined, true);
}

/**
 * display account of the controller
 *
 * @private
 * @this {Option}
 * @param {zimbra_notifier_Controller} controller
 */
zimbra_notifier_options.displayIdentifier = function(controller) {
    if(!controller) {
        return;
    }

    var accountId = controller.getAccountId();
    $('<fieldset id="identifier' + accountId + '" class="options identifier"><legend><label msg="option_identifiant_caption" class="section"></label></legend></fieldset>').insertBefore('#zimbra_mail_notifier-addNewIdentifier');
    $('<fieldset class="options"><legend><label class="section" msg="option_identifiant_params_caption"></label></legend><div class="subOptions"><div><div msg="option_identifiant_alias_label" msgTemplate="%MSG% : " style="width:160px;float:left;"></div><input id="zimbra_mail_notifier-textboxAlias' + accountId + '" type="text" pref="userAlias' + accountId + '" style="width:160px;"></input></div><div><div msg="option_identifiant_login_label" msgTemplate="%MSG% : " style="width:160px;float:left;"></div><input id="zimbra_mail_notifier-textboxLogin' + accountId + '" type="text" pref="userLogin' + accountId + '" style="width:160px;"></input></div><div><div msg="option_identifiant_password_label" msgTemplate="%MSG% : " style="width:160px;float:left;"></div><input id="zimbra_mail_notifier-optionPassword' + accountId + '" type="password" pref="userPassword' + accountId + '" style="width:160px;"></input></div><div><input type="checkbox" id="zimbra_mail_notifier-checkboxSavePassword' + accountId + '" pref="userSavePassword' + accountId + '" style="margin-left:160px;"/><label for="zimbra_mail_notifier-checkboxSavePassword' + accountId + '" msg="option_identifiant_savePassword_label"></label></div></div></fieldset>').appendTo('#identifier' + accountId);
    $('<fieldset class="options"><legend><label class="section" msg="option_identifiant_server_caption"></label></legend><div class="subOptions"><div><div msg="option_identifiant_authtype_label" msgTemplate="%MSG% : " style="width:160px;float:left;"></div><select id="zimbra_mail_notifier-listAuthType' + accountId + '" pref="userServer|userUrlWebInteface"><option value="" msg="option_identifiant_authtype_normal"></option><option value="https://zimbra.free.fr|https://zimbra.free.fr/zimbra/mail">Free</option><option value="http://zimbra.aliceadsl.fr|http://zimbra.aliceadsl.fr/zimbra/mail">Alice Adsl</option></select></div><div><div msg="option_identifiant_urlwebservice_label" msgTemplate="%MSG% : " style="width:160px;float:left;"></div><input id="zimbra_mail_notifier-textboxUrlWebService' + accountId + '" type="text" pref="userServer' + accountId + '" msgTitle="option_identifiant_urlwebservice_tooltip" style="width:300px"></input></div><div><div msg="option_identifiant_urlwebinterface_label" msgTemplate="%MSG% : " style="width:160px;float:left;"></div><input id="zimbra_mail_notifier-textboxUrlWebInterface' + accountId + '" type="text" pref="userUrlWebInteface' + accountId + '" msgTitle="option_identifiant_urlwebinterface_tooltip" style="width:300px"></input></div></div></fieldset>').appendTo('#identifier' + accountId);
    $('<div id="zimbra_mail_notifier-serverError' + accountId + '" class="zimbra_mail_notifier-serverError"></div>').appendTo('#identifier' + accountId);
    $('<div class="actionButtons"><button id="zimbra_mail_notifier-removeButton' + accountId + '" msg="option_identifiant_remove_button" ></button><button id="zimbra_mail_notifier-connectButton' + accountId + '" msg="option_identifiant_connect_button" style="float:right"></button><button id="zimbra_mail_notifier-connectCancelButton' + accountId + '" msg="option_identifiant_connectCancel_button" style="float:right"></button><button id="zimbra_mail_notifier-disconnectButton' + accountId + '" msg="option_identifiant_disconnect_button" style="float:right"></button></div></fieldset>').appendTo('#identifier' + accountId);

    $('#zimbra_mail_notifier-listAuthType' + accountId).on('click', $.proxy(function() {
        this.authTypeChanged(controller);
    }, this));

    $('#zimbra_mail_notifier-removeButton' + accountId).on('click', $.proxy(function() {
        this._zimbra_notifier_SuperController.removeController(controller);
    }, this));

    $('#zimbra_mail_notifier-connectButton' + accountId).on('click', $.proxy(function() {
        this.connect(controller);
    }, this));

    $('#zimbra_mail_notifier-connectCancelButton' + accountId).on('click', $.proxy(function() {
        this.disconnect(controller);
    }, this));


    $('#zimbra_mail_notifier-disconnectButton' + accountId).on('click', $.proxy(function() {
        this.disconnect(controller);
    }, this));
}

/**
 * Call when the window is closed
 *
 * @public
 * @this {Option}
 */
zimbra_notifier_options.release = function() {
    if(!this._zimbra_notifier_SuperController) {
        return;
    }

    this._zimbra_notifier_SuperController.removeCallBackRefresh(this);

    // clear password if needed
    this._zimbra_notifier_SuperController.getControllers().forEach(function(controller) {
        if (!$("#zimbra_mail_notifier-checkboxSavePassword" + controller.getAccountId()).is(":checked")) {
            zimbra_notifier_options._zimbra_notifier_Prefs.clearPassword(controller.getAccountId());
        }
    });
};

/**
 * show selected content
 *
 * @public
 * @this {Options}
 * @param {Number} content Id
 * @param {Number} animation Time
 */
zimbra_notifier_options.showContent = function(contentId, animationTime) {
    if(!$.isNumeric(contentId) || (Math.floor(contentId) != contentId) || (contentId<0) || (contentId>4) ) {
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
        }
    });
}

/**
 * Refresh.
 *
 * @public
 * @this {Option}
 * @param {Event} the refresh event
 * @param {Boolean} is forced (optional)
 */
zimbra_notifier_options.refresh = function(event, forced) {
    var newIdentifierDisplayed = (forced === true);
    // check identifier removed
    var identifiersDisplayed = [];
    var accountsAvailable = this._zimbra_notifier_Prefs.getAccounts();
    $(".identifier").each(function() {
        var accountId = $(this).attr("id").replace("identifier", "");
        if(accountsAvailable.indexOf(accountId)<0) {
            $("#identifier" + accountId).remove();
        } else {
            identifiersDisplayed.push(accountId);
        }
    });
    // check identifier added
    this._zimbra_notifier_SuperController.getControllers().forEach(function(controller) {
        if(identifiersDisplayed.indexOf(controller.getAccountId())<0) {
            zimbra_notifier_options.displayIdentifier(controller);
            newIdentifierDisplayed = true;
        }
    });
    // refresh locale and value if necessary
    if(newIdentifierDisplayed) {
        //refresh values
        $("*").each(function() {
            var attr = $(this).attr("pref");
            if (attr) {
                // Initialize value
                if ($(this).attr("id").indexOf("zimbra_mail_notifier-listAuthType")>=0) {
                    var accountId = $(this).attr("id").replace("zimbra_mail_notifier-listAuthType", "");
                    $(this).val(zimbra_notifier_options._zimbra_notifier_Prefs.getPref("userServer" + accountId) + "|" + zimbra_notifier_options._zimbra_notifier_Prefs.getPref("userUrlWebInteface" + accountId));
                    if (!$(this).val()) {
                        $(this).val("");
                    }
                    // add event on change
                    $(this).on('change', function() {
                        var urls = $(this).val().split('|', 2);
                        if (urls.length === 2) {
                            $("#zimbra_mail_notifier-textboxUrlWebService" + accountId).val(urls[0]);
                            $("#zimbra_mail_notifier-textboxUrlWebInterface" + accountId).val(urls[1]);
                        } else {
                            $("#zimbra_mail_notifier-textboxUrlWebService" + accountId).val("");
                            $("#zimbra_mail_notifier-textboxUrlWebInterface" + accountId).val("");
                        }
                        // update prefs
                        var prefs = $(this).attr("pref").split('|', 2);
                        zimbra_notifier_options._zimbra_notifier_Prefs.updatePref(prefs[0] + accountId, $("#zimbra_mail_notifier-textboxUrlWebService" + accountId).val());
                        zimbra_notifier_options._zimbra_notifier_Prefs.updatePref(prefs[1] + accountId, $("#zimbra_mail_notifier-textboxUrlWebInterface" + accountId).val());
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
                    if(($(this).attr("id").indexOf("zimbra_mail_notifier-textboxLogin")>=0) || ($(this).attr("id").indexOf("zimbra_mail_notifier-optionPassword")>=0) || ($(this).attr("id").indexOf("zimbra_mail_notifier-textboxUrlWebService")>=0)) {
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
        zimbra_notifier_UiUtil.initLocale();
    }
    // Update buttons in interface
    this._zimbra_notifier_SuperController.getControllers().forEach(function(controller) {
        var accountId = controller.getAccountId();
        if ($("#zimbra_mail_notifier-textboxLogin" + accountId).val() !== '' && $("#zimbra_mail_notifier-optionPassword" + accountId).val() !== '' && $("#zimbra_mail_notifier-textboxUrlWebService" + accountId).val() !== '') {
            $("#zimbra_mail_notifier-connectButton" + accountId).removeAttr('disabled');
        } else {
            $("#zimbra_mail_notifier-connectButton" + accountId).attr('disabled', 'disabled');
        }
        if (controller.isConnected()) {
            $("#zimbra_mail_notifier-connectButton" + accountId).hide();
            $("#zimbra_mail_notifier-disconnectButton" + accountId).show()
            $("#zimbra_mail_notifier-connectCancelButton" + accountId).hide();
            $("#zimbra_mail_notifier-textboxLogin" + accountId).attr('disabled', 'disabled');
            $("#zimbra_mail_notifier-optionPassword" + accountId).attr('disabled', 'disabled');
            $("#zimbra_mail_notifier-textboxUrlWebService" + accountId).attr('disabled', 'disabled');
            $("#zimbra_mail_notifier-listAuthType" + accountId).attr('disabled', 'disabled');
        } else if (controller.isConnecting()) {
            $("#zimbra_mail_notifier-connectButton" + accountId).hide();
            $("#zimbra_mail_notifier-disconnectButton" + accountId).hide();
            $("#zimbra_mail_notifier-connectCancelButton" + accountId).show()
            $("#zimbra_mail_notifier-textboxLogin" + accountId).attr('disabled', 'disabled');
            $("#zimbra_mail_notifier-optionPassword" + accountId).attr('disabled', 'disabled');
            $("#zimbra_mail_notifier-textboxUrlWebService" + accountId).attr('disabled', 'disabled');
            $("#zimbra_mail_notifier-listAuthType" + accountId).attr('disabled', 'disabled');
        } else {
            $("#zimbra_mail_notifier-connectButton" + accountId).show()
            $("#zimbra_mail_notifier-disconnectButton" + accountId).hide();
            $("#zimbra_mail_notifier-connectCancelButton" + accountId).hide();
            $("#zimbra_mail_notifier-textboxLogin" + accountId).removeAttr('disabled');
            $("#zimbra_mail_notifier-optionPassword" + accountId).removeAttr('disabled');
            if ($("#zimbra_mail_notifier-listAuthType" + accountId).val() === "") {
                $("#zimbra_mail_notifier-textboxUrlWebService" + accountId).removeAttr('disabled');
            } else {
                $("#zimbra_mail_notifier-textboxUrlWebService" + accountId).attr('disabled', 'disabled');
            }
            $("#zimbra_mail_notifier-listAuthType" + accountId).removeAttr('disabled');
        }
        $("#zimbra_mail_notifier-serverError" + accountId).html(controller.getLastErrorMessage());
    });

};

/**
 * Called when the authentication changed
 *
 * @private
 * @this {Option}
 * @param {zimbra_notifier_Controller} controller
 */
zimbra_notifier_options.authTypeChanged = function(controller) {
    if(!controller) {
        return;
    }

    var accountId = controller.getAccountId();
    var newAuthType = $("#zimbra_mail_notifier-listAuthType" + accountId).val();
    if (this._previousAuthType !== newAuthType) {

        if (newAuthType !== '') {
            var urls = newAuthType.split('|', 2);
            $("#zimbra_mail_notifier-textboxUrlWebService" + accountId).attr('disabled', 'disabled');
            $("#zimbra_mail_notifier-textboxUrlWebService" + accountId).val(urls[0]);

            $("#zimbra_mail_notifier-textboxUrlWebInterface" + accountId).attr('disabled', 'disabled');
            $("#zimbra_mail_notifier-textboxUrlWebInterface" + accountId).val(urls[1]);
        } else {
            $("#zimbra_mail_notifier-textboxUrlWebService" + accountId).val("");
            $("#zimbra_mail_notifier-textboxUrlWebInterface" + accountId).val("");
            $("#zimbra_mail_notifier-textboxUrlWebInterface" + accountId).removeAttr('disabled');
        }
        this._previousAuthType = newAuthType;
    }
    this.refresh();
};

/**
 * start connection.
 *
 * @private
 * @this {Option}
 * @param {zimbra_notifier_Controller} controller
 */
zimbra_notifier_options.connect = function(controller) {
    if(!controller) {
        return;
    }

    var accountId = controller.getAccountId();
    // update screen view
    $("#zimbra_mail_notifier-connectButton" + accountId).hide();
    $("#zimbra_mail_notifier-disconnectButton" + accountId).hide();
    $("#zimbra_mail_notifier-connectCancelButton" + accountId).show()
    $("#zimbra_mail_notifier-textboxLogin" + accountId).attr('disabled', 'disabled');
    $("#zimbra_mail_notifier-optionPassword" + accountId).attr('disabled', 'disabled');
    $("#zimbra_mail_notifier-textboxUrlWebService" + accountId).attr('disabled', 'disabled');
    $("#zimbra_mail_notifier-listAuthType" + accountId).attr('disabled', 'disabled');
    $("#zimbra_mail_notifier-serverError" + accountId).val("");

    // initialize connection
    controller.initializeConnection($("#zimbra_mail_notifier-optionPassword" + accountId).val());
};

/**
 * disconnection.
 *
 * @private
 * @this {Option}
 * @param {zimbra_notifier_Controller} controller
 */
zimbra_notifier_options.disconnect = function(controller) {
    if(controller) {
        controller.closeConnection();
    }
};

/**
 * add event listener to notify when content is loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    var backgroundPage = chrome.extension.getBackgroundPage();
    zimbra_notifier_options.init(backgroundPage);
});

/**
 * add event listener to notify when content is unloaded
 */
$(window).on('unload', function() {
    zimbra_notifier_options.release();
});
