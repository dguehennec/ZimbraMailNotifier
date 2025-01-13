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

var EXPORTED_SYMBOLS = ["zimbra_notifier_MailBoxInfo"];

/**
 * Creates an instance of MailBoxInfo.
 *
 * @constructor
 * @this {MailBoxInfo}
 *
 * @param {String}
 *            version
 * @param {Number}
 *            maxSize
 * @param {Number}
 *            used
 */
var zimbra_notifier_MailBoxInfo = function(version, maxSize, used) {
    this.version = version;
    this.setQuotaSize(maxSize);
    this.setQuotaUsed(used);
};

/**
 * Set the current used quota
 *
 * @this {MailBoxInfo}
 * @param {Number}
 *            used  The quota used in bytes
 */
zimbra_notifier_MailBoxInfo.prototype.setQuotaUsed = function(used) {
    this.quotaUsed = used;
    if (used > 0) {
        this.quotaUsedString = zimbra_notifier_Util.convertBytesToStringValue(used);
    }
    else {
        this.quotaUsedString = null;
    }
    this.setPercentageQuotaUsed()
};

/**
 * Set the quota of the mailbox
 *
 * @this {MailBoxInfo}
 * @param {Number}
 *            maxSize  The quota in bytes
 */
zimbra_notifier_MailBoxInfo.prototype.setQuotaSize = function(maxSize) {
    this.quotaSize = maxSize;
    if (maxSize > 0) {
        this.quotaSizeString = zimbra_notifier_Util.convertBytesToStringValue(maxSize);
    }
    else {
        this.quotaSizeString = null;
    }
    this.setPercentageQuotaUsed()
};

/**
 * Indicate the percentage size used on the mailbox
 *
 * @this {MailBoxInfo}
 * @return {String} percentage quota
 */
zimbra_notifier_MailBoxInfo.prototype.setPercentageQuotaUsed = function() {
    if (this.quotaSize > 0) {
        var perc = ((this.quotaUsed ?? 0) * 100) / this.quotaSize;
        this.percentageQuotaUsedString = perc.toFixed(1);
    } else {
        this.percentageQuotaUsedString = null;
    }
};

/**
 * Freeze the interface
 */
Object.freeze(zimbra_notifier_MailBoxInfo);
