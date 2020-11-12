const { logger } = require("../../src/lib/common");
const { start } = require("../../src/lib/flows/branch-flow");
const { createCommonConfig } = require("../../src/lib/flows/common/config");
const assert = require("assert");
const { createRootFolder } = require("./build-chain-pull-request-helper");

/**
 * Executes branch flow
 * @param {String} token the token to communicate to github
 * @param {Object} octokit octokit instance
 * @param {Object} env proces.env
 * @param {Object} githubInformation
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
  options = {}
) {
  const config = await createCommonConfig(githubInformation, rootFolder, env);
  const context = { token, octokit, config };
  createRootFolder(context.config.rootFolder);
  await start(context, options);
}

/**
 * Prepares execution when this is triggered from a github action's event
 * @param {String} token the token to communicate to github
 * @param {Object} octokit octokit instance
 * @param {Object} env proces.env
 */
async function executeFromEvent(token, octokit, env) {
  // TODO
  logger.error("Functionallity not implemented yet", token, octokit, env);
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
