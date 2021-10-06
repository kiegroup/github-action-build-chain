const fse = require("fs-extra");
const git = require("../src/lib/git");
const { tmpdir } = require("../src/lib/fs-helper");
const prInfo = require("./resources/pr_list_info.json");
const prInfoEmpty = require("./resources/pr_list_info_empty.json");
const forkedProjectListInfo = require("./resources/forked_projects_list_info.json");
const forkedProjectListInfoEmpty = require("./resources/forked_projects_list_info_empty.json");
const getRepositoryOk = require("./resources/get_project_ok.json");
const getRepositoryNotFound = require("./resources/get_project_not_found.json");

async function init(dir) {
  await fse.mkdirs(dir);
  await git.git(dir, "init");
  await git.git(dir, "checkout", "-b", "main");
}

async function commit(dir, message = "C%d", count = 1) {
  for (let i = 1; i <= count; i++) {
    await git.git(
      dir,
      "commit",
      "--allow-empty",
      "-m",
      message.replace(/%d/g, i)
    );
  }
}

test("clone creates the target directory", async () => {
  await tmpdir(async path => {
    await init(`${path}/origin`);
    await commit(`${path}/origin`);
    await git.clone(`file://${path}/origin`, `${path}/ws`, "main", 1);
    expect(await fse.exists(`${path}/ws`)).toBe(true);
  });
});

test("fetchUntilMergeBase finds the correct merge base", async () => {
  await tmpdir(async path => {
    const origin = `${path}/origin`;
    await init(origin);
    await commit(origin, "base %d", 10);
    const base = await git.head(origin);
    await git.git(origin, "checkout", "-b", "br1");
    await commit(origin, "br1 %d", 20);
    await git.git(origin, "checkout", "main");
    await commit(origin, "main %d", 20);

    const ws = `${path}/ws`;
    await git.clone(`file://${path}/origin`, ws, "br1");
    await git.fetch(ws, "main");
    expect(await git.fetchUntilMergeBase(ws, "main", 10000)).toBe(base);
  });
}, 15000);

test("fetchUntilMergeBase finds the earliest merge base 1", async () => {
  await tmpdir(async path => {
    const origin = `${path}/origin`;
    await init(origin);
    await commit(origin, "base %d", 10);
    const base = await git.head(origin);
    await git.git(origin, "branch", "br1");
    await commit(origin, "main %d", 10);
    await git.git(origin, "checkout", "br1");
    await commit(origin, "br1 before merge %d", 5);
    await git.git(origin, "merge", "--no-ff", "main");
    await commit(origin, "br1 after merge %d", 10);
    await git.git(origin, "checkout", "main");
    await commit(origin, "main after merge %d", 10);

    const ws = `${path}/ws`;
    await git.clone(`file://${path}/origin`, ws, "br1");
    await git.fetch(ws, "main");
    expect(await git.fetchUntilMergeBase(ws, "main", 10000)).toBe(base);
  });
}, 15000);

test("fetchUntilMergeBase finds the earliest merge base 2", async () => {
  await tmpdir(async path => {
    const origin = `${path}/origin`;
    await init(origin);
    await commit(origin, "base a%d", 5);
    const base = await git.head(origin);
    await commit(origin, "base b%d", 5);
    await git.git(origin, "branch", "br1");
    await commit(origin, "main %d", 10);
    await git.git(origin, "checkout", "br1");
    await commit(origin, "br1 before merge %d", 5);
    await git.git(origin, "merge", "--no-ff", "main");
    await commit(origin, "br1 after merge %d", 10);
    await git.git(origin, "checkout", "main");
    await commit(origin, "main after merge %d", 10);
    await git.git(origin, "checkout", "-b", "br2", base);
    await commit(origin, "br2");
    await git.git(origin, "checkout", "br1");
    await git.git(origin, "merge", "--no-ff", "br2");

    const ws = `${path}/ws`;
    await git.clone(`file://${path}/origin`, ws, "br1");
    await git.fetch(ws, "main");
    expect(await git.fetchUntilMergeBase(ws, "main", 10000)).toBe(base);
  });
}, 15000);

