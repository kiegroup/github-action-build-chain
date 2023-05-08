import { GitActionTypes, MockGithub, Moctokit } from "@kie/mock-github";
import path from "path";
import { Act } from "@kie/act-js";
import { logActOutput } from "../helper/logger";

let mockGithub: MockGithub;
beforeEach(async () => {
  mockGithub = new MockGithub(
    {
      repo: {
        "build-chain": {
          files: [
            {
              src: path.resolve(__dirname, "..", "resources"),
              dest: ".github/",
            },
            {
              src: path.join(__dirname, "parallel-execution.yaml"),
              dest: ".github/workflows/parallel-execution.yaml",
            },
            {
              src: path.resolve(__dirname, "..", "..", "..", "action.yml"),
              dest: "action.yml",
            },
            {
              src: path.resolve(__dirname, "..", "..", "..", "dist-e2e"),
              dest: "dist",
            },
          ],
        },
        "owner1/project1": {
          pushedBranches: ["branchA", "8.B"],
          history: [
            {
              action: GitActionTypes.PUSH,
              branch: "branchA",
            },
            {
              action: GitActionTypes.PUSH,
              branch: "8.B",
            }
          ],
        },
        "owner1/project2": {
          pushedBranches: ["branchA", "branchB"],
          history: [
            {
              action: GitActionTypes.PUSH,
              branch: "branchA",
            },
            {
              action: GitActionTypes.PUSH,
              branch: "branchB",
            }
          ],
        },
        "owner1/project3": {
          pushedBranches: ["branchB", "branchA"],
          history: [
            {
              action: GitActionTypes.PUSH,
              branch: "branchB",
            },
            {
              action: GitActionTypes.PUSH,
              branch: "branchA",
            },
          ],
        },
        "owner1/project4": {
          pushedBranches: ["branchB", "branchA"],
          history: [
            {
              action: GitActionTypes.PUSH,
              branch: "branchB",
            },
            {
              action: GitActionTypes.PUSH,
              branch: "branchA",
            }
          ],
        },
      },
    },
    path.join(__dirname, "setup")
  );
  await mockGithub.setup();
});

afterEach(async () => {
  await mockGithub.teardown();
});

test("PR from target:branchA to target:branchB while using mapping of a non-starting project (mapping.dependant.X)", async () => {
  const moctokit = new Moctokit("http://api.github.com");
  const act = new Act();
  const repoPath = mockGithub.repo.getPath("build-chain");
  const parentDir = path.dirname(repoPath!);
  const result = await act
    .setGithubToken("token")
    .setEnv("GITHUB_SERVER_URL", `${parentDir}${path.sep}`)
    .setEnv("GITHUB_REPOSITORY", "owner1/project2")
    .setEvent({
      pull_request: {
        head: {
          ref: "branchA",
          repo: {
            full_name: "owner1/project2",
            name: "project2",
            owner: {
              login: "owner1",
            },
          },
        },
        base: {
          ref: "branchB",
          repo: {
            full_name: "owner1/project2",
            name: "project2",
            owner: {
              login: "owner1",
            },
          },
        },
      },
    })
    .runEvent("pull_request", {
      ...logActOutput("parallel-execution.log"),
      cwd: parentDir,
      workflowFile: repoPath,
      bind: true,
      mockApi: [
        moctokit.rest.repos
          .get({
            owner: "owner1",
            repo: /project(1|2|3|4)/,
          })
          .setResponse({ status: 200, data: {}, repeat: 4 }),
        moctokit.rest.pulls
          .list({
            owner: "owner1",
            repo: /project(1|2|3|4)/,
          })
          .setResponse({ status: 200, data: [{ title: "pr" }], repeat: 4 }),
      ],
    });
  expect(result.length).toBe(3);
  expect(result[1]).toMatchObject({ name: "Main ./build-chain", status: 0 });
  
  // parallel execution calculations
  const parallelExecutionGroup = result[1].groups![4];
  expect(parallelExecutionGroup.name).toBe("Calculating projects that can be executed parallely");
  expect(parallelExecutionGroup.output).toEqual(expect.stringContaining("1. [owner1/project1]"));
  expect(parallelExecutionGroup.output).toEqual(expect.stringContaining("2. [owner1/project2,owner1/project3]"));
  expect(parallelExecutionGroup.output).toEqual(expect.stringContaining("3. [owner1/project4]"));
  
  // make sure there execution summary for every project and was flushed before exiting
  expect(result[1].output).toEqual(expect.stringContaining("Execution summary for owner1/project1"));
  expect(result[1].output).toEqual(expect.stringContaining("Execution summary for owner1/project2"));
  expect(result[1].output).toEqual(expect.stringContaining("Execution summary for owner1/project3"));
  expect(result[1].output).toEqual(expect.stringContaining("Execution summary for owner1/project4"));
  // last line of logs to check stdout was flushed
  expect(result[1].output).toEqual(expect.stringContaining("No artifacts to archive"));
});
