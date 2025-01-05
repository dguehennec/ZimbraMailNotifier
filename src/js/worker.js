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

/* globals chrome, importScripts */

importScripts(chrome.runtime.getURL('modules/service/util.js'))
importScripts(chrome.runtime.getURL('modules/constant/zimbrahelper.js'))

importScripts(chrome.runtime.getURL('modules/domain/calevent.js'))
importScripts(chrome.runtime.getURL('modules/domain/mailboxinfo.js'))
importScripts(chrome.runtime.getURL('modules/domain/message.js'))
importScripts(chrome.runtime.getURL('modules/domain/session.js'))
importScripts(chrome.runtime.getURL('modules/domain/task.js'))

importScripts(chrome.runtime.getURL('modules/service/logger.js'))
importScripts(chrome.runtime.getURL('modules/service/browser.js'))
importScripts(chrome.runtime.getURL('modules/service/prefs.js'))
importScripts(chrome.runtime.getURL('modules/service/infoerror.js'))
importScripts(chrome.runtime.getURL('modules/service/notifier.js'))
importScripts(chrome.runtime.getURL('modules/service/request.js'))
importScripts(chrome.runtime.getURL('modules/service/webservices.js'))
importScripts(chrome.runtime.getURL('modules/service/aes.js'))

importScripts(chrome.runtime.getURL('modules/controller/service.js'))
importScripts(chrome.runtime.getURL('modules/controller/controller.js'))
importScripts(chrome.runtime.getURL('modules/controller/supercontroller.js'))

importScripts(chrome.runtime.getURL('js/background.js'))
