const {
  checkoutDefinitionTree,
  getPlaceHolders
} = require("./common/build-chain-flow-helper");
const {
  getTreeForProject,
  getTree,
  parentChainFromNode,
  getOrderedListForProject
} = require("@kie/build-chain-configuration-reader");
const core = require("@actions/core");
const { logger } = require("../common");
const {
  printCheckoutInformation,
  printExecutionSummary
} = require("../summary");
const {
  executeBuild,
  executeBuildSpecificCommand,
  getExecutionResultError
} = require("./common/common-helper");

const { execute: executePre } = require("./sections/pre");
const { execute: executePost } = require("./sections/post");

async function start(
  context,
  options = { skipExecution: false, isFullDownStream: false }
) {
  logger.debug("branch-flow.js options", options);
  const readerOptions = {
    urlPlaceHolders: await getPlaceHolders(
      context,
      context.config.github.inputs.definitionFile
    ),
    token: context.token
  };
  logger.debug("branch-flow.js readerOptions", readerOptions);

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
  logger.debug(
    "branch-flow.js definitionTree",
    context.config.github.inputs.definitionFile,
    context.config.github.inputs.startingProject
  );
  if ([null, undefined].includes(definitionTree)) {
    throw new Error(
      `The definition tree is undefined. Does the project ${context.config.github.inputs.startingProject} exist into the definition file ${context.config.github.inputs.definitionFile}?`
    );
  }
  let nodeChain = options.isFullDownStream
    ? await getOrderedListForProject(
        context.config.github.inputs.definitionFile,
        context.config.github.inputs.startingProject,
        readerOptions
      )
    : await parentChainFromNode(definitionTree);
  logger.debug(`isFullDownStream: ${options.isFullDownStream}`);

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
      : await executeBuild(
          context.config.rootFolder,
          nodeChain,
          context.config.github.repository,
          options
        );

    const executionResultError = getExecutionResultError(executionResult);

    core.startGroup(`[Branch Flow] Execution Summary...`);
    printExecutionSummary(executionResult);
    core.endGroup();

    await executePost(
      context.config.github.inputs.definitionFile,
      !executionResultError,
      readerOptions
    );

    if (executionResultError) {
      logger.error(executionResultError && executionResultError.error);
      throw new Error(
        `Command executions have failed, please review latest execution ${
          executionResultError && executionResultError.error
        }`
      );
    }
  } else {
    logger.info("Execution has been skipped.");
  }
}

module.exports = { start };
