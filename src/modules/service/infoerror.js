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
 * Benjamin ROBIN
 * Portions created by the Initial Developer are Copyright (C) 2013
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
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
 * Creates an instance of ReqInfoError.
 *
 * @constructor
 * @this {ReqInfoError}
 * @param {String}
 *            reqType the type of the request.
 * @param {Number}
 *            reqStatus the error code of the request
 */
var zimbra_notifier_ReqInfoError = function (reqType, reqStatus) {
    this.requestType = reqType;
    this.lastReqStatus = reqStatus;
    this.nbTotalFail = 1;
    this.nbLoopFail = 1;
    this.dateLastFail = new Date();
};

/**
 * Dump the contents of the error
 *
 * @this {ReqInfoError}
 * @return The human representation of the error
 */
zimbra_notifier_ReqInfoError.prototype.toString = function () {
    return (
        '{' +
        this.requestType +
        ', status:' +
        this.lastReqStatus +
        ', loop:' +
        this.nbLoopFail +
        ', total:' +
        this.nbTotalFail +
        ', date:' +
        this.dateLastFail.toTimeString() +
        '}'
    );
};

/**
 * Creates an instance of InfoErrors.
 *
 * @constructor
 * @this {InfoErrors}
 */
var zimbra_notifier_InfoErrors = function () {
    this._lstReqInfoErr = [];
};

/**
 * Increment the error counter of the specified request
 *
 * @this {InfoErrors}
 * @param {String}
 *            reqType the type of the request.
 * @param {Number}
 *            reqStatus the error code of the request
 */
zimbra_notifier_InfoErrors.prototype.addError = function (reqType, reqStatus) {
    var reqInfo = null;

    // Get a reference of the request info error and remove it from the array
    for (var idx = 0; idx < this._lstReqInfoErr.length; idx++) {
        if (this._lstReqInfoErr[idx].requestType === reqType) {
            reqInfo = this._lstReqInfoErr[idx];
            this._lstReqInfoErr.splice(idx, 1);
            break;
        }
    }
    // Update request info data
    if (reqInfo !== null) {
        reqInfo.nbTotalFail += 1;
        reqInfo.nbLoopFail += 1;
        reqInfo.dateLastFail = new Date();
        reqInfo.lastReqStatus = reqStatus;
    } else {
        reqInfo = new zimbra_notifier_ReqInfoError(reqType, reqStatus);
    }
    // Add the error to the front
    this._lstReqInfoErr.unshift(reqInfo);
};

/**
 * Reset the loop error counter of the specified request
 *
 * @this {InfoErrors}
 * @param {String}
 *            reqType the type of the request
 */
zimbra_notifier_InfoErrors.prototype.resetLoopErrorCounter = function (reqType) {
    for (var idx = 0; idx < this._lstReqInfoErr.length; idx++) {
        var reqInfo = this._lstReqInfoErr[idx];
        if (reqInfo.requestType === reqType) {
            reqInfo.nbLoopFail = 0;
            break;
        }
    }
};

/**
 * Get the loop error counter of the specified request
 *
 * @this {InfoErrors}
 * @param {String}
 *            reqType the type of the request
 *
 * @return {Number} The loop counter, 0 if does not exist
 */
zimbra_notifier_InfoErrors.prototype.getLoopErrorCounter = function (reqType) {
    for (var idx = 0; idx < this._lstReqInfoErr.length; idx++) {
        var reqInfo = this._lstReqInfoErr[idx];
        if (reqInfo.requestType === reqType) {
            return reqInfo.nbLoopFail;
        }
    }
    return 0;
};

/**
 * Clear the errors of the specified request
 *
 * @this {InfoErrors}
 * @param {String}
 *            reqType the type of the request
 */
zimbra_notifier_InfoErrors.prototype.clearError = function (reqType) {
    for (var idx = 0; idx < this._lstReqInfoErr.length; idx++) {
        if (this._lstReqInfoErr[idx].requestType === reqType) {
            this._lstReqInfoErr.splice(idx, 1);
            break;
        }
    }
};

/**
 * Clear the errors of all requests
 *
 * @this {InfoErrors}
 */
zimbra_notifier_InfoErrors.prototype.clearAllErrors = function () {
    this._lstReqInfoErr = [];
};

/**
 * Get the information about the last error
 *
 * @this {InfoErrors}
 * @return {ReqInfoError} The information about the error
 */
zimbra_notifier_InfoErrors.prototype.getLastError = function () {
    if (this._lstReqInfoErr.length > 0) {
        return this._lstReqInfoErr[0];
    }
    return null;
};

/**
 * Get the number of errors
 *
 * @this {InfoErrors}
 * @return {Number}
 */
zimbra_notifier_InfoErrors.prototype.getNbErrors = function () {
    return this._lstReqInfoErr.length;
};

/**
 * Dump the errors
 *
 * @this {InfoErrors}
 * @return The human representation of the error
 */
zimbra_notifier_InfoErrors.prototype.toString = function () {
    if (this._lstReqInfoErr.length > 0) {
        var txt = 'errors:[ ' + this._lstReqInfoErr[0].toString();

        for (var idx = 1; idx < this._lstReqInfoErr.length; idx++) {
            txt += ',\n    ' + this._lstReqInfoErr[idx].toString();
        }
        return txt + ' ]';
    }
    return 'errors:null';
};

/**
 * Freeze the interface
 */
Object.freeze(zimbra_notifier_InfoErrors);
