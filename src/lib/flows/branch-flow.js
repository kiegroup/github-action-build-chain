const {
  getFinalDefinitionFilePath
} = require("./common/build-chain-flow-helper");
const {
  getTreeForProject,
  getTree
} = require("@kie/build-chain-configuration-reader");

async function start(context) {
  core.startGroup(
    `Checking out ${context.config.github.groupProject} and its dependencies`
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

  logger.info(
    `Tree for project ${
      context.config.github.inputs.startingProject
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

  if (executionResult !== true) {
    logger.error(executionResult);
    throw new Error(
      `Command executions have failed, please review latest execution ${executionResult}`
    );
  }
}

module.exports = { start };
