import "reflect-metadata";
import { MockGithub } from "../../../setup/mock-github";
import path from "path";
import { ActionConfiguration } from "@bc/service/config/action-configuration";
import Container from "typedi";
import { constants } from "@bc/domain/constants";
import { EntryPoint } from "@bc/domain/entry-point";
import fs from "fs";
import { getOrderedListForTree, getTree, ProjectTree, readDefinitionFile } from "@kie/build-chain-configuration-reader";
import { Node } from "@bc/domain/node";
import { defaultInputValues } from "@bc/domain/inputs";
import { InputService } from "@bc/service/inputs/input-service";
jest.mock("@kie/build-chain-configuration-reader");

Container.set(constants.CONTAINER.ENTRY_POINT, EntryPoint.GITHUB_EVENT);
const mockGithub = new MockGithub(path.join(__dirname, "config.json"), "event-action");
let actionConfig = new ActionConfiguration();

// disable logs
jest.spyOn(global.console, "log");

beforeEach(async () => {
  await mockGithub.setup();
  actionConfig = new ActionConfiguration();
});

afterEach(() => {
  mockGithub.teardown();
});

describe("load event data", () => {
  test("success", async () => {
    const eventData = await actionConfig.loadGitEvent();
    const actualData = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8"));
    expect(eventData).toStrictEqual(actualData.action.eventPayload.pull_request);
  });

  test("failure", async () => {
    delete process.env["GITHUB_EVENT_PATH"];
    await expect(actionConfig.loadGitEvent()).rejects.toThrowError();
  });
});

describe("load git config", () => {
  const token = "fakenotenvtoken";
  beforeEach(() => {
    Container.set(constants.GITHUB.TOKEN, token);
  });
  test("Without default github url", () => {
    const config = actionConfig.loadGitConfiguration();
    const expectedData = {
      action: process.env.GITHUB_ACTION,
      actor: process.env.GITHUB_ACTOR,
      author: process.env.GITHUB_AUTHOR,
      serverUrl: "https://git.ca",
      serverUrlWithToken: `https://${token}@git.ca`,
      jobId: process.env.GITHUB_JOB,
      ref: process.env.GITHUB_REF,
      workflow: process.env.GITHUB_WORKFLOW,
    };
    expect(config).toStrictEqual(expectedData);
  });

  test("With default github url", () => {
    delete process.env["GITHUB_SERVER_URL"];
    const config = actionConfig.loadGitConfiguration();
    const expectedData = {
      action: process.env.GITHUB_ACTION,
      actor: process.env.GITHUB_ACTOR,
      author: process.env.GITHUB_AUTHOR,
      serverUrl: "https://github.com",
      serverUrlWithToken: `https://${token}@github.com`,
      jobId: process.env.GITHUB_JOB,
      ref: process.env.GITHUB_REF,
      workflow: process.env.GITHUB_WORKFLOW,
    };
    expect(config).toStrictEqual(expectedData);
  });
});

describe("load source and target project", () => {
  test("success", async () => {
    const eventData = await actionConfig.loadGitEvent();
    jest.spyOn(actionConfig, "gitEventData", "get").mockImplementation(() => eventData);
    const { source, target } = actionConfig.loadProject();
    const actualData = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8")).action.eventPayload.pull_request;
    const expectedSource = {
      branch: actualData.head.ref,
      repository: actualData.head.repo.full_name,
      name: actualData.head.repo.name,
      group: actualData.head.repo.owner.login,
    };

    const expectedTarget = {
      branch: actualData.base.ref,
      repository: actualData.base.repo.full_name,
      name: actualData.base.repo.name,
      group: actualData.base.repo.owner.login,
    };

    expect(source).toStrictEqual(expectedSource);
    expect(target).toStrictEqual(expectedTarget);
  });
});

describe("load token", () => {
  test("success", () => {
    actionConfig.loadToken();
    const actualData = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8")).env.token;
    expect(Container.get(constants.GITHUB.TOKEN)).toBe(actualData);
  });
  test("failure", () => {
    delete process.env["GITHUB_TOKEN"];
    expect(() => actionConfig.loadToken()).toThrowError();
  });
});

