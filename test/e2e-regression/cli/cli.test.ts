import { Act } from "@kie/act-js";
import { EventJSON } from "@kie/act-js/build/src/action-event/action-event.types";
import { cpSync, mkdirSync, readFileSync, rmSync } from "fs";
import path from "path";
import { logActOutput } from "../../e2e/helper/logger";

type TestCommand = {
  name: string;
  cmd: string;
  env?: Record<string, string>;
  eventPayload?: EventJSON;
  shouldFail?: boolean;
};

describe("test custom cli e2e commands", () => {
  const testCases: TestCommand[] = JSON.parse(
    readFileSync(path.join(__dirname, "tests.json"), "utf8")
  ) as TestCommand[];

  const tmpFolder = path.join(__dirname, "tmp");
  
  beforeAll(() => {
    mkdirSync(tmpFolder);
  });

  afterEach(() => {
    rmSync(tmpFolder, { recursive: true });
  });
  
  beforeEach(() => {
    cpSync(path.join(__dirname, "cli.yaml"), path.join(tmpFolder, "cli.yaml"));
  });

  for (const testCase of testCases) {
    test(testCase.name, async () => {
      let act = new Act()
        .setGithubToken(process.env["GITHUB_TOKEN"] ?? "token")
        .setEnv("GITHUB_REPOSITORY", "");

      for (const key of Object.keys(testCase.env ?? {})) {
        act = act.setEnv(key, testCase.env![key]);
      }

      if (testCase.eventPayload) {
        act = act.setEvent(testCase.eventPayload);
      }

      const result = await act.runEvent("pull_request", {
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

      expect(result.length).toBe(7);
      expect(result[6].name).toBe("Main Execute build-chain");
      expect(result[6].status).toBe(testCase.shouldFail ? 1 : 0);
    });
  }
});
