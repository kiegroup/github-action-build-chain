import { Act } from "@kie/act-js";
import { copyFileSync, mkdirSync, readFileSync, rmSync } from "fs-extra";
import path from "path";
import { logActOutput } from "../../e2e/helper/logger";

type TestCommand = {
  name: string;
  cmd: string;
  description?: string;
  env?: Record<string, string>;
  shouldFail?: boolean;
  matchOutput?: string[]
  dontMatchOutput?: string[]
};

describe("test custom cli e2e commands", () => {
  const testCases: TestCommand[] = JSON.parse(
    readFileSync(path.join(__dirname, "tests.json"), "utf8")
  ) as TestCommand[];

  const tmpFolder = path.join(__dirname, "tmp");
  
  beforeAll(() => {
    mkdirSync(tmpFolder);
  });

  afterAll(() => {
    rmSync(tmpFolder, { recursive: true });
  });
  
  beforeEach(() => {
    copyFileSync(path.join(__dirname, "test.yaml"), path.join(tmpFolder, "test.yaml"));
  });

  for (const testCase of testCases) {
    test(testCase.name, async () => {
      const act = new Act()
        .setGithubStepSummary("/dev/stdout")
        .setEnv("GITHUB_REPOSITORY", extractGithubRepository(testCase.cmd))
        .setGithubToken(process.env["GITHUB_TOKEN"] ?? "");

      for (const key of Object.keys(testCase.env ?? {})) {
        act.setEnv(key, testCase.env![key]);
      }

      const result = await act.runEvent("workflow_dispatch", {
        ...logActOutput(`${testCase.name}-cli.log`),
        workflowFile: tmpFolder,
        mockSteps: {
          build: [
            {
              name: "Execute build-chain",
              mockWith: `${testCase.cmd} -d`,
            },
          ],
        },
      });

      expect(result.length).toBe(18);
      expect(result[13].name).toBe("Main Execute build-chain");
      expect(result[13].status).toBe(testCase.shouldFail ? 1 : 0);
      if (testCase.matchOutput) {
        testCase.matchOutput.forEach(output => {
          expect(result[13].output).toEqual(expect.stringContaining(output));
        });
      }

      if (testCase.dontMatchOutput) {
        testCase.dontMatchOutput.forEach(output => {
          expect(result[13].output).not.toEqual(expect.stringContaining(output));
        });
      }
    });
  }
});

function extractGithubRepository(cmd: string) {
  const urlRegex = /-u https?:\/\/.+\/([^/\s]+\/[^/\s]+)\/pull\/(\d+)/;
  const urlCheck = cmd.match(urlRegex);
  if (urlCheck) {
    return urlCheck[1];
  }
  return "";
}
