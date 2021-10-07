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
  eventFlowTypeToCliFlowType,
  getDefinitionFile,
  getStartingProject
} = require("../src/lib/util/action-utils");
const { createOctokitInstance, getProcessEnvVariable } = require("./bin-utils");
require("dotenv").config();
const core = require("@actions/core");
const pkg = require("../package.json");
const fse = require("fs-extra");

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

/**
 * prints the local command to be copy pasted by the users
 *
 * @param {Object} the JSON object for the event data
 */
function printLocalCommand(eventData) {
  core.startGroup(`Printing local execution command`);
  logger.info(
    "You can copy paste the following commands to locally execute build chain tool."
  );
  logger.info(`npm i @kie/build-chain-action@${pkg.version} -g`);
  logger.info(
    `${Object.keys(
      pkg.bin
    )} -df "${getDefinitionFile()}" build ${eventFlowTypeToCliFlowType(
      getFlowType()
    )} -url ${eventData.pull_request.html_url} ${
      getStartingProject() ? `-sp ${getStartingProject}` : ""
    }`
  );

  logger.warn("Remember you need Node installed in the environment.");
  logger.warn("The `GITHUB_TOKEN` has to be set in the environment.");
  core.endGroup();
}

async function main() {
  const eventData = await getEventData();

  printLocalCommand(eventData);

  const token = getProcessEnvVariable("GITHUB_TOKEN", false);
  const octokit = createOctokitInstance(token);

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
