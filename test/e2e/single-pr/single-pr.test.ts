import { GitActionTypes, MockGithub, Moctokit } from "@kie/mock-github";
import path from "path";
import { Act } from "@kie/act-js";
import { existsSync, rmSync } from "fs";
import { logActOutput } from "../helper/helper";


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
              src: path.join(__dirname, "single-pr.yaml"),
              dest: ".github/workflows/single-pr.yaml",
            },
            {
              src: path.resolve(__dirname, "..", "..", "..", "action.yml"),
              dest: "action.yml",
            },
            {
              src: path.resolve(__dirname, "..", "..", "..", "dist"),
              dest: "dist",
            },
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
            },
          ],
        },
        "owner1/project3": {
          pushedBranches: ["branchA", "branchB"],
          history: [
            {
              action: GitActionTypes.PUSH,
              branch: "branchA",
            },
            {
              action: GitActionTypes.PUSH,
              branch: "branchB",
            },
          ],
        },
        "owner2/project3": {
          pushedBranches: ["branchA"],
          history: [
            {
              action: GitActionTypes.PUSH,
              branch: "branchA",
            },
          ],
        },
        "owner1/project1": {
          pushedBranches: ["branchA", "branchB"],
          history: [
            {
              action: GitActionTypes.PUSH,
              branch: "branchA",
            },
            {
              action: GitActionTypes.PUSH,
              branch: "branchB",
            },
          ],
        },
        "owner2/project1-forked": {
          pushedBranches: ["branchA"],
          history: [
            {
              action: GitActionTypes.PUSH,
              branch: "branchA",
            },
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

test("PR from target:branchA to target:branchB", async () => {
  const moctokit = new Moctokit("http://api.github.com");
  const act = new Act();
  const repoPath = mockGithub.repo.getPath("build-chain");
  const parentDir = path.dirname(repoPath!);
  const result = await act
    .setGithubToken("token")
    .setEnv("ACT_REPO", `${parentDir}${path.sep}` ?? "")
    .setEnv("STARTING_PROJECT", "owner1/project2")
    .setEnv("CLONE_DIR", path.join(parentDir, "project2"))
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
      ...logActOutput("single-pr-1.log"),
      cwd: parentDir,
      workflowFile: repoPath,
      bind: true,
      mockApi: [
        moctokit.rest.repos
          .get({
            owner: "owner1",
            repo: "project2",
          })
          .setResponse({ status: 200, data: {} }),
        moctokit.rest.pulls.list().setResponse([
          { status: 200, data: [{ title: "pr" }] },
        ]),
      ],
    });
  expect(result.length).toBe(4);
  expect(result[0]).toStrictEqual({
    name: "Main actions/checkout@v2",
    status: 0,
    output: "",
  });
  expect(result[1]).toMatchObject({ name: "Main ./build-chain", status: 0 });
  expect(result[1].groups?.length).toBe(7);
  const group1 = result[1].groups![0];
  expect(group1.name).toBe("Executing pre section");
  expect(group1.output).toEqual(
    expect.stringContaining("Executing pre step 1")
  );
  expect(group1.output).toEqual(
    expect.stringContaining("Executing pre step 2")
  );

  const group2 = result[1].groups![1];
  expect(group2.name).toBe("Execution Plan");
  expect(group2.output).toEqual(
    expect.stringContaining("1 projects will be executed")
  );
  expect(group2.output).toEqual(expect.stringContaining("[owner1/project2]"));
  expect(group2.output).toEqual(expect.stringContaining("Level type: current"));

  const group3 = result[1].groups![2];
  expect(group3.name).toBe("Checking out owner1/project2 and its dependencies");
  expect(group3.output).toEqual(expect.stringContaining("[owner1/project2]"));
  expect(group3.output).toEqual(
    expect.stringContaining("Project taken from owner1/project2:branchB")
  );
  expect(group3.output).toEqual(
    expect.stringContaining(
      "Merged owner1/project2:branchA into branch branchB"
    )
  );

  const group4 = result[1].groups![3];
  expect(group4.name).toBe("Executing before");
  expect(group4.output).toEqual(expect.stringContaining("[owner1/project2]"));
  expect(group4.output).toEqual(
    expect.stringContaining("No commands were found for this project")
  );

  const group5 = result[1].groups![4];
  expect(group5.name).toBe("Executing commands");
  expect(group5.output).toEqual(
    expect.stringContaining("current owner1/project2")
  );
  expect(group5.output).toEqual(expect.stringContaining("[owner1/project2]"));
  expect(group5.output).toEqual(
    expect.stringContaining("[OK] echo \"current owner1/project2\" [Executed in")
  );

  const group6 = result[1].groups![5];
  expect(group6.name).toBe("Executing after");
  expect(group6.output).toEqual(
    expect.stringContaining("default after current")
  );
  expect(group6.output).toEqual(expect.stringContaining("[owner1/project2]"));
  expect(group6.output).toEqual(
    expect.stringContaining("[OK] echo \"default after current\" [Executed in")
  );

  const group7 = result[1].groups![6];
  expect(group7.name).toBe("Uploading artifacts");
  expect(group7.output).toEqual(
    expect.stringContaining("No artifacts to archive")
  );

  expect(result[2]).toStrictEqual({
    name: "Main Check for clones",
    status: 0,
    output: "exist",
  });
});

