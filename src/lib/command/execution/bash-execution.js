const exec = require("@actions/exec");
require("dotenv").config();

async function execute(cwd, command) {
  const options = {};
  options.cwd = cwd;
  await exec.exec(command, [], options);
}

module.exports = {
  execute
};
