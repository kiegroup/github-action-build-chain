import "reflect-metadata";
import { UploadResponse } from "@actions/artifact";
import { CheckedOutNode } from "@bc/domain/checkout";
import { constants } from "@bc/domain/constants";
import { EntryPoint } from "@bc/domain/entry-point";
import { ExecuteCommandResult, ExecutionResult } from "@bc/domain/execute-command-result";
import { FlowType } from "@bc/domain/inputs";
import { defaultNodeValue } from "@bc/domain/node";
import { ConfigurationService } from "@bc/service/config/configuration-service";
import { GitCLIService } from "@bc/service/git/git-cli";
import { JobSummaryService } from "@bc/service/job-summary/job-summary-service";
import { open, rm } from "fs/promises";
import path from "path";
import Container from "typedi";
import { readFileSync } from "fs";
import { Node } from "@kie/build-chain-configuration-reader";

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

const thirtySeconds = (30) * 1000;
const executionResult1 = {
  node: nodeChain[0],
  executeCommandResults: [
    {
      startingDate: 0,
      endingDate: thirtySeconds,
      time: thirtySeconds,
      command: "cmd1",
      result: ExecutionResult.SKIP,
      errorMessage: "error",
    },
  ],
};

const fiveMinutes = (5 * 60) * 1000;
const executionResult2 = {
  node: nodeChain[1],
  executeCommandResults: [
    {
      startingDate: 0,
      endingDate: fiveMinutes,
      time: fiveMinutes,
      command: "cmd2",
      result: ExecutionResult.OK,
      errorMessage: "",
    },
  ],
};

const twoHours = (2 * 60 * 60) * 1000;
const executionResult3 = {
  node: nodeChain[2],
  executeCommandResults: [
    {
      startingDate: 0,
      endingDate: twoHours,
      time: twoHours,
      command: "cmd3",
      result: ExecutionResult.NOT_OK,
      errorMessage: "error",
    },
  ],
};

const artifactUploadResults: PromiseSettledResult<UploadResponse>[] = [];

const prePostResult: ExecuteCommandResult[] = [
  {
    startingDate: 0,
    endingDate: 1,
    time: 1,
    command: "cmd1",
    result: ExecutionResult.OK,
    errorMessage: "",
  },
  {
    startingDate: 0,
    endingDate: 2,
    time: 2,
    command: "cmd2",
    result: ExecutionResult.NOT_OK,
    errorMessage: "error",
  },
  {
    startingDate: 0,
    endingDate: 3,
    time: 3,
    command: "cmd3",
    result: ExecutionResult.OK,
    errorMessage: "",
  },
];

const definitionFile = "definitionFile";
const eventUrl = "eventUrl";
const gitVersion = "1.0.1";
const filename = path.join(__dirname, "summary");

beforeEach(async () => {
  jest.spyOn(ConfigurationService.prototype, "getDefinitionFileUrl").mockImplementation(() => definitionFile);
  jest.spyOn(ConfigurationService.prototype, "getEventUrl").mockImplementation(() => eventUrl);
  jest.spyOn(ConfigurationService.prototype, "getStarterProjectName").mockImplementation(() => nodeChain[1].project);
  jest.spyOn(GitCLIService.prototype, "version").mockImplementation(async () => gitVersion);
  Container.set(constants.CONTAINER.ENTRY_POINT, EntryPoint.GITHUB_EVENT);

  const fd = await open(filename, "w");
  fd.close();
  process.env["GITHUB_STEP_SUMMARY"] = filename;
});

afterEach(async () => {
  await rm(filename);
  delete process.env["GITHUB_STEP_SUMMARY"];
});

test("non-branch flow", async () => {
  jest.spyOn(ConfigurationService.prototype, "getFlowType").mockImplementation(() => FlowType.CROSS_PULL_REQUEST);
  const jobSummaryService = Container.get(JobSummaryService);
  await jobSummaryService.generateSummary(
    {
      checkoutInfo,
      artifactUploadResults,
      executionResult: [
        [executionResult1, executionResult1, executionResult1], 
        [executionResult2, executionResult2, executionResult2], 
        [executionResult3, executionResult3, executionResult3]
      ]
    },
    prePostResult,
    prePostResult
  );
  
  const expected = readFileSync(
    path.join(__dirname, "expected-summary"),
    "utf8"
  ).replace(
    /\${{ PACKAGE_NAME }}/,
    `${process.env.npm_package_name}`
  );
  expect(readFileSync(filename, "utf8")).toBe(expected);
});

test("branch flow", async () => {
  jest.spyOn(ConfigurationService.prototype, "getFlowType").mockImplementation(() => FlowType.BRANCH);
  const jobSummaryService = Container.get(JobSummaryService);
  await jobSummaryService.generateSummary(
    {
      checkoutInfo,
      artifactUploadResults,
      executionResult: [
        [executionResult1, executionResult1, executionResult1], 
        [executionResult2, executionResult2, executionResult2], 
        [executionResult3, executionResult3, executionResult3]
      ]
    },
    prePostResult,
    prePostResult
  );

  expect(readFileSync(filename, "utf8")).toBe("");
});
