import "reflect-metadata";
import { ExecuteCommandService } from "@bc/service/command/execute-command-service";
import { PostExecutor } from "@bc/service/pre-post/post";
import Container from "typedi";
import { constants } from "@bc/domain/constants";
import { EntryPoint } from "@bc/domain/entry-point";
import * as core from "@actions/core";
import { ConfigurationService } from "@bc/service/config/configuration-service";

// just for initialization otherwise not relevant to testing
Container.set(constants.CONTAINER.ENTRY_POINT, EntryPoint.GITHUB_EVENT);
// disable logs
jest.spyOn(global.console, "log");
jest.spyOn(core, "startGroup").mockImplementation(() => undefined);
jest.spyOn(core, "endGroup").mockImplementation(() => undefined);

describe("On success", () => {
  let post: PostExecutor;

  beforeAll(() => {
    Container.reset();
    Container.set("post.executionSuccess", true);
  });

  beforeEach(() => {
    post = Container.get(PostExecutor);
  });

  test.each([
    ["single command", "cmd", ["cmd"]],
    ["multiple commands", ["cmd1", "cmd2"], ["cmd1", "cmd2"]],
  ])("No always: %p", async (_title: string, cmds: string | string[], executedCmds: string[]) => {
    jest.spyOn(ConfigurationService.prototype, "getPost").mockImplementationOnce(() => {
      return {
        success: cmds,
      };
    });
    const execSpy = jest.spyOn(ExecuteCommandService.prototype, "executeCommand").mockImplementationOnce(async (_cmd: string, _cwd?: string) => {
      return {};
    });
    await post.run();
    expect(execSpy).toHaveBeenCalledTimes(executedCmds.length);
    executedCmds.forEach((cmd) => {
      expect(execSpy).toHaveBeenCalledWith(cmd, process.cwd());
    });
  });

  test.each([
    ["single command", "cmd", ["cmd"]],
    ["multiple commands", ["cmd1", "cmd2"], ["cmd1", "cmd2"]],
  ])("With always: %p", async (_title: string, cmds: string | string[], executedCmds: string[]) => {
    jest.spyOn(ConfigurationService.prototype, "getPost").mockImplementationOnce(() => {
      return {
        success: cmds,
        always: cmds,
      };
    });
    const execSpy = jest.spyOn(ExecuteCommandService.prototype, "executeCommand").mockImplementationOnce(async (_cmd: string, _cwd?: string) => {
      return {};
    });
    await post.run();
    expect(execSpy).toHaveBeenCalledTimes(executedCmds.length * 2);
    [...executedCmds, ...executedCmds].forEach((cmd) => {
      expect(execSpy).toHaveBeenCalledWith(cmd, process.cwd());
    });
  });

  test("no success", async () => {
    jest.spyOn(ConfigurationService.prototype, "getPost").mockImplementationOnce(() => {
      return {
        failure: "cmd",
      };
    });
    const execSpy = jest.spyOn(ExecuteCommandService.prototype, "executeCommand").mockImplementationOnce(async (_cmd: string, _cwd?: string) => {
      return {};
    });
    await post.run();
    expect(execSpy).toHaveBeenCalledTimes(0);
  });
});

describe("On failure", () => {
  let post: PostExecutor;

  beforeAll(() => {
    Container.reset();
    Container.set("post.executionSuccess", false);
  });

  beforeEach(() => {
    post = Container.get(PostExecutor);
  });

  test.each([
    ["single command", "cmd", ["cmd"]],
    ["multiple commands", ["cmd1", "cmd2"], ["cmd1", "cmd2"]],
  ])("No always: %p", async (_title: string, cmds: string | string[], executedCmds: string[]) => {
    jest.spyOn(ConfigurationService.prototype, "getPost").mockImplementationOnce(() => {
      return {
        failure: cmds,
      };
    });
    const execSpy = jest.spyOn(ExecuteCommandService.prototype, "executeCommand").mockImplementationOnce(async (_cmd: string, _cwd?: string) => {
      return {};
    });
    await post.run();
    expect(execSpy).toHaveBeenCalledTimes(executedCmds.length);
    executedCmds.forEach((cmd) => {
      expect(execSpy).toHaveBeenCalledWith(cmd, process.cwd());
    });
  });

  test.each([
    ["single command", "cmd", ["cmd"]],
    ["multiple commands", ["cmd1", "cmd2"], ["cmd1", "cmd2"]],
  ])("With always: %p", async (_title: string, cmds: string | string[], executedCmds: string[]) => {
    jest.spyOn(ConfigurationService.prototype, "getPost").mockImplementationOnce(() => {
      return {
        failure: cmds,
        always: cmds,
      };
    });
    const execSpy = jest.spyOn(ExecuteCommandService.prototype, "executeCommand").mockImplementationOnce(async (_cmd: string, _cwd?: string) => {
      return {};
    });

    await post.run();
    expect(execSpy).toHaveBeenCalledTimes(executedCmds.length * 2);
    [...executedCmds, ...executedCmds].forEach((cmd) => {
      expect(execSpy).toHaveBeenCalledWith(cmd, process.cwd());
    });
  });

  test("no failure", async () => {
    jest.spyOn(ConfigurationService.prototype, "getPost").mockImplementationOnce(() => {
      return {
        success: "cmd",
      };
    });
    const execSpy = jest.spyOn(ExecuteCommandService.prototype, "executeCommand").mockImplementationOnce(async (_cmd: string, _cwd?: string) => {
      return {};
    });

    await post.run();
    expect(execSpy).toHaveBeenCalledTimes(0);
  });
});

test("no post", async () => {
  jest.spyOn(ConfigurationService.prototype, "getPost").mockImplementationOnce(() => {
    return {};
  });
  const execSpy = jest.spyOn(ExecuteCommandService.prototype, "executeCommand").mockImplementationOnce(async (_cmd: string, _cwd?: string) => {
    return {};
  });
  const post = Container.get(PostExecutor);
  await post.run();
  expect(execSpy).toHaveBeenCalledTimes(0);
});
