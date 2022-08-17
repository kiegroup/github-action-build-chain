import "reflect-metadata";
import { MockGithub } from "../../../setup/mock-github";
import path from "path";
import { ActionConfiguration } from "@bc/service/config/action-configuration";
import Container from "typedi";
import { constants } from "@bc/domain/constants";
import { EntryPoint } from "@bc/domain/entry-point";
import fs from "fs";
import { defaultInputValues, FlowType } from "@bc/domain/inputs";
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
  test("success: non branch flow", async () => {
    jest.spyOn(actionConfig, "parsedInputs", "get").mockImplementation(() => {
      return { ...defaultInputValues, flowType: FlowType.CROSS_PULL_REQUEST };
    });
    const eventData = await actionConfig.loadGitEvent();
    const actualData = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8"));
    expect(eventData).toStrictEqual(actualData.action.eventPayload.pull_request);
  });

  test("success: branch flow", async () => {
    jest.spyOn(actionConfig, "parsedInputs", "get").mockImplementation(() => {
      return { ...defaultInputValues, flowType: FlowType.BRANCH };
    });
    const eventData = await actionConfig.loadGitEvent();
    expect(eventData).toStrictEqual({});
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
    const actualData = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8")).env;
    const expectedData = {
      action: actualData.action,
      actor: actualData.actor,
      author: actualData.author,
      serverUrl: "https://git.ca",
      serverUrlWithToken: `https://${token}@git.ca`,
      jobId: actualData.job,
      ref: actualData.ref,
      workflow: actualData.workflow,
      repository: actualData.repository,
    };
    expect(config).toStrictEqual(expectedData);
  });

  test("With default github url", () => {
    delete process.env["GITHUB_SERVER_URL"];
    const config = actionConfig.loadGitConfiguration();
    const actualData = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8")).env;
    const expectedData = {
      action: actualData.action,
      actor: actualData.actor,
      author: actualData.author,
      serverUrl: "https://github.com",
      serverUrlWithToken: `https://${token}@github.com`,
      jobId: actualData.job,
      ref: actualData.ref,
      workflow: actualData.workflow,
      repository: actualData.repository,
    };
    expect(config).toStrictEqual(expectedData);
  });
});

describe("load source and target project", () => {
  test("non branch flow", async () => {
    jest.spyOn(actionConfig, "parsedInputs", "get").mockImplementation(() => {
      return { ...defaultInputValues, flowType: FlowType.CROSS_PULL_REQUEST };
    });
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

  test("branch flow", async () => {
    const actualData = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8")).env;
    jest.spyOn(actionConfig, "parsedInputs", "get").mockImplementation(() => {
      return { ...defaultInputValues, flowType: FlowType.BRANCH };
    });
    jest.spyOn(actionConfig, "gitConfiguration", "get").mockImplementation(() => {
      return { ref: actualData.ref, repository: actualData.repository };
    });
    const { source, target } = actionConfig.loadProject();
    const expectedConfig = {
      branch: actualData.ref,
      repository: actualData.repository,
      name: actualData.repository.slice(actualData.repository.indexOf("/") + 1),
      group: actualData.repository.slice(0, actualData.repository.indexOf("/")),
    };
    expect(source).toStrictEqual(expectedConfig);
    expect(target).toStrictEqual(expectedConfig);
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

describe("load input", () => {
  test("success: validated input", () => {
    const input = { ...defaultInputValues, customCommandTreatment: ["abc||def", "xyz||pqr"], startProject: "owner/project" };
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
