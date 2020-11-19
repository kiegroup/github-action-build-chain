const {
  getDefinitionFile,
  getStartingProject
} = require("../../util/action-utils");

function getInputs() {
  return {
    definitionFile: getDefinitionFile(),
    startingProject: getStartingProject()
  };
}

async function createCommonConfig(eventData, rootFolder, env) {
  async function parseGitHub(eventData, env) {
    return {
      serverUrl: getServerUrl(env["GITHUB_SERVER_URL"]), // https://github.com
      serverUrlWithToken: getServerUrl(
        env["GITHUB_SERVER_URL"],
        env["GITHUB_TOKEN"]
      ), // https://token@github.com
      action: env["GITHUB_ACTION"], // Ginxogithub-action-build-chain
      sourceGroup: eventData.sourceGroup,
      author: eventData.author,
      actor: env["GITHUB_ACTOR"], // Ginxo
      sourceBranch: env["GITHUB_HEAD_REF"], // Ginxo-patch-1
      targetBranch: env["GITHUB_BASE_REF"], // master
      jobId: env["GITHUB_JOB"], // build-chain
      sourceRepository: eventData.sourceRepository,
      repository: env["GITHUB_REPOSITORY"], // Ginxo/lienzo-tests
      group: env["GITHUB_REPOSITORY"].split("/")[0], // Ginxo
      project: env["GITHUB_REPOSITORY"].split("/")[1], // lienzo-tests
      groupProject: env["GITHUB_REPOSITORY"],
      workflowName: env["GITHUB_WORKFLOW"], // Build Chain
      ref: env["GITHUB_REF"], // refs/pull/1/merge'
      inputs: getInputs()
    };
  }
  return {
    github: await parseGitHub(eventData, env),
    rootFolder: rootFolder === undefined ? env["GITHUB_WORKSPACE"] : rootFolder
  };
}

function getServerUrl(serverUrl, token = undefined) {
  const result = serverUrl ? serverUrl.replace(/\/$/, "") : undefined;
  if (result && token) {
    return result.replace("://", `://${token}@`);
  } else {
    return result;
  }
}

module.exports = {
  createCommonConfig,
  getInputs
};
