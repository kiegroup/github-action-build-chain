const { run: uploadArtifacts } = require("./upload-artifacts");
const { logger } = require("../common");

async function archiveArtifacts(nodeTirggering, nodeArray, on) {
  const nodesToArchive = getNodesToArchive(nodeTirggering, nodeArray);
  logger.info(
    nodesToArchive.length > 0
      ? `Archiving artifacts for ${nodesToArchive.map(node => node.project)}`
      : "No artifacts to archive"
  );

  await uploadNodes(nodesToArchive, on);
}

function getNodesToArchive(nodeTriggering, nodeArray) {
  const archiveDependencies =
    nodeTriggering.build["archive-artifacts"] &&
    nodeTriggering.build["archive-artifacts"].dependencies
      ? nodeTriggering.build["archive-artifacts"].dependencies
      : "none";

  return archiveDependencies === "none"
    ? [nodeTriggering].filter(
        node =>
          node.build["archive-artifacts"] &&
          node.build["archive-artifacts"].paths
      )
    : nodeArray.filter(
        node =>
          node.build["archive-artifacts"] &&
          node.build["archive-artifacts"].paths &&
          (archiveDependencies === "all" ||
            archiveDependencies.includes(node.project) ||
            node.project === nodeTriggering.project)
      );
}

async function uploadNodes(nodesToArchive, on) {
  await Promise.allSettled(
    nodesToArchive.map(async node => {
      logger.info(`Project [${node.project}]. Uploading artifacts...`);
      const uploadResponse = await uploadArtifacts(
        node.build["archive-artifacts"],
        on
      );
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
            `Project [${node.project}] Failed State. Artifact [${uploadResponse.artifactName}]. Failed Items (${uploadResponse.failedItems.length}): ${uploadResponse.failedItems}. ${uploadArtifactsMessage}`
          );
          return Promise.reject(uploadResponse);
        } else {
          logger.info(
            `Project [${node.project}]. Artifact [${uploadResponse.artifactName}]. ${uploadArtifactsMessage}`
          );
          return Promise.resolve(uploadResponse);
        }
      } else {
        logger.info(`Project [${node.project}]. No artifacts uploaded`);
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

module.exports = { archiveArtifacts };
