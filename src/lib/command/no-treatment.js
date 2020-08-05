const { logger } = require("../common");

function treat(command) {
  logger.info(`No treatment for command ${command}`);
  return command;
}

module.exports = {
  treat
};
