import "reflect-metadata";
import { constants } from "@bc/domain/constants";
import { EntryPoint } from "@bc/domain/entry-point";
import Container from "typedi";
import { ConfigurationService } from "@bc/service/config/configuration-service";
import { PreExecutor } from "@bc/service/pre-post/pre";
import { PostExecutor } from "@bc/service/pre-post/post";
import { FlowService } from "@bc/service/flow/flow-service";
import { defaultFlowResult, FlowResult } from "@bc/domain/flow";
import { ExecuteCommandResult, ExecutionResult } from "@bc/domain/execute-command-result";
import { UploadResponse } from "@actions/artifact";
import { ExecuteNodeResult } from "@bc/domain/execute-node-result";
import { GithubActionRunner } from "@bc/bin/runners/github-action-runner";
import { JobSummaryService } from "@bc/service/job-summary/job-summary-service";
import { defaultNodeValue } from "@bc/domain/node";
import { ActionArguments } from "@bc/service/arguments/action/action-arguments";


// disable logs
jest.spyOn(global.console, "log");

test("initialization", () => {
  // ensure that entry point value is something other than GITHUB_EVENT
  Container.set(constants.CONTAINER.ENTRY_POINT, EntryPoint.CLI);

  new GithubActionRunner();

  expect(Container.get(constants.CONTAINER.ENTRY_POINT)).toBe(EntryPoint.GITHUB_EVENT);
});

