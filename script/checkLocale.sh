#!/bin/bash

cd "$1"

referenceFile=$(mktemp)
grep -Eo "\"[a-zA-Z\._]+\": {" en/messages.json | sed -r "s/(\"|:|\{| )//g" > "$referenceFile"

ls -1 */messages.json | while read file ; do 
    tmpFile=$(mktemp)
    grep -Eo "\"[a-zA-Z\._]+\": {" "$file" | sed -r "s/(\"|:|\{| )//g" > "$tmpFile"
    echo "**** $file ****"
    diff "$referenceFile" "$tmpFile"
    rm "$tmpFile"
done

rm "$referenceFile"
