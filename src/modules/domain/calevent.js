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

var EXPORTED_SYMBOLS = ["zimbra_notifier_CalEvent"];

/**
 * Creates an instance of CalEvent.
 *
 * @constructor
 * @this {CalEvent}
 *
 * @param {String}
 *            id the message id
 * @param {String}
 *            name the event name
 * @param {Number}
 *            timestamp the timestamp event start date
 * @param {Number}
 *            duration the duration
 * @param {Number}
 *            timeConf the time configuration
 */
var zimbra_notifier_CalEvent = function(id, name, timestamp, duration, timeConf) {
    this.id = id;
    this.name = name;
    this.startDate = new Date(timestamp);
    this.endDate = new Date(timestamp + duration);
    this.duration = duration;
    this.timeConf = timeConf;
    this.notifier = null;
    this.startWeek = this.weekDate(this.startDate);
};


/**
 * Indicate the week date / Week number of the specified date
 * @see http://en.wikipedia.org/wiki/ISO_week_date
 *
 * @this {CalEvent}
 * @param {Date}
 *            date The date
 * @return {Number} Week number
 */
zimbra_notifier_CalEvent.prototype.weekDate = function(date) {
    // If we are in december, this is possible that we are in W1 of the next year
    if (date.getMonth() === 11) {
        var dateW1NextY = this.dateBeginW1(date.getFullYear() + 1);
        if (date >= dateW1NextY) {
            // We are in the first week of the next year
            return 1;
        }
    }
    // General case
    var dateW1 = this.dateBeginW1(date.getFullYear());
    var diffDays = Math.floor((date.getTime() - dateW1.getTime()) / 86400000);
    return Math.floor(diffDays / 7) + 1;
};

/**
 * Find the date corresponding of the first day of W1
 *
 * @this {CalEvent}
 * @param {Number}
 *            year  The year
 * @return {Date} The date of the first day of W1
 */
zimbra_notifier_CalEvent.prototype.dateBeginW1 = function(year) {
    var dateDay4 = new Date(year, 0, 4, 0, 0, 0, 0);
    return new Date(dateDay4.getTime() - (dateDay4.getDay() * 86400000));
};

/**
 * Freeze the interface
 */
Object.freeze(zimbra_notifier_CalEvent);
