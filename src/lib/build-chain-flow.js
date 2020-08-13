const {
  checkoutDependencies,
  getDir,
  readWorkflowInformation
} = require("./build-chain-flow-helper");
const { merge } = require("./git");
const { logger } = require("./common");
const { execute } = require("./command");
const { treatCommand } = require("./command/command-treatment-delegator");

async function start(context) {
  try {
    await merge(
      ".",
      context.config.github.group,
      context.config.github.project,
      context.config.github.targetBranch
    );
  } catch (err) {
    logger.error(
      `Error merging ${context.config.github.serverUrl}/${context.config.github.group}/${context.config.github.project}:${context.config.github.targetBranch}. Please manually merge it and relaunch.`
    );
    throw err;
  }

  const workflowInformation = readWorkflowInformation(
    context.config.github.jobName,
    context.config.github.workflow,
    context.config.github.group
  );
  await treatParents(
    context,
    [],
    context.config.github.project,
    workflowInformation
  );
  await executeBuildCommands(".", workflowInformation["buildCommands"]);
}

async function treatParents(
  context,
  projectList,
  project,
  workflowInformation,
  shouldExecute = false
) {
  if (!projectList[project]) {
    projectList.push(project);
    if (workflowInformation.parentDependencies) {
      await checkoutDependencies(
        context,
        workflowInformation.parentDependencies
      );
      for (const parentProject of Object.keys(
        workflowInformation.parentDependencies
      ).filter(a => a !== null && a !== "")) {
        const dir = getDir(context.config.rootFolder, parentProject);
        const parentWorkflowInformation = readWorkflowInformation(
          context.config.github.jobName,
          context.config.github.workflow,
          context.config.github.group,
          dir
        );
        if (parentWorkflowInformation) {
          await treatParents(
            context,
            projectList,
            parentProject,
            parentWorkflowInformation,
            true
          );
        } else {
          logger.warn(
            `workflow information ${context.config.github.workflow} not present for ${parentProject}. So, won't execute`
          );
        }
      }
    }
    if (shouldExecute) {
      await executeBuildCommands(
        getDir(context.config.rootFolder, project),
        workflowInformation["buildCommandsUpstream"] ||
          workflowInformation["buildCommands"]
      );
    }
  }
}

async function executeBuildCommands(cwd, buildCommands) {
  for (const command of buildCommands) {
    await execute(cwd, treatCommand(command));
  }
}

module.exports = {
  start,
  treatParents
};
