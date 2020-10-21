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
  addInputVariableToEnv("definition-file", true);
  const config = await createConfigLocally(
    octokit,
    process.env.URL,
    process.env
  );
  const context = { token, octokit, config };
  await executeGitHubAction(context);
}

/**
 * The idea here is to add every env variable as an INPUT_X variable, this is the way github actions sets variables to the environment, so it's the way to introduce inputs from command line
 * @param {String} inputVariable the input variable name
 * @param {Boolean} mandatory is the input variable mandatory
 */
function addInputVariableToEnv(inputVariable, mandatory) {
  if (process.env[inputVariable]) {
    process.env[`INPUT_${inputVariable.replace(/ /g, "_").toUpperCase()}`] =
      process.env[inputVariable];
  } else if (mandatory) {
    throw new Error(
      `Input variable ${inputVariable} is mandatory and it's not defined. Please add it following documentation.`
    );
  }
}

main().catch(e => {
  process.exitCode = 1;
  console.error(e);
});
