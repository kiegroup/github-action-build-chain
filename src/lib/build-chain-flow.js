const {
  checkoutDependencies,
  getDir,
  readWorkflowInformation
} = require("./build-chain-flow-helper");
const { logger } = require("./common");
const { execute } = require("./command");

async function start(context) {
  console.log(
    "context.config.github",
    context.config.github,
    context.config.github.jobName,
    context.config.github.workflow
  );
  const workflowInformation = readWorkflowInformation(
    context.config.github.jobName,
    context.config.github.workflow
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
        const dir = getDir(parentProject);
        const parentWorkflowInformation = readWorkflowInformation(
          context.config.github.jobName,
          context.config.github.workflow,
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
        getDir(project),
        workflowInformation["buildCommandsUpstream"] ||
          workflowInformation["buildCommands"]
      );
    }
  }
}

async function executeBuildCommands(cwd, buildCommands) {
  for (const command of buildCommands) {
    await execute(cwd, command);
  }
}

module.exports = {
  start,
  treatParents
};
