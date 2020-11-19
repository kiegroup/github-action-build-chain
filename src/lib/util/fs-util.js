const fse = require("fs-extra");
const { logger } = require("../common");
const path = require("path");

function copyNodeFolder(rootFolder, sourceFolder, destinationFolders) {
  if (destinationFolders) {
    const clonedFolders = (typeof destinationFolders === "string"
      ? [destinationFolders]
      : destinationFolders
    ).map(destFolder => {
      const destinationFolder = path.join(rootFolder, destFolder);
      logger.info(`Copying ${sourceFolder} to ${destinationFolder}`);
      try {
        fse.copySync(sourceFolder, destinationFolder);
      } catch (err) {
        throw new Error(
          `Error copying project folder from  ${sourceFolder} to ${destinationFolder}. Message: ${err}`
        );
      }
      return { original: destFolder, to: destinationFolder };
    });
    return clonedFolders.map(clonedFolder => {
      const destinationFolder = path.join(sourceFolder, clonedFolder.original);
      moveFolder(clonedFolder.to, destinationFolder);
      return destinationFolder;
    });
  }
  return undefined;
}

function moveFolder(sourceFolder, destinationFolder) {
  try {
    logger.info(`Moving ${sourceFolder} to ${destinationFolder}`);
    fse.moveSync(sourceFolder, destinationFolder);
  } catch (err) {
    throw new Error(
      `Error moving project folder from  ${sourceFolder} to ${destinationFolder}. Message: ${err}`
    );
  }
}

module.exports = { copyNodeFolder };
