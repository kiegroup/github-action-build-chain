const {
  checkoutDefinitionTree,
  getPlaceHolders
} = require("./common/build-chain-flow-helper");
const {
  executeBuild,
  getExecutionResultError
} = require("./common/common-helper");
const {
  getTreeForProject,
  parentChainFromNode
} = require("@kie/build-chain-configuration-reader");
const {
  printCheckoutInformation,
  printExecutionPlan,
  printExecutionSummary
} = require("../summary");
const { logger } = require("../common");
const core = require("@actions/core");
const {
  archiveArtifacts
} = require("../artifacts/build-chain-flow-archive-artifact-helper");
const { execute: executePre } = require("./sections/pre");
const { execute: executePost } = require("./sections/post");

async function start(
  context,
  options = {
    skipProjectCheckout: new Map(),
    isArchiveArtifacts: true,
    skipCheckout: false,
    skipExecution: false
  }
) {
  logger.debug("pull-request-flow.js options", options);
  const readerOptions = {
    urlPlaceHolders: await getPlaceHolders(
      context,
      context.config.github.inputs.definitionFile
    ),
    token: context.token
  };
  logger.debug("pull-request-flow.js readerOptions", readerOptions);

  if (!options.skipExecution) {
    await executePre(
      context.config.github.inputs.definitionFile,
      readerOptions
    );
  }

  const projectTriggeringJob = context.config.github.inputs.startingProject
    ? context.config.github.inputs.startingProject
    : context.config.github.repository;
  logger.debug(
    "pull-request-flow.js projectTriggeringJob",
    projectTriggeringJob
  );

  const definitionTree = await getTreeForProject(
    context.config.github.inputs.definitionFile,
    projectTriggeringJob,
    readerOptions
  );

  if ([null, undefined].includes(definitionTree)) {
    throw new Error(
      `The definition tree is undefined. Does the project ${projectTriggeringJob} exist into the definition file ${context.config.github.inputs.definitionFile}?`
    );
  }

  const nodeChain = await parentChainFromNode(definitionTree);

  if (!options.skipExecution) {
    core.startGroup(`[Pull Request Flow] Execution Plan...`);
    printExecutionPlan(nodeChain, projectTriggeringJob);
    core.endGroup();
  }

  core.startGroup(
    `[Pull Request Flow] Checking out ${context.config.github.groupProject} and its dependencies`
  );

  logger.info(
    `Tree for project ${projectTriggeringJob}. Dependencies: ${nodeChain.map(
      node => "\n" + node.project
    )}`
  );
  const checkoutInfo = await checkoutDefinitionTree(
    context,
    nodeChain,
    "pr",
    options
  );
  core.endGroup();

  core.startGroup(`[Pull Request Flow] Checkout Summary...`);
  printCheckoutInformation(checkoutInfo);
  core.endGroup();

  if (!options.skipExecution) {
    const executionResult = await executeBuild(
      context.config.rootFolder,
      nodeChain,
      projectTriggeringJob,
      options
    );
    const executionResultError = getExecutionResultError(executionResult);

    if (options.isArchiveArtifacts) {
      core.startGroup(`[Pull Request Flow] Archiving artifacts...`);
      await archiveArtifacts(
        nodeChain.find(node => node.project === projectTriggeringJob),
        nodeChain,
        !executionResultError ? ["success", "always"] : ["failure", "always"]
      );
      core.endGroup();
    } else {
      logger.info("Archive artifact won't be executed");
    }

    core.startGroup(`[Pull Request Flow] Execution Summary...`);
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

module.exports = {
  start
};
