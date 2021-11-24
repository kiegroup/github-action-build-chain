const { logger, annotationer } = require("../../common");
const { execute } = require("../../command/command");
const {
  treatCommand
} = require("../../command/treatment/command-treatment-delegator");
const { getDir } = require("./build-chain-flow-helper");
const { hrtimeToMs } = require("../../util/js-util");
const core = require("@actions/core");

async function executeBuild(
  rootFolder,
  nodeChain,
  projectTriggeringJob,
  options = {}
) {
  const result = [];
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
    const start = process.hrtime();
    if (node.build && node.build.skip) {
      result.push({
        project: node.project,
        result: "skipped",
        time: 0
      });
      logger.info(
        `Execution skip for ${node.project}. No command will be executed.`
      );
    } else {
      let executionResult = "ok";
      let error = undefined;
      const levelType =
        index < projectTriggeringJobIndex
          ? "upstream"
          : index == projectTriggeringJobIndex
          ? "current"
          : "downstream";
      try {
        await executeNodeBuildCommands(rootFolder, node, levelType, options);
      } catch (e) {
        executionResult = "error";
        error = e;
        break;
      } finally {
        result.push({
          project: node.project,
          result: executionResult,
          time: hrtimeToMs(start),
          error
        });
      }
    }
  }
  return result;
}

async function executeBuildSpecificCommand(
  rootFolder,
  nodeChain,
  command,
  options = {}
) {
  const result = [];

  for await (const node of nodeChain) {
    const start = process.hrtime();

    const dir = getDir(
      rootFolder,
      node.project,
      options.skipProjectCheckout
        ? options.skipProjectCheckout.get(node.project)
        : undefined
    );
    let executionResult = "ok";
    let error = undefined;
    try {
      await executeBuildCommands(dir, command, node.project, options);
    } catch (e) {
      executionResult = "error";
      error = e;
      break;
    } finally {
      result.push({
        project: node.project,
        result: executionResult,
        time: hrtimeToMs(start),
        error
      });
    }
  }
  return result;
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
          `[${project}] error executing command: '${commandTreated}'. Message: ${e}`
        );
      }
      annotationer.notice(`[${project}] [Execution OK]`, commandTreated);
      if (!options.skipStartGroup) {
        core.endGroup();
      }
    }
  }
}

function getExecutionResultError(executionResult) {
  if (executionResult && executionResult.length) {
    return executionResult.find(er => er.result === "error");
  }
  return undefined;
}

module.exports = {
  executeBuild,
  executeBuildSpecificCommand,
  executeBuildCommands,
  getCommand,
  getExecutionResultError
};
