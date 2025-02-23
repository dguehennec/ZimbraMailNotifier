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

'use strict';

/**
 * Creates a global instance of zimbra_notifier_UiUtil
 *
 * @constructor
 * @this {UiUtil}
 *
 */
var zimbra_notifier_UiUtil = {};

/**
 * Initialize locale in html page
 *
 * @public
 * @this {UiUtil}
 */
zimbra_notifier_UiUtil.initLocale = function () {
    $('*').each(function () {
        var attr = $(this).attr('msg');
        if (attr) {
            var attrTemplate = $(this).attr('msgtemplate');
            if (attrTemplate) {
                $(this).text(attrTemplate.replace('%MSG%', chrome.i18n.getMessage(attr)));
            } else {
                $(this).text(chrome.i18n.getMessage(attr));
            }
        }
        attr = $(this).attr('msgtitle');
        if (attr) {
            $(this).attr('title', chrome.i18n.getMessage(attr));
        }
        attr = $(this).attr('msgsrc');
        if (attr) {
            $(this).attr('src', chrome.i18n.getMessage(attr));
        }
        attr = $(this).attr('msgvalue');
        if (attr) {
            $(this).attr('value', chrome.i18n.getMessage(attr));
        }
        attr = $(this).attr('msgplaceholder');
        if (attr) {
            $(this).attr('placeholder', chrome.i18n.getMessage(attr));
        }
    });
};

/**
 * play sound
 *
 * @return {Boolean} true if success
 */
zimbra_notifier_UiUtil.playSound = function (selected, customSound, volume) {
    var sound = './skin/ding.ogg';
    switch (selected) {
        case 1:
            break;
        case 2:
            sound = './skin/ping.ogg';
            break;
        case 3:
            sound = './skin/heal.ogg';
            break;
        case 4:
            sound = './skin/drain.ogg';
            break;
        case 5:
            if (customSound) {
                sound = customSound;
            }
            break;
        default:
            return false;
    }
    var audio = new Audio(sound);
    audio.volume = parseInt(volume) / 100;
    audio.play();
    return true;
};

/**
 * Option select tab
 *
 * @constant
 *
 */
zimbra_notifier_UiUtil.OPTION_SELECT_TAB = {
    GENERAL: 0,
    MESSAGE: 1,
    CALENDAR: 2,
    TASK: 3,
    IDENTIFICATION: 4,
};

/**
 * Add event listener to notify when content is loaded
 */
document.addEventListener('DOMContentLoaded', function () {
    zimbra_notifier_UiUtil.initLocale();
});
