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
  const config = await createConfigLocally(
    octokit,
    process.env.URL,
    process.env
  );
  const context = { token, octokit, config };
  await executeGitHubAction(context);
}

main().catch(e => {
  process.exitCode = 1;
  console.error(e);
});
