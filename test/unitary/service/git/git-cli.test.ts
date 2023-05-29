import "reflect-metadata";
import { constants } from "@bc/domain/constants";
import { EntryPoint } from "@bc/domain/entry-point";
import { GitCLIService } from "@bc/service/git/git-cli";
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import Container from "typedi";
import { assert } from "console";
import { FileState, MockGithub, GitActionTypes } from "@kie/mock-github";

let git: GitCLIService;
let cwd: string;
let currentBranch: string;
let pushedBranches: string[];
let localBranches: string[];
let files: FileState[];

const mockGithub = new MockGithub(
  {
    repo: {
      repoA: {
        pushedBranches: ["sbranch", "tbranch"],
        localBranches: ["lbranch"],
        currentBranch: "main",
        history: [
          {
            action: GitActionTypes.PUSH,
            branch: "main",
          },
          {
            action: GitActionTypes.PUSH,
            branch: "sbranch",
          },
          {
            action: GitActionTypes.PUSH,
            branch: "tbranch",
          },
        ],
      },
    },
  },
  path.join(__dirname, "setup-cli")
);

beforeAll(async () => {
  //setup
  await mockGithub.setup();
  cwd = mockGithub.repo.getPath("repoA")!;
  currentBranch = mockGithub.repo.getBranchState("repoA")!.currentBranch;
  pushedBranches = mockGithub.repo.getBranchState("repoA")!.pushedBranches;
  localBranches = mockGithub.repo.getBranchState("repoA")!.localBranches;
  files = (await mockGithub.repo.getFileSystemState("repoA"))!;

  //make sure the setup is correct to run this test suite
  assert(
    pushedBranches.length > 1,
    "your configuration must have a repository with pushed branches other than main"
  );
  assert(
    localBranches.length > 0,
    "your configuration must have a repository with local branches i.e. not pushed branches"
  );
  assert(
    files.length > 0,
    "your configuration needs at least 1 file committed to some branch which is not the current branch"
  );

  // disable logs
  jest.spyOn(global.console, "log");
});

afterAll(async () => {
  await mockGithub.teardown();
});

beforeEach(() => {
  // create a fresh instance of git before each test
  Container.set(constants.CONTAINER.ENTRY_POINT, EntryPoint.CLI);
  git = new GitCLIService();
});

test("version", async () => {
  const result = await git.version();
  const actualVersion = spawnSync("git", ["version"]).stdout.toString();
  const match = actualVersion.match(/(\d+\.\d+(\.\d+)?)/);
  if (match) {
    expect(result).toEqual(match[1]);
  } else {
    expect(result).toBe(undefined);
  }
});

test.each([
  ["destination does not exist", false, 0],
  ["destination exists", true, 1],
])("clone %p", async (_title: string, destExist: boolean, numRmCalls: number) => {
  // Setup
  const dest = path.join(__dirname, "git-clone-test");

  if (destExist) {
    // create the folder before cloning the repo
    fs.mkdirSync(dest);
  }

  const rmSyncSpy = jest.spyOn(fs, "rmSync");

  await git.clone(cwd, dest, "main");

  expect(rmSyncSpy).toBeCalledTimes(numRmCalls);

  expect(fs.existsSync(dest)).toBe(true);
  const files = fs.readdirSync(dest);
  expect(files.length).toBeGreaterThan(0);

  // Clean up
  rmSyncSpy.mockRestore();
  fs.rmSync(dest, { recursive: true });
});

test("fetch", async () => {
  await expect(git.fetch(cwd, currentBranch)).resolves.not.toThrowError();
});

test("getCommonAncestor", async () => {
  // using the code from original codebase to test whether the results match
  const mergeBase = async (dir: string, ...refs: string[]) => {
    if (refs.length === 1) {
      return refs[0];
    } else if (refs.length < 1) {
      throw new Error("empty refs!");
    }
    let todo = refs;

    while (todo.length > 1) {
      const rawCommand = spawnSync("git", ["merge-base", todo[0], todo[1]], {
        cwd: dir,
      });
      if (rawCommand.status === 1) {
        return null;
      }
      const base = rawCommand.stdout.toString().trim();
      todo = [base].concat(todo.slice(2));
    }
    return todo[0];
  };
  const result = await Promise.all([
    mergeBase(cwd, ...pushedBranches),
    git.getCommonAncestor(cwd, ...pushedBranches),
  ]);
  expect(result[1]).toEqual(result[0]);
});

test("getReachableParentCommits", async () => {
  const ref = pushedBranches[1];

  // using code from original codebase to compare results
  const rawCommand = spawnSync(
    "git",
    ["rev-list", "--parents", `${ref}..HEAD`],
    { cwd }
  );
  const output = rawCommand.stdout
    .toString()
    .split(/\n/g)
    .map(line => line.split(/ /g).slice(1))
    .filter(commit => commit.length > 0)
    .flat();
  const result = await git.getReachableParentCommits(cwd, ref);
  expect(result).toStrictEqual(output);
});

test("merge", async () => {
  // get a branch which is not the current branch and has a file committed
  let branchToMergeFrom = "";
  for (let i = 0; i < files.length; i++) {
    if (files[i].branch !== currentBranch) {
      branchToMergeFrom = files[i].branch;
      break;
    }
  }
  assert(
    branchToMergeFrom !== "",
    "your configuration needs at least 1 file committed to some branch which is not on the current branch"
  );

  // merge the found branch to the current branch
  await expect(
    git.merge(cwd, "origin", branchToMergeFrom)
  ).resolves.not.toThrowError();

  // verify that files actually exist after branch is merged
  for (let i = 0; i < files.length; i++) {
    if (files[i].branch === branchToMergeFrom) {
      expect(fs.existsSync(path.join(cwd, files[i].path))).toBe(true);
    }
  }
});

test("head", async () => {
  const output = spawnSync("git", ["show-ref", "--head", "-s", "/HEAD"], {
    cwd,
  }).stdout.toString();
  const result = await git.head(cwd);
  expect(result).toEqual(output);
});

test("sha", async () => {
  const ref = pushedBranches[1];
  const output = spawnSync(
    "git",
    ["show-ref", "-s", `refs/remotes/origin/${ref}`],
    { cwd }
  ).stdout.toString();
  const result = await git.sha(cwd, ref);
  expect(result).toEqual(output);
});

test("rename", async () => {
  const ref = localBranches[0];
  const newName = "newBranchName";

  //switch to local branch
  spawnSync("git", ["checkout", ref], { cwd });

  // change name
  await git.rename(cwd, newName);

  // get the current branch name
  const output = spawnSync("git", ["branch", "--show-current"], { cwd })
    .stdout.toString()
    .trim();

  expect(output).toEqual(newName);

  // go back to the original current branch
  spawnSync("git", ["checkout", currentBranch], { cwd });
});

test("rebase", async () => {
  await expect(git.rebase(cwd, currentBranch)).resolves.not.toThrowError();
});

test.each([
  ["with force", true],
  ["without force", false],
])("push %p", async (title: string, withForce: boolean) => {
  const expressionToTest = "GIT_CHERRY_SHOULD_NOT_INCLUDE_THIS_MSG";
  // create file to push
  fs.writeFileSync(path.join(cwd, "test-push"), "testing git push");

  // add and commit the file
  spawnSync("git", ["add", "."], { cwd });
  spawnSync("git", ["commit", "-m", expressionToTest], { cwd });

  await git.push(cwd, withForce, currentBranch);

  // use git cherry to verify this commit was pushed
  const output = spawnSync("git", ["cherry", "-v"], { cwd }).stdout.toString();
  expect(output.includes(expressionToTest)).toBe(false);
});
