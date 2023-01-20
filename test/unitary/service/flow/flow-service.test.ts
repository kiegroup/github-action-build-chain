import "reflect-metadata";
import { UploadResponse } from "@actions/artifact";
import { CheckedOutNode } from "@bc/domain/checkout";
import { constants } from "@bc/domain/constants";
import { EntryPoint } from "@bc/domain/entry-point";
import { ExecutionResult } from "@bc/domain/execute-command-result";
import { ExecuteNodeResult } from "@bc/domain/execute-node-result";
import { ExecutionPhase } from "@bc/domain/execution-phase";
import { FlowType } from "@bc/domain/inputs";
import { NodeExecutionLevel } from "@bc/domain/node-execution";
import { CheckoutService } from "@bc/service/checkout/checkout-service";
import { ExecuteCommandService } from "@bc/service/command/execute-command-service";
import { ConfigurationService } from "@bc/service/config/configuration-service";
import { FlowService } from "@bc/service/flow/flow-service";
import { GithubActionLoggerService } from "@bc/service/logger/github-action-logger-service";
import Container from "typedi";
import { ArtifactService } from "@bc/service/artifacts/artifact-service";
import { Node } from "@kie/build-chain-configuration-reader";
import { defaultNodeValue } from "@bc/domain/node";

const nodeChain: Node[] = [
  {
    ...defaultNodeValue,
    project: "owner1/project1",
    before: {
      upstream: ["cmd1"],
      downstream: [],
      current: [],
    },
  },
  {
    ...defaultNodeValue,
    project: "owner2/project2",
    before: {
      current: ["cmd2-before"],
      downstream: [],
      upstream: [],
    },
    commands: {
      upstream: [],
      downstream: [],
      current: ["cmd2-current"],
    },
    after: {
      upstream: [],
      downstream: [],
      current: [],
    },
  },
  {
    ...defaultNodeValue,
    project: "owner3/project3",
    after: {
      upstream: [],
      downstream: [],
      current: ["cmd3"],
    },
    commands: {
      upstream: [],
      downstream: [],
      current: [],
    },
  },
];

const checkoutInfo: CheckedOutNode[] = [
  {
    node: nodeChain[0],
  },
  {
    node: nodeChain[1],
    checkoutInfo: {
      sourceBranch: "main",
      sourceGroup: "owner2",
      sourceName: "project2",
      targetBranch: "main",
      targetGroup: "owner2",
      targetName: "project2",
      merge: false,
      repoDir: "owner2_project2",
    },
  },
  {
    node: nodeChain[2],
    checkoutInfo: {
      sourceBranch: "dev",
      sourceGroup: "owner3-forked",
      sourceName: "project3-forked",
      targetBranch: "main",
      targetGroup: "owner3",
      targetName: "project3",
      merge: true,
      repoDir: "owner3_project3",
    },
  },
];

const executionResult: ExecuteNodeResult[] = [
  {
    node: nodeChain[0],
    executeCommandResults: [],
  },
  {
    node: nodeChain[1],
    executeCommandResults: [
      {
        startingDate: 0,
        endingDate: 2,
        time: 2,
        command: "cmd2",
        result: ExecutionResult.OK,
        errorMessage: "",
      },
    ],
  },
  {
    node: nodeChain[2],
    executeCommandResults: [
      {
        startingDate: 0,
        endingDate: 3,
        time: 3,
        command: "cmd3",
        result: ExecutionResult.NOT_OK,
        errorMessage: "error",
      },
    ],
  },
];

const artifactUploadResults: PromiseSettledResult<UploadResponse>[] = [];

