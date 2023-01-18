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
              src: path.join(__dirname, "branch.yaml"),
              dest: ".github/workflows/branch.yaml",
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
          pushedBranches: ["branchB", "8.B"],
          history: [
            {
              action: GitActionTypes.PUSH,
              branch: "8.B",
            },
            {
              action: GitActionTypes.PUSH,
              branch: "branchB",
            },
          ],
        },
        "owner1/project2": {
          pushedBranches: ["branchB"],
          history: [
            {
              action: GitActionTypes.PUSH,
              branch: "branchB",
            },
          ],
        },
        "owner1/project4": {
          pushedBranches: ["branchB"],
          history: [
            {
              action: GitActionTypes.PUSH,
              branch: "branchB",
            },
          ],
        },
        "owner2/project4": {
          pushedBranches: ["branchB"],
          history: [
            {
              action: GitActionTypes.PUSH,
              branch: "branchB",
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

test("full downstream where 1 project has a PR and one doesn't", async () => {
  const moctokit = new Moctokit("http://api.github.com");
  const act = new Act();
  const repoPath = mockGithub.repo.getPath("build-chain");
  const parentDir = path.dirname(repoPath!);
  const result = await act
    .setGithubToken("token")
    .setEnv("ACT_REPO", `${parentDir}${path.sep}` ?? "")
    .setEnv("STARTING_PROJECT", "owner1/project2")
    .setEnv(
      "CLONE_DIR",
      `${path.join(parentDir, "project2")} ${path.join(parentDir, "project1")}`
    )
    .setEnv("ADDITIONAL_FLAGS", "--fullProjectDependencyTree; --branch branchB")
    .runEvent("push", {
      ...logActOutput("branch-1.log"),
      cwd: parentDir,
      workflowFile: repoPath,
      bind: true,
      mockApi: [
        moctokit.rest.repos
          .get({
            owner: "owner1",
            repo: /project(1|2|4)/,
          })
          .setResponse({ status: 200, data: {}, repeat: 3 }),
        moctokit.rest.pulls
          .list({
            owner: "owner1",
            repo: /project(2|4)/,
          })
          .setResponse({ status: 200, data: [], repeat: 4 }),
        moctokit.rest.pulls
          .list({
            owner: "owner1",
            repo: "project1",
          })
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

  // pre section
  const group1 = result[1].groups![0];
  expect(group1.name).toBe("Executing pre section");
  expect(group1.output).toEqual(
    expect.stringContaining("Executing pre step 1")
  );
  expect(group1.output).toEqual(
    expect.stringContaining("Executing pre step 2")
  );

  // execution plan
  const group2 = result[1].groups![1];
  expect(group2.name).toBe("Execution Plan");
  expect(group2.output).toEqual(
    expect.stringContaining("3 projects will be executed")
  );
  expect(group2.output).toEqual(expect.stringContaining("[owner1/project1]"));
  expect(group2.output).toEqual(
    expect.stringContaining("Level type: upstream")
  );
  expect(group2.output).toEqual(expect.stringContaining("[owner1/project2]"));
  expect(group2.output).toEqual(expect.stringContaining("Level type: current"));
  expect(group2.output).toEqual(expect.stringContaining("[owner1/project4]"));
  expect(group2.output).toEqual(
    expect.stringContaining("Level type: downstream")
  );

  // checkout projects
  const group3 = result[1].groups![2];
  expect(group3.name).toBe("Checking out owner1/project2 and its dependencies (3 projects in total). It can take some time.");
  expect(group3.output).toEqual(expect.stringContaining("[owner1/project1]"));
  expect(group3.output).toEqual(
    expect.stringContaining("Project taken from owner1/project1:8.B")
  );
  expect(group3.output).toEqual(
    expect.stringContaining("Merged owner1/project1:branchB into branch 8.B")
  );
  expect(group3.output).toEqual(expect.stringContaining("[owner1/project2]"));
  expect(group3.output).toEqual(
    expect.stringContaining("Project taken from owner1/project2:branchB")
  );
  expect(group3.output).not.toEqual(
    expect.stringContaining(
      "Merged owner1/project2:branchB into branch branchB"
    )
  );
  expect(group3.output).toEqual(expect.stringContaining("[owner1/project4]"));
  expect(group3.output).toEqual(
    expect.stringContaining("Project taken from owner1/project4:branchB")
  );
  expect(group3.output).not.toEqual(
    expect.stringContaining(
      "Merged owner1/project4:branchB into branch branchB"
    )
  );

  // before section
  const group4 = result[1].groups![3];
  expect(group4.name).toBe("Executing before");
  expect(group4.output).toEqual(
    expect.stringContaining(" before upstream owner1/project1")
  );
  expect(group4.output).toEqual(expect.stringContaining("[owner1/project1]"));
  expect(group4.output).toEqual(
    expect.stringContaining(
      "[OK] echo \"before upstream owner1/project1\" [Executed in"
    )
  );
  expect(group4.output).toEqual(expect.stringContaining("[owner1/project2]"));
  expect(group4.output).toEqual(
    expect.stringContaining("No commands were found for this project")
  );
  expect(group4.output).toEqual(expect.stringContaining("[owner1/project4]"));
  expect(group4.output).toEqual(
    expect.stringContaining("No commands were found for this project")
  );

  // current section
  const group5 = result[1].groups![4];
  expect(group5.name).toBe("Executing commands");
  expect(group5.output).toEqual(expect.stringContaining("default upstream"));
  expect(group5.output).toEqual(
    expect.stringContaining("current owner1/project2")
  );
  expect(group5.output).toEqual(expect.stringContaining("default current"));
  expect(group5.output).toEqual(expect.stringContaining("[owner1/project1]"));
  expect(group5.output).toEqual(
    expect.stringContaining("[OK] echo \"default upstream\" [Executed in")
  );
  expect(group5.output).toEqual(expect.stringContaining("[owner1/project2]"));
  expect(group5.output).toEqual(
    expect.stringContaining("[OK] echo \"current owner1/project2\" [Executed in")
  );
  // if no downstream is defined by default we execute current
  expect(group5.output).toEqual(expect.stringContaining("[owner1/project4]"));
  expect(group5.output).toEqual(
    expect.stringContaining("[OK] echo \"default current\" [Executed in")
  );

  // after section
  const group6 = result[1].groups![5];
  expect(group6.name).toBe("Executing after");
  expect(group6.output).toEqual(
    expect.stringContaining("default after current")
  );
  expect(group6.output).toEqual(
    expect.stringContaining("default after current")
  );
  expect(group6.output).toEqual(
    expect.stringContaining("default after current")
  );
  expect(group6.output).toEqual(expect.stringContaining("[owner1/project1]"));
  expect(group6.output).toEqual(
    expect.stringContaining("[OK] echo \"default after current\" [Executed in")
  );
  expect(group6.output).toEqual(expect.stringContaining("[owner1/project2]"));
  expect(group6.output).toEqual(
    expect.stringContaining("[OK] echo \"default after current\" [Executed in")
  );
  expect(group6.output).toEqual(expect.stringContaining("[owner1/project4]"));
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

test("cross-pr with no PRs", async () => {
  const moctokit = new Moctokit("http://api.github.com");
  const act = new Act();
  const repoPath = mockGithub.repo.getPath("build-chain");
  const parentDir = path.dirname(repoPath!);
  const result = await act
    .setGithubToken("token")
    .setEnv("ACT_REPO", `${parentDir}${path.sep}` ?? "")
    .setEnv("STARTING_PROJECT", "owner1/project2")
    .setEnv(
      "CLONE_DIR",
      `${path.join(parentDir, "project1")} ${path.join(parentDir, "project2")}`
    )
    .setEnv("ADDITIONAL_FLAGS", "--branch branchB")
    .runEvent("push", {
      ...logActOutput("branch-2.log"),
      cwd: parentDir,
      workflowFile: repoPath,
      bind: true,
      mockApi: [
        moctokit.rest.repos
          .get({
            owner: "owner1",
            repo: /project(1|2)/,
          })
          .setResponse({ status: 200, data: {}, repeat: 2 }),
        moctokit.rest.pulls
          .list({
            owner: "owner1",
            repo: /project(1|2)/,
          })
          .setResponse({ status: 200, data: [], repeat: 4 }),
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

  // pre section
  const group1 = result[1].groups![0];
  expect(group1.name).toBe("Executing pre section");
  expect(group1.output).toEqual(
    expect.stringContaining("Executing pre step 1")
  );
  expect(group1.output).toEqual(
    expect.stringContaining("Executing pre step 2")
  );

  // execution plan
  const group2 = result[1].groups![1];
  expect(group2.name).toBe("Execution Plan");
  expect(group2.output).toEqual(
    expect.stringContaining("2 projects will be executed")
  );
  expect(group2.output).toEqual(expect.stringContaining("[owner1/project1]"));
  expect(group2.output).toEqual(
    expect.stringContaining("Level type: upstream")
  );
  expect(group2.output).toEqual(expect.stringContaining("[owner1/project2]"));
  expect(group2.output).toEqual(expect.stringContaining("Level type: current"));

  // checkout projects. important to verify the mapped targets
  const group3 = result[1].groups![2];
  expect(group3.name).toBe("Checking out owner1/project2 and its dependencies (2 projects in total). It can take some time.");
  expect(group3.output).toEqual(expect.stringContaining("[owner1/project1]"));
  expect(group3.output).toEqual(
    expect.stringContaining("Project taken from owner1/project1:8.B")
  );
  expect(group3.output).not.toEqual(
    expect.stringContaining("Merged owner1/project1:branchB into branch 8.B")
  );
  expect(group3.output).toEqual(expect.stringContaining("[owner1/project2]"));
  expect(group3.output).toEqual(
    expect.stringContaining("Project taken from owner1/project2:branchB")
  );
  expect(group3.output).not.toEqual(
    expect.stringContaining(
      "Merged owner1/project2:branchB into branch branchB"
    )
  );

  // before section
  const group4 = result[1].groups![3];
  expect(group4.name).toBe("Executing before");
  expect(group4.output).toEqual(
    expect.stringContaining(" before upstream owner1/project1")
  );
  expect(group4.output).toEqual(expect.stringContaining("[owner1/project1]"));
  expect(group4.output).toEqual(
    expect.stringContaining(
      "[OK] echo \"before upstream owner1/project1\" [Executed in"
    )
  );
  expect(group4.output).toEqual(expect.stringContaining("[owner1/project2]"));
  expect(group4.output).toEqual(
    expect.stringContaining("No commands were found for this project")
  );

  // current section
  const group5 = result[1].groups![4];
  expect(group5.name).toBe("Executing commands");
  expect(group5.output).toEqual(expect.stringContaining("default upstream"));
  expect(group5.output).toEqual(
    expect.stringContaining("current owner1/project2")
  );
  expect(group5.output).toEqual(expect.stringContaining("[owner1/project1]"));
  expect(group5.output).toEqual(
    expect.stringContaining("[OK] echo \"default upstream\" [Executed in")
  );
  expect(group5.output).toEqual(expect.stringContaining("[owner1/project2]"));
  expect(group5.output).toEqual(
    expect.stringContaining("[OK] echo \"current owner1/project2\" [Executed in")
  );

  // after section
  const group6 = result[1].groups![5];
  expect(group6.name).toBe("Executing after");
  expect(group6.output).toEqual(
    expect.stringContaining("default after current")
  );
  expect(group6.output).toEqual(
    expect.stringContaining("default after current")
  );
  expect(group6.output).toEqual(expect.stringContaining("[owner1/project1]"));
  expect(group6.output).toEqual(
    expect.stringContaining("[OK] echo \"default after current\" [Executed in")
  );
  expect(group6.output).toEqual(expect.stringContaining("[owner1/project2]"));
  expect(group6.output).toEqual(
    expect.stringContaining("[OK] echo \"default after current\" [Executed in")
  );

  // artifacts
  const group7 = result[1].groups![6];
  expect(group7.name).toBe("Uploading artifacts");
  expect(group7.output).toEqual(
    expect.stringContaining("No artifacts to archive")
  );

  // clone check is done during the workflow execution. just verify it succeeded here
  expect(result[2]).toStrictEqual({
    name: "Main Check for clones",
    status: 0,
    output: "exist",
  });
});
