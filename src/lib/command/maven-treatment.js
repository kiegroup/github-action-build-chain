function treat(command) {
  return `${command} -Dorg.slf4j.simpleLogger.log.org.apache.maven.cli.transfer.Slf4jMavenTransferListener=warn -B`;
}

module.exports = {
  treat
};