test("run flow", async () => {
  // entry point does not make any difference for this function
  Container.set(constants.CONTAINER.ENTRY_POINT, EntryPoint.GITHUB_EVENT);

  // flow type does not make a difference for this function
  const flowType = FlowType.BRANCH;
  jest.spyOn(ConfigurationService.prototype, "getFlowType").mockImplementation(() => flowType);

  jest.spyOn(ConfigurationService.prototype, "nodeChain", "get").mockImplementation(() => nodeChain);
  jest.spyOn(ConfigurationService.prototype, "getStarterProjectName").mockImplementation(() => nodeChain[1].project);
  jest.spyOn(ConfigurationService.prototype, "getStarterNode").mockImplementation(() => nodeChain[1]);
  jest
    .spyOn(ConfigurationService.prototype, "skipExecution")
    .mockImplementationOnce(() => true)
    .mockImplementationOnce(() => false)
    .mockImplementationOnce(() => false);
  jest.spyOn(CheckoutService.prototype, "checkoutDefinitionTree").mockImplementation(async () => checkoutInfo);
  jest.spyOn(ExecuteCommandService.prototype, "executeChainCommands").mockImplementation(async () => executionResult);
  jest.spyOn(ArtifactService.prototype, "uploadNodes").mockImplementation(async () => []);

  const groupSpy = jest.spyOn(GithubActionLoggerService.prototype, "startGroup").mockImplementation(_msg => undefined);
  jest.spyOn(GithubActionLoggerService.prototype, "endGroup").mockImplementation(() => undefined);
  jest.spyOn(GithubActionLoggerService.prototype, "debug").mockImplementation(_msg => undefined);
  const infoSpy = jest.spyOn(GithubActionLoggerService.prototype, "info").mockImplementation(_msg => undefined);
  const errorSpy = jest.spyOn(GithubActionLoggerService.prototype, "error").mockImplementation(_msg => undefined);

  const flowService = Container.get(FlowService);
  const result = await flowService.run();

  // execution plan
  expect(groupSpy).toHaveBeenNthCalledWith(1, "Execution Plan");
  expect(infoSpy).toHaveBeenNthCalledWith(1, `${nodeChain.length} projects will be executed`);
  expect(infoSpy).toHaveBeenNthCalledWith(2, `[${nodeChain[0].project}]`);
  expect(infoSpy).toHaveBeenNthCalledWith(3, `\t Level type: ${NodeExecutionLevel.UPSTREAM}`);
  expect(infoSpy).toHaveBeenNthCalledWith(4, "\t No command will be executed (this project will be skipped)");
  expect(infoSpy).toHaveBeenNthCalledWith(5, `[${nodeChain[1].project}]`);
  expect(infoSpy).toHaveBeenNthCalledWith(6, `\t Level type: ${NodeExecutionLevel.CURRENT}`);
  expect(infoSpy).toHaveBeenNthCalledWith(7, `\t [${ExecutionPhase.BEFORE}]`);
  expect(infoSpy).toHaveBeenNthCalledWith(8, "\t\t cmd2-before");
  expect(infoSpy).toHaveBeenNthCalledWith(9, `\t [${ExecutionPhase.CURRENT}]`);
  expect(infoSpy).toHaveBeenNthCalledWith(10, "\t\t cmd2-current");
  expect(infoSpy).toHaveBeenNthCalledWith(11, `[${nodeChain[2].project}]`);
  expect(infoSpy).toHaveBeenNthCalledWith(12, `\t Level type: ${NodeExecutionLevel.DOWNSTREAM}`);
  expect(infoSpy).toHaveBeenNthCalledWith(13, `\t [${ExecutionPhase.AFTER}]`);
  expect(infoSpy).toHaveBeenNthCalledWith(14, "\t\t cmd3");

  // checkout summary
  expect(groupSpy).toHaveBeenNthCalledWith(2, `Checking out ${nodeChain[1].project} and its dependencies (${nodeChain.length} projects in total). It can take some time.`);
  expect(groupSpy).toHaveBeenNthCalledWith(3, "Checkout summary");
  expect(infoSpy).toHaveBeenNthCalledWith(15, `[${nodeChain[0].project}]`);
  expect(infoSpy).toHaveBeenNthCalledWith(16, "\t This project wasn't checked out");
  expect(infoSpy).toHaveBeenNthCalledWith(17, `[${nodeChain[1].project}]`);
  expect(infoSpy).toHaveBeenNthCalledWith(18, "\t Project taken from owner2/project2:main");
  expect(infoSpy).toHaveBeenNthCalledWith(19, `[${nodeChain[2].project}]`);
  expect(infoSpy).toHaveBeenNthCalledWith(20, "\t Project taken from owner3/project3:main");
  expect(infoSpy).toHaveBeenNthCalledWith(21, "\t Merged owner3-forked/project3-forked:dev into branch main");

  // execution summary: BEFORE
  expect(groupSpy).toHaveBeenNthCalledWith(4, `Executing ${ExecutionPhase.BEFORE}`);
  expect(infoSpy).toHaveBeenNthCalledWith(22, `Execution summary for phase ${ExecutionPhase.BEFORE}`);
  expect(infoSpy).toHaveBeenNthCalledWith(23, `[${ExecutionPhase.BEFORE.toUpperCase()}] No commands were found for ${nodeChain[0].project}`);
  expect(groupSpy).toHaveBeenNthCalledWith(5, `[${ExecutionPhase.BEFORE.toUpperCase()}] [${nodeChain[1].project}] cmd2`);
  expect(infoSpy).toHaveBeenNthCalledWith(24, `${ExecutionResult.OK} [Executed in 2 ms]`);
  expect(groupSpy).toHaveBeenNthCalledWith(6, `[${ExecutionPhase.BEFORE.toUpperCase()}] [${nodeChain[2].project}] cmd3`);
  expect(infoSpy).toHaveBeenNthCalledWith(25, `${ExecutionResult.NOT_OK} [Executed in 3 ms]`);
  expect(errorSpy).toHaveBeenNthCalledWith(1, "error");

  // execution summary: CURRENT
  expect(groupSpy).toHaveBeenNthCalledWith(7, `Executing ${ExecutionPhase.CURRENT}`);
  expect(infoSpy).toHaveBeenNthCalledWith(26, `Execution summary for phase ${ExecutionPhase.CURRENT}`);
  expect(infoSpy).toHaveBeenNthCalledWith(27, `[${ExecutionPhase.CURRENT.toUpperCase()}] No commands were found for ${nodeChain[0].project}`);
  expect(groupSpy).toHaveBeenNthCalledWith(8, `[${ExecutionPhase.CURRENT.toUpperCase()}] [${nodeChain[1].project}] cmd2`);
  expect(infoSpy).toHaveBeenNthCalledWith(28, `${ExecutionResult.OK} [Executed in 2 ms]`);
  expect(groupSpy).toHaveBeenNthCalledWith(9, `[${ExecutionPhase.CURRENT.toUpperCase()}] [${nodeChain[2].project}] cmd3`);
  expect(infoSpy).toHaveBeenNthCalledWith(29, `${ExecutionResult.NOT_OK} [Executed in 3 ms]`);
  expect(errorSpy).toHaveBeenNthCalledWith(2, "error");

  // execution summary: AFTER
  expect(groupSpy).toHaveBeenNthCalledWith(10, `Executing ${ExecutionPhase.AFTER}`);
  expect(infoSpy).toHaveBeenNthCalledWith(30, `Execution summary for phase ${ExecutionPhase.AFTER}`);
  expect(infoSpy).toHaveBeenNthCalledWith(31, `[${ExecutionPhase.AFTER.toUpperCase()}] No commands were found for ${nodeChain[0].project}`);
  expect(groupSpy).toHaveBeenNthCalledWith(11, `[${ExecutionPhase.AFTER.toUpperCase()}] [${nodeChain[1].project}] cmd2`);
  expect(infoSpy).toHaveBeenNthCalledWith(32, `${ExecutionResult.OK} [Executed in 2 ms]`);
  expect(groupSpy).toHaveBeenNthCalledWith(12, `[${ExecutionPhase.AFTER.toUpperCase()}] [${nodeChain[2].project}] cmd3`);
  expect(infoSpy).toHaveBeenNthCalledWith(33, `${ExecutionResult.NOT_OK} [Executed in 3 ms]`);
  expect(errorSpy).toHaveBeenNthCalledWith(3, "error");

  expect(groupSpy).toHaveBeenNthCalledWith(13, "Uploading artifacts");

  expect(result).toStrictEqual({
    checkoutInfo,
    artifactUploadResults,
    executionResult: { before: executionResult, after: executionResult, commands: executionResult },
  });
});
