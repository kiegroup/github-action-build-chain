const { logger } = require("../../common");
const { execute } = require("../../command/command");
const { treatCommand } = require("../../command/command-treatment-delegator");
const { getDir } = require("./build-chain-flow-helper");
const core = require("@actions/core");

async function executeBuild(rootFolder, nodeChain, projectTriggeringJob) {
  const projectTriggeringJobIndex = nodeChain.findIndex(
    node => node.project === projectTriggeringJob
  );
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
      await executeNodeBuildCommands(rootFolder, node, levelType);
    }
  }
}

async function executeBuildSpecificCommand(rootFolder, nodeChain, command) {
  for await (const node of nodeChain) {
    const dir = getDir(rootFolder, node.project);
    await executeBuildCommands(dir, command, node.project);
  }
}

/**
 *
 * @param {String} rootFolder the folder path to execute command
 * @param {Object} node the node to execute
 * @param {String} levelType an option between upstream, current or downstream
 */
async function executeNodeBuildCommands(rootFolder, node, levelType) {
  const dir = getDir(rootFolder, node.project);
  if (node.build["build-command"].before) {
    await executeBuildCommands(
      dir,
      getCommand(node.build["build-command"].before, levelType),
      node.project
    );
  }
  await executeBuildCommands(
    dir,
    getCommand(node.build["build-command"], levelType),
    node.project
  );
  if (node.build["build-command"].after) {
    await executeBuildCommands(
      dir,
      getCommand(node.build["build-command"].after, levelType),
      node.project
    );
  }
}

function getCommand(buildCommand, levelType) {
  return buildCommand[levelType] || buildCommand.current;
}

async function executeBuildCommands(cwd, buildCommands, project) {
  if (buildCommands) {
    for (const command of Array.isArray(buildCommands)
      ? buildCommands.filter(c => c)
      : [buildCommands]) {
      core.startGroup(`[${project}]. Command: '${command}' in dir ${cwd}`);
      const commandTreated = treatCommand(command);
      try {
        await execute(cwd, commandTreated);
      } catch (e) {
        throw new Error(
          `[${project}] error executing command '${commandTreated}'`
        );
      }
      core.endGroup();
    }
  }
}

module.exports = { executeBuild, executeBuildSpecificCommand };
