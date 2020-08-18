const { Octokit } = require("@octokit/rest");

const { executeGitHubAction } = require("../src/lib/api");
const { createConfigLocally } = require("../src/lib/config");

async function main() {
  require("dotenv").config();

  const token = process.env.GITHUB_TOKEN;

  const octokit = new Octokit({
    auth: `token ${token}`,
    userAgent: "kiegroup/github-build-chain-action-it"
  });
  addInputVariableToEnv("parent-dependencies");
  addInputVariableToEnv("child-dependencies");
  addInputVariableToEnv("workflow-file-name");
  const config = await createConfigLocally(
    octokit,
    process.env.URL,
    process.env
  );
  const context = { token, octokit, config };
  await executeGitHubAction(context);
}

function addInputVariableToEnv(inputVariable) {
  if (process.env[inputVariable]) {
    process.env[`INPUT_${inputVariable.replace(/ /g, "_").toUpperCase()}`] =
      process.env[inputVariable];
  }
}

main().catch(e => {
  process.exitCode = 1;
  console.error(e);
});
