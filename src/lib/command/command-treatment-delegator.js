const { logger } = require("../common");

function treatCommand(command) {
  logger.info("treatCommand.command", command);
  logger.info("treatCommand.command.match", command.match(/.*mvn .*/));
  let libraryToLoad = "./no-treatment";
  if (command.match(/.*mvn .*/)) {
    libraryToLoad = "./maven-treatment";
  }
  logger.info("treatCommand.libraryToLoad", libraryToLoad);

  return require(libraryToLoad).treat(command);
}

module.exports = {
  treatCommand
};
