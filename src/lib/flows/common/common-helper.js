const { execute } = require("../../command/command");
const { treatCommand } = require("../../command/command-treatment-delegator");
const { getDir } = require("./build-chain-flow-helper");
const core = require("@actions/core");

async function executeBuild(rootFolder, nodeChain, projectTriggeringJob) {
  for await (const node of nodeChain) {
    await executeNodeBuildCommands(
      rootFolder,
      node,
      projectTriggeringJob === node.project
    );
  }
}

async function executeBuildSpecificCommand(rootFolder, nodeChain, command) {
  for await (const node of nodeChain) {
    const dir = getDir(rootFolder, node.project);
    await executeBuildCommands(dir, command, node.project);
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
