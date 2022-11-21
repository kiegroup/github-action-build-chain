import "reflect-metadata";
import { constants } from "@bc/domain/constants";
import { EntryPoint } from "@bc/domain/entry-point";
import { defaultInputValues, FlowType, InputValues } from "@bc/domain/inputs";
import { ConfigurationService } from "@bc/service/config/configuration-service";
import { MockGithub } from "../../../setup/mock-github";
import Container from "typedi";
import path from "path";
import { BaseConfiguration } from "@bc/service/config/base-configuration";
import fs from "fs";
import { NodeExecutionLevel } from "@bc/domain/node-execution";
import { TreatmentOptions } from "@bc/domain/treatment-options";
import { ToolType } from "@bc/domain/cli";
import { DefinitionFileReader } from "@bc/service/config/definition-file-reader";
import { Node } from "@kie/build-chain-configuration-reader";
import {defaultNodeValue} from "@bc/domain/node";

// disable logs
jest.spyOn(global.console, "log");
jest.mock("@kie/build-chain-configuration-reader");

const mockGithub = new MockGithub(path.join(__dirname, "config.json"), "event");

beforeEach(async () => {
  await mockGithub.setup();
  jest
    .spyOn(DefinitionFileReader.prototype, "generateNodeChain")
    .mockImplementation(async () => []);
  jest
    .spyOn(DefinitionFileReader.prototype, "getDefinitionFile")
    .mockImplementation(async () => {
      return { version: "2.1" };
    });
});

afterEach(() => {
  mockGithub.teardown();
});

describe("cli", () => {
  let config: ConfigurationService;
  let currentInput: InputValues;
  const startProject = "owner/project";

  beforeAll(() => {
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
    expect(config.isNodeStarter({ ...defaultNodeValue, project })).toBe(isNodeStarter);
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
    const workspace = JSON.parse(
      fs.readFileSync(path.join(__dirname, "config.json"), "utf8")
    ).env.workspace;
    expect(config.getRootFolder()).toBe(workspace);
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
});

describe("action", () => {
  let config: ConfigurationService;
  let currentInput: InputValues;
  const data = JSON.parse(
    fs.readFileSync(path.join(__dirname, "config.json"), "utf8")
  );

  beforeAll(() => {
    Container.set(constants.CONTAINER.ENTRY_POINT, EntryPoint.GITHUB_EVENT);
  });

  beforeEach(async () => {
    currentInput = defaultInputValues;
    jest
      .spyOn(BaseConfiguration.prototype, "parsedInputs", "get")
      .mockImplementation(() => currentInput);
    config = new ConfigurationService();
    await config.init();
  });

  afterEach(() => {
    currentInput = defaultInputValues;
  });

  test("getStarterProjectName: success", () => {
    expect(config.getStarterProjectName()).toBe(data.env.repository);
  });

  test("getStarterProjectName: failure", () => {
    delete process.env["GITHUB_REPOSITORY"];
    expect(() => config.getStarterProjectName()).toThrowError();
  });

  test.each([
    [true, data.env.repository],
    [false, "falsename"],
  ])("isNodeStarter %p", (isNodeStarter: boolean, project: string) => {
    expect(config.isNodeStarter({ ...defaultNodeValue, project: project })).toBe(isNodeStarter);
  });

  test("getStarterNode: success", () => {
    const chain: Node[] = [
      { ...defaultNodeValue, project: "abc" },
      { ...defaultNodeValue, project: data.env.repository },
      { ...defaultNodeValue, project: "def" },
    ];
    const nodeFound: Node = { ...defaultNodeValue, project: data.env.repository };
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
        { ...defaultNodeValue, project: data.env.repository },
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

  test("get flow type", () => {
    currentInput = {
      ...defaultInputValues,
      flowType: FlowType.CROSS_PULL_REQUEST,
    };
    expect(config.getFlowType()).toBe(FlowType.CROSS_PULL_REQUEST);
  });

  test("root folder from github workspace", () => {
    const workspace = JSON.parse(
      fs.readFileSync(path.join(__dirname, "config.json"), "utf8")
    ).env.workspace;
    expect(config.getRootFolder()).toBe(workspace);
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
          version: "2.2",
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
          version: "2.2",
          post: {
            success: ["hello"],
          },
        };
      });
    expect(config.getPost()).toStrictEqual({ success: ["hello"] });
  });

  test.each([
    ["branch flow", FlowType.BRANCH, ""],
    [
      "non-branch flow",
      FlowType.CROSS_PULL_REQUEST,
      data.action.eventPayload.pull_request.html_url,
    ],
  ])(
    "getEventUrl: %p",
    (_title: string, flowType: FlowType, result: string) => {
      jest
        .spyOn(ConfigurationService.prototype, "getFlowType")
        .mockImplementationOnce(() => flowType);

      expect(config.getEventUrl()).toBe(result);
    }
  );
});
