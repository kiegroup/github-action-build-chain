const {
  checkoutDefinitionTree,
  getPlaceHolders
} = require("./common/build-chain-flow-helper");
const {
  executeBuild,
  getExecutionResultError
} = require("./common/common-helper");
const {
  getOrderedListForProject
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
  options = { isArchiveArtifacts: true, skipExecution: false }
) {
  logger.debug("full-downstream-flow.js options", options);

  const readerOptions = {
    urlPlaceHolders: await getPlaceHolders(
      context,
      context.config.github.inputs.definitionFile
    ),
    token: context.token
  };
  logger.debug("full-downstream-flow.js readerOptions", readerOptions);

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
    "full-downstream-flow.js projectTriggeringJob",
    projectTriggeringJob
  );

  const nodeChain = await getOrderedListForProject(
    context.config.github.inputs.definitionFile,
    projectTriggeringJob,
    readerOptions
  );
  logger.debug("full-downstream-flow.js nodeChain", nodeChain);

  if (!options.skipExecution) {
    core.startGroup(`[Full Downstream Flow] Execution Plan...`);
    printExecutionPlan(nodeChain, projectTriggeringJob);
    core.endGroup();
  }

  core.startGroup(
    `[Full Downstream Flow] Checking out ${context.config.github.groupProject} and its dependencies`
  );

  logger.info(
    `Tree for project ${projectTriggeringJob}. Chain: ${nodeChain.map(
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

  core.startGroup(`[Full Downstream Flow] Checkout Summary...`);
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
      core.startGroup(`[Full Downstream Flow] Archiving artifacts...`);
      await archiveArtifacts(
        nodeChain.find(node => node.project === projectTriggeringJob),
        nodeChain,
        !executionResultError ? ["success", "always"] : ["failure", "always"]
      );
      core.endGroup();
    } else {
      logger.info("Archive artifact won't be executed");
    }

    core.startGroup(`[Full Downstream Flow] Execution Summary...`);
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
