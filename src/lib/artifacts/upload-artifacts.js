const { create } = require("@actions/artifact");
const core = require("@actions/core");
const noFileOptions = require("./constants");
const { findFilesToUpload } = require("./search");

async function run(archiveArtifacts) {
  try {
    core.startGroup(`Uploading artifacts for path [${archiveArtifacts.path}]`);
    const searchResult = await findFilesToUpload(archiveArtifacts.path);
    if (searchResult.filesToUpload.length === 0) {
      switch (archiveArtifacts.ifNoFilesFound) {
        case noFileOptions.warn: {
          core.warning(
            `No files were found with the provided path: ${archiveArtifacts.path}. No artifacts will be uploaded.`
          );
          break;
        }
        case noFileOptions.error: {
          core.setFailed(
            `No files were found with the provided path: ${archiveArtifacts.path}. No artifacts will be uploaded.`
          );
          break;
        }
        case noFileOptions.ignore: {
          core.info(
            `No files were found with the provided path: ${archiveArtifacts.path}. No artifacts will be uploaded.`
          );
          break;
        }
      }
    } else {
      core.info(
        `With the provided path, there will be ${searchResult.filesToUpload.length} file(s) uploaded`
      );
      core.debug(`Root artifact directory is ${searchResult.rootDirectory}`);

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
          `An error was encountered when uploading ${uploadResponse.artifactName}. There were ${uploadResponse.failedItems.length} items that failed to upload.`
        );
      } else {
        core.info(
          `Artifact ${uploadResponse.artifactName} has been successfully uploaded!`
        );
      }
    }
  } catch (err) {
    core.setFailed(err.message);
  } finally {
    core.endGroup();
  }
}
module.exports = {
  run
};
