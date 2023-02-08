import "reflect-metadata";
import { UploadResponse } from "@actions/artifact";
import { CheckedOutNode } from "@bc/domain/checkout";
import { constants } from "@bc/domain/constants";
import { EntryPoint } from "@bc/domain/entry-point";
import { ExecutionResult } from "@bc/domain/execute-command-result";
import { FlowType } from "@bc/domain/inputs";
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

const executionResult1 = {
  node: nodeChain[0],
  executeCommandResults: [],
};

const executionResult2 = {
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
};

const executionResult3 = {
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
};

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
  jest.spyOn(ExecuteCommandService.prototype, "executeNodeCommands").mockImplementationOnce(async () => [
    executionResult1, executionResult1, executionResult1
  ]);
  jest.spyOn(ExecuteCommandService.prototype, "executeNodeCommands").mockImplementationOnce(async () => [
    executionResult2, executionResult2, executionResult2
  ]);
  jest.spyOn(ExecuteCommandService.prototype, "executeNodeCommands").mockImplementationOnce(async () => [
    executionResult3, executionResult3, executionResult3
  ]);
  jest.spyOn(ArtifactService.prototype, "uploadNodes").mockImplementation(async () => []);

  jest.spyOn(GithubActionLoggerService.prototype, "startGroup").mockImplementation(_msg => undefined);
  jest.spyOn(GithubActionLoggerService.prototype, "endGroup").mockImplementation(() => undefined);
  jest.spyOn(GithubActionLoggerService.prototype, "debug").mockImplementation(_msg => undefined);
  jest.spyOn(GithubActionLoggerService.prototype, "info").mockImplementation(_msg => undefined);
  jest.spyOn(GithubActionLoggerService.prototype, "error").mockImplementation(_msg => undefined);

  const flowService = Container.get(FlowService);
  const result = await flowService.run();

  expect(result).toStrictEqual({
    checkoutInfo,
    artifactUploadResults,
    executionResult: [
      [executionResult1, executionResult1, executionResult1], 
      [executionResult2, executionResult2, executionResult2],
      [executionResult3, executionResult3, executionResult3]
    ],
  });
});
