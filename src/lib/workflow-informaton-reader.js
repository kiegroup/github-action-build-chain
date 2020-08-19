const fs = require("fs");
const path = require("path");
const { logger, dependenciesToObject } = require("./common");
const { getYamlFileContent } = require("./fs-helper");
var assert = require("assert");

function readWorkflowInformation(
  triggeringJobName,
  workflowFilePath,
  defaultGroup,
  matrixVariables,
  dir = "."
) {
  const filePath = path.join(dir, workflowFilePath);
  if (!fs.existsSync(filePath)) {
    logger.warn(`file ${filePath} does not exist`);
    return undefined;
  }
  return parseWorkflowInformation(
    triggeringJobName,
    getYamlFileContent(filePath),
    defaultGroup,
    matrixVariables
  );
}

function parseWorkflowInformation(
  jobName,
  workflowData,
  defaultGroup,
  matrixVariables
) {
  assert(workflowData.jobs[jobName], `The job id '${jobName}' does not exist`);
  const buildChainStep = workflowData.jobs[jobName].steps.find(
    step => step.uses && step.uses.includes("github-action-build-chain")
  );
  buildChainStep.with = Object.entries(buildChainStep.with)
    .filter(([key]) => key !== "matrix-variables")
    .reduce((acc, [key, value]) => {
      acc[key] = treatMatrixVariables(value, matrixVariables);
      return acc;
    }, {});
  return {
    id: buildChainStep.id,
    name: buildChainStep.name,
    buildCommands: treatCommand(buildChainStep.with["build-command"]),
    buildCommandsUpstream: treatCommand(
      buildChainStep.with["build-command-upstream"]
    ),
    buildCommandsDownstream: treatCommand(
      buildChainStep.with["build-command-downstream"]
    ),
    childDependencies: dependenciesToObject(
      buildChainStep.with["child-dependencies"],
      defaultGroup
    ),
    parentDependencies: dependenciesToObject(
      buildChainStep.with["parent-dependencies"],
      defaultGroup
    )
  };
}

function treatCommand(command) {
  return command ? command.split("|").map(item => item.trim()) : undefined;
}

function treatMatrixVariables(withExpression, matrixVariables) {
  let result = withExpression;
  const exp = /((\${{ )([a-zA-Z0-9\\.\\-]*)( }}))/g;
  let match = undefined;
  while ((match = exp.exec(withExpression))) {
    if (!matrixVariables || !matrixVariables[match[3]]) {
      throw new Error(
        `The variable '${match[3]}' is not defined in "with" 'matrix-variables' so it can't be replaced. Please define it in the flow triggering the job.`
      );
    }
    result = result.replace(`${match[1]}`, matrixVariables[match[3]]);
  }
  return result;
}

module.exports = {
  readWorkflowInformation
};
