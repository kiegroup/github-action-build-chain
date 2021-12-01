const { logger } = require("../..//lib/common");
const { start } = require("../..//lib/flows/branch-flow");
const { createCommonConfig } = require("../..//lib/flows/common/config");
const assert = require("assert");

/**
 * Executes branch flow
 * @param {String} token the token to communicate to github
 * @param {Object} octokit octokit instance
 * @param {Object} env proces.env
 * @param {Object} eventData
 * @param {String} rootFolder path to store flow data/projects
 * @param {String} command the command to execute for every project, no matter what's defined on definition file
 * @param {String} projectToStart the project to start building
 */
async function execute(
  token,
  octokit,
  env,
  githubInformation,
  rootFolder,
  options = {},
  overwriteConfig = {}
) {
  const config = await createCommonConfig(
    githubInformation,
    rootFolder,
    env,
    overwriteConfig
  );
  const context = { token, octokit, config };
  logger.debug(
    "build-chain-pull-branch.js. githubInformation",
    githubInformation
  );
  logger.debug("build-chain-pull-branch.js. options", options);
  logger.debug("build-chain-pull-branch.js. config", config);
  await start(context, options);
}

/**
 * Prepares execution when this is triggered from a github action's event
 * @param {String} token the token to communicate to github
 * @param {Object} octokit octokit instance
 * @param {Object} env proces.env
 */
async function executeFromEvent(token, octokit, env, options = {}) {
  const groupName = env["GITHUB_REPOSITORY_OWNER"];
  const project = env["GITHUB_REPOSITORY"];

  const githubInformation = {
    sourceGroup: groupName,
    author: groupName,
    sourceRepository: project
  };
  const overwriteConfig = options.b
    ? {
        sourceBranch: options.b,
        targetBranch: options.b
      }
    : {};

  await execute(
    token,
    octokit,
    env,
    githubInformation,
    undefined,
    {
      isArchiveArtifacts: true,
      ...options
    },
    overwriteConfig
  );
}

/**
 * Prepares execution when this is triggered from command line
 * @param {String} token the token to communicate to github
 * @param {Object} octokit octokit instance
 * @param {String} eventUrl event url
 * @param {Object} env proces.env
 * @param {String} rootFolder path to store flow data/projects
 * @param {String} group the group to projects from
 * @param {String} project the project to get the chain from
 * @param {String} branch the branch to checkout projects
 * @param {String} command the command to execute for every project, no matter what's defined on definition file
 * @param {String} projectToStart the project to start building
 * @param {String} skipExecution if the execution has to be skipped
 */
async function executeLocally(
  token,
  octokit,
  env,
  rootFolder,
  group,
  project,
  branch,
  options = {}
) {
  assert(
    project.includes("/"),
    `project ${project} should follow 'group/projectName' pattern`
  );
  const groupName = group ? group : project.split("/")[0];
  logger.info(
    `Executing branch flow for ${project}:${branch} in ${rootFolder}`
  );

  env["GITHUB_SERVER_URL"] = "https://github.com";
  env["GITHUB_ACTION"] = undefined;
  env["GITHUB_ACTOR"] = groupName;
  env["GITHUB_HEAD_REF"] = branch;
  env["GITHUB_BASE_REF"] = branch;
  env["GITHUB_REPOSITORY"] = project;

  const githubInformation = {
    sourceGroup: groupName,
    author: groupName,
    sourceRepository: project
  };

  await execute(token, octokit, env, githubInformation, rootFolder, options);
}

module.exports = { executeLocally, executeFromEvent };