describe("generate placeholders", () => {
  test("generated from source", () => {
    const definitionFileUrl = "https://abc/${GROUP}/${PROJECT_NAME}/${BRANCH}";
    jest.spyOn(actionConfig, "parsedInputs", "get").mockImplementation(() => {
      return { ...defaultInputValues, definitionFile: definitionFileUrl };
    });

    const actualData = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8")).action.eventPayload.pull_request;
    const source = {
      branch: actualData.head.ref,
      repository: actualData.head.repo.full_name,
      name: actualData.head.repo.name,
      group: actualData.head.repo.owner.login,
    };

    expect(actionConfig.generatePlaceholder(source)).toStrictEqual({ BRANCH: source.branch, GROUP: source.group, PROJECT_NAME: source.name });
  });

  test("generated from target", () => {
    const definitionFileUrl = "https://abc/${GROUP}/${PROJECT_NAME}/${BRANCH}";
    jest.spyOn(actionConfig, "parsedInputs", "get").mockImplementation(() => {
      return { ...defaultInputValues, definitionFile: definitionFileUrl };
    });

    const actualData = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8")).action.eventPayload.pull_request;
    const target = {
      branch: actualData.base.ref,
      repository: actualData.base.repo.full_name,
      name: actualData.base.repo.name,
      group: actualData.base.repo.owner.login,
    };

    expect(actionConfig.generatePlaceholder(target)).toStrictEqual({ BRANCH: target.branch, GROUP: target.group, PROJECT_NAME: target.name });
  });

  test("no source or target. generated from env", () => {
    const definitionFileUrl = "https://abc/${GROUP}/${PROJECT_NAME}/${BRANCH}/${TEST}";
    jest.spyOn(actionConfig, "parsedInputs", "get").mockImplementation(() => {
      return { ...defaultInputValues, definitionFile: definitionFileUrl };
    });

    const env = {
      TEST: "test1",
      GROUP: "group",
      PROJECT_NAME: "name",
      BRANCH: "main",
    };

    process.env = { ...process.env, ...env };

    expect(actionConfig.generatePlaceholder({})).toStrictEqual(env);
  });

  test("no source or target or env. generated from default", () => {
    const definitionFileUrl = "https://abc/${GROUP:group}/${PROJECT_NAME:name}/${BRANCH:branch}/";
    jest.spyOn(actionConfig, "parsedInputs", "get").mockImplementation(() => {
      return { ...defaultInputValues, definitionFile: definitionFileUrl };
    });

    const env = {
      GROUP: "group",
      PROJECT_NAME: "name",
      BRANCH: "main",
    };

    expect(actionConfig.generatePlaceholder({})).toStrictEqual(env);
  });

  test("no placeholders required", () => {
    const definitionFileUrl = "https://abc/group/branch";
    jest.spyOn(actionConfig, "parsedInputs", "get").mockImplementation(() => {
      return { ...defaultInputValues, definitionFile: definitionFileUrl };
    });
    expect(actionConfig.generatePlaceholder({})).toStrictEqual({});
  });

  test("no definition file url", () => {
    const definitionFileUrl = "definitionfile";
    jest.spyOn(actionConfig, "parsedInputs", "get").mockImplementation(() => {
      return { ...defaultInputValues, definitionFile: definitionFileUrl };
    });
    expect(actionConfig.generatePlaceholder({})).toStrictEqual({});
  });
});

describe("load definition file", () => {
  test("success: from source generated placeholder", async () => {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, "projectNodes.json"), "utf8"));
    const mockData: ProjectTree = data.mock;
    const expectedData: Node[] = data.expected;

    const readDefinitionFileMock = readDefinitionFile as jest.Mock;
    const getTreeMock = getTree as jest.Mock;
    const getOrderedListForTreeMock = getOrderedListForTree as jest.Mock;

    readDefinitionFileMock.mockReturnValueOnce({ version: "2.1" });
    getTreeMock.mockReturnValueOnce(mockData);
    getOrderedListForTreeMock.mockReturnValueOnce(mockData);

    const { definitionFile, projectList, projectTree } = await actionConfig.loadDefinitionFile();
    expect(readDefinitionFile).toHaveBeenCalledTimes(1);
    expect(getTree).toHaveBeenCalledTimes(1);
    expect(getOrderedListForTree).toHaveBeenCalledTimes(1);

    expect(definitionFile).toStrictEqual({ version: "2.1" });
    expect(projectList).toStrictEqual(expectedData);
    expect(projectTree).toStrictEqual(expectedData);
  });

  test("success: from target generated placeholder", async () => {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, "projectNodes.json"), "utf8"));
    const mockData: ProjectTree = data.mock;
    const expectedData: Node[] = data.expected;

    const readDefinitionFileMock = readDefinitionFile as jest.Mock;
    const getTreeMock = getTree as jest.Mock;
    const getOrderedListForTreeMock = getOrderedListForTree as jest.Mock;

    readDefinitionFileMock
      .mockImplementationOnce(() => {
        throw new Error("Invalid definition file");
      })
      .mockReturnValueOnce({ version: "2.1" });
    getTreeMock.mockReturnValueOnce(mockData);
    getOrderedListForTreeMock.mockReturnValueOnce(mockData);

    const { definitionFile, projectList, projectTree } = await actionConfig.loadDefinitionFile();
    expect(readDefinitionFile).toHaveBeenCalledTimes(2);
    expect(getTree).toHaveBeenCalledTimes(1);
    expect(getOrderedListForTree).toHaveBeenCalledTimes(1);

    expect(definitionFile).toStrictEqual({ version: "2.1" });
    expect(projectList).toStrictEqual(expectedData);
    expect(projectTree).toStrictEqual(expectedData);
  });

  test("failure", async () => {
    const readDefinitionFileMock = readDefinitionFile as jest.Mock;
    readDefinitionFileMock.mockImplementation(() => {
      throw new Error("Invalid definition file");
    });
    await expect(actionConfig.loadDefinitionFile()).rejects.toThrowError();
  });
});

describe("load input", () => {
  test("success: validated input", () => {
    const input = { ...defaultInputValues, customCommandTreatment: ["abc||def", "xyz||pqr"] };
    jest.spyOn(InputService.prototype, "inputs", "get").mockImplementation(() => input);
    expect(actionConfig.loadParsedInput()).toStrictEqual(input);
  });

  test("success: no input to validate", () => {
    jest.spyOn(InputService.prototype, "inputs", "get").mockImplementation(() => defaultInputValues);
    expect(actionConfig.loadParsedInput()).toStrictEqual(defaultInputValues);
  });

  test("failure: invalidate input", () => {
    const input = { ...defaultInputValues, customCommandTreatment: ["abc||def", "xyz|pqr"] };
    jest.spyOn(InputService.prototype, "inputs", "get").mockImplementation(() => input);
    expect(() => actionConfig.loadParsedInput()).toThrowError();
  });
});
