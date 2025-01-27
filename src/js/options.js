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
    // Enable messaging between scripts
    chrome.runtime.onMessage.addListener(this.onMessage);
    // select tab
    if(location.href.split("#").length>1) {
        this.showContent(location.href.split("#")[1], 0);
    }
    else {
        this.showContent(0, 0);
    }

    // Add button event
    $(".menu a").click(function(evt) {
        evt.preventDefault();
        var contentid = $(this).attr("contentid");
        zimbra_notifier_options.showContent(contentid, 100);
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
        zimbra_notifier_Util.loadFile(evt.target.files[0], function(base64file) {
            zimbra_notifier_options.updatePref(zimbra_notifier_Prefs.PREF.EMAIL_SOUND_FILE, base64file)
            zimbra_notifier_options._emailSoundBase64File = base64file
        }, window.alert);
    });
    $('#zimbra_mail_notifier-emailNotificationTestPlay').on('click', function() {
        var selected = parseInt($('#zimbra_mail_notifier-optionMailSoundSelected').val());
        var customSound = zimbra_notifier_options._emailSoundBase64File || zimbra_notifier_Prefs.getEmailSoundCustom();
        var volumeSound = parseInt($('#zimbra_mail_notifier-optionMailNotificationVolume').val());
        zimbra_notifier_UiUtil.playSound(selected, customSound, volumeSound);
    });
    updateSoundFileButton('email', zimbra_notifier_Prefs.getEmailSoundSelected());

    // manage calendar sound notification
    $('#zimbra_mail_notifier-optionCalendarSoundSelected').on('change', function(evt) {
        var value = parseInt($(evt.target).val());
        updateSoundFileButton('calendar', value);
    });
    $('#zimbra_mail_notifier-calendarNotificationFile').on('change', function(evt) {
        zimbra_notifier_Util.loadFile(evt.target.files[0], function(base64file) {
            zimbra_notifier_options.updatePref(zimbra_notifier_Prefs.PREF.CALENDAR_SOUND_FILE, base64file)
            zimbra_notifier_options._calendarSoundBase64File = base64file
        }, window.alert);
    });
    $('#zimbra_mail_notifier-calendarNotificationTestPlay').on('click', function() {
        var selected = parseInt($('#zimbra_mail_notifier-optionCalendarSoundSelected').val());;
        var customSound = zimbra_notifier_options._calendarSoundBase64File || zimbra_notifier_Prefs.getCalendarSoundCustom();
        var volumeSound = parseInt($('#zimbra_mail_notifier-optionCalendarNotificationVolume').val());
        zimbra_notifier_UiUtil.playSound(selected, customSound, volumeSound);
    });
    updateSoundFileButton('calendar', zimbra_notifier_Prefs.getCalendarSoundSelected());


    $('#zimbra_mail_notifier-addNewIdentifier').on('click', function() {
        zimbra_notifier_options.driver('addNewIdentifier')
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
zimbra_notifier_options.displayIdentifier = async function(controller) {
    if(!controller) {
        return;
    }

    var accountId = controller.accountId;

    $('<fieldset id="identifier' + accountId + '" class="options identifier"> \
        <legend> \
            <label msg="option_identifiant_caption" class="section"></label> \
        </legend> \
    </fieldset>').insertBefore('#zimbra_mail_notifier-addNewIdentifier');

    $('<fieldset class="options"> \
        <legend> \
        <label class="section" msg="option_identifiant_params_caption"></label> \
        </legend> \
        <div class="subOptions"> \
            <div> \
                <div msg="option_identifiant_alias_label" msgtemplate="%MSG% : " style="width:200px;float:left;"></div> \
                <input id="zimbra_mail_notifier-textboxAlias' + accountId + '" type="text" pref="userAlias' + accountId + '" style="width:160px;"></input> \
            </div> \
            <div> \
                <div msg="option_identifiant_login_label" msgtemplate="%MSG% : " style="width:200px;float:left;"></div> \
                <input id="zimbra_mail_notifier-textboxLogin' + accountId + '" type="text" pref="userLogin' + accountId + '" style="width:300px;"></input> \
            </div> \
            <div> \
                <div msg="option_identifiant_password_label" msgtemplate="%MSG% : " style="width:200px;float:left;"></div> \
                <input id="zimbra_mail_notifier-optionPassword' + accountId + '" type="password" pref="userPassword' + accountId + '" style="width:300px;"></input> \
            </div> \
            <div> \
                <input type="checkbox" id="zimbra_mail_notifier-checkboxSavePassword' + accountId + '" pref="userSavePassword' + accountId + '" style="margin-left:200px;"/> \
                <label for="zimbra_mail_notifier-checkboxSavePassword' + accountId + '" msg="option_identifiant_savePassword_label"></label> \
            </div> \
            <div> \
                <div msg="option_identifiant_2fatoken_label" msgtemplate="%MSG% : " style="width:200px;float:left;"></div> \
                <input id="zimbra_mail_notifier-option2faToken' + accountId + '" type="text" style="width:100px;margin-right:5px;"></input> \
                <button id="zimbra_mail_notifier-2faTokenButton' + accountId + '" msg="option_identifiant_2fatoken_button"></button> \
            </div> \
        </div> \
    </fieldset>').appendTo('#identifier' + accountId);

    $('<fieldset class="options"> \
        <legend> \
            <label class="section" msg="option_identifiant_server_caption"></label> \
        </legend> \
        <div class="subOptions"> \
            <div> \
                <div msg="option_identifiant_urlwebservice_label" msgtemplate="%MSG% : " style="width:200px;float:left;"></div> \
                <input id="zimbra_mail_notifier-textboxUrlWebService' + accountId + '" type="text" pref="userServer' + accountId + '" msgtitle="option_identifiant_urlwebservice_tooltip" style="width:300px"></input> \
            </div> \
            <div> \
                <div msg="option_identifiant_urlwebinterface_label" msgtemplate="%MSG% : " style="width:200px;float:left;"></div><input id="zimbra_mail_notifier-textboxUrlWebInterface' + accountId + '" type="text" pref="userUrlWebInteface' + accountId + '" msgtitle="option_identifiant_urlwebinterface_tooltip" style="width:300px"></input> \
            </div> \
        </div> \
    </fieldset>').appendTo('#identifier' + accountId);

    $('<div id="zimbra_mail_notifier-serverError' + accountId + '" class="zimbra_mail_notifier-serverError"></div>').appendTo('#identifier' + accountId);
    $('<div class="actionButtons"> \
        <button id="zimbra_mail_notifier-removeButton' + accountId + '" msg="option_identifiant_remove_button"></button> \
        <button id="zimbra_mail_notifier-connectButton' + accountId + '" msg="option_identifiant_connect_button" style="float:right"></button> \
        <button id="zimbra_mail_notifier-connectCancelButton' + accountId + '" msg="option_identifiant_connectCancel_button" style="float:right"></button> \
        <button id="zimbra_mail_notifier-disconnectButton' + accountId + '" msg="option_identifiant_disconnect_button" style="float:right"></button> \
    </div>').appendTo('#identifier' + accountId);

    $('#zimbra_mail_notifier-removeButton' + accountId).on('click', $.proxy(function() {
       this.remove(controller);
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

    $('#zimbra_mail_notifier-2faTokenButton' + accountId).on('click', $.proxy(function () {
        this.sendTwoFactorToken(controller);
    }, this));
}

/**
 * Call when the window is closed
 *
 * @public
 * @this {Option}
 */
zimbra_notifier_options.release = function() {
    // Disable messaging between scripts
    chrome.runtime.onMessage.removeListener(this.onMessage);
    // clear password if needed
    $(".identifier").each(function () {
        var accountId = $(this).attr("id").replace("identifier", "");
        if (!$("#zimbra_mail_notifier-checkboxSavePassword" + accountId).is(":checked")) {
            zimbra_notifier_options.updatePref("userPassword" + accountId, "");
        }
    });
};

/**
   * Enable scripts to call options functions through messaging
   * @param {Object} message
   * @param {Object} sender
   * @param {Function} callback
   */
zimbra_notifier_options.onMessage = function ({ source, func, args }, sender, callback) {
    if (func !== 'needRefresh') {
        return
    }
    zimbra_notifier_options.refresh(args[0])
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

    $.when($(".tabContent").hide()).done(function() {
        $(".tabContent").eq(contentId).animate({
            opacity: 'show',
            height: 'show'
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
zimbra_notifier_options.refresh = async function(event, forced) {
    var newIdentifierDisplayed = (forced === true);
    // check identifier added
    const controllers = await this.driver('getControllers')
    // check identifier removed
    var identifiersDisplayed = [];
    $(".identifier").each(function() {
        var accountId = $(this).attr("id").replace("identifier", "");
        if (!controllers.some((controller) => controller.accountId === accountId)) {
            $("#identifier" + accountId).remove();
        } else {
            identifiersDisplayed.push(accountId);
        }
    });
    controllers.forEach(function(controller) {
        if(identifiersDisplayed.indexOf(controller.accountId)<0) {
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

                var value = zimbra_notifier_Prefs.getPref(attr);
                if ($(this).attr("type") === "checkbox") {
                    $(this).attr("checked", value && 1);
                } else {
                    $(this).val(value);
                }
                // add event on change
                if(($(this).attr("id").indexOf("zimbra_mail_notifier-textboxLogin")>=0) || ($(this).attr("id").indexOf("zimbra_mail_notifier-optionPassword")>=0) || ($(this).attr("id").indexOf("zimbra_mail_notifier-textboxUrlWebService")>=0)) {
                    // add event on keyup
                    $(this).on('focusout', function() {
                        zimbra_notifier_options.updatePref($(this).attr("pref"), $(this).val());
                        // refresh screen
                        zimbra_notifier_options.refresh();
                    });
                }
                else {
                    $(this).on('change', function() {
                        if ($(this).attr("type") === "checkbox") {
                            zimbra_notifier_options.updatePref($(this).attr("pref"), $(this).is(":checked"));
                        } else {
                            zimbra_notifier_options.updatePref($(this).attr("pref"), $(this).val());
                        }
                    });
                }
            }
        });
        zimbra_notifier_UiUtil.initLocale();
    }
    // Update buttons in interface
    await Promise.all(controllers.map(async function(controller) {
        var accountId = controller.accountId;
        if ($("#zimbra_mail_notifier-textboxLogin" + accountId).val() !== '' && $("#zimbra_mail_notifier-optionPassword" + accountId).val() !== '' && $("#zimbra_mail_notifier-textboxUrlWebService" + accountId).val() !== '') {
            $("#zimbra_mail_notifier-connectButton" + accountId).removeAttr('disabled');
        } else {
            $("#zimbra_mail_notifier-connectButton" + accountId).attr('disabled', 'disabled');
        }
        if (controller.isConnected) {
            $("#zimbra_mail_notifier-connectButton" + accountId).hide();
            $("#zimbra_mail_notifier-disconnectButton" + accountId).show()
            $("#zimbra_mail_notifier-connectCancelButton" + accountId).hide();
            $("#zimbra_mail_notifier-textboxLogin" + accountId).attr('disabled', 'disabled');
            $("#zimbra_mail_notifier-optionPassword" + accountId).attr('disabled', 'disabled');
            $("#zimbra_mail_notifier-textboxUrlWebService" + accountId).attr('disabled', 'disabled');
            $("#zimbra_mail_notifier-option2faToken" + accountId).attr('disabled', 'disabled');
            $("#zimbra_mail_notifier-option2faToken" + accountId).val("");
            $("#zimbra_mail_notifier-2faTokenButton" + accountId).attr('disabled', 'disabled');
        } else if (controller.isConnecting) {
            $("#zimbra_mail_notifier-connectButton" + accountId).hide();
            $("#zimbra_mail_notifier-disconnectButton" + accountId).hide();
            $("#zimbra_mail_notifier-connectCancelButton" + accountId).show()
            $("#zimbra_mail_notifier-textboxLogin" + accountId).attr('disabled', 'disabled');
            $("#zimbra_mail_notifier-optionPassword" + accountId).attr('disabled', 'disabled');
            $("#zimbra_mail_notifier-textboxUrlWebService" + accountId).attr('disabled', 'disabled');
        } else {
            $("#zimbra_mail_notifier-connectButton" + accountId).show()
            $("#zimbra_mail_notifier-disconnectButton" + accountId).hide();
            $("#zimbra_mail_notifier-connectCancelButton" + accountId).hide();
            $("#zimbra_mail_notifier-textboxLogin" + accountId).removeAttr('disabled');
            $("#zimbra_mail_notifier-optionPassword" + accountId).removeAttr('disabled');
            $("#zimbra_mail_notifier-textboxUrlWebService" + accountId).removeAttr('disabled');
        }
        if (controller.needTwoFactorAuth) {
            $("#zimbra_mail_notifier-option2faToken" + accountId).removeAttr('disabled');
            $("#zimbra_mail_notifier-2faTokenButton" + accountId).removeAttr('disabled');
        } else {
            $("#zimbra_mail_notifier-option2faToken" + accountId).attr('disabled', 'disabled');
            $("#zimbra_mail_notifier-option2faToken" + accountId).val("");
            $("#zimbra_mail_notifier-2faTokenButton" + accountId).attr('disabled', 'disabled');
        }
        $("#zimbra_mail_notifier-serverError" + accountId).html(controller.lastErrorMessage);
    }));
};

/**
 * start connection.
 *
 * @private
 * @this {Option}
 * @param {Controller}
 */
zimbra_notifier_options.connect = async function(controller) {
    if (!controller) {
        return
    }
    var accountId = controller.accountId
    // update screen view
    $("#zimbra_mail_notifier-connectButton" + accountId).hide();
    $("#zimbra_mail_notifier-disconnectButton" + accountId).hide();
    $("#zimbra_mail_notifier-connectCancelButton" + accountId).show()
    $("#zimbra_mail_notifier-textboxLogin" + accountId).attr('disabled', 'disabled');
    $("#zimbra_mail_notifier-optionPassword" + accountId).attr('disabled', 'disabled');
    $("#zimbra_mail_notifier-textboxUrlWebService" + accountId).attr('disabled', 'disabled');
    $("#zimbra_mail_notifier-serverError" + accountId).val("");

    // initialize connection
    await this.driver('initializeConnection', controller.id, $("#zimbra_mail_notifier-optionPassword" + accountId).val());
};

/**
 * send two factor token.
 *
 * @private
 * @this {Option}
 * @param {Controller}
 * @return {Promise}
 */
zimbra_notifier_options.sendTwoFactorToken = async function (controller) {
    if (!controller) {
        return
    }
    const accountId = controller.accountId
    const token = $("#zimbra_mail_notifier-option2faToken" + accountId).val()
    if (token) {
        await this.driver('sendTwoFactorToken', controller.id, token);
    }
};

/**
 * disconnection.
 *
 * @private
 * @this {Option}
 * @param {zimbra_notifier_Controller} controller
 * @return {Promise}
 */
zimbra_notifier_options.disconnect = async function(controller) {
    if (!controller) {
        return
    }
    await this.driver('closeConnection', controller.id);
};

/**
 * remove.
 *
 * @private
 * @this {Option}
 * @param {zimbra_notifier_Controller} controller
 * @return {Promise}
 */
zimbra_notifier_options.remove = async function (controller) {
    if (!controller) {
        return
    }
    await this.driver('removeController', controller.id);
};

/**
 * updatePref.
 *
 * @private
 * @this {Option}
 * @param {String} key
 * @param {Any} val
 * @return {Promise}
 */
zimbra_notifier_options.updatePref = async function (key, val) {
    await this.driver('updatePref', key, val);
};

/**
 * driver
 * @this {Option}
 * @param {func}
 * @param {args}
 * @return {Promise}
 */
zimbra_notifier_options.driver = function (func, ...args) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
            {
                source: 'options.js',
                func,
                args: args ? (Array.isArray(args) ? args : [args]) : [],
            },
            (response) => {
                chrome.runtime.lastError
                    ? reject(chrome.runtime.lastError)
                    : resolve(response)
            }
        )
    })
};

/**
 * add event listener to notify when content is loaded
 */
document.addEventListener('DOMContentLoaded', async function() {
    zimbra_notifier_Prefs.init(() => {
        zimbra_notifier_options.init();
    })
});

/**
 * add event listener to notify when content is unloaded
 */
$(window).on('unload', function() {
    zimbra_notifier_options.release();
});
