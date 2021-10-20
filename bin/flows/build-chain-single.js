const { logger } = require("../../src/lib/common");
const {
  prepareEnv,
  createGithubInformationObject,
  getEvent
} = require("./build-chain-pull-request-helper");
const { start } = require("../../src/lib/flows/single-flow");
const { createCommonConfig } = require("../../src/lib/flows/common/config");

/**
 * Executes single flow
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
  options = {}
) {
  const githubInformation = createGithubInformationObject(eventData, env);
  const config = await createCommonConfig(githubInformation, rootFolder, env);
  const context = { token, octokit, config };
  logger.debug(
    "build-chain-pull-single.js. githubInformation",
    githubInformation
  );
  logger.debug("build-chain-pull-single.js. config", config);
  await start(context, options);
}

/**
 * Prepares execution when this is triggered from a github action's event
 * @param {String} token the token to communicate to github
 * @param {Object} octokit octokit instance
 * @param {Object} env proces.env
 * @param {Object} the JSON object for the event data
 */
async function executeFromEvent(token, octokit, env, eventData) {
  await execute(token, octokit, env, eventData, undefined, {
    isArchiveArtifacts: true
  });
}

/**
 * Prepares execution when this is triggered from command line
 * @param {String} token the token to communicate to github
 * @param {Object} octokit octokit instance
 * @param {Object} env proces.env
 * @param {String} rootFolder path to store flow data/projects
 * @param {String} eventUrl event url
 */
async function executeLocally(
  token,
  octokit,
  env,
  rootFolder,
  eventUrl,
  options = {}
) {
  logger.info(`Executing pull request flow for ${eventUrl} in ${rootFolder}`);
  options.isArchiveArtifacts = false;

  const eventData = await getEvent(octokit, eventUrl);
  prepareEnv(env, eventUrl, eventData);
  await execute(token, octokit, env, eventData, rootFolder, options);
}

module.exports = { executeLocally, executeFromEvent };
