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

var EXPORTED_SYMBOLS = ["zimbra_notifier_Constant"];
var zimbra_notifier_Constant = {};

/**
 * The version of the extension
 *
 * @constant
 */
zimbra_notifier_Constant.VERSION = 0x020000;

/**
 * Logger level
 *
 * @constant
 */
zimbra_notifier_Constant.LOGGER = {
    LEVEL : 4,
    PRINT_STACK : false,
    PRINT_DATE : true,
    PRINT_DATA_REQUEST : false
};

/**
 * Oberver
 *
 * @constant
 *
 */
zimbra_notifier_Constant.OBSERVER = {
    PREF_SAVED : "zimbra_mail_notifier.pref.saved"
};

/**
 * The string bundle info
 *
 * @constant
 *
 */
zimbra_notifier_Constant.STRING_BUNDLE = {
    DEFAULT_URL : "chrome://zimbra_mail_notifier/locale/zimbra_mail_notifier.properties"
};

/**
 * Notifier
 *
 * @constant
 *
 */
zimbra_notifier_Constant.NOTIFIER = {
    REPEAT_DELAY_MS : 60000
};

/**
 * Session
 *
 * @constant
 *
 */
zimbra_notifier_Constant.SESSION = {
    TOKEN_LIFETIME_EXPIR : 180000
};

/**
 * Service
 *
 * @constant
 *
 */
zimbra_notifier_Constant.SERVICE = {
    CONNECT_BASE_WAIT_AFTER_FAILURE : 20000,
    CONNECT_MAX_WAIT_AFTER_FAILURE : 300000,
    REFRESH_WAIT_AFTER_FAILURE : 10000,
    DELAY_NOTIFY_FIRST_UNREAD : 8000,
    NB_RETRY_QUERY : 3
};

/**
 * WebService
 *
 * @constant
 *
 */
zimbra_notifier_Constant.WEBSERVICE = {
    WAITSET_WATCH_TYPES : 'all',
    COOKIE_KEY_TOKEN : "ZM_AUTH_TOKEN"
};