test("PR from owner2/target:branchA to owner1/target:branchB", async () => {
  const moctokit = new Moctokit("http://api.github.com");
  const act = new Act();
  const repoPath = mockGithub.repo.getPath("build-chain");
  const parentDir = path.dirname(repoPath!);
  const artifactPath = path.join(__dirname, "artifacts");
  const result = await act
    .setGithubToken("token")
    .setEnv("ACT_REPO", `${parentDir}${path.sep}` ?? "")
    .setEnv("STARTING_PROJECT", "owner1/project3")
    .setEnv("CLONE_DIR", path.join(parentDir, "project3"))
    .setEvent({
      pull_request: {
        head: {
          ref: "branchA",
          repo: {
            full_name: "owner2/project3",
            name: "project3",
            owner: {
              login: "owner2",
            },
          },
        },
        base: {
          ref: "branchB",
          repo: {
            full_name: "owner1/project3",
            name: "project3",
            owner: {
              login: "owner1",
            },
          },
        },
      },
    })
    .runEvent("pull_request", {
      ...logActOutput("single-pr-2.log"),
      cwd: parentDir,
      workflowFile: repoPath,
      bind: true,
      artifactServer: {
        path: artifactPath,
        port: "42469",
      },
      mockApi: [
        moctokit.rest.repos
          .listForks({
            owner: "owner1",
            repo: "project3",
          })
          .setResponse({
            status: 200,
            data: [
              {
                name: "project3",
                owner: {
                  login: "owner2",
                },
              },
            ],
          }),
        moctokit.rest.pulls
          .list()
          .setResponse({ status: 200, data: [{ title: "pr" }] }),
      ],
    });

  expect(result.length).toBe(4);
  expect(result[0]).toStrictEqual({
    name: "Main actions/checkout@v2",
    status: 0,
    output: "",
  });
  expect(result[1]).toMatchObject({ name: "Main ./build-chain", status: 0 });
  expect(result[1].groups?.length).toBe(7);
  const group1 = result[1].groups![0];
  expect(group1.name).toBe("Executing pre section");
  expect(group1.output).toEqual(
    expect.stringContaining("Executing pre step 1")
  );
  expect(group1.output).toEqual(
    expect.stringContaining("Executing pre step 2")
  );

  const group2 = result[1].groups![1];
  expect(group2.name).toBe("Execution Plan");
  expect(group2.output).toEqual(
    expect.stringContaining("1 projects will be executed")
  );
  expect(group2.output).toEqual(expect.stringContaining("[owner1/project3]"));
  expect(group2.output).toEqual(expect.stringContaining("Level type: current"));

  const group3 = result[1].groups![2];
  expect(group3.name).toBe("Checking out owner1/project3 and its dependencies");
  expect(group3.output).toEqual(expect.stringContaining("[owner1/project3]"));
  expect(group3.output).toEqual(
    expect.stringContaining("Project taken from owner1/project3:branchB")
  );
  expect(group3.output).toEqual(
    expect.stringContaining(
      "Merged owner2/project3:branchA into branch branchB"
    )
  );

  const group4 = result[1].groups![3];
  expect(group4.name).toBe("Executing before");
  expect(group4.output).toEqual(expect.stringContaining("[owner1/project3]"));
  expect(group4.output).toEqual(
    expect.stringContaining("No commands were found for this project")
  );

  const group5 = result[1].groups![4];
  expect(group5.name).toBe("Executing commands");
  expect(group5.output).toEqual(expect.stringContaining("[owner1/project3]"));
  expect(group5.output).toEqual(
    expect.stringContaining("[OK] touch project3-current.log [Executed in")
  );

  const group6 = result[1].groups![5];
  expect(group6.name).toBe("Executing after");
  expect(group6.output).toEqual(
    expect.stringContaining("default after current")
  );
  expect(group6.output).toEqual(expect.stringContaining("[owner1/project3]"));
  expect(group6.output).toEqual(
    expect.stringContaining("[OK] echo \"default after current\" [Executed in")
  );

  const group7 = result[1].groups![6];
  expect(group7.name).toBe("Uploading artifacts");
  expect(group7.output).toEqual(
    expect.stringContaining("Artifact owner1_project3 uploaded 1 files")
  );

  expect(result[2]).toStrictEqual({
    name: "Main Check for clones",
    status: 0,
    output: "exist",
  });
  
  // the first owner1_project3 is the parent dir of the artifact. The second one is 
  // because we didn't pass any artifact name so it uses the project name as the 
  // artifact name. So the repetition of owner1_project3 is expected  
  expect(existsSync(path.join(artifactPath, "1", "owner1_project3", "owner1_project3", "project3-current.log"))).toBe(true);
  rmSync(artifactPath, { recursive: true });
});

