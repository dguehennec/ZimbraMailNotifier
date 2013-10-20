#Zimbra Mail Notifier (Firefox Addon)

## Description

Zimbra Mail Notifier checks your Zimbra webmail account and notifies the number of unread messages.
When new message arrive in your mailbox, a system notification is posted
You can view your next appointments (save in your Zimbra calendar) and be notified by the system.
Tracking ongoing tasks is also available.

### Currently supports:
All websites using default zimbra login interface (example : https://zimbra.sii.fr, https://zimbra.foncia.net/, https://zimbra.inria.fr/, ...)
And specifique websites : http://zimbra.free.fr and http://zimbra.aliceadsl.fr/

### Not supported yet:
All websites using a pre-authentification interface except http://zimbra.free.fr and http://zimbra.aliceadsl.fr/

### User with Mac OS X:
Don't forget to install Growl (http://growl.info/) to be notify by system notification.

## Usage

	# Maven is used to generate Firefox extension (xpi) of Zimbra Mail Notifier sources.
	# There are 2 profiles (Dev en Prod)
	
	# In Dev mode, just des sources is packaging, use the next command line
	mvn clean install
	
	# In Prod mode, sources is closure, jsDoc is generated and Sonar is executed
	# (it is necessary to have Sonar installed on localhost), use the next command line
	mvn clean install -PProd
	

 

