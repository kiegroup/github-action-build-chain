import "reflect-metadata";
import { CLIRunner } from "@bc/bin/runners/cli-runner";
import { constants } from "@bc/domain/constants";
import { EntryPoint } from "@bc/domain/entry-point";
import { Plan } from "@bc/service/tools/plan";
import Container from "typedi";
import { GitCLIService } from "@bc/service/git/git-cli";
import { CommandExecutorDelegator } from "@bc/service/command/executor/command-executor-delegator";
import { BaseLoggerService } from "@bc/service/logger/base-logger-service";
import { ExecutionResult } from "@bc/domain/execute-command-result";
import { InputService } from "@bc/service/inputs/input-service";
import { CLIActionType } from "@bc/domain/cli";
import { FlowType } from "@bc/domain/inputs";
import { CLIArguments } from "@bc/service/arguments/cli/cli-arguments";

Container.set(constants.CONTAINER.ENTRY_POINT, EntryPoint.CLI);

let plan: Plan;
beforeEach(() => {
  plan = new Plan();
});

test("execute", async () => {
  jest.spyOn(BaseLoggerService.prototype, "logger", "get").mockReturnValue({
    log: () => undefined,
    emptyLine: () => undefined,
  });
  Container.get(InputService).updateInputs({
    flowType: FlowType.BRANCH,
  });

  const cliSpy = jest
    .spyOn(CLIRunner.prototype, "execute")
    .mockImplementation(async () => undefined);
  await plan.execute();
  expect(cliSpy).toHaveBeenCalledTimes(1);

  const git = Container.get(GitCLIService);
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  await expect(git.clone()).resolves.toBe(undefined);
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  await expect(git.merge()).resolves.toBe(undefined);
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  await expect(git.rename()).resolves.toBe(undefined);

  const commandExecutor = Container.get(CommandExecutorDelegator);
  await expect(
    commandExecutor.executeCommand("command")
  ).resolves.toMatchObject({
    startingDate: expect.any(Number),
    endingDate: expect.any(Number),
    time: 0,
    command: "command",
    result: ExecutionResult.OK,
    errorMessage: "",
  });

  const inputService = Container.get(InputService);
  expect(inputService.inputs).toMatchObject({
    CLICommand: CLIActionType.BUILD,
    CLISubCommand: FlowType.BRANCH,
  });

  const args = Container.get(CLIArguments);
  expect(args.getCommand().parse()).toBe(undefined);
});
