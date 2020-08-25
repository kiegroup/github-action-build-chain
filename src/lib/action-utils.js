const core = require("@actions/core");

function getWorkflowfileName() {
  return core.getInput("workflow-file-name");
}

function getEnv() {
  return core.getInput("env");
}

module.exports = {
  getWorkflowfileName,
  getEnv
};
