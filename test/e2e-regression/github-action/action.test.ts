import { Act } from "@kie/act-js";
import { MockGithub } from "@kie/mock-github";
import { Endpoints } from "@octokit/types";
import { readFileSync } from "fs";
import path from "path";
import { logActOutput } from "../../e2e/helper/logger";

type PullRequestPayload = Endpoints["GET /repos/{owner}/{repo}/pulls/{pull_number}"]["response"]["data"];

type TestCommand = {
  name: string;
  "definition-file": string;
  "flow-type": string;
  "starting-project?": string;
  "skip-execution"?: string;
  "skip-project-execution"?: string;
  "skip-checkout"?: string;
  "skip-project-checkout"?: string;
  "skip-parallel-checkout"?: string;
  "custom-command-treatment"?: string;
  "additional-flags"?: string;
  "logger-level"?: string;
  "annotations-prefix"?: string;
  "java-version"?: string;
  "maven-version"?: string;
  "cache-key-prefix"?: string;
  eventPayload: PullRequestPayload;
  env?: Record<string, string>
  shouldFail?: boolean;
  matchOutput?: string[]
};


describe("test custom e2e github action", () => {
  const testCases: TestCommand[] = JSON.parse(
    readFileSync(path.join(__dirname, "tests.json"), "utf8")
  ) as TestCommand[];

  let mockGithub: MockGithub;

  beforeEach(async () => {
    mockGithub = new MockGithub(
      {
        repo: {
          "build-chain": {
            files: [
              {
                src: path.join(__dirname, "test.yaml"),
                dest: ".github/workflows/test.yaml",
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
          }
        },
      },
      path.join(__dirname, "setup")
    );
    await mockGithub.setup();
  });

  afterEach(async () => {
    await mockGithub.teardown();
  });

  for (const testCase of testCases) {
    test(testCase.name, async () => {
      const act = new Act()
        .setGithubStepSummary("/dev/stdout")
        .setGithubToken(process.env["GITHUB_TOKEN"] ?? "token")
        .setEnv("GITHUB_REPOSITORY", testCase.eventPayload.base.repo.full_name);

      for (const key of Object.keys(testCase.env ?? {})) {
        act.setEnv(key, testCase.env![key]);
      }

      if (testCase.eventPayload) {
        act.setEvent({pull_request: testCase.eventPayload});
      }
      
      for (const [key, value] of Object.entries(testCase)) {
        if (value && 
          !["name", "eventPayload", "env", "name"].includes(key) &&
          typeof value === "string") {
            act.setInput(key, value);
        }
      }

      const result = await act.runEvent("workflow_dispatch", {
        ...logActOutput(`${testCase.name}-action.log`),
        cwd: mockGithub.repo.getPath("build-chain"),
        workflowFile: mockGithub.repo.getPath("build-chain")
      });
      
      expect(result.length).toBe(12);
      expect(result[8].name).toBe("Main ./build-chain");
      expect(result[8].status).toBe(testCase.shouldFail ? 1 : 0);
      if (testCase.matchOutput) {
        testCase.matchOutput.forEach(output => {
          expect(result[8].output).toEqual(expect.stringContaining(output));
        });
      }
    });
  }
});
