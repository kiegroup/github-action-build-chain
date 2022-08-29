import "reflect-metadata";
import { UploadResponse } from "@actions/artifact";
import { Runner } from "@bc/bin/runners/runner";
import { EntryPoint } from "@bc/domain/entry-point";
import { ExecuteCommandResult, ExecutionResult } from "@bc/domain/execute-command-result";
import { ExecuteNodeResult } from "@bc/domain/execute-node-result";
import { FlowResult } from "@bc/domain/flow";
import { PreExecutor } from "@bc/service/pre-post/pre";
import { PostExecutor } from "@bc/service/pre-post/post";
import { FlowService } from "@bc/service/flow/flow-service";
import { AbstractLoggerService } from "@bc/service/logger/abstract-logger-service";

/** Dummy runner to test protected methods */
class DummyRunner extends Runner {
  async execute(): Promise<void> {
    return;
  }

  async testExecutePre(): Promise<{ isFailure: boolean; output: ExecuteCommandResult[] }> {
    return this.executePre();
  }

  async testExecuteFlow(): Promise<{ isFailure: boolean; output: FlowResult }> {
    return this.executeFlow();
  }

  async testExecutePost(flowExecutionResult: boolean): Promise<{ isFailure: boolean; output: ExecuteCommandResult[] }> {
    return this.executePost(flowExecutionResult);
  }

  testPrintExecutionFailure(res: ExecuteCommandResult[]) {
    this.printExecutionFailure(res);
  }

  testPrintNodeExecutionFailure(res: ExecuteNodeResult[]) {
    this.printNodeExecutionFailure(res);
  }
}

const okResult: ExecuteCommandResult = {
  startingDate: 0,
  endingDate: 0,
  result: ExecutionResult.OK,
  errorMessage: "",
  time: 0,
  command: "cmd1",
};

const notOkResult: ExecuteCommandResult = {
  startingDate: 0,
  endingDate: 0,
  result: ExecutionResult.NOT_OK,
  errorMessage: "multiline\nmsg",
  time: 0,
  command: "cmd1",
};

const skipResult: ExecuteCommandResult = {
  startingDate: 0,
  endingDate: 0,
  result: ExecutionResult.SKIP,
  errorMessage: "",
  time: 0,
  command: "cmd1",
};

const artifactOk: PromiseSettledResult<UploadResponse> = {
  status: "fulfilled",
  value: { artifactName: "test", failedItems: [], artifactItems: [], size: 2 },
};

const artifactNotOk: PromiseSettledResult<UploadResponse> = {
  status: "rejected",
  reason: "something",
};

const nodeOk: ExecuteNodeResult = {
  node: { project: "owner1/project1" },
  executeCommandResults: [okResult, skipResult],
};

const nodeNotOk: ExecuteNodeResult = {
  node: { project: "owner1/project1" },
  executeCommandResults: [okResult, notOkResult, skipResult],
};

let dummyRunner: DummyRunner;
beforeEach(() => {
  // entrypoint does not matter here
  dummyRunner = new DummyRunner(EntryPoint.GITHUB_EVENT);
});

test.each([
  ["executePre: success", false, [okResult, skipResult]],
  ["executePre: failure", true, [okResult, skipResult, notOkResult]],
])("%p", async (_title: string, isFailure: boolean, output: ExecuteCommandResult[]) => {
  jest.spyOn(PreExecutor.prototype, "run").mockImplementation(async () => output);
  await expect(dummyRunner.testExecutePre()).resolves.toStrictEqual({ isFailure, output });
});

test.each([
  ["executePost: success", false, [okResult, skipResult]],
  ["executePost: failure", true, [okResult, skipResult, notOkResult]],
])("%p", async (_title: string, isFailure: boolean, output: ExecuteCommandResult[]) => {
  jest.spyOn(PostExecutor.prototype, "run").mockImplementation(async () => output);

  // flowExecutionResult does not matter here
  await expect(dummyRunner.testExecutePost(true)).resolves.toStrictEqual({ isFailure, output });
});

test.each([
  [
    "executeFlow: success",
    false,
    {
      artifactUploadResults: [artifactOk],
      checkoutInfo: [],
      executionResult: { after: [nodeOk], commands: [nodeOk], before: [nodeOk] },
    },
  ],
  [
    "executeFlow: failure - before execution phase",
    true,
    {
      artifactUploadResults: [artifactOk],
      checkoutInfo: [],
      executionResult: { after: [nodeOk], commands: [nodeOk], before: [nodeNotOk] },
    },
  ],
  [
    "executeFlow: failure - commands execution phase",
    true,
    {
      artifactUploadResults: [artifactOk],
      checkoutInfo: [],
      executionResult: { after: [nodeOk], commands: [nodeNotOk], before: [nodeOk] },
    },
  ],
  [
    "executeFlow: failure - after execution phase",
    true,
    {
      artifactUploadResults: [artifactOk],
      checkoutInfo: [],
      executionResult: { after: [nodeNotOk], commands: [nodeOk], before: [nodeOk] },
    },
  ],
  [
    "executeFlow: failure - artifact upload",
    true,
    {
      artifactUploadResults: [artifactNotOk],
      checkoutInfo: [],
      executionResult: { after: [nodeOk], commands: [nodeOk], before: [nodeOk] },
    },
  ],
])("%p", async (_title: string, isFailure: boolean, output: FlowResult) => {
  jest.spyOn(FlowService.prototype, "run").mockImplementation(async () => output);
  await expect(dummyRunner.testExecuteFlow()).resolves.toStrictEqual({ isFailure, output });
});

test.each([
  ["no failure", [okResult, okResult, skipResult], 0],
  ["failure", [okResult, okResult, skipResult, notOkResult], 3],
])("printExecutionFailure - %p", (_title: string, result: ExecuteCommandResult[], numOfLogCalls: number) => {
  const loggerSpy = jest.spyOn(AbstractLoggerService.prototype, "error");
  dummyRunner.testPrintExecutionFailure(result);
  expect(loggerSpy).toBeCalledTimes(numOfLogCalls);
});

test.each([
  ["no failure", [nodeOk, nodeOk], 0],
  ["failure", [nodeOk, nodeNotOk, nodeOk], 4],
])("printNodeExecutionFailure - %p", (_title: string, result: ExecuteNodeResult[], numOfLogCalls: number) => {
  const loggerSpy = jest.spyOn(AbstractLoggerService.prototype, "error");
  dummyRunner.testPrintNodeExecutionFailure(result);
  expect(loggerSpy).toBeCalledTimes(numOfLogCalls);
});
