#Zimbra Mail Notifier (Chrome, Firefox, Opera and Safari Addon)

## Description

Zimbra Mail Notifier checks your Zimbra webmail account and notifies the number of unread messages.
When new message arrive in your mailbox, a system notification is posted
You can view your next appointments (save in your Zimbra calendar) and be notified by the system.
Tracking ongoing tasks is also available.

### Currently supports:
All websites using default zimbra login interface

### Not supported yet:
All websites using a pre-authentification interface (example: http://zimbra.free.fr)

## Usage

	# Maven is used to generate Chrome, Firefox, Opera and Safari extension of Zimbra Mail Notifier sources.
	# There are 2 profiles (Dev en Prod)
	
	# In Dev mode, just des sources is packaging, use the next command line
	mvn clean install
	
	# In Prod mode, jsDoc is generated in addition of the Dev mode, use the next command line
	mvn clean install -PProd
