const buildChainFlow = require("./build-chain-flow");

async function executeGitHubAction(context) {
  await buildChainFlow.start(context);
}

module.exports = { executeGitHubAction };
