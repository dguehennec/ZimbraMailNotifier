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

var EXPORTED_SYMBOLS = ["zimbra_notifier_Conversation", "zimbra_notifier_MessageManager"];

/**
 * Creates an instance of Conversation.
 *
 * @constructor
 * @this {Conversation}
 *
 * @param {String}
 *            convId the conversation id
 * @param {Number}
 *            timestamp the timestamp message date
 * @param {String}
 *            subject the message subject
 * @param {String}
 *            content the message content
 * @param {String}
 *            senderMail the message sender
 * @param {String}
 *            mailIdList the message id list
 */
var zimbra_notifier_Conversation = function(convId, timestamp, subject, content, senderMail, mailIdList) {
    this.convId = convId;
    this.date = new Date(timestamp);
    this.subject = subject;
    this.content = content;
    this.senderEmail = senderMail;
    this.mailIdList = mailIdList;
};

/**
 * Creates an instance of MessageManager.
 * Used to detect new unread message
 *
 * @constructor
 * @this {MessageManager}
 */
var zimbra_notifier_MessageManager = function() {
    this._oldNbMessages = 0;
    this._nbMessages = 0;
    this._tmpNbMessages = 0;

    this._listConversations = [];
    this._tmpListConversations = [];

    this._mapMsgId2ConvId = {};
    this._tmpMapMsgId2ConvId = {};

    this._mapConvId2IdxList = {};
    this._tmpMapConvId2IdxList = {};
};

/**
 * Get the current number of messages
 *
 * @this {MessageManager}
 *
 * @return {Number} Number of messages
 */
zimbra_notifier_MessageManager.prototype.nbMessages = function() {
    return this._nbMessages;
};

/**
 * End of adding messages
 *
 * @this {MessageManager}
 *
 * @return {Number} Number of new message since the last call
 */
zimbra_notifier_MessageManager.prototype.endAddingMessages = function() {
    // Get the number of new messages since the last call
    var diff = this._nbMessages - this._oldNbMessages;
    this._oldNbMessages = this._nbMessages;
    this._nbMessages = this._tmpNbMessages;
    this._tmpNbMessages = 0;

    // Update the list of message from the temporary list...
    this._listConversations = this._tmpListConversations;
    this._tmpListConversations = [];
    this._mapMsgId2ConvId = this._tmpMapMsgId2ConvId;
    this._tmpMapMsgId2ConvId = {};
    this._mapConvId2IdxList = this._tmpMapConvId2IdxList;
    this._tmpMapConvId2IdxList = {};

    return diff;
};

/**
 * Add the message and indicate the number of new messages
 *
 * @this {MessageManager}
 *
 * @param {Conversation}
 *            conv  The conversation to add
 * @return {Number} Number of new mail
 */
zimbra_notifier_MessageManager.prototype.addConversation = function(conv) {
    var nbNewMsg = 0;

    // For each message of the conversation
    for (var idxMail = 0; idxMail < conv.mailIdList.length; ++idxMail) {
        var msgId = conv.mailIdList[idxMail];

        // First check if the message doesn't already exist in temporary list
        if (this._tmpMapMsgId2ConvId[msgId] !== conv.convId) {

            // Add the message to the map msg id -> conv id
            this._tmpMapMsgId2ConvId[msgId] = conv.convId;

            // Check if the message is in the old list
            if (this._mapMsgId2ConvId[msgId] !== conv.convId) {
                nbNewMsg++;
                this._nbMessages++;
            }
            this._tmpNbMessages++;
        }

        // Update or add the conversation info
        var idxConv = this._tmpMapConvId2IdxList[conv.convId];
        if (idxConv >= 0) {
            this._tmpListConversations[idxConv] = conv;
        }
        else {
            this._tmpMapConvId2IdxList[conv.convId] = this._tmpListConversations.length;
            this._tmpListConversations.push(conv);
        }
    }

    return nbNewMsg;
};
