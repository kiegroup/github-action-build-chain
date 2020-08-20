const { create } = require("@actions/artifact");
const core = require("@actions/core");
const noFileOptions = require("./constants");
const { findFilesToUpload } = require("./search");
const { logger } = require("../common");

async function run(archiveArtifacts) {
  try {
    logger.info(`Uploading artifacts for path [${archiveArtifacts.paths}]`);
    const searchResult = await findFilesToUpload(archiveArtifacts.paths);
    if (searchResult.filesToUpload.length === 0) {
      switch (archiveArtifacts.ifNoFilesFound) {
        case noFileOptions.warn: {
          core.warning(
            `[WARNING] No files were found with the provided path: ${archiveArtifacts.paths}. No artifacts will be uploaded.`
          );
          break;
        }
        case noFileOptions.error: {
          core.setFailed(
            `[ERROR] No files were found with the provided path: ${archiveArtifacts.paths}. No artifacts will be uploaded.`
          );
          break;
        }
        case noFileOptions.ignore: {
          core.info(
            `[INFO] No files were found with the provided path: ${archiveArtifacts.paths}. No artifacts will be uploaded.`
          );
          break;
        }
      }
    } else {
      core.info(
        `[INFO] With the provided path (${archiveArtifacts.paths}), there will be ${searchResult.filesToUpload.length} file(s) uploaded`
      );
      core.debug(
        `[DEBUG] Root artifact directory is ${searchResult.rootDirectory}`
      );

      const artifactClient = create();
      const options = {
        continueOnError: false
      };
      const uploadResponse = await artifactClient.uploadArtifact(
        archiveArtifacts.name,
        searchResult.filesToUpload,
        searchResult.rootDirectory,
        options
      );
      if (uploadResponse.failedItems.length > 0) {
        core.setFailed(
          `[ERROR] An error was encountered when uploading ${uploadResponse.artifactName}. There were ${uploadResponse.failedItems.length} items that failed to upload.`
        );
      } else {
        core.info(
          `[INFO] Artifact ${uploadResponse.artifactName} has been successfully uploaded!`
        );
      }
      return uploadResponse;
    }
  } catch (err) {
    core.setFailed(err.message);
  }
  return undefined;
}
module.exports = {
  run
};
