const fse = require("fs-extra");
const git = require("../src/lib/git");
const { tmpdir } = require("../src/lib/fs-helper");
const prInfo = require("./resources/pr_info.json");
const prInfoEmpty = require("./resources/pr_info_empty.json");
const workflowInfo = require("./resources/workflow.json");
const workflowInfoEmpty = require("./resources/workflow_empty.json");

async function init(dir) {
  await fse.mkdirs(dir);
  await git.git(dir, "init");
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
    await git.clone(`file://${path}/origin`, `${path}/ws`, "master", 1);
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
    await git.git(origin, "checkout", "master");
    await commit(origin, "master %d", 20);

    const ws = `${path}/ws`;
    await git.clone(`file://${path}/origin`, ws, "br1");
    await git.fetch(ws, "master");
    expect(await git.fetchUntilMergeBase(ws, "master", 10000)).toBe(base);
  });
}, 15000);

test("fetchUntilMergeBase finds the earliest merge base 1", async () => {
  await tmpdir(async path => {
    const origin = `${path}/origin`;
    await init(origin);
    await commit(origin, "base %d", 10);
    const base = await git.head(origin);
    await git.git(origin, "branch", "br1");
    await commit(origin, "master %d", 10);
    await git.git(origin, "checkout", "br1");
    await commit(origin, "br1 before merge %d", 5);
    await git.git(origin, "merge", "--no-ff", "master");
    await commit(origin, "br1 after merge %d", 10);
    await git.git(origin, "checkout", "master");
    await commit(origin, "master after merge %d", 10);

    const ws = `${path}/ws`;
    await git.clone(`file://${path}/origin`, ws, "br1");
    await git.fetch(ws, "master");
    expect(await git.fetchUntilMergeBase(ws, "master", 10000)).toBe(base);
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
    await commit(origin, "master %d", 10);
    await git.git(origin, "checkout", "br1");
    await commit(origin, "br1 before merge %d", 5);
    await git.git(origin, "merge", "--no-ff", "master");
    await commit(origin, "br1 after merge %d", 10);
    await git.git(origin, "checkout", "master");
    await commit(origin, "master after merge %d", 10);
    await git.git(origin, "checkout", "-b", "br2", base);
    await commit(origin, "br2");
    await git.git(origin, "checkout", "br1");
    await git.git(origin, "merge", "--no-ff", "br2");

    const ws = `${path}/ws`;
    await git.clone(`file://${path}/origin`, ws, "br1");
    await git.fetch(ws, "master");
    expect(await git.fetchUntilMergeBase(ws, "master", 10000)).toBe(base);
  });
}, 15000);

test("mergeCommits returns the correct commits", async () => {
  await tmpdir(async path => {
    await init(path);
    await commit(path, "master %d", 2);
    const head1 = await git.head(path);
    await git.git(path, "checkout", "-b", "branch", "HEAD^");
    const head2 = await git.head(path);
    await git.git(path, "merge", "--no-ff", "master");

    const commits = await git.mergeCommits(path, "HEAD^");
    expect(commits).toHaveLength(1);
    expect(commits[0][0]).toBe(head2);
    expect(commits[0][1]).toBe(head1);
  });
});

test("mergeCommits returns the correct commits", async () => {
  await tmpdir(async path => {
    await init(path);
    await commit(path, "master %d", 2);
    const head1 = await git.head(path);
    await git.git(path, "checkout", "-b", "branch", "HEAD^");
    const head2 = await git.head(path);
    await git.git(path, "merge", "--no-ff", "master");

    const commits = await git.mergeCommits(path, "HEAD^");
    expect(commits).toHaveLength(1);
    expect(commits[0][0]).toBe(head2);
    expect(commits[0][1]).toBe(head1);
  });
});

test("hasPullRequest true", async () => {
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
});

test("getWorkflowFileName with content", async () => {
  const octokit = {
    actions: {
      listRepoWorkflows: jest.fn(({ owner, repo }) => {
        return owner === "ownerx" && repo === "repox"
          ? { status: 200, data: workflowInfo }
          : undefined;
      })
    }
  };

  const result = await git.getWorkflowFileName(
    octokit,
    "ownerx",
    "repox",
    "Linter"
  );

  expect(result).toBe(".github/workflows/linter.yml");
});

test("getWorkflowFileName with content not existing", async () => {
  const octokit = {
    actions: {
      listRepoWorkflows: jest.fn(({ owner, repo }) => {
        return owner === "ownerx" && repo === "repox"
          ? { status: 200, data: workflowInfo }
          : undefined;
      })
    }
  };

  const result = await git.getWorkflowFileName(
    octokit,
    "ownerx",
    "repox",
    "notexisting"
  );

  expect(result).toBe(undefined);
});

test("getWorkflowFileName empty", async () => {
  const octokit = {
    actions: {
      listRepoWorkflows: jest.fn(({ owner, repo }) => {
        return owner === "ownerx" && repo === "repox"
          ? { status: 200, data: workflowInfoEmpty }
          : undefined;
      })
    }
  };

  const result = await git.getWorkflowFileName(
    octokit,
    "ownerx",
    "repox",
    "Linter"
  );

  expect(result).toBe(undefined);
});
