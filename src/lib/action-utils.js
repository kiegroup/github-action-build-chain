const core = require("@actions/core");
const { dependenciesToObject } = require("./common");

function getParentDependencies() {
  return dependenciesToObject(core.getInput("parent-dependencies"));
}

function getChildDependencies() {
  return dependenciesToObject(core.getInput("child-dependencies"));
}

function getBuildCommand() {
  return treatCommands(core.getInput("build-command"));
}

function getBuildCommandUpstream() {
  return treatCommands(core.getInput("build-command-upstream"));
}

function getBuildCommandDownstream() {
  return treatCommands(core.getInput("build-command-downstream"));
}

function getWorkflowfileName() {
  return core.getInput("workflow-file-name");
}

function getMatrixVariables() {
  const matrixVariables = core.getInput("matrix-variables");
  return matrixVariables
    ? matrixVariables.split(",").reduce((acc, variableKeyValue) => {
        const variableKeyValueSplit = variableKeyValue.trim().split(":");
        acc[variableKeyValueSplit[0].trim()] = variableKeyValueSplit[1].trim();
        return acc;
      }, {})
    : undefined;
}

function treatCommands(command) {
  return command ? command.split("|").map(item => item.trim()) : undefined;
}

module.exports = {
  getParentDependencies,
  getChildDependencies,
  getBuildCommandUpstream,
  getBuildCommandDownstream,
  getBuildCommand,
  getWorkflowfileName,
  getMatrixVariables
};
