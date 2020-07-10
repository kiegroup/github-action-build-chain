
const { logger } = require("./common");
const exec = require('@actions/exec');

class ExitError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

async function execute(cwd, command) {
  logger.info(`Execute command '${command}' in dir '${cwd}'`);
  const options = {};
  options.cwd = cwd;
  await exec.exec(command, [], options);
}

module.exports = {
  ExitError,
  execute
};
