#!/usr/bin/env node

const { ClientError, logger } = require("../src/lib/common");
const {
  executeLocally: pullRequestLocalFlow,
  executeFromEvent: pullRequestEventFlow
} = require("./flows/build-chain-pull-request");
const {
  executeLocally: branchLocalFlow
} = require("./flows/build-chain-branch");
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
} = require("./bin-utils");
require("dotenv").config();
const assert = require("assert");

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
    assert(
      args.url && args.url.length > 0,
      "URL has not been defined, please define one following instructions"
    );
    await pullRequestLocalFlow(
      token,
      octokit,
      process.env,
      args.folder[0],
      args.url[0]
    );
  }
  if (args.f.includes("branch")) {
    assert(
      args.p && args.p.length > 0,
      "project has not been defined, please define one following instructions"
    );
    assert(
      args.b && args.b.length > 0,
      "branch has not been defined, please define one following instructions"
    );
    addLocalExecutionVariables({
      "starting-project": { value: args.p[0], mandatory: true }
    });
    await branchLocalFlow(
      token,
      octokit,
      process.env,
      args.folder[0],
      args.g ? args.g[0] : undefined,
      args.p[0],
      args.b[0],
      {
        command: args.c ? args.c[0] : undefined,
        projectToStart: args.ps ? args.ps[0] : undefined,
        skipExecution: args.skipExecution
      }
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
