const core = require("@actions/core");

function getDefinitionFile() {
  return core.getInput("definition-file");
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

module.exports = {
  getDefinitionFile,
  getMatrixVariables
};
