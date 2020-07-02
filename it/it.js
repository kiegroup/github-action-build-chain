const { Octokit } = require("@octokit/rest");

const { executeLocally } = require("../lib/api");
const { createConfig, logger } = require("../lib/common");

async function main() {
  require("dotenv").config();

  const token = process.env.GITHUB_TOKEN;

  const octokit = new Octokit({
    auth: `token ${token}`,
    userAgent: "ginxo/github-build-chain-action-it"
  });

  addInputVariableToEnv('parent-dependencies');
  addInputVariableToEnv('child-dependencies');
  const config = createConfig({
  });
  logger.info("Configuration:", config);

  const context = { token, octokit, config };

  await executeLocally(context, process.env.URL);
}

function addInputVariableToEnv(inputVariable) {
  if (process.env[inputVariable]) {
    process.env[`INPUT_${inputVariable.replace(/ /g, '_').toUpperCase()}`] = process.env[inputVariable];
  }
}

main().catch(e => {
  process.exitCode = 1;
  console.error(e);
});
