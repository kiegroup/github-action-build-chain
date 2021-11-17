const { spawn } = require("child_process");
var assert = require("assert");

const { TimeoutError, logger } = require("./common");
const fs = require("fs");

class ExitError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

const FETCH_DEPTH = 10;

const COMMON_ARGS = [
  "-c",
  "user.name=GitHub",
  "-c",
  "user.email=noreply@github.com"
];

function git(cwd, ...args) {
  const stdio = ["ignore", "pipe", logger.isDebug() ? "inherit" : "pipe"];
  const filteredArgs = args.filter(
    arg =>
      ![null, undefined].includes(arg) &&
      (!logger.isDebug() || arg !== "--quiet")
  );
  // the URL passed to the clone command could contain a password!
  const command = `git ${filteredArgs.join(" ")}`;
  logger.debug(`Executing git command ${command}`);
  return new Promise((resolve, reject) => {
    const proc = spawn("git", COMMON_ARGS.concat(filteredArgs), { cwd, stdio });
    const buffers = [];
    if (stdio[2] !== "inherit") {
      proc.stdout.on("data", data => buffers.push(data));
      proc.stderr.on("data", data => buffers.push(data));
    }

    proc.on("error", () => {
      reject(new Error(`command failed: ${command}`));
    });
    proc.on("exit", code => {
      const stdoutData = Buffer.concat(buffers);
      if (code === 0) {
        resolve(stdoutData.toString("utf8").trim());
      } else {
        reject(
          new ExitError(
            `command ${command} failed with code ${code}. Error Message: ${stdoutData}`,
            code
          )
        );
      }
    });
  });
}

/**
 * Gets the git version available in the system.
 */
async function getVersion() {
  const gitVersionCommandOutput = await git(".", "--version");
  const match = gitVersionCommandOutput.match(/(\d+\.\d+(\.\d+)?)/);
  return match && match.length > 1 ? match[1] : undefined;
}

async function clone(from, to, branch) {
  if (!fs.existsSync(to)) {
    await git(
      ".",
      "clone",
      "--quiet",
      "--shallow-submodules",
      "--no-tags",
      "--branch",
      branch,
      from,
      to
    );
  } else {
    logger.warn(`Folder ${to} already exist. Won't clone`);
  }
}

async function fetch(dir, branch) {
  await git(
    dir,
    "fetch",
    "--quiet",
    "origin",
    `${branch}:refs/remotes/origin/${branch}`
  );
}

async function fetchUntilMergeBase(dir, branch, timeout) {
  const maxTime = new Date().getTime() + timeout;
  const ref = `refs/remotes/origin/${branch}`;
  while (new Date().getTime() < maxTime) {
    const base = await mergeBase(dir, "HEAD", ref);
    if (base) {
      const bases = [base];
      const parents = await mergeCommits(dir, ref);
      let fetchMore = false;
      for (const parent of parents.flat()) {
        const b = await mergeBase(dir, parent, ref);
        if (b) {
          if (!bases.includes(b)) {
            bases.push(b);
          }
        } else {
          // we found a commit which does not have a common ancestor with
          // the branch we want to merge, so we need to fetch more
          fetchMore = true;
          break;
        }
      }
      if (!fetchMore) {
        const commonBase = await mergeBase(dir, ...bases);
        if (!commonBase) {
          throw new Error(`failed to find common base for ${bases}`);
        }
        return commonBase;
      }
    }
    await fetchDeepen(dir);
  }
  throw new TimeoutError();
}

async function fetchDeepen(dir) {
  await git(dir, "fetch", "--quiet", "--deepen", FETCH_DEPTH);
}

async function mergeBase(dir, ...refs) {
  if (refs.length === 1) {
    return refs[0];
  } else if (refs.length < 1) {
    throw new Error("empty refs!");
  }
  let todo = refs;
  try {
    while (todo.length > 1) {
      const base = await git(dir, "merge-base", todo[0], todo[1]);
      todo = [base].concat(todo.slice(2));
    }
    return todo[0];
  } catch (e) {
    if (e instanceof ExitError && e.code === 1) {
      return null;
    } else {
      throw e;
    }
  }
}

async function mergeCommits(dir, ref) {
  return (await git(dir, "rev-list", "--parents", `${ref}..HEAD`))
    .split(/\n/g)
    .map(line => line.split(/ /g).slice(1))
    .filter(commit => commit.length > 1);
}

async function merge(dir, repositoryUrl, branch) {
  return await git(dir, "pull", "--no-rebase", repositoryUrl, branch);
}

async function head(dir) {
  return await git(dir, "show-ref", "--head", "-s", "/HEAD");
}

async function sha(dir, branch) {
  return await git(dir, "show-ref", "-s", `refs/remotes/origin/${branch}`);
}

/**
 * It retrieves the hash from a remote repository and branch
 *
 * @param {string} repositoryUrl the repository URL
 * @param {string} branch the branch to get the hash from
 */
async function remoteSha(repositoryUrl, branch) {
  return await git(".", "ls-remote", repositoryUrl, branch);
}

async function rename(dir, branch) {
  return await git(dir, "branch", "--move", branch);
}

