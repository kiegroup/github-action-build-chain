import "reflect-metadata";
import { MockGithub } from "../../../setup/mock-github";
import path from "path";
import Container from "typedi";
import { constants } from "@bc/domain/constants";
import { EntryPoint } from "@bc/domain/entry-point";
import fs from "fs";
import { CLIConfiguration } from "@bc/service/config/cli-configuration";
import { defaultInputValues, FlowType, InputValues } from "@bc/domain/inputs";
import { InputService } from "@bc/service/inputs/input-service";
jest.mock("@kie/build-chain-configuration-reader");

Container.set(constants.CONTAINER.ENTRY_POINT, EntryPoint.CLI);
const mockGithub = new MockGithub(path.join(__dirname, "config.json"), "event-cli");
let cliConfig = new CLIConfiguration();

// disable logs
jest.spyOn(global.console, "log");

beforeEach(async () => {
  await mockGithub.setup();
  cliConfig = new CLIConfiguration();
});

afterEach(() => {
  mockGithub.teardown();
});

describe("load event data", () => {
  let currentInput: InputValues = { ...defaultInputValues, url: "http://github.com/owner/project/pull/270" };
  beforeEach(() => {
    jest.spyOn(cliConfig, "parsedInputs", "get").mockImplementation(() => currentInput);
  });
  afterEach(() => {
    currentInput = { ...defaultInputValues, url: "http://github.com/owner/project/pull/270" };
  });
  test("success: non-branch flow build", async () => {
    Container.set(constants.GITHUB.TOKEN, "faketoken");
    const eventData = await cliConfig.loadGitEvent();
    const actualData = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8"));
    expect(eventData).toStrictEqual(actualData.action.eventPayload.pull_request);
  });

  test("success: branch flow build", async () => {
    currentInput = { ...defaultInputValues, CLISubCommand: FlowType.BRANCH };
    const eventData = await cliConfig.loadGitEvent();
    expect(eventData).toStrictEqual({});
  });

  test("failure: no url defined", async () => {
    delete currentInput["url"];
    await expect(cliConfig.loadGitEvent()).rejects.toThrowError();
  });

  test("failure: invalid url (caught by regex)", async () => {
    currentInput["url"] = "https://git.com/";
    await expect(cliConfig.loadGitEvent()).rejects.toThrowError();
  });

  test("failure: invalid url (passes regex)", async () => {
    await expect(cliConfig.loadGitEvent()).resolves.not.toThrowError();
    await expect(cliConfig.loadGitEvent()).rejects.toThrowError();
  });
});

describe("load git config branch flow", () => {
  const token = "fakenotenvtoken";
  let currentInput: InputValues = { ...defaultInputValues, CLISubCommand: FlowType.BRANCH, group: "group", branch: "main" };
  beforeEach(async () => {
    jest.spyOn(cliConfig, "parsedInputs", "get").mockImplementation(() => currentInput);
    Container.set(constants.GITHUB.TOKEN, token);
  });

  afterEach(() => {
    currentInput = { ...defaultInputValues, CLISubCommand: FlowType.BRANCH, group: "group", branch: "main" };
  });

  test("success: without default github url", async () => {
    const config = cliConfig.loadGitConfiguration();
    const expectedData = {
      actor: "group",
      serverUrl: "https://git.ca",
      serverUrlWithToken: `https://${token}@git.ca`,
      ref: "main",
    };
    expect(config).toStrictEqual(expectedData);
  });

  test("success: with default github url", async () => {
    delete process.env["GITHUB_SERVER_URL"];

    const config = cliConfig.loadGitConfiguration();
    const expectedData = {
      actor: "group",
      serverUrl: "https://github.com",
      serverUrlWithToken: `https://${token}@github.com`,
      ref: "main",
    };
    expect(config).toStrictEqual(expectedData);
  });

  test("failure: no group", async () => {
    delete currentInput["group"];
    expect(cliConfig.loadGitConfiguration).toThrowError();
  });
});

