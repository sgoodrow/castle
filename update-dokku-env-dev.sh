#! /bin/bash

# update castle-discord-bot config from a local .env file.

echo "Updating castlebot-dev config at dokku@172.105.106.208."

FILE="$1"

if [ ! -f "$file" ]; then
    read -p "Please specify a .env file to use: " NEW_FILE
    FILE="$NEW_FILE"
fi

echo "Setting config from $FILE ..."

ONELINER=$(sed '/^#.*$/d' $FILE | tr '\n' ' ')

ssh -t dokku@172.105.106.208 "config:set castlebot-dev $ONELINER"