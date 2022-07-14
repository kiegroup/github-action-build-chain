import "reflect-metadata";
import { constants } from "@bc/domain/constants";
import { EntryPoint } from "@bc/domain/entry-point";
import { defaultInputValues, InputValues } from "@bc/domain/inputs";
import { ConfigurationService } from "@bc/service/config/configuration-service";
import { MockGithub } from "../../../setup/mock-github";
import Container from "typedi";
import path from "path";
import { BaseConfiguration } from "@bc/service/config/base-configuration";
import fs from "fs";
import { NodeExecutionLevel } from "@bc/domain/node-execution-level";
import { TreatmentOptions } from "@bc/domain/treatment-options";
import { Node } from "@bc/domain/node";
import { getOrderedListForTree, getTree, readDefinitionFile } from "@kie/build-chain-configuration-reader";

// disable logs
jest.spyOn(global.console, "log");
jest.mock("@kie/build-chain-configuration-reader");

const mockGithub = new MockGithub(path.join(__dirname, "config.json"), "event");

beforeEach(async () => {
  await mockGithub.setup();

  const readDefinitionFileMock = readDefinitionFile as jest.Mock;
  const getTreeMock = getTree as jest.Mock;
  const getOrderedListForTreeMock = getOrderedListForTree as jest.Mock;

  readDefinitionFileMock.mockReturnValue({ version: "2.1" });
  getTreeMock.mockReturnValue([]);
  getOrderedListForTreeMock.mockReturnValue([]);
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
    currentInput = { ...defaultInputValues, startProject, url: "https://github.com/owner/project/pull/270" };
    jest.spyOn(BaseConfiguration.prototype, "parsedInputs", "get").mockImplementation(() => currentInput);
    config = new ConfigurationService();
    await config.init();
  });

  afterEach(() => {
    currentInput = { ...defaultInputValues, startProject, url: "https://github.com/owner/project/pull/270" };
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
    expect(config.isNodeStarter({ project: project })).toBe(isNodeStarter);
  });

  test("getStarterNode: success", () => {
    const chain: Node[] = [{ project: "abc" }, { project: startProject }, { project: "def" }];
    const nodeFound: Node = { project: startProject };
    jest.spyOn(BaseConfiguration.prototype, "projectList", "get").mockImplementation(() => chain);
    expect(config.getStarterNode()).toStrictEqual(nodeFound);
  });

  test("getStarterNode: failure", () => {
    const chain: Node[] = [{ project: "abc" }, { project: "xyz" }, { project: "def" }];
    jest.spyOn(BaseConfiguration.prototype, "projectList", "get").mockImplementation(() => chain);
    expect(() => config.getStarterNode()).toThrowError();
  });

  test.each([
    ["upstream", 0, NodeExecutionLevel.UPSTREAM],
    ["current", 1, NodeExecutionLevel.CURRENT],
    ["downstream", 2, NodeExecutionLevel.DOWNSTREAM],
  ])("getNodeExecutionLevel: %p", (title: string, currNodeIndex: number, executionLevel: NodeExecutionLevel) => {
    const chain: Node[] = [{ project: "abc" }, { project: startProject }, { project: "def" }];
    jest.spyOn(BaseConfiguration.prototype, "projectList", "get").mockImplementation(() => chain);
    expect(config.getNodeExecutionLevel(chain[currNodeIndex])).toBe(executionLevel);
  });

  test.each([
    ["option skipExecution set to true", { project: "abc" }, { ...defaultInputValues, skipExecution: true }, true],
    [
      "option skipExecution set to false and skipProjectExecution contains project name",
      { project: "abc" },
      { ...defaultInputValues, skipProjectExecution: ["abc"] },
      true,
    ],
    [
      "option skipExecution set to false and skipProjectExecution does not contain project name",
      { project: "abc" },
      { ...defaultInputValues, skipProjectExecution: ["def"] },
      false,
    ],
    ["option skipExecution set to false and skipProjectExecution not defined", { project: "abc" }, defaultInputValues, false],
  ])("skipExecution: %p", (title: string, node: Node, currInput: InputValues, isExecutionSkipped: boolean) => {
    currentInput = currInput;
    expect(config.skipExecution(node)).toBe(isExecutionSkipped);
  });

  test.each([
    ["custom command treatment defined", { ...defaultInputValues, customCommandTreatment: ["abc||xyz"] }, { replaceExpressions: ["abc||xyz"] }],
    ["custom command treatment not defined", defaultInputValues, {}],
  ])("getTreatmentOptions: success - %p", (title: string, currInput: InputValues, treatmentOptions: TreatmentOptions) => {
    currentInput = currInput;
    expect(config.getTreatmentOptions()).toStrictEqual(treatmentOptions);
  });

  test("get target project", () => {
    const project = { branch: "main", name: "project", group: "owner", repository: "owner/project" };
    jest.spyOn(BaseConfiguration.prototype, "targetProject", "get").mockImplementation(() => project);
    expect(config.getTargetProject()).toStrictEqual(project);
  });

  test("get source project", () => {
    const project = { branch: "main", name: "project", group: "owner", repository: "owner/project" };
    jest.spyOn(BaseConfiguration.prototype, "targetProject", "get").mockImplementation(() => project);
    expect(config.getSourceProject()).toStrictEqual(project);
  });
});

