const { getDefinitionFile } = require("../../util/action-utils");

function getInputs() {
  return {
    definitionFile: getDefinitionFile()
  };
}

async function createCommonConfig(eventData, rootFolder, env = {}) {
  async function parseGitHub(eventData, env) {
    return {
      serverUrl: env["GITHUB_SERVER_URL"]
        ? env["GITHUB_SERVER_URL"].replace(/\/$/, "")
        : undefined, // https://github.com
      action: env["GITHUB_ACTION"], // Ginxogithub-action-build-chain
      sourceGroup: eventData.pull_request.head.repo.full_name.split("/")[0], // forkedGroup
      author: eventData.pull_request.head.user.login, // Ginxo
      actor: env["GITHUB_ACTOR"], // Ginxo
      sourceBranch: env["GITHUB_HEAD_REF"], // Ginxo-patch-1
      targetBranch: env["GITHUB_BASE_REF"], // master
      jobId: env["GITHUB_JOB"], // build-chain
      sourceRepository: eventData.repository
        ? eventData.repository.name
        : eventData.pull_request.repo
        ? eventData.pull_request.repo.full_name
        : env["GITHUB_REPOSITORY"], // forkedGroup/lienzo-tests
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
    rootFolder: rootFolder === undefined ? "" : rootFolder
  };
}

module.exports = {
  createCommonConfig,
  getInputs
};
