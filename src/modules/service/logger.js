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

var EXPORTED_SYMBOLS = ["zimbra_notifier_Logger"];

/**
 * Creates an instance of logger.
 *
 * @constructor
 * @this {Logger}
 *
 */
var zimbra_notifier_Logger = function(name) {
    this._name = name;
};

/**
 * generate error trace.
 *
 * @this {Logger}
 * @param {String}
 *            message message of the trace
 */
zimbra_notifier_Logger.prototype.error = function(message) {
    if (zimbra_notifier_Constant.LOGGER.LEVEL > 0) {
        this._printStack();
        console.error(this._getStrDate() + "ERROR in " + this._name + " : " + message + "\n");
    }
};

/**
 * generate warning trace.
 *
 * @this {Logger}
 * @param {String}
 *            message message of the trace
 */
zimbra_notifier_Logger.prototype.warning = function(message) {
    if (zimbra_notifier_Constant.LOGGER.LEVEL > 1) {
        this._printStack();
        console.warn(this._getStrDate() + "WARNING in " + this._name + " : " + message + "\n");
    }
};

/**
 * generate info trace.
 *
 * @this {Logger}
 * @param {String}
 *            message message of the trace
 */
zimbra_notifier_Logger.prototype.info = function(message) {
    if (zimbra_notifier_Constant.LOGGER.LEVEL > 2) {
        this._printStack();
        console.info(this._getStrDate() + "INFO in " + this._name + " : " + message + "\n");
    }
};

/**
 * generate trace trace.
 *
 * @this {Logger}
 * @param {String}
 *            message message of the trace
 */
zimbra_notifier_Logger.prototype.trace = function(message) {
    if (zimbra_notifier_Constant.LOGGER.LEVEL > 3) {
        this._printStack();
        console.log(this._getStrDate() + "TRACE in " + this._name + " : " + message + "\n");
    }
};

/**
 * generate error trace and conditionally display the data of the request
 *
 * @this {Logger}
 * @param {String}
 *            message message of the trace
 * @param {String}
 *            data The request data to display conditionally
 */
zimbra_notifier_Logger.prototype.errorReqData = function(message, data) {
    if (zimbra_notifier_Constant.LOGGER.PRINT_DATA_REQUEST) {
        this.error(message + " ->\n" + data + "\n");
    }
    else {
        this.error(message);
    }
};

/**
 * generate warning trace and conditionally display the data of the request
 *
 * @this {Logger}
 * @param {String}
 *            message message of the trace
 * @param {String}
 *            data The request data to display conditionally
 */
zimbra_notifier_Logger.prototype.warningReqData = function(message, data) {
    if (zimbra_notifier_Constant.LOGGER.PRINT_DATA_REQUEST) {
        this.warning(message + " ->\n" + data + "\n");
    }
    else {
        this.warning(message);
    }
};

/**
 * generate trace trace and conditionally display the data of the request
 *
 * @this {Logger}
 * @param {String}
 *            message message of the trace
 * @param {String}
 *            data The request data to display conditionally
 */
zimbra_notifier_Logger.prototype.traceReqData = function(message, data) {
    if (zimbra_notifier_Constant.LOGGER.PRINT_DATA_REQUEST) {
        this.trace(message + " ->\n" + data + "\n");
    }
    else {
        this.trace(message);
    }
};



/**
 * Print the stack trace
 *
 * @private
 * @this {Logger}
 */
zimbra_notifier_Logger.prototype._printStack = function() {
    if (zimbra_notifier_Constant.LOGGER.PRINT_STACK === true) {
        try {
            throw Error('');
        } catch(err) {
            var stack = err.stack.split("\n").slice(2).join("\n");
            console.log("--------\n" + stack + "--------\n");
        }
    }
};

/**
 * Get date to print
 *
 * @private
 * @this {Logger}
 */
zimbra_notifier_Logger.prototype._getStrDate = function() {
    if (zimbra_notifier_Constant.LOGGER.PRINT_DATE === true) {
        var date = new Date();
        var h = date.getHours();
        var m = date.getMinutes();
        var s = date.getSeconds();
        var ms = date.getMilliseconds();
        return "[" + ((h < 10) ? "0" + h : h) + ":" +
                     ((m < 10) ? "0" + m : m) + ":" +
                     ((s < 10) ? "0" + s : s) + "." +
                     ((ms < 10) ? "00" + ms : ((ms < 100) ? "0" + ms : ms)) + "] ";
    }
    return '';
};

/**
 * Freeze the interface
 */
Object.freeze(zimbra_notifier_Logger);
