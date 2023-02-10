import { Act } from "@kie/act-js";
import { EventJSON } from "@kie/act-js/build/src/action-event/action-event.types";
import { MockGithub } from "@kie/mock-github";
import { readFileSync } from "fs";
import path from "path";
import { logActOutput } from "../../e2e/helper/logger";

type TestCommand = {
  name: string;
  "definition-file": string;
  "flow-type": string;
  "starting-project"?: string;
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
  eventPayload?: EventJSON
  env?: Record<string, string>
  shouldFail?: boolean
};

describe("test custom e2e commands", () => {
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
                src: path.join(__dirname, "custom.yaml"),
                dest: ".github/workflows/custom.yaml",
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
      const act = new Act().setGithubToken(
        process.env["GITHUB_TOKEN"] ?? "token"
      );

      for (const key of Object.keys(testCase.env ?? {})) {
        act.setEnv(key, testCase.env![key]);
      }

      if (testCase.eventPayload) {
        act.setEvent(testCase.eventPayload);
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

      expect(result.length).toBe(3);
      expect(result[2].name).toBe("Main ./build-chain");
      expect(result[2].status).toBe(testCase.shouldFail ? 1 : 0);
    });
  }
});
