FROM openjdk:8

RUN echo "Building build-chain docker image"

LABEL "com.github.actions.name"="Build Chain"
LABEL "com.github.actions.description"="It chains actions"
LABEL "com.github.actions.author"="ginxo"
LABEL "com.github.actions.icon"="link"
LABEL "com.github.actions.color"="purple"
ARG MAVEN_VERSION=3.6.3
ARG SHA=c35a1803a6e70a126e80b2b3ae33eed961f83ed74d18fcd16909b2d44d7dada3203f1ffe726c17ef8dcca2dcaa9fca676987befeadc9b9f759967a8cb77181c0
ARG BASE_URL=https://apache.osuosl.org/maven/maven-3/${MAVEN_VERSION}/binaries

RUN apt-get update \
  && apt-get install git openssl curl tar bash procps gnupg

# Install Node & yarn
RUN echo "Installing Nodejs and Yarn"

USER root
RUN curl -sL https://deb.nodesource.com/setup_12.x  | bash - \
  && apt-get -y install nodejs \
  && npm install -g yarn

COPY . /tmp/src/
RUN yarn global add "file:/tmp/src" && rm -rf /tmp/src

# Install Maven
RUN echo "Installing Maven"
RUN mkdir -p /usr/share/maven /usr/share/maven/ref \
  && echo "Downloading maven" \
  && curl -fsSL -o /tmp/apache-maven.tar.gz ${BASE_URL}/apache-maven-${MAVEN_VERSION}-bin.tar.gz \
  \
  && echo "Checking download hash" \
  && echo "${SHA}  /tmp/apache-maven.tar.gz" | sha512sum -c - \
  \
  && echo "Unziping maven" \
  && tar -xzf /tmp/apache-maven.tar.gz -C /usr/share/maven --strip-components=1 \
  \
  && echo "Cleaning and setting links" \
  && rm -f /tmp/apache-maven.tar.gz \
  && ln -s /usr/share/maven/bin/mvn /usr/bin/mvn

ENV MAVEN_HOME /usr/share/maven \
  && MAVEN_CONFIG "$USER_HOME_DIR/.m2"

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

ENTRYPOINT [ "build-chain-action" ]