describe("load git config no branch flow", () => {
  const token = "fakenotenvtoken";
  beforeEach(async () => {
    jest.spyOn(cliConfig, "parsedInputs", "get").mockImplementation(() => defaultInputValues);
    Container.set(constants.GITHUB.TOKEN, token);
  });

  test("success: without default github url", async () => {
    const config = cliConfig.loadGitConfiguration();
    const expectedData = {
      serverUrl: "https://git.ca",
      serverUrlWithToken: `https://${token}@git.ca`,
    };
    expect(config).toStrictEqual(expectedData);
  });

  test("success: with default github url", async () => {
    delete process.env["GITHUB_SERVER_URL"];

    const config = cliConfig.loadGitConfiguration();
    const expectedData = {
      serverUrl: "https://github.com",
      serverUrlWithToken: `https://${token}@github.com`,
    };
    expect(config).toStrictEqual(expectedData);
  });
});

describe("load source and target project", () => {
  let currentInput: InputValues = {
    ...defaultInputValues,
    startProject: "owner/project",
    group: "owner",
    branch: "main",
    url: "http://github.com/owner/project/pull/270",
  };
  beforeEach(() => {
    jest.spyOn(cliConfig, "parsedInputs", "get").mockImplementation(() => currentInput);
  });

  afterEach(() => {
    currentInput = {
      ...defaultInputValues,
      startProject: "owner/project",
      group: "owner",
      branch: "main",
      url: "http://github.com/owner/project/pull/270",
    };
  });

  test("branch flow", () => {
    currentInput["CLISubCommand"] = FlowType.BRANCH;
    const expectedData = {
      branch: "main",
      name: "project",
      group: "owner",
      repository: "owner/project",
    };
    const { source, target } = cliConfig.loadProject();
    expect(source).toStrictEqual(expectedData);
    expect(target).toStrictEqual(expectedData);
  });

  test("Non branch flow", async () => {
    const eventData = await cliConfig.loadGitEvent();
    jest.spyOn(cliConfig, "gitEventData", "get").mockImplementation(() => eventData);
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
    const { source, target } = cliConfig.loadProject();
    expect(source).toStrictEqual(expectedSource);
    expect(target).toStrictEqual(expectedTarget);
  });
});

describe("load token", () => {
  test("success: via token flag", () => {
    const token = "tokenflag";
    jest.spyOn(cliConfig, "parsedInputs", "get").mockImplementation(() => {
      return { ...defaultInputValues, token };
    });
    cliConfig.loadToken();
    expect(Container.get(constants.GITHUB.TOKEN)).toBe(token);
  });

  test("success: via env", () => {
    cliConfig.loadToken();
    const actualData = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8")).env.token;
    expect(Container.get(constants.GITHUB.TOKEN)).toBe(actualData);
  });

  test("failure", () => {
    jest.spyOn(cliConfig, "parsedInputs", "get").mockImplementation(() => {
      return { ...defaultInputValues };
    });
    delete process.env["GITHUB_TOKEN"];
    expect(() => cliConfig.loadToken()).toThrowError();
  });
});

describe("load input", () => {
  test("success: validated input", () => {
    const input = { ...defaultInputValues, customCommandTreatment: ["abc||def", "xyz||pqr"], startProject: "owner/project" };
    jest.spyOn(InputService.prototype, "inputs", "get").mockImplementation(() => input);
    expect(cliConfig.loadParsedInput()).toStrictEqual(input);
  });

  test("success: no input to validate", () => {
    jest.spyOn(InputService.prototype, "inputs", "get").mockImplementation(() => defaultInputValues);
    expect(cliConfig.loadParsedInput()).toStrictEqual(defaultInputValues);
  });

  test("failure: invalidate input", () => {
    const input = { ...defaultInputValues, customCommandTreatment: ["abc||def", "xyz|pqr"] };
    jest.spyOn(InputService.prototype, "inputs", "get").mockImplementation(() => input);
    expect(() => cliConfig.loadParsedInput()).toThrowError();
  });
});
