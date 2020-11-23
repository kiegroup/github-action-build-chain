const { logger } = require("../common");
const { executeCommand } = require("./execution/command-execution-delegator");

class ExitError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

async function execute(cwd, command) {
  logger.info(`Execute command '${command}' in dir '${cwd}'`);
  await executeCommand(cwd, command);
}

module.exports = {
  ExitError,
  execute
};
