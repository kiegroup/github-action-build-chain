const { logger, ClientError } = require("../../src/lib/common");
const { start } = require("../../src/lib/flows/pull-request-flow");
const { createCommonConfig } = require("../../src/lib/flows/common/config");
const { getProcessEnvVariable } = require("../bin-utils");
const fse = require("fs-extra");

const GITHUB_URL_REGEXP = /^https:\/\/github.com\/([^/]+)\/([^/]+)\/(pull|tree)\/([^ ]+)$/;
const GIT_URL_REGEXP = /^(https?:\/\/.*\/)([^/]+)\/([^/]+)\/(pull|tree)\/([^ ]+)$/;

/**
 * Executes pull request flow
 * @param {String} token the token to communicate to github
 * @param {Object} octokit octokit instance
 * @param {Object} env proces.env
 * @param {Object} pullRequestData information from pull request event
 * @param {String} rootFolder path to store flow data/projects
 * @param {Boolean} isArchiveArtifacts
 */
async function execute(
  token,
  octokit,
  env,
  eventData,
  rootFolder,
  isArchiveArtifacts
) {
  const githubInformation = {
    sourceGroup: eventData.pull_request.head.repo.full_name.split("/")[0], // forkedGroup
    author: eventData.pull_request.head.user.login, // Ginxo
    sourceRepository: eventData.repository
      ? eventData.repository.name
      : eventData.pull_request.repo
      ? eventData.pull_request.repo.full_name
      : env["GITHUB_REPOSITORY"] // forkedGroup/lienzo-tests
  };

  const config = await createCommonConfig(githubInformation, rootFolder, env);
  const context = { token, octokit, config };
  await start(context, isArchiveArtifacts);
}

/**
 * Prepares execution when this is triggered from a github action's event
 * @param {String} token the token to communicate to github
 * @param {Object} octokit octokit instance
 * @param {Object} env proces.env
 */
async function executeFromEvent(token, octokit, env) {
  const eventDataStr = await fse.readFile(
    getProcessEnvVariable("GITHUB_EVENT_PATH"),
    "utf8"
  );
  const eventData = JSON.parse(eventDataStr);
  await execute(token, octokit, env, eventData, undefined, true);
}

/**
 * Prepares execution when this is triggered from command line
 * @param {String} token the token to communicate to github
 * @param {Object} octokit octokit instance
 * @param {Object} env proces.env
 * @param {String} rootFolder path to store flow data/projects
 * @param {String} eventUrl event url
 */
async function executeLocally(token, octokit, env, rootFolder, eventUrl) {
  logger.info(`Executing pull request flow for ${eventUrl} in ${rootFolder}`);

  const eventData = await getEvent(octokit, eventUrl);
  env["GITHUB_SERVER_URL"] = eventUrl.match(GIT_URL_REGEXP)[1];
  env["GITHUB_ACTION"] = undefined;
  env["GITHUB_ACTOR"] = eventData.pull_request.head.user.login;
  env["GITHUB_HEAD_REF"] = eventData.pull_request.head.ref;
  env["GITHUB_BASE_REF"] = eventData.pull_request.base.ref;
  env["GITHUB_REPOSITORY"] = eventData.pull_request.base.repo.full_name;
  env["GITHUB_REF"] = eventData.ref;

  await execute(token, octokit, env, eventData, rootFolder, false);
}

async function getEvent(octokit, eventUrl) {
  let event;

  const m = eventUrl.match(GITHUB_URL_REGEXP);
  if (m && m[3] === "pull") {
    logger.debug("Getting PR data...");
    const { data: pull_request } = await octokit.pulls.get({
      owner: m[1],
      repo: m[2],
      pull_number: m[4]
    });
    event = {
      action: "opened",
      ref: `refs/pull/${m[4]}/merge`,
      type: "pull_request",
      pull_request
    };
  } else if (m && m[3] === "tree") {
    event = {
      type: "tree",
      ref: `refs/heads/${m[4]}`,
      repository: {
        name: m[2],
        owner: {
          name: m[1]
        }
      }
    };
  } else {
    throw new ClientError(`invalid URL: ${eventUrl}`);
  }
  return event;
}

module.exports = { executeLocally, executeFromEvent };
