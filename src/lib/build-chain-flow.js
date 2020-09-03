const { checkoutProject, getDir } = require("./build-chain-flow-helper");
const { printCheckoutInformation } = require("./summary");
const {
  readWorkflowInformation,
  checkoutParentsAndGetWorkflowInformation
} = require("./workflow-informaton-reader");
const { logger } = require("./common");
const { execute } = require("./command");
const { treatCommand } = require("./command/command-treatment-delegator");
const core = require("@actions/core");
const uploadArtifacts = require("./artifacts/upload-artifacts");
const { getCheckoutInfo } = require("./context");

async function start(context) {
  core.startGroup(
    `Checkout ${context.config.github.group}/${context.config.github.project}.`
  );
  const projectFolder = getDir(
    context.config.rootFolder,
    context.config.github.project
  );
  await checkoutProject(
    context,
    context.config.github.project,
    {
      group: context.config.github.group
    },
    context.config.github.targetBranch
  );
  const workflowInformation = readWorkflowInformation(
    context.config.github.project,
    context.config.github.jobId,
    `.github/workflows/${context.config.github.flowFile}`,
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
      context.config.github.targetBranch,
      workflowInformation
    )
  ).reverse();

  core.startGroup(`Checkout Summary...`);
  printCheckoutInformation(getCheckoutInfo(context));
  core.endGroup();

  await executeBuildCommandsWorkflowInformation(
    context.config.rootFolder,
    workflowInformation,
    parentWorkflowInformationArray
  );
  core.startGroup(`Archiving artifacts...`);
  await archiveArtifacts(
    workflowInformation,
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

async function archiveArtifacts(
  workflowInformationTriggering,
  workflowInformationArray
) {
  const archiveDependencies =
    workflowInformationTriggering.archiveArtifacts.dependencies;
  logger.info(
    `${archiveDependencies} parent artifact(s) will be treated to be uploaded`
  );
  const wiArrayWithArtifacts =
    archiveDependencies === "none"
      ? [workflowInformationTriggering].filter(wi => wi.archiveArtifacts.path)
      : workflowInformationArray.filter(
          wi =>
            wi.archiveArtifacts.path &&
            (archiveDependencies === "all" ||
              archiveDependencies.includes(wi.project) ||
              wi.project === workflowInformationTriggering.project)
        );
  logger.info(
    wiArrayWithArtifacts.length > 0
      ? `Archiving artifacts for ${wiArrayWithArtifacts.map(wi => wi.project)}`
      : "No artifacts to archive"
  );

  await Promise.allSettled(
    wiArrayWithArtifacts.map(async wi => {
      logger.info(`Project [${wi.project}]. Uploading artifacts...`);
      const uploadResponse = await uploadArtifacts.run(wi.archiveArtifacts);
      if (uploadResponse) {
        const uploadArtifactsMessage =
          uploadResponse.artifactItems &&
          uploadResponse.artifactItems.length > 0
            ? `Uploaded Items (${uploadResponse.artifactItems.length}): ${uploadResponse.artifactItems}.`
            : "";
        if (
          uploadResponse.failedItems &&
          uploadResponse.failedItems.length > 0
        ) {
          logger.error(
            `Project [${wi.project}] Failed State. Artifact [${uploadResponse.artifactName}]. Failed Items (${uploadResponse.failedItems.length}): ${uploadResponse.failedItems}. ${uploadArtifactsMessage}`
          );
          return Promise.reject(uploadResponse);
        } else {
          logger.info(
            `Project [${wi.project}]. Artifact [${uploadResponse.artifactName}]. ${uploadArtifactsMessage}`
          );
          return Promise.resolve(uploadResponse);
        }
      } else {
        logger.info(`Project [${wi.project}]. No artifacts uploaded`);
        return Promise.resolve(undefined);
      }
    })
  ).then(promises => {
    logger.info("-------------- ARCHIVE ARTIFACTS SUMMARY --------------");
    const totalUploadResponses = promises
      .map(promiseResult => promiseResult.value || promiseResult.reason)
      .filter(
        uploadResponse =>
          uploadResponse &&
          uploadResponse.artifactItems &&
          uploadResponse.artifactItems.length > 0
      );
    const uploadedFiles = totalUploadResponses.flatMap(
      uploadResponse => uploadResponse.artifactItems
    );
    const failureUploadResponses = promises
      .filter(promiseResult => promiseResult.reason)
      .map(promiseResult => promiseResult.reason)
      .filter(
        uploadResponse =>
          uploadResponse &&
          uploadResponse.failedItems &&
          uploadResponse.failedItems.length > 0
      );
    const failedFiles = failureUploadResponses.flatMap(
      uploadResponse => uploadResponse.failedItems
    );
    logger.info(
      `Artifacts uploaded (${
        totalUploadResponses.length
      }): ${totalUploadResponses.map(
        uploadResponse => uploadResponse.artifactName
      )}. Files (${uploadedFiles.length}): ${uploadedFiles}`
    );
    logger.info(
      `Artifacts failed (${
        failureUploadResponses.length
      }): ${failureUploadResponses.map(
        uploadResponse => uploadResponse.artifactName
      )}. Files (${failedFiles.length}): ${failedFiles}`
    );
  });
}

async function executeBuildCommands(cwd, buildCommands, project) {
  for (const command of buildCommands) {
    await execute(cwd, treatCommand(command), project);
  }
}

module.exports = {
  start
};
