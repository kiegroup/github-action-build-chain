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

function isFDFlowType() {
  return getFlowType() === "full-downstream";
}

function isSingleFlowType() {
  return getFlowType() === "single";
}

function isBranchFlowType() {
  return getFlowType() === "branch";
}

function eventFlowTypeToCliFlowType(flowType) {
  switch (flowType) {
    case "pull-request":
      return "pr";
    case "single":
      return "single";
    case "full-downstream":
      return "fd";
    default:
      return undefined;
  }
}

module.exports = {
  getDefinitionFile,
  getStartingProject,
  getFlowType,
  isPullRequestFlowType,
  isFDFlowType,
  isSingleFlowType,
  isBranchFlowType,
  eventFlowTypeToCliFlowType
};
