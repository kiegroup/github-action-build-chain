const buildChainFlow = require("./build-chain-flow");
const { logger } = require("./common");

async function executeGitHubAction(context) {
  logger.info("Executing action", __dirname);
  await buildChainFlow.start(context);
}

module.exports = { executeGitHubAction };
