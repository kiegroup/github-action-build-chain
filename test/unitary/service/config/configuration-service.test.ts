import "reflect-metadata";
import { constants } from "@bc/domain/constants";
import { EntryPoint } from "@bc/domain/entry-point";
import { defaultInputValues, FlowType, InputValues } from "@bc/domain/inputs";
import { ConfigurationService } from "@bc/service/config/configuration-service";
import Container from "typedi";
import { BaseConfiguration } from "@bc/service/config/base-configuration";
import { NodeExecutionLevel } from "@bc/domain/node-execution";
import { TreatmentOptions } from "@bc/domain/treatment-options";
import { ToolType } from "@bc/domain/cli";
import { DefinitionFileReader } from "@bc/service/config/definition-file-reader";
import { Node } from "@kie/build-chain-configuration-reader";
import { defaultNodeValue } from "@bc/domain/node";
import { EventData } from "@bc/domain/configuration";

// disable logs
jest.spyOn(global.console, "log");
jest.mock("@kie/build-chain-configuration-reader");

describe("initialization", () => {
  beforeEach(() => {
    jest
      .spyOn(ConfigurationService.prototype, "init")
      .mockImplementationOnce(async () => 
        Container.get(constants.CONTAINER.ENTRY_POINT) as never
      );
  });
  test("action", async () => {
    Container.set(constants.CONTAINER.ENTRY_POINT, EntryPoint.GITHUB_EVENT);
    const config = new ConfigurationService();
    await expect(config.init()).resolves.toBe(EntryPoint.GITHUB_EVENT);
  });

  test("cli", async () => {
    Container.set(constants.CONTAINER.ENTRY_POINT, EntryPoint.CLI);
    const config = new ConfigurationService();
    await expect(config.init()).resolves.toBe(EntryPoint.CLI);
  });

  test("incorrect entrypoint", async () => {
    Container.set(constants.CONTAINER.ENTRY_POINT, "dummy");
    expect(() => new ConfigurationService()).toThrowError();
  });
});

