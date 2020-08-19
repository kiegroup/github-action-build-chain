FROM python:3.8.5-slim-buster

RUN echo "Building build-chain docker image"

LABEL "com.github.actions.name"="Build Chain"
LABEL "com.github.actions.description"="It chains actions"
LABEL "com.github.actions.author"="ginxo"
LABEL "com.github.actions.icon"="link"
LABEL "com.github.actions.color"="purple"

# Install required packages
RUN apt-get update \
  && apt-get -y --no-install-recommends install gcc libkrb5-dev gnupg2 apt-utils build-essential rsync  

# Install pip packages
RUN pip3 install gssapi cekit behave lxml docker docker-squash odcs[client] elementPath pyyaml ruamel.yaml python-dateutil

# Install docker
RUN echo "Installing Docker"
USER root
RUN apt-get update && \
  apt-get install -y --no-install-recommends \
  apt-transport-https \
  ca-certificates \
  curl \
  gnupg-agent \
  software-properties-common \
  && curl -fsSL https://download.docker.com/linux/debian/gpg | apt-key add - \
  && add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/debian $(lsb_release -cs) stable" \
  && apt-get update \
  && apt-get install -y docker-ce docker-ce-cli containerd.io --no-install-recommends

# Install s2i
RUN curl -L https://github.com/openshift/source-to-image/releases/download/v1.3.0/source-to-image-v1.3.0-eed2850f-linux-amd64.tar.gz -o /tmp/s2i.tar.gz\
  && mkdir -p /tmp/s2i \
  && tar -zxvf /tmp/s2i.tar.gz -C /tmp/s2i \
  && mv /tmp/s2i/* /bin

# Installing required packages for build-chain
RUN apt-get update \
  && apt-get -y --no-install-recommends  install git openssl curl tar bash procps gnupg

# Install Node & yarn
RUN echo "Installing Nodejs and Yarn"

USER root
RUN curl -sL https://deb.nodesource.com/setup_12.x  | bash - \
  && apt-get -y install nodejs \
  && npm install -g yarn

COPY . /tmp/src/
RUN yarn global add "file:/tmp/src" && rm -rf /tmp/src

ENTRYPOINT [ "build-chain-action" ]
