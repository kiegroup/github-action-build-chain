const {
  checkoutDefinitionTree,
  getFinalDefinitionFilePath
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
  const definitionFile = await getFinalDefinitionFilePath(
    context,
    context.config.github.inputs.definitionFile
  );

  const definitionTree = context.config.github.inputs.startingProject
    ? await getTreeForProject(
        definitionFile,
        context.config.github.inputs.startingProject
      )
    : getTree(definitionFile);

  let nodeChain = await parentChainFromNode(definitionTree);

  logger.info(
    `Tree for project ${
      context.config.github.inputs.startingProject
    } loaded from ${definitionFile}. Dependencies: ${nodeChain.map(
      node => "\n" + node.project
    )}`
  );
  const checkoutInfo = await checkoutDefinitionTree(
    context,
    nodeChain,
    "branch"
  );
  core.endGroup();

  core.startGroup(`[Branch Flow] Checkout Summary...`);
  printCheckoutInformation(checkoutInfo);
  core.endGroup();

  if (options.skipExecution) {
    if (options.projectToStart) {
      const nodeChainIndex = nodeChain
        .map(node => node.project)
        .indexOf(options.projectToStart);
      if (nodeChainIndex === -1) {
        throw new Error(
          `The project to start "${
            options.projectToStart
          }" is not defined in ${nodeChain.map(node => node.project)}`
        );
      }
      nodeChain = nodeChain.slice(nodeChainIndex);
    }

    const executionResult = options.command
      ? await executeBuildSpecificCommand(
          context.config.rootFolder,
          nodeChain,
          options.command,
          options.projectToStart
        )
          .then(() => true)
          .catch(e => e)
      : await executeBuild(
          context.config.rootFolder,
          nodeChain,
          context.config.github.repository
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
