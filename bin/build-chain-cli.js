#!/usr/bin/env node

const { ClientError, logger } = require("../src/lib/common");
const { execute: executeBuild } = require("./actions/build-actions");
const { execute: executeTools } = require("./actions/tools-action");
const {
  createOctokitInstance,
  getProcessEnvVariable,
  addLocalExecutionVariables
} = require("./bin-utils");
const { getArguments } = require("./arguments/arguments-constructor");
require("dotenv").config();

async function main() {
  const args = getArguments();
  if (args.trace) {
    logger.level = "trace";
  } else if (args.debug) {
    logger.level = "debug";
  }
  logger.debug("ARGS", args);
  if (args.token) {
    process.env["GITHUB_TOKEN"] = args.token[0];
  }
  const token = getProcessEnvVariable("GITHUB_TOKEN");
  const octokit = createOctokitInstance(token);

  addLocalExecutionVariables({
    "definition-file": { value: args.df[0], mandatory: true }
  });

  if (args.action === "build") {
    await executeBuild(args, token, octokit);
  }
  if (args.action === "tools") {
    await executeTools(args);
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
