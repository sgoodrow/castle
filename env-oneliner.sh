#! /bin/bash
# output all env vars in one line to make it easy to add to dokku
# --> log into dokku server, then `dokku config:set castle-discord-bot` + this output
sed '/^#.*$/d' .env | tr '\n' ' '