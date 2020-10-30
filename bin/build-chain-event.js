#!/usr/bin/env node

const { ClientError, logger } = require("../src/lib/common");
const {
  executeFromEvent: pullRequestEventFlow
} = require("./flows/build-chain-pull-request");
const { executeFromEvent: fdbEventFlow } = require("./flows/build-chain-fdb");
const {
  isPullRequestFlowType,
  isFDBFlowType,
  getFlowType
} = require("../src/lib/util/action-utils");
const { createOctokitInstance, getProcessEnvVariable } = require("./bin-utils");
require("dotenv").config();

async function main() {
  const token = getProcessEnvVariable("GITHUB_TOKEN");
  const octokit = createOctokitInstance(token);
  if (isPullRequestFlowType()) {
    await pullRequestEventFlow(token, octokit, process.env);
  } else if (isFDBFlowType()) {
    await fdbEventFlow(token, octokit, process.env);
  } else {
    throw new Error(
      `flow type input value '${getFlowType()}' is not supported. Please check documentation.`
    );
  }
}

if (require.main === module) {
  main().catch(e => {
    if (e instanceof ClientError) {
      process.exitCode = 2;
      logger.error(e);
    } else {
      process.exitCode = 1;
      logger.error(e);
    }
  });
}

module.exports = { main };
