const git = require("../git");
const { logger } = require("../common");

/**
 * It treats a git hash from a remote repositry.
 *
 * @param {string} repositoryUrl the repository URL
 * @param {string} branch the branch to get the hash from
 * @param {number} hashLength the length of hash to return back
 */
async function getRemoteSha(repositoryUrl, branch, hashLength = 7) {
  try {
    const remoteHashValue = await git.remoteSha(repositoryUrl, branch);
    logger.debug(`Hash for ${repositoryUrl}:${branch} '${remoteHashValue}'`);
    return `@${remoteHashValue.substring(0, hashLength)}`;
  } catch (e) {
    logger.warn(
      `Error getting sha for ${repositoryUrl}:${branch}. It is only for logging purposes, no worries.`
    );
    return undefined;
  }
}

module.exports = { getRemoteSha };
