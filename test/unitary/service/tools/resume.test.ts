import "reflect-metadata";
import { CLIRunner } from "@bc/bin/runners/cli-runner";
import { constants } from "@bc/domain/constants";
import { EntryPoint } from "@bc/domain/entry-point";
import Container from "typedi";
import { FlowType } from "@bc/domain/inputs";
import { CLIArguments } from "@bc/service/arguments/cli/cli-arguments";
import { Resume } from "@bc/service/tools/resume";
import fs from "fs-extra";
import { PlatformType } from "@kie/build-chain-configuration-reader";
import { ConfigurationService } from "@bc/service/config/configuration-service";
import { CheckoutService } from "@bc/service/checkout/checkout-service";
import { FlowService } from "@bc/service/flow/flow-service";
import { ExecutionResult } from "@bc/domain/execute-command-result";
import { CLIConfiguration } from "@bc/service/config/cli-configuration";
import path from "path";
import { MockGithub } from "@kie/mock-github";
import { GitCLIService } from "@bc/service/git/git-cli";
import { BranchSummary } from "simple-git";

Container.set(constants.CONTAINER.ENTRY_POINT, EntryPoint.CLI);

let resume: Resume;
beforeEach(() => {
  resume = new Resume();
  jest.spyOn(global.console, "log").mockImplementation(() => undefined);
  jest
    .spyOn(CLIConfiguration.prototype, "loadToken")
    .mockImplementation(() => undefined);
  delete process.env["GITHUB_REPOSITORY"];
});

describe("execute", () => {
  let cliSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.spyOn(fs, "existsSync").mockReturnValue(true);
    jest.spyOn(fs, "readFileSync").mockReturnValue(
      JSON.stringify({
        configurationService: {
          configuration: {
            _gitEventData: {
              base: {
                repo: {
                  full_name: "test",
                },
              },
            },
            _gitConfiguration: {},
            _sourceProject: {},
            _targetProject: {},
            _parsedInputs: {
              CLISubCommand: FlowType.BRANCH,
            },
            _defaultPlatform: PlatformType.GITLAB,
          },
          _nodeChain: [{ project: "test" }],
          _definitionFile: {
            version: 2.3,
            build: [],
          },
        },
        checkoutService: [
          {
            node: { project: "test" },
            checkoutInfo: { merge: false, repoDir: "dir" },
            checkedOut: true,
          },
        ],
        flowService: [
          [
            {
              node: {
                project: "test",
              },
              executeCommandResults: [
                {
                  command: "false",
                  result: ExecutionResult.OK,
                  errorMessage: "",
                },
              ],
            },
            {
              node: {
                project: "test",
              },
              executeCommandResults: [
                {
                  command: "false",
                  result: ExecutionResult.OK,
                  errorMessage: "",
                },
              ],
            },
            {
              node: {
                project: "test",
              },
              executeCommandResults: [
                {
                  command: "false",
                  result: ExecutionResult.OK,
                  errorMessage: "",
                },
              ],
            },
          ],
        ],
      })
    );
    cliSpy = jest
      .spyOn(CLIRunner.prototype, "execute")
      .mockImplementation(async () => undefined);
    jest
      .spyOn(GitCLIService.prototype, "branch")
      .mockResolvedValue({} as BranchSummary);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("cli runner to have been called", async () => {
    await resume.execute();
    expect(cliSpy).toHaveBeenCalledTimes(1);
  });

  test("config service successfully reconstructed and patched", async () => {
    await resume.execute();
    const configService = Container.get(ConfigurationService);
    expect(configService.init()).resolves.toBe(undefined);
    expect(configService.getFlowType()).toBe(FlowType.BRANCH);
    expect(configService.getRootFolder()).toBe(process.cwd());
  });

  test("checkout service successfully reconstructed", async () => {
    await resume.execute();
    const checkoutService = Container.get(CheckoutService);
    expect(checkoutService.checkoutDefinitionTree()).resolves.toMatchObject([
      {
        node: { project: "test" },
        checkoutInfo: {
          merge: false,
          repoDir: path.join(process.cwd(), "test"),
        },
      },
    ]);
  });

  test("flow service successfully reconstructed", async () => {
    await resume.execute();
    const flowService = Container.get(FlowService);
    expect(flowService.run()).resolves.toMatchObject({
      executionResult: [
        [
          {
            node: {
              project: "test",
            },
            executeCommandResults: [
              {
                command: "false",
                result: ExecutionResult.OK,
                errorMessage: "",
              },
            ],
          },
          {
            node: {
              project: "test",
            },
            executeCommandResults: [
              {
                command: "false",
                result: ExecutionResult.OK,
                errorMessage: "",
              },
            ],
          },
          {
            node: {
              project: "test",
            },
            executeCommandResults: [
              {
                command: "false",
                result: ExecutionResult.OK,
                errorMessage: "",
              },
            ],
          },
        ],
      ],
    });
  });

  test("cli argument service successfully patched", async () => {
    await resume.execute();
    const args = Container.get(CLIArguments);
    expect(args.getCommand().parse()).toBe(undefined);
  });
});

