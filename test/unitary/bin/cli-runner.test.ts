import "reflect-metadata";
import { CLIRunner } from "@bc/bin/runners/cli-runner";
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
import { defaultNodeValue } from "@bc/domain/node";
import { Command } from "commander";

// disable logs
jest.spyOn(global.console, "log");

test("initialization", () => {
  // ensure that entry point value is something other than CLI
  Container.set(constants.CONTAINER.ENTRY_POINT, EntryPoint.GITHUB_EVENT);

  new CLIRunner();

  expect(Container.get(constants.CONTAINER.ENTRY_POINT)).toBe(EntryPoint.CLI);
});

describe("execute", () => {
  let cliRunner: CLIRunner;
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
    cliRunner = new CLIRunner();
    jest.spyOn(Command.prototype, "parse").mockImplementation(() => undefined!);
  });

  test("success", async () => {
    const configSpy = jest.spyOn(ConfigurationService.prototype, "init").mockImplementation(async () => undefined);
    const preSpy = jest.spyOn(PreExecutor.prototype, "run").mockImplementation(async () => [okResult]);
    const postSpy = jest.spyOn(PostExecutor.prototype, "run").mockImplementation(async () => [okResult, okResult, okResult]);
    const flowSpy = jest.spyOn(FlowService.prototype, "run").mockImplementation(async () => flowOk);

    await cliRunner.execute();

    expect(configSpy).toHaveBeenCalledTimes(1);
    expect(preSpy).toHaveBeenCalledTimes(1);
    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(flowSpy).toHaveBeenCalledTimes(1);
  });

  test("failure: pre", async () => {
    const configSpy = jest.spyOn(ConfigurationService.prototype, "init").mockImplementation(async () => undefined);
    const preSpy = jest.spyOn(PreExecutor.prototype, "run").mockImplementation(async () => [notOkResult]);
    const postSpy = jest.spyOn(PostExecutor.prototype, "run").mockImplementation(async () => []);
    const flowSpy = jest.spyOn(FlowService.prototype, "run").mockImplementation(async () => defaultFlowResult);
    const exitSpy = jest.spyOn(process, "exit").mockImplementation((_code?: number) => undefined as never);

    await cliRunner.execute();

    expect(configSpy).toHaveBeenCalledTimes(1);
    expect(preSpy).toHaveBeenCalledTimes(1);
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(postSpy).toHaveBeenCalledTimes(0);
    expect(flowSpy).toHaveBeenCalledTimes(0);
  });

  test("failure: post", async () => {
    const configSpy = jest.spyOn(ConfigurationService.prototype, "init").mockImplementation(async () => undefined);
    const preSpy = jest.spyOn(PreExecutor.prototype, "run").mockImplementation(async () => [okResult]);
    const postSpy = jest.spyOn(PostExecutor.prototype, "run").mockImplementation(async () => [notOkResult]);
    const flowSpy = jest.spyOn(FlowService.prototype, "run").mockImplementation(async () => flowOk);
    const exitSpy = jest.spyOn(process, "exit").mockImplementation((_code?: number) => undefined as never);

    await cliRunner.execute();

    expect(configSpy).toHaveBeenCalledTimes(1);
    expect(preSpy).toHaveBeenCalledTimes(1);
    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(flowSpy).toHaveBeenCalledTimes(1);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  test("failure: flow - node execution", async () => {
    const configSpy = jest.spyOn(ConfigurationService.prototype, "init").mockImplementation(async () => undefined);
    const preSpy = jest.spyOn(PreExecutor.prototype, "run").mockImplementation(async () => [okResult]);
    const postSpy = jest.spyOn(PostExecutor.prototype, "run").mockImplementation(async () => [okResult]);
    const flowSpy = jest.spyOn(FlowService.prototype, "run").mockImplementation(async () => ({
      artifactUploadResults: [artifactOk],
      checkoutInfo: [],
      executionResult: [[nodeOk, nodeNotOk, nodeNotOk]],
    }));
    const exitSpy = jest.spyOn(process, "exit").mockImplementation((_code?: number) => undefined as never);

    await cliRunner.execute();

    expect(configSpy).toHaveBeenCalledTimes(1);
    expect(preSpy).toHaveBeenCalledTimes(1);
    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(flowSpy).toHaveBeenCalledTimes(1);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  test("failure: flow - artifact upload failure", async () => {
    const configSpy = jest.spyOn(ConfigurationService.prototype, "init").mockImplementation(async () => undefined);
    const preSpy = jest.spyOn(PreExecutor.prototype, "run").mockImplementation(async () => [okResult]);
    const postSpy = jest.spyOn(PostExecutor.prototype, "run").mockImplementation(async () => [okResult]);
    const flowSpy = jest.spyOn(FlowService.prototype, "run").mockImplementation(async () => ({
      artifactUploadResults: [artifactNotOk],
      checkoutInfo: [],
      executionResult: flowOk.executionResult,
    }));
    const exitSpy = jest.spyOn(process, "exit").mockImplementation((_code?: number) => undefined as never);

    await cliRunner.execute();

    expect(configSpy).toHaveBeenCalledTimes(1);
    expect(preSpy).toHaveBeenCalledTimes(1);
    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(flowSpy).toHaveBeenCalledTimes(1);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