async function rebase(dir, branch) {
  return await git(dir, "rebase", "--quiet", "--autosquash", branch);
}

async function push(dir, force, branch) {
  return await git(
    dir,
    "push",
    "--quiet",
    force ? "--force-with-lease" : null,
    "origin",
    branch
  );
}

async function doesBranchExist(octokit, owner, repo, branch) {
  assert(owner, "owner is not defined");
  assert(repo, "repo is not defined");
  assert(branch, "branch is not defined");
  try {
    const { status } = await octokit.repos.getBranch({
      owner,
      repo,
      branch
    });
    return status == 200;
  } catch (e) {
    logger.warn(
      `project github.com/${owner}/${repo}:${branch} does not exist. It's not necessarily an error.`
    );
    return false;
  }
}

/**
 * Checks if there is a pull request either from a forked project or the same project
 * @param {Object} octokit instance
 * @param {String} owner the repo owner or group
 * @param {String} repo the repository name
 * @param {String} branch the branch of the pull request to look for
 * @param {String} fromAuthor the pull request author
 */
async function hasPullRequest(octokit, owner, repo, branch, fromAuthor) {
  return (
    (await hasForkPullRequest(octokit, owner, repo, branch, fromAuthor)) ||
    (await hasOriginPullRequest(octokit, owner, repo, branch))
  );
}

/**
 * Checks if there is a pull request from a forked project
 * @param {Object} octokit instance
 * @param {String} owner the repo owner or group
 * @param {String} repo the repository name
 * @param {String} branch the branch of the pull request to look for
 * @param {String} fromAuthor the pull request author
 */
async function hasForkPullRequest(octokit, owner, repo, branch, fromAuthor) {
  assert(owner, "owner is not defined");
  assert(repo, "repo is not defined");
  assert(branch, "branch is not defined");
  assert(fromAuthor, "fromAuthor is not defined");
  try {
    const { status, data } = await octokit.pulls.list({
      owner,
      repo,
      state: "open",
      head: `${fromAuthor}:${branch}`
    });
    return status == 200 && data.length > 0;
  } catch (e) {
    logger.error(
      `Error getting pull request list from https://api.github.com/repos/${owner}/${repo}/pulls?head=${fromAuthor}:${branch}&state=open'".`
    );
    throw e;
  }
}

/**
 * Checks if there is a pull request from the same project
 * @param {Object} octokit instance
 * @param {String} owner the repo owner or group
 * @param {String} repo the repository name
 * @param {String} branch the branch of the pull request to look for
 */
async function hasOriginPullRequest(octokit, owner, repo, branch) {
  assert(owner, "owner is not defined");
  assert(repo, "repo is not defined");
  assert(branch, "branch is not defined");
  try {
    const { status, data } = await octokit.pulls.list({
      owner,
      repo,
      state: "open",
      head: `${owner}:${branch}`
    });
    return status == 200 && data.length > 0;
  } catch (e) {
    logger.error(
      `Error getting pull request list from https://api.github.com/repos/${owner}/${repo}/pulls?head=${owner}:${branch}&state=open'".`
    );
    throw e;
  }
}

async function getRepository(octokit, owner, repo) {
  assert(octokit, "octokit is not defined");
  assert(owner, "owner is not defined");
  assert(repo, "repo is not defined");
  try {
    const { status, data } = await octokit.repos.get({
      owner,
      repo
    });
    logger.debug(`getRepository info ${owner}/${repo}. ${status}`);
    logger.debug(data);
    if (status == 200) {
      return data;
    }
    return undefined;
  } catch (e) {
    logger.warn(
      `${owner}/${repo} not found. Trying to get it by forked project list.`
    );
    return undefined;
  }
}

async function getForkedProject(
  octokit,
  owner,
  repo,
  wantedOwner,
  page = 1,
  per_page = 100
) {
  assert(owner, "owner is not defined");
  assert(repo, "repo is not defined");
  assert(wantedOwner, "wantedOwner is not defined");
  assert(page, "page is not defined");
  try {
    const { status, data } = await octokit.repos.listForks({
      owner,
      repo,
      page
    });
    if (status == 200) {
      if (data && data.length > 0) {
        const forkedProject = data.find(
          forkedProject => forkedProject.owner.login === wantedOwner
        );
        return forkedProject
          ? forkedProject
          : await getForkedProject(
              octokit,
              owner,
              repo,
              wantedOwner,
              ++page,
              per_page
            );
      } else {
        return undefined;
      }
    }
  } catch (e) {
    logger.error(
      `Error getting forked project list from  https://api.github.com/repos/${owner}/${repo}/forks?per_page=${per_page}&page=${page}'".`
    );
    throw e;
  }
}

module.exports = {
  ExitError,
  git,
  clone,
  fetch,
  fetchUntilMergeBase,
  fetchDeepen,
  mergeBase,
  mergeCommits,
  merge,
  head,
  sha,
  remoteSha,
  rename,
  rebase,
  push,
  doesBranchExist,
  hasPullRequest,
  getForkedProject,
  getRepository,
  getVersion
};
