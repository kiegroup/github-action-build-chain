const {
  checkoutDefinitionTree,
  getPlaceHolders
} = require("./common/build-chain-flow-helper");
const {
  getTreeForProject,
  getTree,
  parentChainFromNode
} = require("@kie/build-chain-configuration-reader");
const core = require("@actions/core");
const { logger } = require("../common");
const { printCheckoutInformation } = require("../summary");
const {
  executeBuild,
  executeBuildSpecificCommand
} = require("./common/common-helper");

async function start(context, options = {}) {
  core.startGroup(
    `[Branch Flow] Checking out ${context.config.github.groupProject} and its dependencies`
  );
  const urlPlaceHolders = await getPlaceHolders(
    context,
    context.config.github.inputs.definitionFile
  );

  const definitionTree = context.config.github.inputs.startingProject
    ? await getTreeForProject(
        context.config.github.inputs.definitionFile,
        context.config.github.inputs.startingProject,
        urlPlaceHolders
      )
    : getTree(context.config.github.inputs.definitionFile, urlPlaceHolders);

  let nodeChain = await parentChainFromNode(definitionTree);

  logger.info(
    `Tree for project ${
      context.config.github.inputs.startingProject
    }. Dependencies: ${nodeChain.map(node => "\n" + node.project)}`
  );
  const checkoutInfo = await checkoutDefinitionTree(
    context,
    nodeChain,
    "branch",
    options
  );
  core.endGroup();

  core.startGroup(`[Branch Flow] Checkout Summary...`);
  printCheckoutInformation(checkoutInfo);
  core.endGroup();

  if (!options.skipExecution) {
    const executionResult = options.command
      ? await executeBuildSpecificCommand(
          context.config.rootFolder,
          nodeChain,
          options.command,
          options
        )
          .then(() => true)
          .catch(e => e)
      : await executeBuild(
          context.config.rootFolder,
          nodeChain,
          context.config.github.repository,
          options
        )
          .then(() => true)
          .catch(e => e);

    if (executionResult !== true) {
      logger.error(executionResult);
      throw new Error(
        `Command executions have failed, please review latest execution ${executionResult}`
      );
    }
  } else {
    logger.info("Execution has been skipped. Won't execute.");
  }
}

module.exports = { start };
