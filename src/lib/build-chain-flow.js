const {
  checkouProject,
  checkoutDependencies,
  getDir,
  readWorkflowInformation
} = require("./build-chain-flow-helper");
const { logger } = require("./common");
const { execute } = require("./command");
const { treatCommand } = require("./command/command-treatment-delegator");
const core = require("@actions/core");

async function start(context) {
  core.startGroup(
    `Checkout ${context.config.github.group}/${context.config.github.project}.`
  );
  const rootProjectFolder = getDir(
    context.config.rootFolder,
    context.config.github.project
  );
  await checkouProject(context, context.config.github.project, {
    group: context.config.github.group
  });
  const workflowInformation = readWorkflowInformation(
    context.config.github.jobName,
    context.config.github.workflow,
    context.config.github.group,
    rootProjectFolder
  );

  console.log("workflowInformation", workflowInformation);
  core.endGroup();
  await treatParents(
    context,
    [context.config.github.project],
    context.config.github.project,
    workflowInformation
  );
  await executeBuildCommands(
    rootProjectFolder,
    workflowInformation["buildCommands"],
    context.config.github.project
  );
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
    if (
      workflowInformation.parentDependencies &&
      Object.keys(workflowInformation.parentDependencies).length > 0
    ) {
      core.startGroup(
        `Checking out dependencies [${Object.keys(
          workflowInformation.parentDependencies
        ).join(", ")}] for project ${project}`
      );
      await checkoutDependencies(
        context,
        workflowInformation.parentDependencies
      );
      core.endGroup();
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
          workflowInformation["buildCommands"],
        project
      );
    }
  }
}

async function executeBuildCommands(cwd, buildCommands, project) {
  for (const command of buildCommands) {
    await execute(cwd, treatCommand(command), project);
  }
}

module.exports = {
  start,
  treatParents
};
