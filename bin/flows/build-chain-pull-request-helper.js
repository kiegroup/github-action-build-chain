const { logger, ClientError } = require("../../src/lib/common");

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
    try {
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
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
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

function getErrorMessage(err) {
  switch (err.status) {
    case 401:
      return "Failed to authenticate with provided token, please use -token argument to provide a new one. You can also check your GITHUB_TOKEN environment variable and check whether the provided token is still valid.";
    case 404:
      return "Failed to fetch GitHub URL, please check if the URL used in -url argument is valid and if the token you are using have permissions to access it.";
    default:
      return err.message;
  }
}

module.exports = {
  getEvent,
  createGithubInformationObject,
  prepareEnv
};
