const core = require("@actions/core");

function getDefinitionFile() {
  return core.getInput("definition-file");
}

function getStartingProject() {
  return core.getInput("starting-project");
}

function getFlowType() {
  return core.getInput("flow-type");
}

function isPullRequestFlowType() {
  return getFlowType() === "pull-request";
}

function isBranchFlowType() {
  return getFlowType() === "branch";
}

module.exports = {
  getDefinitionFile,
  getStartingProject,
  getFlowType,
  isPullRequestFlowType,
  isBranchFlowType
};
