FROM openjdk:8

LABEL "com.github.actions.name"="Build Chain"
LABEL "com.github.actions.description"="It chains actions"
LABEL "com.github.actions.author"="ginxo"
LABEL "com.github.actions.icon"="link"
LABEL "com.github.actions.color"="purple"
ARG MAVEN_VERSION=3.6.3
ARG SHA=c35a1803a6e70a126e80b2b3ae33eed961f83ed74d18fcd16909b2d44d7dada3203f1ffe726c17ef8dcca2dcaa9fca676987befeadc9b9f759967a8cb77181c0
ARG BASE_URL=https://apache.osuosl.org/maven/maven-3/${MAVEN_VERSION}/binaries

RUN apt-get update
RUN apt-get install git openssl curl tar bash procps gnupg

# Install Node & yarn
USER root
RUN curl -sL https://deb.nodesource.com/setup_12.x  | bash -
RUN apt-get -y install nodejs
RUN npm install -g yarn

COPY . /tmp/src/
RUN yarn global add "file:/tmp/src" && rm -rf /tmp/src

# Install Maven
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

ENV MAVEN_HOME /usr/share/maven
ENV MAVEN_CONFIG "$USER_HOME_DIR/.m2"

ENTRYPOINT [ "build-chain-action" ]