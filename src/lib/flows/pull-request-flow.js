const {
  checkoutDefinitionTree,
  getPlaceHolders
} = require("./common/build-chain-flow-helper");
const { executeBuild } = require("./common/common-helper");
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
const { isError } = require("../util/js-util");

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
  logger.debug("pull-request-flow.js definitionTree", definitionTree);

  if ([null, undefined].includes(definitionTree)) {
    throw new Error(
      `The definition tree is undefined. Does the project ${projectTriggeringJob} exist into the definition file ${context.config.github.inputs.definitionFile}?`
    );
  }

  const nodeChain = await parentChainFromNode(definitionTree);
  logger.debug("pull-request-flow.js nodeChain", nodeChain);

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
    )
      .then(e => e)
      .catch(e => e);

    if (options.isArchiveArtifacts) {
      core.startGroup(`[Pull Request Flow] Archiving artifacts...`);
      await archiveArtifacts(
        nodeChain.find(node => node.project === projectTriggeringJob),
        nodeChain,
        isError(executionResult) ? ["failure", "always"] : ["success", "always"]
      );
      core.endGroup();
    } else {
      logger.info("Archive artifact won't be executed");
    }

    await executePost(
      context.config.github.inputs.definitionFile,
      !isError(executionResult),
      readerOptions
    );

    if (isError(executionResult)) {
      logger.error(executionResult);
      throw new Error(
        `Command executions have failed, please review latest execution ${executionResult}`
      );
    } else {
      core.startGroup(`[Pull Request Flow] Execution Summary...`);
      printExecutionSummary(executionResult);
      core.endGroup();
    }
  } else {
    logger.info("Execution has been skipped.");
  }
}

module.exports = {
  start
};