describe("action", () => {
  let config: ConfigurationService;
  let currentInput: InputValues;
  const env = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8")).env;
  beforeAll(() => {
    Container.set(constants.CONTAINER.ENTRY_POINT, EntryPoint.GITHUB_EVENT);
  });

  beforeEach(async () => {
    currentInput = defaultInputValues;
    jest.spyOn(BaseConfiguration.prototype, "parsedInputs", "get").mockImplementation(() => currentInput);
    config = new ConfigurationService();
    await config.init();
  });

  afterEach(() => {
    currentInput = defaultInputValues;
  });

  test("getStarterProjectName: success", () => {
    expect(config.getStarterProjectName()).toBe(env.repository);
  });

  test("getStarterProjectName: failure", () => {
    delete process.env["GITHUB_REPOSITORY"];
    expect(() => config.getStarterProjectName()).toThrowError();
  });

  test.each([
    [true, env.repository],
    [false, "falsename"],
  ])("isNodeStarter %p", (isNodeStarter: boolean, project: string) => {
    expect(config.isNodeStarter({ project: project })).toBe(isNodeStarter);
  });

  test("getStarterNode: success", () => {
    const chain: Node[] = [{ project: "abc" }, { project: env.repository }, { project: "def" }];
    const nodeFound: Node = { project: env.repository };
    jest.spyOn(BaseConfiguration.prototype, "projectList", "get").mockImplementation(() => chain);
    expect(config.getStarterNode()).toStrictEqual(nodeFound);
  });

  test("getStarterNode: failure", () => {
    const chain: Node[] = [{ project: "abc" }, { project: "xyz" }, { project: "def" }];
    jest.spyOn(BaseConfiguration.prototype, "projectList", "get").mockImplementation(() => chain);
    expect(() => config.getStarterNode()).toThrowError();
  });

  test.each([
    ["upstream", 0, NodeExecutionLevel.UPSTREAM],
    ["current", 1, NodeExecutionLevel.CURRENT],
    ["downstream", 2, NodeExecutionLevel.DOWNSTREAM],
  ])("getNodeExecutionLevel: %p", (title: string, currNodeIndex: number, executionLevel: NodeExecutionLevel) => {
    const chain: Node[] = [{ project: "abc" }, { project: env.repository }, { project: "def" }];
    jest.spyOn(BaseConfiguration.prototype, "projectList", "get").mockImplementation(() => chain);
    expect(config.getNodeExecutionLevel(chain[currNodeIndex])).toBe(executionLevel);
  });

  test.each([
    ["option skipExecution set to true", { project: "abc" }, { ...defaultInputValues, skipExecution: true }, true],
    [
      "option skipExecution set to false and skipProjectExecution contains project name",
      { project: "abc" },
      { ...defaultInputValues, skipProjectExecution: ["abc"] },
      true,
    ],
    [
      "option skipExecution set to false and skipProjectExecution does not contain project name",
      { project: "abc" },
      { ...defaultInputValues, skipProjectExecution: ["def"] },
      false,
    ],
    ["option skipExecution set to false and skipProjectExecution not defined", { project: "abc" }, defaultInputValues, false],
  ])("skipExecution: %p", (title: string, node: Node, currInput: InputValues, isExecutionSkipped: boolean) => {
    currentInput = currInput;
    expect(config.skipExecution(node)).toBe(isExecutionSkipped);
  });

  test.each([
    ["custom command treatment defined", { ...defaultInputValues, customCommandTreatment: ["abc||xyz"] }, { replaceExpressions: ["abc||xyz"] }],
    ["custom command treatment not defined", defaultInputValues, {}],
  ])("getTreatmentOptions: success - %p", (title: string, currInput: InputValues, treatmentOptions: TreatmentOptions) => {
    currentInput = currInput;
    expect(config.getTreatmentOptions()).toStrictEqual(treatmentOptions);
  });

  test("get target project", () => {
    const project = { branch: "main", name: "project", group: "owner", repository: "owner/project" };
    jest.spyOn(BaseConfiguration.prototype, "targetProject", "get").mockImplementation(() => project);
    expect(config.getTargetProject()).toStrictEqual(project);
  });

  test("get source project", () => {
    const project = { branch: "main", name: "project", group: "owner", repository: "owner/project" };
    jest.spyOn(BaseConfiguration.prototype, "targetProject", "get").mockImplementation(() => project);
    expect(config.getSourceProject()).toStrictEqual(project);
  });
});
