const { checkoutDefinitionTree, getDir } = require("./build-chain-flow-helper");
const { getTreeForProject } = require("build-chain-configuration-reader");

const { printCheckoutInformation } = require("./summary");
const { logger } = require("./common");
const { execute } = require("./command/command");
const { treatCommand } = require("./command/command-treatment-delegator");
const core = require("@actions/core");
const {
  archiveArtifacts
} = require("./artifacts/build-chain-flow-archive-artifact-helper");

async function start(context) {
  core.startGroup(
    `Checking out ${context.config.github.groupProject} and its dependencies`
  );
  const definitionTree = await getTreeForProject(
    context.config.github.inputs.definitionFile,
    context.config.github.repository
  );
  logger.info(
    `Tree for project ${context.config.github.repository} loaded from ${
      context.config.github.inputs.definitionFile
    }. Result: ${definitionTree.map(node => node.project)}`
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

  core.startGroup(`Archiving artifacts...`);
  await archiveArtifacts(
    nodeChain.find(node => node.project === context.config.github.repository),
    nodeChain,
    executionResult === true ? ["success", "always"] : ["failure", "always"]
  );
  core.endGroup();

  if (executionResult !== true) {
    logger.error(executionResult);
    throw new Error(
      `Command executions have failed, please review latest execution ${executionResult}`
    );
  }
}

async function executeBuild(rootFolder, nodeChain, projectTriggeringJob) {
  for await (const node of nodeChain) {
    await executeNodeBuildCommands(
      rootFolder,
      node,
      projectTriggeringJob === node.project
    );
  }
}

async function executeNodeBuildCommands(
  rootFolder,
  node,
  isProjectTriggeringJob
) {
  const dir = getDir(rootFolder, node.project);
  if (node.build["build-command"].before) {
    await executeBuildCommands(
      dir,
      getCommand(node.build["build-command"].before, isProjectTriggeringJob),
      node.project
    );
  }
  await executeBuildCommands(
    dir,
    getCommand(node.build["build-command"], isProjectTriggeringJob),
    node.project
  );
  if (node.build["build-command"].after) {
    await executeBuildCommands(
      dir,
      getCommand(node.build["build-command"].after, isProjectTriggeringJob),
      node.project
    );
  }
}

function getCommand(buildCommand, isProjectTriggeringJob) {
  return isProjectTriggeringJob
    ? buildCommand.current
    : buildCommand.upstream || buildCommand.current;
}

async function executeBuildCommands(cwd, buildCommands, project) {
  for (const command of Array.isArray(buildCommands)
    ? buildCommands
    : [buildCommands]) {
    core.startGroup(`[${project}]. Command: '${command}' in dir ${cwd}`);
    await execute(cwd, treatCommand(command));
    core.endGroup();
  }
}

module.exports = {
  start
};