describe("execute", () => {
  let githubActionRunner: GithubActionRunner;
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
    node: { ...defaultNodeValue, project: "owner1/project1" },
    executeCommandResults: [okResult, okResult],
  };

  const nodeNotOk: ExecuteNodeResult = {
    node: { ...defaultNodeValue, project: "owner1/project1" },
    executeCommandResults: [okResult, notOkResult],
  };

  const flowOk: FlowResult = {
    artifactUploadResults: [artifactOk],
    checkoutInfo: [],
    executionResult: [[nodeOk, nodeOk, nodeOk]],
  };

  beforeEach(() => {
    githubActionRunner = new GithubActionRunner();
    jest.spyOn(ActionArguments.prototype, "parse").mockImplementation(() => undefined);
  });

  test("success", async () => {
    const configSpy = jest.spyOn(ConfigurationService.prototype, "init").mockImplementation(async () => undefined);
    const preSpy = jest.spyOn(PreExecutor.prototype, "run").mockImplementation(async () => [okResult]);
    const postSpy = jest.spyOn(PostExecutor.prototype, "run").mockImplementation(async () => [okResult, okResult, okResult]);
    const flowSpy = jest.spyOn(FlowService.prototype, "run").mockImplementation(async () => flowOk);
    const jobSummarySpy = jest
      .spyOn(JobSummaryService.prototype, "generateSummary")
      .mockImplementation(async (_flowResult: FlowResult, _preResult: ExecuteCommandResult[], _postResult: ExecuteCommandResult[]) => undefined);

    await githubActionRunner.execute();

    expect(configSpy).toHaveBeenCalledTimes(1);
    expect(preSpy).toHaveBeenCalledTimes(1);
    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(flowSpy).toHaveBeenCalledTimes(1);
    expect(jobSummarySpy).toHaveBeenCalledWith(flowOk, [okResult], [okResult, okResult, okResult]);
  });

  test("failure: pre", async () => {
    const configSpy = jest.spyOn(ConfigurationService.prototype, "init").mockImplementation(async () => undefined);
    const preSpy = jest.spyOn(PreExecutor.prototype, "run").mockImplementation(async () => [notOkResult]);
    const postSpy = jest.spyOn(PostExecutor.prototype, "run").mockImplementation(async () => []);
    const flowSpy = jest.spyOn(FlowService.prototype, "run").mockImplementation(async () => defaultFlowResult);
    const exitSpy = jest.spyOn(process, "exit").mockImplementation((_code?: number) => undefined as never);
    const jobSummarySpy = jest
      .spyOn(JobSummaryService.prototype, "generateSummary")
      .mockImplementation(async (_flowResult: FlowResult, _preResult: ExecuteCommandResult[], _postResult: ExecuteCommandResult[]) => undefined);

    await githubActionRunner.execute();

    expect(configSpy).toHaveBeenCalledTimes(1);
    expect(preSpy).toHaveBeenCalledTimes(1);
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(jobSummarySpy).toHaveBeenCalledWith(defaultFlowResult, [notOkResult], []);
    expect(postSpy).toHaveBeenCalledTimes(0);
    expect(flowSpy).toHaveBeenCalledTimes(0);
  });

  test("failure: post", async () => {
    const configSpy = jest.spyOn(ConfigurationService.prototype, "init").mockImplementation(async () => undefined);
    const preSpy = jest.spyOn(PreExecutor.prototype, "run").mockImplementation(async () => [okResult]);
    const postSpy = jest.spyOn(PostExecutor.prototype, "run").mockImplementation(async () => [notOkResult]);
    const flowSpy = jest.spyOn(FlowService.prototype, "run").mockImplementation(async () => flowOk);
    const exitSpy = jest.spyOn(process, "exit").mockImplementation((_code?: number) => undefined as never);
    const jobSummarySpy = jest
      .spyOn(JobSummaryService.prototype, "generateSummary")
      .mockImplementation(async (_flowResult: FlowResult, _preResult: ExecuteCommandResult[], _postResult: ExecuteCommandResult[]) => undefined);

    await githubActionRunner.execute();

    expect(configSpy).toHaveBeenCalledTimes(1);
    expect(preSpy).toHaveBeenCalledTimes(1);
    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(flowSpy).toHaveBeenCalledTimes(1);
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(jobSummarySpy).toHaveBeenCalledWith(flowOk, [okResult], [notOkResult]);
  });

  test("failure: flow - %p phase execution", async () => {
    const configSpy = jest.spyOn(ConfigurationService.prototype, "init").mockImplementation(async () => undefined);
    const preSpy = jest.spyOn(PreExecutor.prototype, "run").mockImplementation(async () => [okResult]);
    const postSpy = jest.spyOn(PostExecutor.prototype, "run").mockImplementation(async () => [okResult]);

    const flowResult = {
      artifactUploadResults: [artifactOk],
      checkoutInfo: [],
      executionResult: [[nodeOk, nodeNotOk, nodeNotOk]],
    };
    const flowSpy = jest.spyOn(FlowService.prototype, "run").mockImplementation(async () => flowResult);
    const exitSpy = jest.spyOn(process, "exit").mockImplementation((_code?: number) => undefined as never);
    const jobSummarySpy = jest
      .spyOn(JobSummaryService.prototype, "generateSummary")
      .mockImplementation(async (_flowResult: FlowResult, _preResult: ExecuteCommandResult[], _postResult: ExecuteCommandResult[]) => undefined);

    await githubActionRunner.execute();

    expect(configSpy).toHaveBeenCalledTimes(1);
    expect(preSpy).toHaveBeenCalledTimes(1);
    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(flowSpy).toHaveBeenCalledTimes(1);
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(jobSummarySpy).toHaveBeenCalledWith(flowResult, [okResult], [okResult]);
  });

  test("failure: flow - artifact upload failure", async () => {
    const configSpy = jest.spyOn(ConfigurationService.prototype, "init").mockImplementation(async () => undefined);
    const preSpy = jest.spyOn(PreExecutor.prototype, "run").mockImplementation(async () => [okResult]);
    const postSpy = jest.spyOn(PostExecutor.prototype, "run").mockImplementation(async () => [okResult]);

    const flowResult = {
      artifactUploadResults: [artifactNotOk],
      checkoutInfo: [],
      executionResult: flowOk.executionResult,
    };
    const flowSpy = jest.spyOn(FlowService.prototype, "run").mockImplementation(async () => flowResult);
    const exitSpy = jest.spyOn(process, "exit").mockImplementation((_code?: number) => undefined as never);
    const jobSummarySpy = jest
      .spyOn(JobSummaryService.prototype, "generateSummary")
      .mockImplementation(async (_flowResult: FlowResult, _preResult: ExecuteCommandResult[], _postResult: ExecuteCommandResult[]) => undefined);

    await githubActionRunner.execute();

    expect(configSpy).toHaveBeenCalledTimes(1);
    expect(preSpy).toHaveBeenCalledTimes(1);
    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(flowSpy).toHaveBeenCalledTimes(1);
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(jobSummarySpy).toHaveBeenCalledWith(flowResult, [okResult], [okResult]);

  });
});