test("mergeCommits returns the correct commits", async () => {
  await tmpdir(async path => {
    await init(path);
    await commit(path, "main %d", 2);
    const head1 = await git.head(path);
    await git.git(path, "checkout", "-b", "branch", "HEAD^");
    const head2 = await git.head(path);
    await git.git(path, "merge", "--no-ff", "main");

    const commits = await git.mergeCommits(path, "HEAD^");
    expect(commits).toHaveLength(1);
    expect(commits[0][0]).toBe(head2);
    expect(commits[0][1]).toBe(head1);
  });
});

test("mergeCommits returns the correct commits", async () => {
  await tmpdir(async path => {
    await init(path);
    await commit(path, "main %d", 2);
    const head1 = await git.head(path);
    await git.git(path, "checkout", "-b", "branch", "HEAD^");
    const head2 = await git.head(path);
    await git.git(path, "merge", "--no-ff", "main");

    const commits = await git.mergeCommits(path, "HEAD^");
    expect(commits).toHaveLength(1);
    expect(commits[0][0]).toBe(head2);
    expect(commits[0][1]).toBe(head1);
  });
});

test("hasPullRequest origin true", async () => {
  const octokit = {
    pulls: {
      list: jest.fn(({ owner, repo, state, head }) => {
        return owner === "ownerx" &&
          repo === "repox" &&
          state === "open" &&
          head === "authorx:branchx"
          ? { status: 200, data: prInfo }
          : undefined;
      })
    }
  };

  const result = await git.hasPullRequest(
    octokit,
    "ownerx",
    "repox",
    "branchx",
    "authorx"
  );

  expect(result).toBe(true);
  expect(octokit.pulls.list).toHaveBeenCalledTimes(1);
});

test("hasPullRequest forked true", async () => {
  const octokit = {
    pulls: {
      list: jest.fn(({ owner, repo, state, head }) => {
        return owner === "ownerx" &&
          repo === "repox" &&
          state === "open" &&
          head === "authorx:branchx"
          ? { status: 200, data: prInfoEmpty }
          : owner === "ownerx" &&
            repo === "repox" &&
            state === "open" &&
            head === "ownerx:branchx"
          ? { status: 200, data: prInfo }
          : undefined;
      })
    }
  };

  const result = await git.hasPullRequest(
    octokit,
    "ownerx",
    "repox",
    "branchx",
    "authorx"
  );

  expect(result).toBe(true);
  expect(octokit.pulls.list).toHaveBeenCalledTimes(2);
});

test("hasPullRequest false", async () => {
  const octokit = {
    pulls: {
      list: jest.fn(({ owner, repo, state, head }) => {
        return owner === "ownerx" &&
          repo === "repox" &&
          state === "open" &&
          head === "authorx:branchx"
          ? { status: 200, data: prInfoEmpty }
          : owner === "ownerx" &&
            repo === "repox" &&
            state === "open" &&
            head === "ownerx:branchx"
          ? { status: 200, data: prInfoEmpty }
          : undefined;
      })
    }
  };

  const result = await git.hasPullRequest(
    octokit,
    "ownerx",
    "repox",
    "branchx",
    "authorx"
  );

  expect(result).toBe(false);
  expect(octokit.pulls.list).toHaveBeenCalledTimes(2);
});

test("getForkedProject existing", async () => {
  const octokit = {
    repos: {
      listForks: jest.fn(({ owner, repo }) => {
        return owner === "ownerx" && repo === "repox"
          ? { status: 200, data: forkedProjectListInfo }
          : undefined;
      })
    }
  };

  const result = await git.getForkedProject(
    octokit,
    "ownerx",
    "repox",
    "Ginxo"
  );

  expect(octokit.repos.listForks).toHaveBeenCalledTimes(1);
  expect(result).not.toBeUndefined();
  expect(result.id).toBe(225822299);
});

