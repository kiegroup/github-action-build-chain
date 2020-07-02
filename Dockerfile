FROM node:11-alpine

LABEL "com.github.actions.name"="Build Chain"
LABEL "com.github.actions.description"="It chains actions"
LABEL "com.github.actions.author"="ginxo"
LABEL "com.github.actions.icon"="link"
LABEL "com.github.actions.color"="purple"

RUN apk add --no-cache git openssl

COPY . /tmp/src/

RUN yarn global add "file:/tmp/src" && rm -rf /tmp/src

ENTRYPOINT [ "buid-chain" ]
