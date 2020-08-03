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
  const stdio = [
    "ignore",
    "pipe",
    logger.level === "trace" || logger.level === "debug" ? "inherit" : "ignore"
  ];
  // the URL passed to the clone command could contain a password!
  const command = `git ${args.join(" ")}`;
  logger.debug("Executing", command);
  return new Promise((resolve, reject) => {
    const proc = spawn(
      "git",
      COMMON_ARGS.concat(args.filter(a => a !== null)),
      { cwd, stdio }
    );
    const buffers = [];
    proc.stdout.on("data", data => buffers.push(data));
    proc.on("error", () => {
      reject(new Error(`command failed: ${command}`));
    });
    proc.on("exit", code => {
      if (code === 0) {
        const data = Buffer.concat(buffers);
        resolve(data.toString("utf8").trim());
      } else {
        reject(
          new ExitError(`command failed with code ${code}: ${command}.`, code)
        );
      }
    });
  });
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
      "--depth",
      FETCH_DEPTH,
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
    "--depth",
    FETCH_DEPTH,
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

async function head(dir) {
  return await git(dir, "show-ref", "--head", "-s", "/HEAD");
}

async function sha(dir, branch) {
  return await git(dir, "show-ref", "-s", `refs/remotes/origin/${branch}`);
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

module.exports = {
  ExitError,
  git,
  clone,
  fetch,
  fetchUntilMergeBase,
  fetchDeepen,
  mergeBase,
  mergeCommits,
  head,
  sha,
  rebase,
  push,
  doesBranchExist
};
