const { Octokit } = require("@octokit/rest");

const { executeLocally } = require("../lib/api");
const { createConfig } = require("../lib/common");

async function main() {
  require("dotenv").config();

  const token = process.env.GITHUB_TOKEN;

  const octokit = new Octokit({
    auth: `token ${token}`,
    userAgent: "ginxo/github-action-build-chain-it"
  });

  const config = createConfig({
  });

  const context = { token, octokit, config };

  await executeLocally(context, process.env.URL);
}

main().catch(e => {
  process.exitCode = 1;
  console.error(e);
});
