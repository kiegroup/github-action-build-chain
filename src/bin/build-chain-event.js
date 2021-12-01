#!/usr/bin/env node

const { ClientError, logger } = require("..//lib/common");
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
  getLoggerLevel,
  additionalFlagsToOptions,
  getAdditionalFlags
} = require("..//lib/util/action-utils");
const {
  createOctokitInstance,
  getProcessEnvVariable
} = require("./utils/bin-utils");
require("dotenv").config();
const fse = require("fs-extra");

const { printLocalCommand } = require("./utils/print-event-command-utils");

async function getEventData() {
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
  return JSON.parse(eventDataStr);
}

async function main() {
  const eventData = await getEventData();
  logger.debug("eventData", eventData);
  logger.level = getLoggerLevel();

  const additionalFlags = getAdditionalFlags();
  const options = additionalFlagsToOptions(additionalFlags);
  logger.debug("options", options, additionalFlags);
  await printLocalCommand(eventData);

  const token = getProcessEnvVariable("GITHUB_TOKEN", false);
  const octokit = createOctokitInstance(token);

  logger.debug("getFlowType", getFlowType());

  if (isPullRequestFlowType()) {
    await pullRequestEventFlow(token, octokit, process.env, eventData, options);
  } else if (isFDFlowType()) {
    await fdbEventFlow(token, octokit, process.env, eventData, options);
  } else if (isSingleFlowType()) {
    await singleEventFlow(token, octokit, process.env, eventData, options);
  } else if (isBranchFlowType()) {
    await branchEventFlow(token, octokit, process.env, options);
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
