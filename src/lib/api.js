const buildChainFlow = require("./build-chain-flow");
const uploadArtifacts = require("./artifacts/upload-artifacts");

async function executeGitHubAction(context) {
  await buildChainFlow.start(context);
  if (context.config.archiveArtifacts.paths) {
    uploadArtifacts.run(context.config.archiveArtifacts);
  }
}

module.exports = { executeGitHubAction };