test("PR from owner2/target:branchA to owner1/target-different-name:branchB", async () => {
  const moctokit = new Moctokit("http://api.github.com");
  const act = new Act();
  const repoPath = mockGithub.repo.getPath("build-chain");
  const parentDir = path.dirname(repoPath!);
  const result = await act
    .setGithubToken("token")
    .setEnv("ACT_REPO", `${parentDir}${path.sep}` ?? "")
    .setEnv("STARTING_PROJECT", "owner1/project1")
    .setEnv("CLONE_DIR", path.join(parentDir, "project1"))
    .setEvent({
      pull_request: {
        head: {
          ref: "branchA",
          repo: {
            full_name: "owner2/project1-forked",
            name: "project1-forked",
            owner: {
              login: "owner2",
            },
          },
        },
        base: {
          ref: "branchB",
          repo: {
            full_name: "owner1/project1",
            name: "project1",
            owner: {
              login: "owner1",
            },
          },
        },
      },
    })
    .runEvent("pull_request", {
      ...logActOutput("single-pr-3.log"),
      cwd: parentDir,
      workflowFile: repoPath,
      bind: true,
      mockApi: [
        moctokit.rest.repos
          .listForks({
            owner: "owner1",
            repo: "project1",
          })
          .setResponse({
            status: 200,
            data: [
              {
                name: "project1-forked",
                owner: {
                  login: "owner2",
                },
              },
            ],
          }),
        moctokit.rest.pulls
          .list()
          .setResponse({ status: 200, data: [{ title: "pr" }] }),
      ],
    });

  expect(result.length).toBe(4);
  expect(result[0]).toStrictEqual({
    name: "Main actions/checkout@v2",
    status: 0,
    output: "",
  });
  expect(result[1]).toMatchObject({ name: "Main ./build-chain", status: 0 });
  expect(result[1].groups?.length).toBe(7);
  const group1 = result[1].groups![0];
  expect(group1.name).toBe("Executing pre section");
  expect(group1.output).toEqual(
    expect.stringContaining("Executing pre step 1")
  );
  expect(group1.output).toEqual(
    expect.stringContaining("Executing pre step 2")
  );

  const group2 = result[1].groups![1];
  expect(group2.name).toBe("Execution Plan");
  expect(group2.output).toEqual(
    expect.stringContaining("1 projects will be executed")
  );
  expect(group2.output).toEqual(expect.stringContaining("[owner1/project1]"));
  expect(group2.output).toEqual(expect.stringContaining("Level type: current"));

  const group3 = result[1].groups![2];
  expect(group3.name).toBe("Checking out owner1/project1 and its dependencies");
  expect(group3.output).toEqual(expect.stringContaining("[owner1/project1]"));
  expect(group3.output).toEqual(
    expect.stringContaining("Project taken from owner1/project1:branchB")
  );
  expect(group3.output).toEqual(
    expect.stringContaining(
      "Merged owner2/project1-forked:branchA into branch branchB"
    )
  );

  const group4 = result[1].groups![3];
  expect(group4.name).toBe("Executing before");
  expect(group4.output).toEqual(
    expect.stringContaining("before current owner1/project1")
  );
  expect(group4.output).toEqual(expect.stringContaining("[owner1/project1]"));
  expect(group4.output).toEqual(
    expect.stringContaining("[OK] echo \"before current owner1/project1\" [Executed in")
  );

  const group5 = result[1].groups![4];
  expect(group5.name).toBe("Executing commands");
  expect(group5.output).toEqual(
    expect.stringContaining("current owner1/project1")
  );
  expect(group5.output).toEqual(expect.stringContaining("[owner1/project1]"));
  expect(group5.output).toEqual(
    expect.stringContaining("[OK] echo \"current owner1/project1\" [Executed in")
  );

  const group6 = result[1].groups![5];
  expect(group6.name).toBe("Executing after");
  expect(group6.output).toEqual(
    expect.stringContaining("default after current")
  );
  expect(group6.output).toEqual(expect.stringContaining("[owner1/project1]"));
  expect(group6.output).toEqual(
    expect.stringContaining("[OK] echo \"default after current\" [Executed in")
  );

  const group7 = result[1].groups![6];
  expect(group7.name).toBe("Uploading artifacts");
  expect(group7.output).toEqual(
    expect.stringContaining("No artifacts to archive")
  );

  expect(result[2]).toStrictEqual({
    name: "Main Check for clones",
    status: 0,
    output: "exist",
  });
});
