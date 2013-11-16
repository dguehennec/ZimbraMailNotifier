#!/bin/bash

cd "$1"

referenceFile=$(mktemp)
grep -Eo "ENTITY [a-zA-Z\.]+ " en-US/zimbra_mail_notifier.dtd | sed -r "s/(ENTITY| )//g" > "$referenceFile"

ls -1 */zimbra_mail_notifier.dtd | while read file ; do 
    tmpFile=$(mktemp)
    grep -Eo "ENTITY [a-zA-Z\.]+ " "$file" | sed -r "s/(ENTITY| )//g" > "$tmpFile"
    echo "**** $file ****"
    diff "$referenceFile" "$tmpFile"
    rm "$tmpFile"
done

rm "$referenceFile"

echo " === "

referenceFile=$(mktemp)
grep -Eo "^[a-zA-Z\.]+=" en-US/zimbra_mail_notifier.properties > "$referenceFile"

ls -1 */zimbra_mail_notifier.properties | while read file ; do 
    tmpFile=$(mktemp)
    grep -Eo "^[a-zA-Z\.]+=" "$file" > "$tmpFile"
    echo "**** $file ****"
    diff "$referenceFile" "$tmpFile"
    rm "$tmpFile"
done

rm "$referenceFile"
