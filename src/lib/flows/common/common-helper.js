const { logger, annotationer } = require("../../common");
const { execute } = require("../../command/command");
const {
  treatCommand
} = require("../../command/treatment/command-treatment-delegator");
const { getDir } = require("./build-chain-flow-helper");
const core = require("@actions/core");

async function executeBuild(
  rootFolder,
  nodeChain,
  projectTriggeringJob,
  options = {}
) {
  const projectTriggeringJobIndex = nodeChain.findIndex(
    node => node.project === projectTriggeringJob
  );
  if (projectTriggeringJobIndex < 0) {
    throw new Error(
      `The chain ${nodeChain.map(
        node => node.project
      )} does not contain the project triggering the job ${projectTriggeringJob}`
    );
  }
  for await (const [index, node] of nodeChain.entries()) {
    if (node.build && node.build.skip) {
      logger.info(
        `Execution skip for ${node.project}. No command will be executed.`
      );
    } else {
      const levelType =
        index < projectTriggeringJobIndex
          ? "upstream"
          : index == projectTriggeringJobIndex
          ? "current"
          : "downstream";
      await executeNodeBuildCommands(rootFolder, node, levelType, options);
    }
  }
}

async function executeBuildSpecificCommand(
  rootFolder,
  nodeChain,
  command,
  options = {}
) {
  for await (const node of nodeChain) {
    const dir = getDir(
      rootFolder,
      node.project,
      options.skipProjectCheckout
        ? options.skipProjectCheckout.get(node.project)
        : undefined
    );
    await executeBuildCommands(dir, command, node.project, options);
  }
}

/**
 *
 * @param {String} rootFolder the folder path to execute command
 * @param {Object} node the node to execute
 * @param {String} levelType an option between upstream, current or downstream
 */
async function executeNodeBuildCommands(
  rootFolder,
  node,
  levelType,
  options = {}
) {
  const dir = getDir(
    rootFolder,
    node.project,
    options.skipProjectCheckout
      ? options.skipProjectCheckout.get(node.project)
      : undefined
  );
  if (node.build["build-command"].before) {
    await executeBuildCommands(
      dir,
      getCommand(node.build["build-command"].before, levelType),
      node.project,
      options
    );
  }
  await executeBuildCommands(
    dir,
    getCommand(node.build["build-command"], levelType),
    node.project,
    options
  );
  if (node.build["build-command"].after) {
    await executeBuildCommands(
      dir,
      getCommand(node.build["build-command"].after, levelType),
      node.project,
      options
    );
  }
}

function getCommand(buildCommand, levelType) {
  return buildCommand[levelType] || buildCommand.current;
}

async function executeBuildCommands(cwd, buildCommands, project, options = {}) {
  if (buildCommands) {
    for (const command of Array.isArray(buildCommands)
      ? buildCommands.filter(c => c)
      : [buildCommands]) {
      if (!options.skipStartGroup) {
        core.startGroup(`[${project}]. Command: '${command}' in dir ${cwd}`);
      }
      const commandTreated = treatCommand(command, options);
      try {
        await execute(cwd, commandTreated);
      } catch (e) {
        annotationer.error(`[${project}] [Execution ERROR]`, commandTreated);
        throw new Error(
          `[${project}] error executing command '${commandTreated}'`
        );
      }
      annotationer.notice(`[${project}] [Execution OK]`, commandTreated);
      if (!options.skipStartGroup) {
        core.endGroup();
      }
    }
  }
}

module.exports = {
  executeBuild,
  executeBuildSpecificCommand,
  executeBuildCommands,
  getCommand
};
