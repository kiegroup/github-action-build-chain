import "reflect-metadata";
import { ActionConfiguration } from "@bc/service/config/action-configuration";
import Container from "typedi";
import { constants } from "@bc/domain/constants";
import { EntryPoint } from "@bc/domain/entry-point";
import { readFile } from "node:fs/promises";
import { defaultInputValues, FlowType } from "@bc/domain/inputs";
import { InputService } from "@bc/service/inputs/input-service";
import { MockGithub } from "@kie/mock-github";
import { EventData } from "@bc/domain/configuration";
jest.mock("node:fs/promises");
jest.mock("@kie/build-chain-configuration-reader");

Container.set(constants.CONTAINER.ENTRY_POINT, EntryPoint.GITHUB_EVENT);
let actionConfig = new ActionConfiguration();
const readFileMock = readFile as jest.Mock;
const event = {
  html_url: "https://github.com/pulls/270",
  head: {
    ref: "feature",
    repo: {
      full_name: "owner/project",
      name: "project",
      owner: {
        login: "owner",
      },
    },
  },
  base: {
    ref: "main",
    repo: {
      full_name: "owner/project",
      name: "project",
      owner: {
        login: "owner",
      },
    },
  },
};

// disable logs
jest.spyOn(global.console, "log");

beforeEach(async () => {
  actionConfig = new ActionConfiguration();
});

describe("load event data", () => {
  test("success: non branch flow", async () => {
    jest.spyOn(actionConfig, "parsedInputs", "get").mockImplementation(() => {
      return { ...defaultInputValues, flowType: FlowType.CROSS_PULL_REQUEST };
    });
    const mockGithub = new MockGithub({
      env: {
        event_path: "path",
      },
    });
    await mockGithub.setup();
    readFileMock.mockResolvedValueOnce(JSON.stringify({ pull_request: event }));
    const eventData = await actionConfig.loadGitEvent();
    expect(eventData).toStrictEqual(event);
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
  const env = {
    action: "pull_request",
    actor: "actor",
    author: "author",
    job: "job",
    workflow: "workflow",
    ref: "main",
    server_url: "https://git.ca/",
    token: "token",
    repository: "owner/project",
    workspace: "current",
  };
  const mockGithub = new MockGithub({
    env,
  });

  beforeEach(async () => {
    await mockGithub.setup();
    Container.set(constants.GITHUB.TOKEN, token);
  });

  afterEach(async () => {
    await mockGithub.teardown();
  });

  test("Without default github url", () => {
    const config = actionConfig.loadGitConfiguration();
    const expectedData = {
      action: env.action,
      actor: env.actor,
      author: env.author,
      serverUrl: "https://git.ca",
      serverUrlWithToken: `https://${token}@git.ca`,
      jobId: env.job,
      ref: env.ref,
      workflow: env.workflow,
      repository: env.repository,
    };
    expect(config).toStrictEqual(expectedData);
  });

  test("With default github url", () => {
    delete process.env["GITHUB_SERVER_URL"];
    const config = actionConfig.loadGitConfiguration();
    const expectedData = {
      action: env.action,
      actor: env.actor,
      author: env.author,
      serverUrl: "https://github.com",
      serverUrlWithToken: `https://${token}@github.com`,
      jobId: env.job,
      ref: env.ref,
      workflow: env.workflow,
      repository: env.repository,
    };
    expect(config).toStrictEqual(expectedData);
  });
});

describe("load source and target project", () => {
  test("non branch flow", async () => {
    jest.spyOn(actionConfig, "parsedInputs", "get").mockImplementation(() => {
      return { ...defaultInputValues, flowType: FlowType.CROSS_PULL_REQUEST };
    });
    jest
      .spyOn(actionConfig, "gitEventData", "get")
      .mockImplementation(() => event as EventData);
    const { source, target } = actionConfig.loadProject();
    const expectedSource = {
      branch: event.head.ref,
      repository: event.head.repo.full_name,
      name: event.head.repo.name,
      group: event.head.repo.owner.login,
    };

    const expectedTarget = {
      branch: event.base.ref,
      repository: event.base.repo.full_name,
      name: event.base.repo.name,
      group: event.base.repo.owner.login,
    };

    expect(source).toStrictEqual(expectedSource);
    expect(target).toStrictEqual(expectedTarget);
  });

  test("branch flow", async () => {
    jest.spyOn(actionConfig, "parsedInputs", "get").mockImplementation(() => {
      return { ...defaultInputValues, flowType: FlowType.BRANCH };
    });
    jest
      .spyOn(actionConfig, "gitConfiguration", "get")
      .mockImplementation(() => {
        return {
          ref: "main",
          repository: "owner/project",
        };
      });
    const { source, target } = actionConfig.loadProject();
    const expectedConfig = {
      branch: "main",
      repository: "owner/project",
      name: "project",
      group: "owner",
    };
    expect(source).toStrictEqual(expectedConfig);
    expect(target).toStrictEqual(expectedConfig);
  });
});

describe("load token", () => {
  test("success", async () => {
    const mockGithub = new MockGithub({
      env: {
        token: "token",
      },
    });
    await mockGithub.setup();
    actionConfig.loadToken();
    expect(Container.get(constants.GITHUB.TOKEN)).toBe("token");
    await mockGithub.teardown();
  });
  test("failure", () => {
    delete process.env["GITHUB_TOKEN"];
    expect(() => actionConfig.loadToken()).toThrowError();
  });
});

describe("load input", () => {
  test("success: validated input", () => {
    const input = {
      ...defaultInputValues,
      customCommandTreatment: ["abc||def", "xyz||pqr"],
      startProject: "owner/project",
    };
    jest
      .spyOn(InputService.prototype, "inputs", "get")
      .mockImplementation(() => input);
    expect(actionConfig.loadParsedInput()).toStrictEqual(input);
  });

  test("success: no input to validate", () => {
    jest
      .spyOn(InputService.prototype, "inputs", "get")
      .mockImplementation(() => defaultInputValues);
    expect(actionConfig.loadParsedInput()).toStrictEqual(defaultInputValues);
  });

  test("failure: invalidate input", () => {
    const input = {
      ...defaultInputValues,
      customCommandTreatment: ["abc||def", "xyz|pqr"],
    };
    jest
      .spyOn(InputService.prototype, "inputs", "get")
      .mockImplementation(() => input);
    expect(() => actionConfig.loadParsedInput()).toThrowError();
  });
});
