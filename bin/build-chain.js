#!/usr/bin/env node

const { ClientError, logger } = require("../src/lib/common");
const {
  executeLocally: pullRequestLocalFlow,
  executeFromEvent: pullRequestEventFlow
} = require("./flows/build-chain-pull-request");
const {
  isPullRequestFlowType,
  isBranchFlowType
} = require("../src/lib/util/action-utils");
const {
  createOctokitInstance,
  getArguments,
  getProcessEnvVariable,
  isLocallyExecution,
  addLocalExecutionVariables
} = require("../src/lib/util/execution-util");
require("dotenv").config();

async function main() {
  const args = getArguments();

  if (args.trace) {
    logger.level = "trace";
  } else if (args.debug) {
    logger.level = "debug";
  }

  const token = getProcessEnvVariable("GITHUB_TOKEN");
  const octokit = createOctokitInstance(token);

  if (isLocallyExecution(args)) {
    await handleLocalExecution(args, token, octokit);
  } else {
    await handleEventExecution(token, octokit);
  }
}

async function handleEventExecution(token, octokit) {
  if (isPullRequestFlowType()) {
    await pullRequestEventFlow(token, octokit, process.env);
  }
  if (isBranchFlowType()) {
    // await pullRequestLocalFlow(token, octokit, process.env);
  }
}

async function handleLocalExecution(args, token, octokit) {
  addLocalExecutionVariables({
    "definition-file": { value: args.df[0], mandatory: true }
  });
  if (args.f.includes("pr")) {
    await pullRequestLocalFlow(
      token,
      octokit,
      process.env,
      args.folder[0],
      args.url[0]
    );
  }
  if (args.f.includes("branch")) {
    // await pullRequest(octokit, args.url[0], process.env, args.folder[0]);
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
