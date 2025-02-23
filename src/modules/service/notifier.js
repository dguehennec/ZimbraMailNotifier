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
 * Creates an instance of zimbra_notifier_Notifier.
 *
 * @constructor
 *
 * @this {Notifier}
 *
 * @param {CalEvent}
 *            event the event
 * @param {Number}
 *            timeConf the time configuration
 * @param {Number}
 *            nbRepeat the number of repeat
 * @param {Boolean}
 *            withSoundNotification indicate if sound is enable
 * @param {Boolean}
 *            withSystemNotification indicate if system notification is enable
 * @param {Object}
 *            parent
 */
var zimbra_notifier_Notifier = function (
    event,
    timeConf,
    nbRepeat,
    withSoundNotification,
    withSystemNotification,
    parent,
) {
    this._event = event;
    this._timeConf = timeConf;
    this._nbRepeat = nbRepeat;
    this._currentTimer = null;
    this._withSoundNotification = withSoundNotification;
    this._withSystemNotification = withSystemNotification;
    this._accountId = parent._accountId;
    this._parent = parent;
    this.start();
};

/**
 * start notifier.
 *
 * @this {Notifier}
 */
zimbra_notifier_Notifier.prototype.start = function () {
    var diff = this._event.startDate.getTime() - new Date().getTime();
    if (this._timeConf >= 0) {
        diff -= this._timeConf * 60 * 1000;
    } else {
        diff -= this._event.timeConf * 60 * 1000;
    }
    this.stop();
    if (diff >= 0 && diff < 0x3fffffff) {
        this._planNotify(diff);
    }
};

/**
 * stop notifier.
 *
 * @this {Notifier}
 */
zimbra_notifier_Notifier.prototype.stop = function () {
    if (this._currentTimer) {
        clearTimeout(this._currentTimer);
        this._currentTimer = null;
    }
};

/**
 * notify the event.
 *
 * @private
 * @this {Notifier}
 */
zimbra_notifier_Notifier.prototype._notify = function () {
    this.stop();

    var alias = '';
    // display account alias if more than one accounts
    if (zimbra_notifier_Prefs.getAccounts().length > 1) {
        alias = '(' + zimbra_notifier_Prefs.getUserAlias(this._accountId) + ')';
    }

    if (this._withSoundNotification) {
        var selected = zimbra_notifier_Prefs.getCalendarSoundSelected();
        var customSound = zimbra_notifier_Prefs.getCalendarSoundCustom();
        var volumeSound = zimbra_notifier_Prefs.getCalendarSoundVolume();
        this._parent.event(zimbra_notifier_SERVICE_EVENT.NEED_PLAY_SOUND, {
            selected,
            customSound,
            volumeSound,
        });
    }
    if (this._withSystemNotification) {
        zimbra_notifier_Util.showNotification(
            this._event.startDate.toLocaleString(),
            zimbra_notifier_Util
                .getBundleString('connector.notification.event')
                .replace('%ACCOUNT%', alias) + this._event.name,
            8000,
            null,
            null,
        );
    }
    if (this._nbRepeat > 0) {
        this._nbRepeat--;
        this._planNotify(zimbra_notifier_Constant.NOTIFIER.REPEAT_DELAY_MS);
    }
};

/**
 * Plan to run the notify function later
 *
 * @private
 * @this {Notifier}
 */
zimbra_notifier_Notifier.prototype._planNotify = function (delay) {
    var object = this;
    this._currentTimer = zimbra_notifier_Util.setTimer(
        this._currentTimer,
        function () {
            object._notify();
        },
        delay,
    );
};

/**
 * update notifier.
 *
 * @this {Notifier}
 *
 * @param {Object}
 *            event the new event
 * @param {Number}
 *            timeConf the time configuration
 * @param {Number}
 *            nbRepeat the number of repeat
 * @param {Boolean}
 *            withSoundNotification indicate if sound is enable
 * @param {Boolean}
 *            withSystemNotification indicate if system notification is enable
 */
zimbra_notifier_Notifier.prototype.update = function (
    event,
    timeConf,
    nbRepeat,
    withSoundNotification,
    withSystemNotification,
) {
    this._withSoundNotification = withSoundNotification;
    this._withSystemNotification = withSystemNotification;

    if (this._nbRepeat > nbRepeat) {
        this._nbRepeat = nbRepeat;
    }
    var changed = false;
    if (
        this._timeConf !== timeConf ||
        this._event.startDate.getTime() !== event.startDate.getTime()
    ) {
        changed = true;
    }

    this._event = event;
    this._timeConf = timeConf;
    if (changed) {
        this._nbRepeat = nbRepeat;
        this.start();
    }
};

/**
 * Freeze the interface
 */
Object.freeze(zimbra_notifier_Notifier);
