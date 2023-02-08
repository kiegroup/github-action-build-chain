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
              src: path.join(__dirname, "cross-pr.yaml"),
              dest: ".github/workflows/cross-pr.yaml",
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
          pushedBranches: ["branchA", "branchB", "8.B", "7.x"],
          history: [
            {
              action: GitActionTypes.PUSH,
              branch: "branchA",
            },
            {
              action: GitActionTypes.PUSH,
              branch: "branchB",
            },
            {
              action: GitActionTypes.PUSH,
              branch: "8.B",
            },
            {
              action: GitActionTypes.PUSH,
              branch: "7.x",
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
          pushedBranches: ["branchC"],
          history: [
            {
              action: GitActionTypes.PUSH,
              branch: "branchC",
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
        "owner2/project3": {
          pushedBranches: ["branchA"],
          history: [
            {
              action: GitActionTypes.PUSH,
              branch: "branchA",
            },
          ],
        },
        "owner2/project4": {
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

test("PR from owner1/target:branchA to owner2/target:branchB while using mapping of the starting project (mapping.dependencies.X)", async () => {
  const moctokit = new Moctokit("http://api.github.com");
  const act = new Act();
  const repoPath = mockGithub.repo.getPath("build-chain");
  const parentDir = path.dirname(repoPath!);
  const result = await act
    .setGithubToken("token")
    .setEnv("ACT_REPO", `${parentDir}${path.sep}` ?? "")
    .setEnv("STARTING_PROJECT", "owner1/project4")
    .setEnv(
      "CLONE_DIR",
      `${path.join(parentDir, "project1")} ${path.join(
        parentDir,
        "project2"
      )} ${path.join(parentDir, "project3")}`
    )
    .setEvent({
      pull_request: {
        head: {
          ref: "branchA",
          repo: {
            full_name: "owner2/project4",
            name: "project4",
            owner: {
              login: "owner2",
            },
          },
        },
        base: {
          ref: "branchB",
          repo: {
            full_name: "owner1/project4",
            name: "project4",
            owner: {
              login: "owner1",
            },
          },
        },
      },
    })
    .runEvent("pull_request", {
      ...logActOutput("cross-pr-1.log"),
      cwd: parentDir,
      workflowFile: repoPath,
      bind: true,
      mockApi: [
        moctokit.rest.repos
          .listForks({
            owner: "owner1",
            repo: "project4",
          })
          .setResponse({
            status: 200,
            data: [
              {
                name: "project4",
                owner: {
                  login: "owner2",
                },
              },
            ],
          }),
        moctokit.rest.repos
          .listForks({
            owner: "owner1",
            repo: "project3",
          })
          .setResponse({
            status: 200,
            data: [{ name: "project3", owner: { login: "owner2" } }],
          }),
        moctokit.rest.repos
          .listForks({
            owner: "owner1",
            repo: /project(1|2)/,
          })
          .setResponse({
            status: 200,
            data: [],
            repeat: 2,
          }),
        moctokit.rest.pulls
          .list({
            owner: "owner1",
            repo: /project(1|2|3|4)/,
          })
          .setResponse({ status: 200, data: [{ title: "pr" }], repeat: 4 }),
      ],
    });

  expect(result.length).toBe(4);
  expect(result[0]).toStrictEqual({
    name: "Main actions/checkout@v2",
    status: 0,
    output: "",
  });
  expect(result[1]).toMatchObject({ name: "Main ./build-chain", status: 0 });
  expect(result[1].groups?.length).toBe(18);

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
    expect.stringContaining("4 projects will be executed")
  );
  expect(group2.output).toEqual(expect.stringContaining("[owner1/project1]"));
  expect(group2.output).toEqual(
    expect.stringContaining("Level type: upstream")
  );
  expect(group2.output).toEqual(expect.stringContaining("[owner1/project2]"));
  expect(group2.output).toEqual(
    expect.stringContaining("Level type: upstream")
  );
  expect(group2.output).toEqual(expect.stringContaining("[owner1/project3]"));
  expect(group2.output).toEqual(
    expect.stringContaining("Level type: upstream")
  );
  expect(group2.output).toEqual(expect.stringContaining("[owner1/project4]"));
  expect(group2.output).toEqual(expect.stringContaining("Level type: current"));

  // checkout project. important to verify the mapped targets
  const group4 = result[1].groups![3];
  expect(group4.name).toBe("Checkout summary");
  expect(group4.output).toEqual(expect.stringContaining("[owner1/project1]"));
  expect(group4.output).toEqual(
    expect.stringContaining("Project taken from owner1/project1:7.x")
  );
  expect(group4.output).toEqual(
    expect.stringContaining("Merged owner1/project1:branchA into branch 7.x")
  );
  expect(group4.output).toEqual(expect.stringContaining("[owner1/project2]"));
  expect(group4.output).toEqual(
    expect.stringContaining("Project taken from owner1/project2:branchB")
  );
  expect(group4.output).toEqual(
    expect.stringContaining(
      "Merged owner1/project2:branchA into branch branchB"
    )
  );
  expect(group4.output).toEqual(expect.stringContaining("[owner1/project3]"));
  expect(group4.output).toEqual(
    expect.stringContaining("Project taken from owner1/project3:branchC")
  );
  expect(group4.output).toEqual(
    expect.stringContaining(
      "Merged owner2/project3:branchA into branch branchC"
    )
  );
  expect(group4.output).toEqual(expect.stringContaining("[owner1/project4]"));
  expect(group4.output).toEqual(
    expect.stringContaining("Project taken from owner1/project4:branchB")
  );
  expect(group4.output).toEqual(
    expect.stringContaining(
      "Merged owner2/project4:branchA into branch branchB"
    )
  );

  // owner1/project1 section
  const group5 = result[1].groups![4];
  expect(group5.name).toBe("Executing owner1/project1");
  expect(group5.output).toEqual(
    expect.stringContaining("before upstream owner1/project1")
  );
  expect(group5.output).toEqual(
    expect.stringContaining("default upstream")
  );
  expect(group5.output).toEqual(
    expect.stringContaining("default after current")
  );

  // owner1/project3 section
  const group9 = result[1].groups![8];
  expect(group9.name).toBe("Executing owner1/project3");
  expect(group9.output).toEqual(expect.stringContaining("default after current"));

  // owner1/project2 section
  const group12 = result[1].groups![11];
  expect(group12.name).toBe("Executing owner1/project2");
  expect(group12.output).toEqual(
    expect.stringContaining("upstream owner1/project2")
  );
  expect(group12.output).toEqual(
    expect.stringContaining("default after current")
  );

  // owner1/project4 section
  const group15 = result[1].groups![14];
  expect(group15.name).toBe("Executing owner1/project4");
  expect(group15.output).toEqual(
    expect.stringContaining("default current")
  );
  expect(group15.output).toEqual(
    expect.stringContaining("default after current")
  );
  
  // artifacts
  const group18 = result[1].groups![17];
  expect(group18.name).toBe("Uploading artifacts");
  expect(group18.output).toEqual(
    expect.stringContaining("No artifacts to archive")
  );
  
  // clone check is done during the workflow execution. just verify it succeeded here
  expect(result[2]).toStrictEqual({
    name: "Main Check for clones",
    status: 0,
    output: "exist",
  });
});

test("PR from target:branchA to target:branchB while using mapping of a non-starting project (mapping.dependant.X)", async () => {
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
      ...logActOutput("cross-pr-2.log"),
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
          .setResponse({ status: 200, data: [{ title: "pr" }], repeat: 2 }),
      ],
    });
  expect(result.length).toBe(4);
  expect(result[0]).toStrictEqual({
    name: "Main actions/checkout@v2",
    status: 0,
    output: "",
  });
  expect(result[1]).toMatchObject({ name: "Main ./build-chain", status: 0 });
  expect(result[1].groups?.length).toBe(12);
  
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
  const group4 = result[1].groups![3];
  expect(group4.name).toBe("Checkout summary");
  expect(group4.output).toEqual(expect.stringContaining("[owner1/project1]"));
  expect(group4.output).toEqual(
    expect.stringContaining("Project taken from owner1/project1:8.B")
  );
  expect(group4.output).toEqual(
    expect.stringContaining("Merged owner1/project1:branchA into branch 8.B")
  );
  expect(group4.output).toEqual(expect.stringContaining("[owner1/project2]"));
  expect(group4.output).toEqual(
    expect.stringContaining("Project taken from owner1/project2:branchB")
  );
  expect(group4.output).toEqual(
    expect.stringContaining(
      "Merged owner1/project2:branchA into branch branchB"
    )
  );
  
  // owner1/project1 section
  const group5 = result[1].groups![4];
  expect(group5.name).toBe("Executing owner1/project1");
  expect(group5.output).toEqual(
    expect.stringContaining("before upstream owner1/project1")
  );
  expect(group5.output).toEqual(
    expect.stringContaining("default upstream")
  );
  expect(group5.output).toEqual(
    expect.stringContaining("default after current")
  );
  
  // owner1/project2 section
  const group9 = result[1].groups![8];
  expect(group9.name).toBe("Executing owner1/project2");
  expect(group9.output).toEqual(
    expect.stringContaining("current owner1/project2")
  );
  expect(group9.output).toEqual(expect.stringContaining("default after current"));
  
  // artifacts
  const group12 = result[1].groups![11];
  expect(group12.name).toBe("Uploading artifacts");
  expect(group12.output).toEqual(
    expect.stringContaining("No artifacts to archive")
  );
  
  // clone check is done during the workflow execution. just verify it succeeded here
  expect(result[2]).toStrictEqual({
    name: "Main Check for clones",
    status: 0,
    output: "exist",
  });
});
