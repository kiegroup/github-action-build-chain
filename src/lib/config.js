const { ClientError, logger } = require('./common');
const { getBuildCommand, getBuildCommandDownstream, getBuildCommandUpstream, getParentDependencies, getChildDependencies } = require("./action-utils");

const GITHUB_URL_REGEXP = /^https:\/\/github.com\/([^/]+)\/([^/]+)\/(pull|tree)\/([^ ]+)$/;
const GIT_URL_REGEXP = /^(https?:\/\/.*\/)([^/]+)\/([^/]+)\/(pull|tree)\/([^ ]+)$/;

function createConfig(eventData, env = {}) {
  function parseGitHub(env) {
    return {
      'serverUrl': env['GITHUB_SERVER_URL'], // https://github.com
      'action': env['GITHUB_ACTION'], // Ginxogithub-action-build-chain
      'author': env['GITHUB_ACTOR'], // Ginxo
      'sourceBranch': env['GITHUB_HEAD_REF'], // Ginxo-patch-1
      'targetBranch': env['GITHUB_BASE_REF'], // master
      'jobName': env['GITHUB_JOB'], // build-chain
      'sourceRepository': eventData.repository ? eventData.repository.name : eventData.pull_request.repo ? eventData.pull_request.repo.full_name : env['GITHUB_REPOSITORY'], // forkedGroup/lienzo-tests
      'repository': env['GITHUB_REPOSITORY'], // Ginxo/lienzo-tests
      'group': env['GITHUB_REPOSITORY'] ? env['GITHUB_REPOSITORY'].split('/')[0]: undefined, // Ginxo/lienzo-tests
      'project': env['GITHUB_REPOSITORY'] ? env['GITHUB_REPOSITORY'].split('/')[1]: undefined, // Ginxo/lienzo-tests
      'workflow': env['GITHUB_WORKFLOW'], // .github/workflows/main.yml
      'ref': env['GITHUB_REF'] // refs/pull/1/merge'
    };
  }
  return {
    'parentDependencies': getParentDependencies(),
    'childDependencies': getChildDependencies(),
    'buildCommands': getBuildCommand(),
    'buildCommandsUpstream': getBuildCommandUpstream(),
    'buildCommandsDownstream': getBuildCommandDownstream(),
    'github': parseGitHub(env)
  };
}

async function createConfigLocally(octokit, eventUrl, env = {}) {
  const event = await getEvent(octokit, eventUrl);
  const m = eventUrl.match(GIT_URL_REGEXP);
  env['GITHUB_SERVER_URL'] = m[1];
  env['GITHUB_ACTION'] = undefined;
  env['GITHUB_ACTOR'] = event.pull_request.head.user.login;
  env['GITHUB_HEAD_REF'] = event.pull_request.head.ref;
  env['GITHUB_BASE_REF'] = event.pull_request.base.ref;
  env['GITHUB_JOB'] = undefined;
  env['GITHUB_REPOSITORY'] = event.pull_request.base.repo.full_name;
  env['GITHUB_REF'] = event.ref;
  return createConfig(event, env);
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

module.exports = {
  createConfig,
  createConfigLocally
};
