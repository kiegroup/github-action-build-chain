const {
  checkoutDefinitionTree,
  getPlaceHolders
} = require("./common/build-chain-flow-helper");
const { executeBuild } = require("./common/common-helper");
const { getTreeForProject } = require("@kie/build-chain-configuration-reader");
const { printCheckoutInformation } = require("../summary");
const { logger } = require("../common");
const core = require("@actions/core");
const {
  archiveArtifacts
} = require("../artifacts/build-chain-flow-archive-artifact-helper");

async function start(context, options = { isArchiveArtifacts: true }) {
  core.startGroup(
    `[Single Flow] Checking out ${context.config.github.groupProject} and its dependencies`
  );
  const projectTriggeringJob = context.config.github.inputs.startingProject
    ? context.config.github.inputs.startingProject
    : context.config.github.repository;
  const definitionTree = await getTreeForProject(
    context.config.github.inputs.definitionFile,
    projectTriggeringJob,
    await getPlaceHolders(context, context.config.github.inputs.definitionFile)
  );
  const nodeChain = [definitionTree];

  logger.info(
    `Single flow for project ${
      context.config.github.inputs.startingProject
    }. Nodes: ${nodeChain.map(node => "\n" + node.project)}`
  );
  const checkoutInfo = await checkoutDefinitionTree(
    context,
    nodeChain,
    "pr",
    options
  );
  core.endGroup();

  core.startGroup(`[Single Flow] Checkout Summary...`);
  printCheckoutInformation(checkoutInfo);
  core.endGroup();

  const executionResult = await executeBuild(
    context.config.rootFolder,
    nodeChain,
    projectTriggeringJob,
    options
  )
    .then(() => true)
    .catch(e => e);

  if (options.isArchiveArtifacts) {
    core.startGroup(`[Single Flow] Archiving artifacts...`);
    await archiveArtifacts(
      nodeChain.find(node => node.project === projectTriggeringJob),
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
