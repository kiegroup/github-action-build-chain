const { start } = require("./build-chain-flow");

async function executeGitHubAction(context) {
  await start(context);
}

module.exports = { executeGitHubAction };
