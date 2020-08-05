const { logger } = require("../common");

function treat(command) {
  const resultCommand = `${command} -Dorg.slf4j.simpleLogger.log.org.apache.maven.cli.transfer.Slf4jMavenTransferListener=warn -B`;
  logger.info(`Command ${command} treated to  ${resultCommand}`);
  return resultCommand;
}

module.exports = {
  treat
};
