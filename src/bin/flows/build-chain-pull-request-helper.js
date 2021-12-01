const { logger, ClientError } = require("../..//lib/common");

const GITHUB_URL_REGEXP = /^https:\/\/github.com\/([^/]+)\/([^/]+)\/(pull|tree)\/([^ ]+)$/;
const GIT_URL_REGEXP = /^(https?:\/\/.*\/)([^/]+)\/([^/]+)\/(pull|tree)\/([^ ]+)$/;

function prepareEnv(env, eventUrl, eventData) {
  env["GITHUB_SERVER_URL"] = eventUrl.match(GIT_URL_REGEXP)[1];
  env["GITHUB_ACTION"] = undefined;
  env["GITHUB_ACTOR"] = eventData.pull_request.head.user.login;
  env["GITHUB_HEAD_REF"] = eventData.pull_request.head.ref;
  env["GITHUB_BASE_REF"] = eventData.pull_request.base.ref;
  env["GITHUB_REPOSITORY"] = eventData.pull_request.base.repo.full_name;
  env["GITHUB_REF"] = eventData.ref;
}

function createGithubInformationObject(eventData, env) {
  logger.debug("eventData", eventData);
  return {
    sourceGroup: (eventData.pull_request
      ? eventData.pull_request.head.repo
      : eventData.repository
    ).full_name.split("/")[0],
    author: (eventData.pull_request
      ? eventData.pull_request.head.user
      : eventData.repository.owner
    ).login,
    sourceRepository: eventData.repository
      ? eventData.repository.name
      : eventData.pull_request.repo
      ? eventData.pull_request.repo.full_name
      : env["GITHUB_REPOSITORY"]
  };
}

async function getEvent(octokit, eventUrl) {
  let event;

  const m = eventUrl.match(GITHUB_URL_REGEXP);
  if (m && m[3] === "pull") {
    logger.debug("Getting PR data...", eventUrl);
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
  getEvent,
  createGithubInformationObject,
  prepareEnv
};
