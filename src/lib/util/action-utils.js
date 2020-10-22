const core = require("@actions/core");

function getDefinitionFile() {
  return core.getInput("definition-file");
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
  getFlowType,
  isPullRequestFlowType,
  isBranchFlowType
};
