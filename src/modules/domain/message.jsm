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

var EXPORTED_SYMBOLS = ["zimbra_notifier_Message"];

/**
 * Creates an instance of Message.
 *
 * @constructor
 * @this {Message}
 *
 * @param {String}
 *            id the message id
 * @param {Number}
 *            timestamp the timestamp message date
 * @param {String}
 *            subject the message subject
 * @param {String}
 *            content the message content
 * @param {String}
 *            senderMail the message sender
 * @param {Number}
 *            nbMail the number of messages
 */
var zimbra_notifier_Message = function(id, timestamp, subject, content, senderMail, mailIdList) {
    this.id = id;
    this.date = new Date(timestamp);
    this.subject = subject;
    this.content = content;
    this.senderEmail = senderMail;
    this.mailIdList = mailIdList;
};

/**
 * Indicate the number of mail in this message list
 *
 * @this {Message}
 * @return {Number} Number of mail in message
 */
zimbra_notifier_Message.prototype.nbMail = function(messageList) {
    return this.mailIdList.length;
};

/**
 * Indicate the number of new mail in message
 *
 * @this {Message}
 * @param {Array}
 *            message list to compare
 * @return {Number} Number of new mail in message
 */
zimbra_notifier_Message.prototype.getNbNewMail = function(messageList) {
    var nbNewMail = this.mailIdList.length;
    // Find this message list inside the old message list
    for ( var index = 0; index < messageList.length; index++) {
        var oldMsg = messageList[index];
        if (oldMsg.id === this.id) {
            // Old message list found, check if new mail were added to mail list
            for (var i = 0; i < this.mailIdList.length; i++) {
                for (var j = 0; j < oldMsg.mailIdList.length; j++) {
                    if (this.mailIdList[i].id === oldMsg.mailIdList[j].id) {
                        nbNewMail--;
                        break;
                    }
                }
            }
            break;
        }
    }
    return nbNewMail;
};
