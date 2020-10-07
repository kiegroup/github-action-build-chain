const { logger } = require("../common");
const exec = require("@actions/exec");
const core = require("@actions/core");

class ExitError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

async function execute(cwd, command, project) {
  core.startGroup(`[${project}]. Command: '${command}' in dir ${cwd}`);
  logger.info(`Execute command '${command}' in dir '${cwd}'`);
  const options = {};
  options.cwd = cwd;
  await exec.exec(command, [], options);
  core.endGroup();
}

module.exports = {
  ExitError,
  execute
};