describe("methods", () => {
  let config: ConfigurationService;
  let currentInput: InputValues;
  const startProject = "owner/project";
  const projectTriggeringTheJob = "owner/job";

  beforeAll(() => {
    // doesn't matter whether it is a CLI or action
    Container.set(constants.CONTAINER.ENTRY_POINT, EntryPoint.CLI);
  });

  beforeEach(async () => {
    currentInput = {
      ...defaultInputValues,
      startProject,
      url: "https://github.com/owner/project/pull/270",
    };

    jest
      .spyOn(BaseConfiguration.prototype, "parsedInputs", "get")
      .mockImplementation(() => currentInput);
    jest
      .spyOn(DefinitionFileReader.prototype, "generateNodeChain")
      .mockImplementation(async () => []);
    jest
      .spyOn(DefinitionFileReader.prototype, "getDefinitionFile")
      .mockImplementation(async () => {
        return { version: "2.1" };
      });
    jest
      .spyOn(BaseConfiguration.prototype, "init")
      .mockImplementation(async () => undefined);

    config = new ConfigurationService();
    await config.init();
  });

  afterEach(() => {
    currentInput = {
      ...defaultInputValues,
      startProject,
      url: "https://github.com/owner/project/pull/270",
    };
  });

  test("getStarterProjectName: success", () => {
    expect(config.getStarterProjectName()).toBe(startProject);
  });

  test("getStarterProjectName: failure", () => {
    delete process.env["GITHUB_REPOSITORY"];
    delete currentInput["startProject"];
    expect(() => config.getStarterProjectName()).toThrowError();
  });

  test.each([
    [true, startProject],
    [false, "falsename"],
  ])("isNodeStarter %p", (isNodeStarter: boolean, project: string) => {
    expect(config.isNodeStarter({ ...defaultNodeValue, project })).toBe(
      isNodeStarter
    );
  });

  test("getStarterNode: success", () => {
    const chain: Node[] = [
      { ...defaultNodeValue, project: "abc" },
      { ...defaultNodeValue, project: startProject },
      { ...defaultNodeValue, project: "def" },
    ];
    const nodeFound: Node = { ...defaultNodeValue, project: startProject };
    jest
      .spyOn(ConfigurationService.prototype, "nodeChain", "get")
      .mockImplementation(() => chain);
    expect(config.getStarterNode()).toStrictEqual(nodeFound);
  });

  test("getStarterNode: failure", () => {
    const chain: Node[] = [
      { ...defaultNodeValue, project: "abc" },
      { ...defaultNodeValue, project: "xyz" },
      { ...defaultNodeValue, project: "def" },
    ];
    jest
      .spyOn(ConfigurationService.prototype, "nodeChain", "get")
      .mockImplementation(() => chain);
    expect(() => config.getStarterNode()).toThrowError();
  });

  test.each([
    ["upstream", 0, NodeExecutionLevel.UPSTREAM],
    ["current", 1, NodeExecutionLevel.CURRENT],
    ["downstream", 2, NodeExecutionLevel.DOWNSTREAM],
  ])(
    "getNodeExecutionLevel: %p",
    (
      title: string,
      currNodeIndex: number,
      executionLevel: NodeExecutionLevel
    ) => {
      const chain: Node[] = [
        { ...defaultNodeValue, project: "abc" },
        { ...defaultNodeValue, project: startProject },
        { ...defaultNodeValue, project: "def" },
      ];
      jest
        .spyOn(ConfigurationService.prototype, "nodeChain", "get")
        .mockImplementation(() => chain);
      expect(config.getNodeExecutionLevel(chain[currNodeIndex])).toBe(
        executionLevel
      );
    }
  );

  test.each([
    [
      "option skipExecution set to true",
      { ...defaultNodeValue, project: "abc" },
      { ...defaultInputValues, skipExecution: true },
      true,
    ],
    [
      "option skipExecution set to false and skipProjectExecution contains project name",
      { ...defaultNodeValue, project: "abc" },
      { ...defaultInputValues, skipProjectExecution: ["abc"] },
      true,
    ],
    [
      "option skipExecution set to false and skipProjectExecution does not contain project name",
      { ...defaultNodeValue, project: "abc" },
      { ...defaultInputValues, skipProjectExecution: ["def"] },
      false,
    ],
    [
      "option skipExecution set to false and skipProjectExecution not defined",
      { ...defaultNodeValue, project: "abc" },
      defaultInputValues,
      false,
    ],
  ])(
    "skipExecution: %p",
    (
      title: string,
      node: Node,
      currInput: InputValues,
      isExecutionSkipped: boolean
    ) => {
      currentInput = currInput;
      expect(config.skipExecution(node)).toBe(isExecutionSkipped);
    }
  );

  test.each([
    [
      "option skipCheckout set to true",
      { ...defaultNodeValue, project: "abc" },
      { ...defaultInputValues, skipCheckout: true },
      true,
    ],
    [
      "option skipCheckout set to false and skipProjectCheckout contains project name",
      { ...defaultNodeValue, project: "abc" },
      { ...defaultInputValues, skipProjectCheckout: ["abc"] },
      true,
    ],
    [
      "option skipCheckout set to false and skipProjectCheckout does not contain project name",
      { ...defaultNodeValue, project: "abc" },
      { ...defaultInputValues, skipProjectCheckout: ["def"] },
      false,
    ],
    [
      "option skipCheckout set to false and skipProjectCheckout not defined",
      { ...defaultNodeValue, project: "abc" },
      defaultInputValues,
      false,
    ],
  ])(
    "skipCheckout: %p",
    (
      title: string,
      node: Node,
      currInput: InputValues,
      isCheckoutSkipped: boolean
    ) => {
      currentInput = currInput;
      expect(config.skipCheckout(node)).toBe(isCheckoutSkipped);
    }
  );

  test.each([
    [
      "custom command treatment defined",
      { ...defaultInputValues, customCommandTreatment: ["abc||xyz"] },
      { replaceExpressions: ["abc||xyz"] },
    ],
    ["custom command treatment not defined", defaultInputValues, {}],
  ])(
    "getTreatmentOptions: success - %p",
    (
      title: string,
      currInput: InputValues,
      treatmentOptions: TreatmentOptions
    ) => {
      currentInput = currInput;
      expect(config.getTreatmentOptions()).toStrictEqual(treatmentOptions);
    }
  );

  test("get target project", () => {
    const project = {
      branch: "main",
      name: "project",
      group: "owner",
      repository: "owner/project",
    };
    jest
      .spyOn(BaseConfiguration.prototype, "targetProject", "get")
      .mockImplementation(() => project);
    expect(config.getTargetProject()).toStrictEqual(project);
  });

  test("get source project", () => {
    const project = {
      branch: "main",
      name: "project",
      group: "owner",
      repository: "owner/project",
    };
    jest
      .spyOn(BaseConfiguration.prototype, "sourceProject", "get")
      .mockImplementation(() => project);
    expect(config.getSourceProject()).toStrictEqual(project);
  });

  test("get flow type: success", () => {
    currentInput = {
      ...defaultInputValues,
      CLISubCommand: FlowType.CROSS_PULL_REQUEST,
    };
    expect(config.getFlowType()).toBe(FlowType.CROSS_PULL_REQUEST);
  });

  test("get flow type: failure", () => {
    currentInput = {
      ...defaultInputValues,
      CLISubCommand: ToolType.PROJECT_LIST,
    };
    expect(() => config.getFlowType()).toThrowError();
  });

  test("root folder from github workspace", () => {
    process.env["GITHUB_WORKSPACE"] = "workspace";
    expect(config.getRootFolder()).toBe("workspace");
    delete process.env["GITHUB_WORKSPACE"];
  });

  test("root folder from input", () => {
    currentInput = { ...defaultInputValues, outputFolder: "current" };
    expect(config.getRootFolder()).toBe(currentInput.outputFolder);
  });

  test("root folder default", () => {
    delete process.env["GITHUB_WORKSPACE"];
    expect(config.getRootFolder()).toBe(process.cwd());
  });

  test("get clone url", () => {
    const gitConfig = { serverUrlWithToken: "http://github.com" };
    jest
      .spyOn(BaseConfiguration.prototype, "gitConfiguration", "get")
      .mockImplementation(() => gitConfig);
    expect(config.getCloneUrl("owner", "project")).toBe(
      `${gitConfig.serverUrlWithToken}/owner/project`
    );
  });

  test("skipParallelCheckout", () => {
    currentInput = { ...defaultInputValues, skipParallelCheckout: true };
    expect(config.skipParallelCheckout()).toBe(
      currentInput.skipParallelCheckout
    );
  });

  test("getPre", () => {
    jest
      .spyOn(ConfigurationService.prototype, "definitionFile", "get")
      .mockImplementation(() => {
        return {
          version: "2.1",
          pre: ["hello"],
        };
      });
    expect(config.getPre()).toStrictEqual(["hello"]);
  });

  test("getPost", () => {
    jest
      .spyOn(ConfigurationService.prototype, "definitionFile", "get")
      .mockImplementation(() => {
        return {
          version: "2.1",
          post: {
            success: ["hello"],
          },
        };
      });
    expect(config.getPost()).toStrictEqual({ success: ["hello"] });
  });

  test.each([
    ["branch flow", FlowType.BRANCH, ""],
    ["non branch flow", FlowType.CROSS_PULL_REQUEST, "url"],
  ])("getEventUrl", (title: string, flowType: FlowType, expected: string) => {
    currentInput = {
      ...defaultInputValues,
      CLISubCommand: flowType,
    };
    jest
      .spyOn(BaseConfiguration.prototype, "gitEventData", "get")
      .mockImplementationOnce(() => ({ html_url: expected } as EventData));
    expect(config.getEventUrl()).toBe(expected);
  });

  test.each([
    ["branch flow", FlowType.BRANCH, "group"],
    ["non branch flow", FlowType.CROSS_PULL_REQUEST, undefined],
  ])("getGroupName", (title: string, flowType: FlowType, group?: string) => {
    currentInput = {
      ...defaultInputValues,
      CLISubCommand: flowType,
      group
    };
    expect(config.getGroupName()).toBe(group);
  });

  test.each([
    ["github env is defined", projectTriggeringTheJob, undefined, projectTriggeringTheJob],
    ["github event is defined", undefined, projectTriggeringTheJob, projectTriggeringTheJob],
    ["neither is defined use startProject", undefined, undefined, startProject],
  ])("getProjectTriggeringTheJobName: %p", (_title, githubEnv, githubEvent, expected) => {
    if (githubEnv) {
      process.env["GITHUB_REPOSITORY"] = githubEnv;
    }
    jest
      .spyOn(BaseConfiguration.prototype, "gitEventData", "get")
      .mockImplementationOnce(() => ({ base: {repo: {full_name: githubEvent}} }) as never);
    expect(config.getProjectTriggeringTheJobName()).toBe(expected);
    delete process.env["GITHUB_REPOSITORY"];
  });

  test.each([
    ["projectTriggeringTheJob is found", projectTriggeringTheJob, projectTriggeringTheJob],
    ["projectTriggeringTheJob is not found", undefined, startProject],
  ])("getProjectTriggeringTheJob: %p", (_title, getProjectTriggeringTheJobName, expectedProject) => {
    const chain: Node[] = [
      { ...defaultNodeValue, project: "abc" },
      { ...defaultNodeValue, project: startProject },
      { ...defaultNodeValue, project: projectTriggeringTheJob },
    ];
    const nodeFound: Node = { ...defaultNodeValue, project: expectedProject };
    jest
      .spyOn(ConfigurationService.prototype, "nodeChain", "get")
      .mockImplementation(() => chain);
    jest
      .spyOn(ConfigurationService.prototype, "getProjectTriggeringTheJobName")
      .mockImplementation(() => getProjectTriggeringTheJobName!);
    expect(config.getProjectTriggeringTheJob()).toStrictEqual(nodeFound);
  });
});
