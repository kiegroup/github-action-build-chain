const {
  checkoutDefinitionTree,
  getPlaceHolders
} = require("./common/build-chain-flow-helper");
const { executeBuild } = require("./common/common-helper");
const {
  getTreeForProject,
  parentChainFromNode
} = require("@kie/build-chain-configuration-reader");
const { printCheckoutInformation, printExecutionPlan } = require("../summary");
const { logger } = require("../common");
const core = require("@actions/core");
const {
  archiveArtifacts
} = require("../artifacts/build-chain-flow-archive-artifact-helper");
const { execute: executePre } = require("./sections/pre");
const { execute: executePost } = require("./sections/post");

async function start(
  context,
  options = { skipProjectCheckout: new Map(), isArchiveArtifacts: true }
) {
  const readerOptions = {
    urlPlaceHolders: await getPlaceHolders(
      context,
      context.config.github.inputs.definitionFile
    ),
    token: context.token
  };
  await executePre(context.config.github.inputs.definitionFile, readerOptions);

  const projectTriggeringJob = context.config.github.inputs.startingProject
    ? context.config.github.inputs.startingProject
    : context.config.github.repository;

  const definitionTree = await getTreeForProject(
    context.config.github.inputs.definitionFile,
    projectTriggeringJob,
    readerOptions
  );
  const nodeChain = await parentChainFromNode(definitionTree);

  core.startGroup(`[Pull Request Flow] Execution Plan...`);
  printExecutionPlan(nodeChain, projectTriggeringJob);
  core.endGroup();

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

  const executionResult = await executeBuild(
    context.config.rootFolder,
    nodeChain,
    projectTriggeringJob,
    options
  )
    .then(() => true)
    .catch(e => e);

  if (options.isArchiveArtifacts) {
    core.startGroup(`[Pull Request Flow] Archiving artifacts...`);
    await archiveArtifacts(
      nodeChain.find(node => node.project === projectTriggeringJob),
      nodeChain,
      executionResult === true ? ["success", "always"] : ["failure", "always"]
    );
    core.endGroup();
  } else {
    logger.info("Archive artifact won't be executed");
  }

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
}

module.exports = {
  start
};
