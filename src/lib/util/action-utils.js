const core = require("@actions/core");
const { ClientError } = require("../common");
const assert = require("assert");

function getDefinitionFile() {
  return core.getInput("definition-file");
}

function getStartingProject() {
  return core.getInput("starting-project");
}

function getFlowType() {
  return core.getInput("flow-type");
}

function getAdditionalFlags() {
  return core.getInput("additional-flags");
}

function getLoggerLevel() {
  const loggerLevelInput = core.getInput("logger-level");
  const loggerLevel = loggerLevelInput ? loggerLevelInput : "info";
  if (!["info", "trace", "debug"].includes(loggerLevel)) {
    throw new ClientError(`invalid 'logger-level' input: ${loggerLevel}`);
  }
  return loggerLevel;
}

function getAnnotationsPrefix() {
  const annotationsPrefix = core.getInput("annotations-prefix");
  return annotationsPrefix ? `[${annotationsPrefix}]` : "";
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
  assert(
    flowType,
    "flow type is not defined for eventFlowTypeToCliFlowType argument"
  );

  switch (flowType) {
    case "pull-request":
      return "pr";
    case "single":
      return "single";
    case "full-downstream":
      return "fd";
    default:
      return flowType;
  }
}

function additionalFlagsToCLI(additionalFlags) {
  return additionalFlags ? additionalFlags.replace(/;/g, " ").trim() : "";
}

function additionalFlagsToOptions(additionalFlags) {
  if (
    [null, undefined].includes(additionalFlags) ||
    additionalFlags.trim() === ""
  ) {
    return {};
  }

  const treatValue = value =>
    value.split(",").length === 1
      ? value.trim()
      : value.split(",").map(item => item.trim());

  return additionalFlags
    .trim()
    .split(";")
    .reduce((acc, additionalFlag) => {
      const additionalFlagTrimmed = additionalFlag.trim();
      const isBooleanFlag = additionalFlagTrimmed.startsWith("--");

      const elementKey = isBooleanFlag
        ? additionalFlagTrimmed.substring(2)
        : additionalFlagTrimmed.substring(
            1,
            additionalFlagTrimmed.indexOf(" ")
          );
      const elementValue = isBooleanFlag
        ? true
        : treatValue(
            additionalFlagTrimmed.substring(
              additionalFlagTrimmed.indexOf(" ") + 1
            )
          );

      acc[elementKey] = elementValue;
      return acc;
    }, {});
}

module.exports = {
  getDefinitionFile,
  getStartingProject,
  getFlowType,
  getLoggerLevel,
  getAnnotationsPrefix,
  getAdditionalFlags,
  isPullRequestFlowType,
  isFDFlowType,
  isSingleFlowType,
  isBranchFlowType,
  eventFlowTypeToCliFlowType,
  additionalFlagsToCLI,
  additionalFlagsToOptions
};