describe("verify", () => {
  let mg: MockGithub;

  beforeEach(async () => {
    mg = new MockGithub(
      {
        repo: {
          project1: {
            currentBranch: "branch1",
          },
          project2: {
            pushedBranches: ["branch2"],
          },
        },
      },
      path.join(__dirname, "setup")
    );
    await mg.setup();
  });

  afterEach(async () => {
    await mg.teardown();
    jest.restoreAllMocks();
  });

  test("verify checkout", async () => {
    jest.spyOn(fs, "readFileSync").mockReturnValue(
      JSON.stringify({
        configurationService: {
          configuration: {
            _gitEventData: {
              base: {
                repo: {
                  full_name: "test",
                },
              },
            },
            _gitConfiguration: {},
            _sourceProject: {},
            _targetProject: {},
            _parsedInputs: {
              CLISubCommand: FlowType.BRANCH,
            },
            _defaultPlatform: PlatformType.GITLAB,
          },
          _nodeChain: [{ project: "test" }],
          _definitionFile: {
            version: 2.3,
            build: [],
          },
        },
        checkoutService: [
          {
            node: { project: "project1" },
            checkoutInfo: {
              sourceBranch: "branch1",
              merge: false,
              repoDir: mg.repo.getPath("project1"),
            },
            checkedOut: true,
          },
          {
            node: { project: "project2" },
            checkoutInfo: {
              sourceBranch: "branch1",
              merge: false,
              repoDir: mg.repo.getPath("project2"),
            },
            checkedOut: true,
          },
          {
            node: { project: "project3" },
            checkoutInfo: {
              sourceBranch: "branch1",
              merge: false,
              repoDir: "project3",
            },
            checkedOut: false,
          },
          {
            node: { project: "project4" },
            checkoutInfo: {
              sourceBranch: "branch1",
              merge: false,
              repoDir: "project4",
            },
            checkedOut: true,
          },
        ],
        flowService: [],
      })
    );

    jest
      .spyOn(CLIRunner.prototype, "execute")
      .mockImplementation(async () => undefined);

    const checkoutServiceSpy = jest.spyOn(CheckoutService, "fromJSON");

    await resume.execute();

    expect(checkoutServiceSpy).toHaveBeenCalledWith([
      {
        node: { project: "project1" },
        checkoutInfo: {
          sourceBranch: "branch1",
          merge: false,
          repoDir: mg.repo.getPath("project1"),
        },
        checkedOut: true,
      },
      {
        node: { project: "project2" },
        checkoutInfo: {
          sourceBranch: "branch1",
          merge: false,
          repoDir: mg.repo.getPath("project2"),
        },
        checkedOut: false,
      },
      {
        node: { project: "project3" },
        checkoutInfo: {
          sourceBranch: "branch1",
          merge: false,
          repoDir: "project3",
        },
        checkedOut: false,
      },
      {
        node: { project: "project4" },
        checkoutInfo: {
          sourceBranch: "branch1",
          merge: false,
          repoDir: "project4",
        },
        checkedOut: false,
      },
    ]);
  });
});
