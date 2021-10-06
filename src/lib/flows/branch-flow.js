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

const { execute: executePre } = require("./sections/pre");
const { execute: executePost } = require("./sections/post");

async function start(context, options = { skipExecution: false }) {
  const readerOptions = {
    urlPlaceHolders: await getPlaceHolders(
      context,
      context.config.github.inputs.definitionFile
    ),
    token: context.token
  };
  if (!options.skipExecution) {
    await executePre(
      context.config.github.inputs.definitionFile,
      readerOptions
    );
  }

  core.startGroup(
    `[Branch Flow] Checking out ${context.config.github.groupProject} and its dependencies`
  );

  const definitionTree = context.config.github.inputs.startingProject
    ? await getTreeForProject(
        context.config.github.inputs.definitionFile,
        context.config.github.inputs.startingProject,
        readerOptions
      )
    : getTree(context.config.github.inputs.definitionFile, readerOptions);

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

  if (!options.skipExecution) {
    core.startGroup(`[Branch Flow] Checkout Summary...`);
    printCheckoutInformation(checkoutInfo);
    core.endGroup();

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

    await executePost(
      context.config.github.inputs.definitionFile,
      executionResult,
      readerOptions
    );

    if (executionResult !== true) {
      logger.error(executionResult);
      throw new Error(
        `Command executions have failed, please review latest execution ${executionResult}`
      );
    }
  } else {
    logger.info("Execution has been skipped.");
  }
}

module.exports = { start };
