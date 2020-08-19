const buildChainFlow = require("./build-chain-flow");
const uploadArtifacts = require("./artifacts/upload-artifacts");
const { logger } = require("./common");

async function executeGitHubAction(context) {
  logger.info("context", context);
  logger.info("context.config", context.config);
  logger.info(
    "context.config.archiveArtifacts",
    context.config.archiveArtifacts
  );
  await buildChainFlow.start(context);
  if (context.config.archiveArtifacts.paths) {
    uploadArtifacts.run(context.config.archiveArtifacts);
  }
}

module.exports = { executeGitHubAction };