test("getForkedProject not existing", async () => {
  const octokit = {
    repos: {
      listForks: jest.fn(({ owner, repo, page }) => {
        return owner === "ownerx" && repo === "repox" && page == 1
          ? { status: 200, data: forkedProjectListInfo }
          : owner === "ownerx" && repo === "repox" && page == 2
          ? { status: 304, data: forkedProjectListInfoEmpty }
          : undefined;
      })
    }
  };

  const result = await git.getForkedProject(
    octokit,
    "ownerx",
    "repox",
    "weirdowner"
  );

  expect(octokit.repos.listForks).toHaveBeenCalledTimes(2);
  expect(result).toBeUndefined();
});

test("getForkedProject empty", async () => {
  const octokit = {
    repos: {
      listForks: jest.fn(({ owner, repo, page }) => {
        return owner === "ownerx" && repo === "repox" && page == 1
          ? { status: 200, data: forkedProjectListInfoEmpty }
          : undefined;
      })
    }
  };

  const result = await git.getForkedProject(
    octokit,
    "ownerx",
    "repox",
    "weirdowner"
  );

  expect(octokit.repos.listForks).toHaveBeenCalledTimes(1);
  expect(result).toBeUndefined();
});

test("getForkedProject second page empty", async () => {
  const octokit = {
    repos: {
      listForks: jest.fn(({ owner, repo, page }) => {
        return owner === "ownerx" && repo === "repox" && page == 1
          ? { status: 200, data: forkedProjectListInfo }
          : owner === "ownerx" && repo === "repox" && page == 2
          ? { status: 200, data: forkedProjectListInfoEmpty }
          : undefined;
      })
    }
  };

  const result = await git.getForkedProject(
    octokit,
    "ownerx",
    "repox",
    "weirdowner"
  );

  expect(octokit.repos.listForks).toHaveBeenCalledTimes(2);
  expect(result).toBeUndefined();
});

test("getRepository existing", async () => {
  const octokit = {
    repos: {
      get: jest.fn(({ owner, repo }) => {
        return owner === "Ginxo" && repo === "repox"
          ? { status: 200, data: getRepositoryOk }
          : undefined;
      })
    }
  };

  const result = await git.getRepository(octokit, "Ginxo", "repox");

  expect(octokit.repos.get).toHaveBeenCalledTimes(1);
  expect(result).not.toBeUndefined();
  expect(result.id).toBe(203378120);
});

test("getRepository not found", async () => {
  const octokit = {
    repos: {
      get: jest.fn(({ owner, repo }) => {
        return owner === "Ginxo" && repo === "repox"
          ? { status: 404, data: getRepositoryNotFound }
          : undefined;
      })
    }
  };

  const result = await git.getRepository(octokit, "Ginxo", "repox");

  expect(octokit.repos.get).toHaveBeenCalledTimes(1);
  expect(result).toBeUndefined();
});

test("getRepository different to 404", async () => {
  const octokit = {
    repos: {
      get: jest.fn(({ owner, repo }) => {
        return owner === "Ginxo" && repo === "repox"
          ? { status: 405, data: getRepositoryNotFound }
          : undefined;
      })
    }
  };

  const result = await git.getRepository(octokit, "Ginxo", "repox");
  expect(octokit.repos.get).toHaveBeenCalledTimes(1);
  expect(result).toBeUndefined();
});

test("getRepository different exception", async () => {
  const octokit = {
    repos: {
      get: jest.fn(({ owner, repo }) => {
        if (owner === "Ginxo" && repo === "repox") {
          throw new Error();
        }
        return { status: 200, data: getRepositoryOk };
      })
    }
  };

  const result = await git.getRepository(octokit, "Ginxo", "repox");
  expect(octokit.repos.get).toHaveBeenCalledTimes(1);
  expect(result).toBeUndefined();
});
