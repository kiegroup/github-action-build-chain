import "reflect-metadata";
import { constants } from "@bc/domain/constants";
import { EntryPoint } from "@bc/domain/entry-point";
import { PreExecutor } from "@bc/service/pre-post/pre";
import { Pre } from "@kie/build-chain-configuration-reader";
import Container from "typedi";
import { ExecuteCommandService } from "@bc/service/command/execute-command-service";
import * as core from "@actions/core";
import { ConfigurationService } from "@bc/service/config/configuration-service";
import { ExecuteCommandResult, ExecutionResult } from "@bc/domain/execute-command-result";

// just for initialization otherwise not relevant to testing
Container.set(constants.CONTAINER.ENTRY_POINT, EntryPoint.GITHUB_EVENT);

// disable logs
jest.spyOn(global.console, "log");
jest.spyOn(core, "startGroup").mockImplementation(() => undefined);
jest.spyOn(core, "endGroup").mockImplementation(() => undefined);

const emptyCommandResult: ExecuteCommandResult = {
  startingDate: 0,
  endingDate: 0,
  command: "",
  result: ExecutionResult.OK,
  time: 0,
  errorMessage: ""
};

test.each([
  ["single command", ["cmd"], ["cmd"]],
  ["multiple commands", ["cmd1", "cmd2"], ["cmd1", "cmd2"]],
])("%p", async (_title: string, cmds: Pre, executedCmds: string[]) => {
  jest.spyOn(ConfigurationService.prototype, "getPre").mockImplementation(() => cmds);
  const execSpy = jest.spyOn(ExecuteCommandService.prototype, "executeCommand").mockImplementation(async (_cmd: string, _cwd?: string) => emptyCommandResult);
  const pre = Container.get(PreExecutor);
  await pre.run();
  expect(execSpy).toHaveBeenCalledTimes(executedCmds.length);
  executedCmds.forEach(cmd => {
    expect(execSpy).toHaveBeenCalledWith(cmd, process.cwd());
  });
});

test("no pre", async () => {
  jest.spyOn(ConfigurationService.prototype, "getPre").mockImplementation(() => undefined);
  const execSpy = jest.spyOn(ExecuteCommandService.prototype, "executeCommand").mockImplementation(async (_cmd: string, _cwd?: string) => emptyCommandResult);
  const pre = Container.get(PreExecutor);
  await pre.run();
  expect(execSpy).toHaveBeenCalledTimes(0);
});
