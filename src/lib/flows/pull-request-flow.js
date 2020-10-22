const {
  checkoutDefinitionTree,
  getFinalDefinitionFilePath
} = require("./common/build-chain-flow-helper");
const { executeBuild } = require("./common/common-helper");
const { getTreeForProject } = require("@kie/build-chain-configuration-reader");

const { printCheckoutInformation } = require("../summary");
const { logger } = require("../common");
const core = require("@actions/core");
const {
  archiveArtifacts
} = require("../artifacts/build-chain-flow-archive-artifact-helper");

async function start(context, isArchiveArtifacts) {
  core.startGroup(
    `Checking out ${context.config.github.groupProject} and its dependencies`
  );
  const definitionFile = await getFinalDefinitionFilePath(
    context,
    context.config.github.inputs.definitionFile
  );
  const definitionTree = await getTreeForProject(
    definitionFile,
    context.config.github.repository
  );
  logger.info(
    `Tree for project ${
      context.config.github.repository
    } loaded from ${definitionFile}. Dependencies: ${
      definitionTree.dependencies
        ? definitionTree.dependencies.map(node => node.project)
        : "no dependencies"
    }`
  );
  const nodeChain = await checkoutDefinitionTree(context, definitionTree);
  core.endGroup();

  core.startGroup(`Checkout Summary...`);
  printCheckoutInformation(
    nodeChain.reduce((acc, curr) => {
      acc[curr.project] = curr.checkoutInfo;
      return acc;
    }, {})
  );
  core.endGroup();

  const executionResult = await executeBuild(
    context.config.rootFolder,
    nodeChain,
    context.config.github.repository
  )
    .then(() => true)
    .catch(e => e);

  if (isArchiveArtifacts) {
    core.startGroup(`Archiving artifacts...`);
    await archiveArtifacts(
      nodeChain.find(node => node.project === context.config.github.repository),
      nodeChain,
      executionResult === true ? ["success", "always"] : ["failure", "always"]
    );
    core.endGroup();
  } else {
    logger.info("Archive artifact won't be executed");
  }

  if (executionResult !== true) {
    logger.error(executionResult);
    throw new Error(
      `Command executions have failed, please review latest execution ${executionResult}`
    );
  }
}

module.exports = {
  start
};
