#!/usr/bin/env node

const { logger } = require("../../src/lib/common");
const {
  eventFlowTypeToCliFlowType,
  getDefinitionFile,
  getStartingProject,
  getFlowType
} = require("../../src/lib/util/action-utils");
const core = require("@actions/core");
const pkg = require("../../package.json");

function printLocalCommandPullRequest(eventData) {
  logger.debug(
    "printLocalCommandPullRequest. pull_request:",
    eventData.pull_request
  );

  const command = `${Object.keys(
    pkg.bin
  )} -df "${getDefinitionFile()}" build ${eventFlowTypeToCliFlowType(
    getFlowType()
  )} -url ${eventData.pull_request.html_url}${
    getStartingProject() ? ` -sp ${getStartingProject()}` : ""
  }`;

  logger.info(command);
  core.notice(command, { title: "Local Command" });
}

function printLocalCommandPush(eventData) {
  logger.debug(
    "printLocalCommandPush. Full name:",
    eventData.repository.full_name
  );
  logger.debug("printLocalCommandPush. Ref:", eventData.ref);

  logger.info(
    `${Object.keys(
      pkg.bin
    )} -df "${getDefinitionFile()}" build ${eventFlowTypeToCliFlowType(
      getFlowType()
    )} -p ${eventData.repository.full_name} -b ${eventData.ref
      .split("refs/heads/")
      .pop()}${getStartingProject() ? ` -sp ${getStartingProject()}` : ""}`
  );
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
  try {
    if (eventData.pull_request) {
      printLocalCommandPullRequest(eventData);
    } else if (eventData.repository && eventData.ref) {
      printLocalCommandPush(eventData);
    } else {
      logger.warn(
        "The event data is not prepared for CLI execution. Command can't be printed."
      );
    }
  } catch (ex) {
    logger.error(
      "Error printing the CLI command. Please contact administrator or fill an issue on github-action-build-chain project."
    );
    logger.error(ex);
  }

  logger.warn("Remember you need Node installed in the environment.");
  logger.warn("The `GITHUB_TOKEN` has to be set in the environment.");

  core.endGroup();
}

module.exports = { printLocalCommand };
