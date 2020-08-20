const { checkoutProject, getDir } = require("./build-chain-flow-helper");
const {
  readWorkflowInformation,
  checkoutParentsAndGetWorkflowInformation
} = require("./workflow-informaton-reader");
const { logger } = require("./common");
const { execute } = require("./command");
const { treatCommand } = require("./command/command-treatment-delegator");
const core = require("@actions/core");
const uploadArtifacts = require("./artifacts/upload-artifacts");

async function start(context) {
  core.startGroup(
    `Checkout ${context.config.github.group}/${context.config.github.project}.`
  );
  const projectFolder = getDir(
    context.config.rootFolder,
    context.config.github.project
  );
  await checkoutProject(context, context.config.github.project, {
    group: context.config.github.group
  });
  const workflowInformation = readWorkflowInformation(
    context.config.github.project,
    context.config.github.jobName,
    context.config.github.workflow,
    context.config.github.group,
    context.config.matrixVariables,
    projectFolder
  );
  core.endGroup();

  const parentWorkflowInformationArray = (
    await checkoutParentsAndGetWorkflowInformation(
      context,
      [context.config.github.project],
      context.config.github.project,
      workflowInformation.parentDependencies
    )
  ).reverse();

  await executeBuildCommandsWorkflowInformation(
    context.config.rootFolder,
    workflowInformation,
    parentWorkflowInformationArray
  );
  core.startGroup(`Archiving artifacts...`);
  await archiveArtifacts(
    parentWorkflowInformationArray.concat(workflowInformation)
  );
  core.endGroup();
}

async function executeBuildCommandsWorkflowInformation(
  rootFolder,
  workflowInformation,
  parentWorkflowInformationArray
) {
  for await (const wi of parentWorkflowInformationArray) {
    await executeBuildCommands(
      getDir(rootFolder, wi.project),
      wi["buildCommandsUpstream"] || wi["buildCommands"],
      wi.project
    );
  }
  await executeBuildCommands(
    getDir(rootFolder, workflowInformation.project),
    workflowInformation["buildCommands"],
    workflowInformation.project
  );
}

async function archiveArtifacts(workflowInformationArray) {
  const wiArrayWithArtifacts = workflowInformationArray.filter(
    wi => wi.archiveArtifacts
  );
  logger.info(
    wiArrayWithArtifacts.length > 0
      ? `Archiving artifacts for ${wiArrayWithArtifacts}`
      : "No artifacts to archive"
  );
  const uploadResponses = await Promise.all(
    wiArrayWithArtifacts.map(async wi => {
      logger.info(`Project ${wi.project}. Uploading artifacts...`);
      const uploadResponse = await uploadArtifacts.run(wi.archiveArtifacts);
      if (uploadResponse) {
        logger.info(
          `Project ${wi.project}. Artifact name ${uploadResponse.artifactName} uploaded.`
        );
        if (
          uploadResponse.failedItems &&
          uploadResponse.failedItems.length > 0
        ) {
          logger.info(
            `Project ${wi.project}. These items have failed ${uploadResponse.failedItems}.`
          );
        }
      } else {
        logger.info(`Project ${wi.project}. No artifacts uploaded`);
      }
      return uploadResponse;
    })
  );
  if (uploadResponses && uploadResponses.length > 0) {
    logger.info(
      `A total of ${uploadResponses.length} artifacts have been uploaded.`
    );
  }
}

async function executeBuildCommands(cwd, buildCommands, project) {
  for (const command of buildCommands) {
    await execute(cwd, treatCommand(command), project);
  }
}

module.exports = {
  start
};
