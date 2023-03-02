import "reflect-metadata";
import Container from "typedi";
import { constants } from "@bc/domain/constants";
import { EntryPoint } from "@bc/domain/entry-point";
import { CLIConfiguration } from "@bc/service/config/cli-configuration";
import { defaultInputValues, FlowType, InputValues } from "@bc/domain/inputs";
import { InputService } from "@bc/service/inputs/input-service";
import { MockGithub, Moctokit } from "@kie/mock-github";
import { EventData } from "@bc/domain/configuration";
jest.mock("@kie/build-chain-configuration-reader");

Container.set(constants.CONTAINER.ENTRY_POINT, EntryPoint.CLI);
let cliConfig = new CLIConfiguration();
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
    user: {
      login: "owner"
    }
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
  cliConfig = new CLIConfiguration();
});

describe("load event data", () => {
  const moctokit = new Moctokit();
  let currentInput: InputValues = {
    ...defaultInputValues,
    url: "http://github.com/owner/project/pull/270",
  };
  beforeEach(() => {
    jest
      .spyOn(cliConfig, "parsedInputs", "get")
      .mockImplementation(() => currentInput);
  });
  afterEach(() => {
    currentInput = {
      ...defaultInputValues,
      url: "http://github.com/owner/project/pull/270",
    };
  });
  test("success: non-branch flow build", async () => {
    moctokit.rest.pulls
      .get({
        owner: "owner",
        repo: "project",
        pull_number: 270,
      })
      .reply({
        status: 200,
        data: event,
      });
    Container.set(constants.GITHUB.TOKEN, "faketoken");
    const eventData = await cliConfig.loadGitEvent();
    expect(eventData).toStrictEqual(event);
    expect(process.env["GITHUB_SERVER_URL"]).toBe("http://github.com/");
    expect(process.env["GITHUB_ACTION"]).toBe(undefined);
    expect(process.env["GITHUB_ACTOR"]).toBe(event.head.user.login);
    expect(process.env["GITHUB_HEAD_REF"]).toBe(event.head.ref);
    expect(process.env["GITHUB_BASE_REF"]).toBe(event.base.ref);
    expect(process.env["GITHUB_REPOSITORY"]).toBe(event.base.repo.full_name);
    expect(process.env["GITHUB_REF"]).toBe("refs/pull/270/merge");
  });

  test("success: branch flow build", async () => {
    currentInput = { 
      ...defaultInputValues, 
      CLISubCommand: FlowType.BRANCH, 
      group: "kiegroup",
      branch: "main",
      startProject: "kiegroup/drools" 
    };
    const eventData = await cliConfig.loadGitEvent();
    expect(eventData).toStrictEqual({});
    expect(process.env["GITHUB_ACTOR"]).toBe("kiegroup");
    expect(process.env["GITHUB_HEAD_REF"]).toBe("main");
    expect(process.env["GITHUB_BASE_REF"]).toBe("main");
    expect(process.env["GITHUB_REPOSITORY"]).toBe("kiegroup/drools");
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
    moctokit.rest.pulls.get().reply({ status: 404, data: {} });
    await expect(cliConfig.loadGitEvent()).rejects.toThrowError();
  });
});

describe("load git config branch flow", () => {
  const token = "fakenotenvtoken";
  let currentInput: InputValues = {
    ...defaultInputValues,
    CLISubCommand: FlowType.BRANCH,
    group: "group",
    branch: "main",
  };
  const mockGithub = new MockGithub({
    env: {
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
    },
  });
  beforeEach(async () => {
    await mockGithub.setup();
    jest
      .spyOn(cliConfig, "parsedInputs", "get")
      .mockImplementation(() => currentInput);
    Container.set(constants.GITHUB.TOKEN, token);
  });

  afterEach(async () => {
    await mockGithub.teardown();
    currentInput = {
      ...defaultInputValues,
      CLISubCommand: FlowType.BRANCH,
      group: "group",
      branch: "main",
    };
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
  const mockGithub = new MockGithub({
    env: {
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
    },
  });

  beforeEach(async () => {
    await mockGithub.setup();
    jest
      .spyOn(cliConfig, "parsedInputs", "get")
      .mockImplementation(() => defaultInputValues);
    Container.set(constants.GITHUB.TOKEN, token);
  });

  afterEach(async () => {
    await mockGithub.teardown();
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
    jest
      .spyOn(cliConfig, "parsedInputs", "get")
      .mockImplementation(() => currentInput);
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
    jest
      .spyOn(cliConfig, "gitEventData", "get")
      .mockImplementation(() => event as EventData);

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

  test("success: via env", async () => {
    const mockGithub = new MockGithub({
      env: {
        token: "token",
      },
    });
    await mockGithub.setup();
    cliConfig.loadToken();
    expect(Container.get(constants.GITHUB.TOKEN)).toBe("token");
    await mockGithub.teardown();

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
    const input = {
      ...defaultInputValues,
      customCommandTreatment: ["abc||def", "xyz||pqr"],
      startProject: "owner/project",
    };
    jest
      .spyOn(InputService.prototype, "inputs", "get")
      .mockImplementation(() => input);
    expect(cliConfig.loadParsedInput()).toStrictEqual(input);
  });

  test("success: no input to validate", () => {
    jest
      .spyOn(InputService.prototype, "inputs", "get")
      .mockImplementation(() => defaultInputValues);
    expect(cliConfig.loadParsedInput()).toStrictEqual(defaultInputValues);
  });

  test("failure: invalidate input", () => {
    const input = {
      ...defaultInputValues,
      customCommandTreatment: ["abc||def", "xyz|pqr"],
    };
    jest
      .spyOn(InputService.prototype, "inputs", "get")
      .mockImplementation(() => input);
    expect(() => cliConfig.loadParsedInput()).toThrowError();
  });
});
