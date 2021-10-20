const core = require("@actions/core");
const { ClientError } = require("../common");

function getDefinitionFile() {
  return core.getInput("definition-file");
}

function getStartingProject() {
  return core.getInput("starting-project");
}

function getFlowType() {
  return core.getInput("flow-type");
}

function getLoggerLevel() {
  const loggerLevel = core.getInput("logger-level");
  if (!["info", "trace", "debug"].includes(loggerLevel)) {
    throw new ClientError(`invalid 'logger-level' input: ${loggerLevel}`);
  }
  return loggerLevel;
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
  getLoggerLevel,
  isPullRequestFlowType,
  isFDFlowType,
  isSingleFlowType,
  isBranchFlowType,
  eventFlowTypeToCliFlowType
};
