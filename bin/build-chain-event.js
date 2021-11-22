#!/usr/bin/env node

const { ClientError, logger } = require("../src/lib/common");
const {
  executeFromEvent: pullRequestEventFlow
} = require("./flows/build-chain-pull-request");
const {
  executeFromEvent: fdbEventFlow
} = require("./flows/build-chain-full-downstream");
const {
  executeFromEvent: singleEventFlow
} = require("./flows/build-chain-single");
const {
  executeFromEvent: branchEventFlow
} = require("./flows/build-chain-branch");
const {
  isPullRequestFlowType,
  isFDFlowType,
  isSingleFlowType,
  isBranchFlowType,
  getFlowType,
  getLoggerLevel
} = require("../src/lib/util/action-utils");
const {
  createOctokitInstance,
  getProcessEnvVariable
} = require("./utils/bin-utils");
require("dotenv").config();
const fse = require("fs-extra");

const { printLocalCommand } = require("./utils/print-event-command-utils");

async function getEventData() {
  logger.debug("getEventData", getProcessEnvVariable("GITHUB_EVENT_PATH"));
  let eventPath;
  try {
    eventPath = getProcessEnvVariable("GITHUB_EVENT_PATH");
  } catch (e) {
    logger.error(
      "Error trying to get event path from 'GITHUB_EVENT_PATH' environment variable. Are you sure you are executing this based on a github event?"
    );
    throw e;
  }
  const eventDataStr = await fse.readFile(eventPath, "utf8");
  const result = JSON.parse(eventDataStr);
  logger.debug("getEventData result", result);
  return result;
}

async function main() {
  const eventData = await getEventData();
  logger.debug("eventData", eventData);
  logger.debug("eventData", eventData);
  logger.level = getLoggerLevel();

  await printLocalCommand(eventData);

  const token = getProcessEnvVariable("GITHUB_TOKEN", false);
  const octokit = createOctokitInstance(token);

  logger.debug("getFlowType", getFlowType());
  if (isPullRequestFlowType()) {
    await pullRequestEventFlow(token, octokit, process.env, eventData);
  } else if (isFDFlowType()) {
    await fdbEventFlow(token, octokit, process.env, eventData);
  } else if (isSingleFlowType()) {
    await singleEventFlow(token, octokit, process.env, eventData);
  } else if (isBranchFlowType()) {
    await branchEventFlow(token, octokit, process.env);
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
