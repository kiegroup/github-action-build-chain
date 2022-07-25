import "reflect-metadata";
import path from "path";
import Container from "typedi";
import { constants } from "@bc/domain/constants";
import { EntryPoint } from "@bc/domain/entry-point";
import { ConfigurationService } from "@bc/service/config/configuration-service";
import { ProjectConfiguration } from "@bc/domain/configuration";
import { CheckoutService } from "@bc/service/checkout/checkout-service";
import { rmSync } from "fs";
import { GitCLIService } from "@bc/service/git/git-cli";
import { BaseConfiguration } from "@bc/service/config/base-configuration";
import { serverUrl, nodeChain, fakeClone, checkClone } from "./helpers";
import { MockGithub } from "../../../setup/mock-github";

// disable logs
jest.spyOn(global.console, "log");

/**
 * just so the config service intialization succeeds. Otherwise not really needed
 * since all config service functions will be mocked
 */
Container.set(constants.CONTAINER.ENTRY_POINT, EntryPoint.GITHUB_EVENT);
Container.set(constants.GITHUB.TOKEN, "faketoken");

const checkoutService = Container.get(CheckoutService);
const mockGithub = new MockGithub(path.join(__dirname, "config.json"), "checkout-setup");
let cloneSpy: jest.SpyInstance, mergeSpy: jest.SpyInstance;

beforeAll(async () => {
  await mockGithub.setup();
});

afterAll(async () => {
  await mockGithub.teardown();
});

beforeEach(async () => {
  // skip checkout for the last node
  jest
    .spyOn(ConfigurationService.prototype, "skipCheckout")
    .mockImplementationOnce(() => false)
    .mockImplementationOnce(() => false)
    .mockImplementationOnce(() => true);

  // mock git server url
  jest.spyOn(BaseConfiguration.prototype, "gitConfiguration", "get").mockImplementation(() => {
    return { serverUrlWithToken: serverUrl };
  });

  // spy on git functions
  cloneSpy = jest
    .spyOn(GitCLIService.prototype, "clone")
    .mockImplementationOnce(async (_from: string, to: string, _branch: string) => fakeClone(to))
    .mockImplementationOnce(async () => undefined);
  mergeSpy = jest.spyOn(GitCLIService.prototype, "merge").mockImplementation(async () => undefined);
});

describe.each([
  ["sequential", true],
  ["parallel", false],
])("%p: starting project has a PR from non-forked repository", (title: string, skipParallelCheckout: boolean) => {
  const originalSource: ProjectConfiguration = {
    name: "project2",
    group: "owner2",
    branch: "sbranch2",
    repository: "owner2/project2",
  };
  const originalTarget: ProjectConfiguration = {
    name: "project2",
    group: "owner2",
    branch: "tbranch2",
    repository: "owner2/project2",
  };
  const rootFolder = path.join(__dirname, "non-forked-pr");

  beforeEach(() => {
    jest.spyOn(ConfigurationService.prototype, "getRootFolder").mockImplementation(() => rootFolder);
    jest.spyOn(ConfigurationService.prototype, "getSourceProject").mockImplementation(() => originalSource);
    jest.spyOn(ConfigurationService.prototype, "getTargetProject").mockImplementation(() => originalTarget);
    jest.spyOn(ConfigurationService.prototype, "getStarterNode").mockImplementation(() => nodeChain[1]);
    jest.spyOn(ConfigurationService.prototype, "skipParallelCheckout").mockImplementation(() => skipParallelCheckout);
  });

  afterEach(() => {
    rmSync(rootFolder, { recursive: true });
  });

  test("PR exists from node_forked:source_branch to node:mapped_branch", async () => {
    const checkedOutNodeInfo = await checkoutService.checkoutDefinitionTree(nodeChain);

    // checking clone and merge correctness
    expect(cloneSpy).toHaveBeenCalledTimes(2);
    expect(cloneSpy).toHaveBeenCalledWith(`${serverUrl}/owner1/project1`, path.join(rootFolder, "owner1_project1"), "tbranch1");
    expect(cloneSpy).toHaveBeenCalledWith(`${serverUrl}/owner2/project2`, path.join(rootFolder, "owner2_project2"), "tbranch2");

    expect(mergeSpy).toHaveBeenCalledTimes(2);
    expect(mergeSpy).toHaveBeenCalledWith(path.join(rootFolder, "owner1_project1"), `${serverUrl}/owner2/project1-forked`, "sbranch2");
    expect(mergeSpy).toHaveBeenCalledWith(path.join(rootFolder, "owner2_project2"), `${serverUrl}/owner2/project2`, "sbranch2");

    // checking copying node (i.e. cloneNode) correctness
    await checkClone(rootFolder);

    // checking checkout information correctness
    expect(checkedOutNodeInfo.length).toBe(3);
    expect(checkedOutNodeInfo[0]).toStrictEqual({
      project: "owner1/project1",
      checkoutInfo: {
        sourceBranch: "sbranch2",
        sourceGroup: "owner2",
        sourceName: "project1-forked",
        targetBranch: "tbranch1",
        targetGroup: "owner1",
        targetName: "project1",
        repoDir: `${rootFolder}/owner1_project1`,
        merge: true,
      },
    });
    expect(checkedOutNodeInfo[1]).toStrictEqual({
      project: "owner2/project2",
      checkoutInfo: {
        sourceBranch: "sbranch2",
        sourceGroup: "owner2",
        sourceName: "project2",
        targetBranch: "tbranch2",
        targetGroup: "owner2",
        targetName: "project2",
        repoDir: `${rootFolder}/owner2_project2`,
        merge: true,
      },
    });
    expect(checkedOutNodeInfo[2]).toStrictEqual({
      project: "owner3/project3",
      checkoutInfo: undefined,
    });
  });

  test("PR exists from node:source_branch to node:mapped_branch", async () => {
    const checkedOutNodeInfo = await checkoutService.checkoutDefinitionTree(nodeChain);

    // checking clone and merge correctness
    expect(cloneSpy).toHaveBeenCalledTimes(2);
    expect(cloneSpy).toHaveBeenCalledWith(`${serverUrl}/owner1/project1`, path.join(rootFolder, "owner1_project1"), "tbranch1");
    expect(cloneSpy).toHaveBeenCalledWith(`${serverUrl}/owner2/project2`, path.join(rootFolder, "owner2_project2"), "tbranch2");

    expect(mergeSpy).toHaveBeenCalledTimes(2);
    expect(mergeSpy).toHaveBeenCalledWith(path.join(rootFolder, "owner1_project1"), `${serverUrl}/owner1/project1`, "sbranch2");
    expect(mergeSpy).toHaveBeenCalledWith(path.join(rootFolder, "owner2_project2"), `${serverUrl}/owner2/project2`, "sbranch2");

    // checking copying node (i.e. cloneNode) correctness
    await checkClone(rootFolder);

    // checking checkout information correctness
    expect(checkedOutNodeInfo.length).toBe(3);
    expect(checkedOutNodeInfo[0]).toStrictEqual({
      project: "owner1/project1",
      checkoutInfo: {
        sourceBranch: "sbranch2",
        sourceGroup: "owner1",
        sourceName: "project1",
        targetBranch: "tbranch1",
        targetGroup: "owner1",
        targetName: "project1",
        repoDir: `${rootFolder}/owner1_project1`,
        merge: true,
      },
    });
    expect(checkedOutNodeInfo[1]).toStrictEqual({
      project: "owner2/project2",
      checkoutInfo: {
        sourceBranch: "sbranch2",
        sourceGroup: "owner2",
        sourceName: "project2",
        targetBranch: "tbranch2",
        targetGroup: "owner2",
        targetName: "project2",
        repoDir: `${rootFolder}/owner2_project2`,
        merge: true,
      },
    });
    expect(checkedOutNodeInfo[2]).toStrictEqual({
      project: "owner3/project3",
      checkoutInfo: undefined,
    });
  });

  test("No PR", async () => {
    const checkedOutNodeInfo = await checkoutService.checkoutDefinitionTree(nodeChain);

    // checking clone and merge correctness
    expect(cloneSpy).toHaveBeenCalledTimes(2);
    expect(cloneSpy).toHaveBeenCalledWith(`${serverUrl}/owner1/project1`, path.join(rootFolder, "owner1_project1"), "tbranch1");
    expect(cloneSpy).toHaveBeenCalledWith(`${serverUrl}/owner2/project2`, path.join(rootFolder, "owner2_project2"), "tbranch2");

    expect(mergeSpy).toHaveBeenCalledTimes(1);
    expect(mergeSpy).toHaveBeenCalledWith(path.join(rootFolder, "owner2_project2"), `${serverUrl}/owner2/project2`, "sbranch2");

    // checking copying node (i.e. cloneNode) correctness
    await checkClone(rootFolder);

    // checking checkout information correctness
    expect(checkedOutNodeInfo.length).toBe(3);
    expect(checkedOutNodeInfo[0]).toStrictEqual({
      project: "owner1/project1",
      checkoutInfo: {
        sourceBranch: "tbranch1",
        sourceGroup: "owner1",
        sourceName: "project1",
        targetBranch: "tbranch1",
        targetGroup: "owner1",
        targetName: "project1",
        repoDir: `${rootFolder}/owner1_project1`,
        merge: false,
      },
    });
    expect(checkedOutNodeInfo[1]).toStrictEqual({
      project: "owner2/project2",
      checkoutInfo: {
        sourceBranch: "sbranch2",
        sourceGroup: "owner2",
        sourceName: "project2",
        targetBranch: "tbranch2",
        targetGroup: "owner2",
        targetName: "project2",
        repoDir: `${rootFolder}/owner2_project2`,
        merge: true,
      },
    });
    expect(checkedOutNodeInfo[2]).toStrictEqual({
      project: "owner3/project3",
      checkoutInfo: undefined,
    });
  });
});

describe.each([
  ["sequential", true],
  ["parallel", false],
])("%p: starting project has a PR from forked repository", (title: string, skipParallelCheckout: boolean) => {
  const originalSource: ProjectConfiguration = {
    name: "project2-forked",
    group: "owner4",
    branch: "sbranch2-forked",
    repository: "owner4/project2-forked",
  };
  const originalTarget: ProjectConfiguration = {
    name: "project2",
    group: "owner2",
    branch: "tbranch2",
    repository: "owner2/project2",
  };
  const rootFolder = path.join(__dirname, "forked-pr");

  beforeEach(() => {
    jest.spyOn(ConfigurationService.prototype, "getRootFolder").mockImplementation(() => rootFolder);
    jest.spyOn(ConfigurationService.prototype, "getSourceProject").mockImplementation(() => originalSource);
    jest.spyOn(ConfigurationService.prototype, "getTargetProject").mockImplementation(() => originalTarget);
    jest.spyOn(ConfigurationService.prototype, "getStarterNode").mockImplementation(() => nodeChain[1]);
    jest.spyOn(ConfigurationService.prototype, "skipParallelCheckout").mockImplementation(() => skipParallelCheckout);
  });

  afterEach(() => {
    rmSync(rootFolder, { recursive: true });
  });

  test("PR exists from node_forked:source_branch to node:mapped_branch", async () => {
    const checkedOutNodeInfo = await checkoutService.checkoutDefinitionTree(nodeChain);

    // checking clone and merge correctness
    expect(cloneSpy).toHaveBeenCalledTimes(2);
    expect(cloneSpy).toHaveBeenCalledWith(`${serverUrl}/owner1/project1`, path.join(rootFolder, "owner1_project1"), "tbranch1");
    expect(cloneSpy).toHaveBeenCalledWith(`${serverUrl}/owner2/project2`, path.join(rootFolder, "owner2_project2"), "tbranch2");

    expect(mergeSpy).toHaveBeenCalledTimes(2);
    expect(mergeSpy).toHaveBeenCalledWith(path.join(rootFolder, "owner1_project1"), `${serverUrl}/owner4/project1-forked`, "sbranch2-forked");
    expect(mergeSpy).toHaveBeenCalledWith(path.join(rootFolder, "owner2_project2"), `${serverUrl}/owner4/project2-forked`, "sbranch2-forked");

    // checking copying node (i.e. cloneNode) correctness
    await checkClone(rootFolder);

    // checking checkout information correctness
    expect(checkedOutNodeInfo.length).toBe(3);
    expect(checkedOutNodeInfo[0]).toStrictEqual({
      project: "owner1/project1",
      checkoutInfo: {
        sourceBranch: "sbranch2-forked",
        sourceGroup: "owner4",
        sourceName: "project1-forked",
        targetBranch: "tbranch1",
        targetGroup: "owner1",
        targetName: "project1",
        repoDir: `${rootFolder}/owner1_project1`,
        merge: true,
      },
    });
    expect(checkedOutNodeInfo[1]).toStrictEqual({
      project: "owner2/project2",
      checkoutInfo: {
        sourceBranch: "sbranch2-forked",
        sourceGroup: "owner4",
        sourceName: "project2-forked",
        targetBranch: "tbranch2",
        targetGroup: "owner2",
        targetName: "project2",
        repoDir: `${rootFolder}/owner2_project2`,
        merge: true,
      },
    });
    expect(checkedOutNodeInfo[2]).toStrictEqual({
      project: "owner3/project3",
      checkoutInfo: undefined,
    });
  });

  test("PR exists from node:source_branch to node:mapped_branch", async () => {
    const checkedOutNodeInfo = await checkoutService.checkoutDefinitionTree(nodeChain);

    // checking clone and merge correctness
    expect(cloneSpy).toHaveBeenCalledTimes(2);
    expect(cloneSpy).toHaveBeenCalledWith(`${serverUrl}/owner1/project1`, path.join(rootFolder, "owner1_project1"), "tbranch1");
    expect(cloneSpy).toHaveBeenCalledWith(`${serverUrl}/owner2/project2`, path.join(rootFolder, "owner2_project2"), "tbranch2");

    expect(mergeSpy).toHaveBeenCalledTimes(2);
    expect(mergeSpy).toHaveBeenCalledWith(path.join(rootFolder, "owner1_project1"), `${serverUrl}/owner1/project1`, "sbranch2-forked");
    expect(mergeSpy).toHaveBeenCalledWith(path.join(rootFolder, "owner2_project2"), `${serverUrl}/owner4/project2-forked`, "sbranch2-forked");

    // checking copying node (i.e. cloneNode) correctness
    await checkClone(rootFolder);

    // checking checkout information correctness
    expect(checkedOutNodeInfo.length).toBe(3);
    expect(checkedOutNodeInfo[0]).toStrictEqual({
      project: "owner1/project1",
      checkoutInfo: {
        sourceBranch: "sbranch2-forked",
        sourceGroup: "owner1",
        sourceName: "project1",
        targetBranch: "tbranch1",
        targetGroup: "owner1",
        targetName: "project1",
        repoDir: `${rootFolder}/owner1_project1`,
        merge: true,
      },
    });
    expect(checkedOutNodeInfo[1]).toStrictEqual({
      project: "owner2/project2",
      checkoutInfo: {
        sourceBranch: "sbranch2-forked",
        sourceGroup: "owner4",
        sourceName: "project2-forked",
        targetBranch: "tbranch2",
        targetGroup: "owner2",
        targetName: "project2",
        repoDir: `${rootFolder}/owner2_project2`,
        merge: true,
      },
    });
    expect(checkedOutNodeInfo[2]).toStrictEqual({
      project: "owner3/project3",
      checkoutInfo: undefined,
    });
  });

  test("No PR", async () => {
    const checkedOutNodeInfo = await checkoutService.checkoutDefinitionTree(nodeChain);

    // checking clone and merge correctness
    expect(cloneSpy).toHaveBeenCalledTimes(2);
    expect(cloneSpy).toHaveBeenCalledWith(`${serverUrl}/owner1/project1`, path.join(rootFolder, "owner1_project1"), "tbranch1");
    expect(cloneSpy).toHaveBeenCalledWith(`${serverUrl}/owner2/project2`, path.join(rootFolder, "owner2_project2"), "tbranch2");

    expect(mergeSpy).toHaveBeenCalledTimes(1);
    expect(mergeSpy).toHaveBeenCalledWith(path.join(rootFolder, "owner2_project2"), `${serverUrl}/owner4/project2-forked`, "sbranch2-forked");

    // checking copying node (i.e. cloneNode) correctness
    await checkClone(rootFolder);

    // checking checkout information correctness
    expect(checkedOutNodeInfo.length).toBe(3);
    expect(checkedOutNodeInfo[0]).toStrictEqual({
      project: "owner1/project1",
      checkoutInfo: {
        sourceBranch: "tbranch1",
        sourceGroup: "owner1",
        sourceName: "project1",
        targetBranch: "tbranch1",
        targetGroup: "owner1",
        targetName: "project1",
        repoDir: `${rootFolder}/owner1_project1`,
        merge: false,
      },
    });
    expect(checkedOutNodeInfo[1]).toStrictEqual({
      project: "owner2/project2",
      checkoutInfo: {
        sourceBranch: "sbranch2-forked",
        sourceGroup: "owner4",
        sourceName: "project2-forked",
        targetBranch: "tbranch2",
        targetGroup: "owner2",
        targetName: "project2",
        repoDir: `${rootFolder}/owner2_project2`,
        merge: true,
      },
    });
    expect(checkedOutNodeInfo[2]).toStrictEqual({
      project: "owner3/project3",
      checkoutInfo: undefined,
    });
  });
});

describe.each([
  ["sequential", true],
  ["parallel", false],
])("%p: starting project has no PR", (title: string, skipParallelCheckout: boolean) => {
  const originalSource: ProjectConfiguration = {
    name: "project2",
    group: "owner2",
    branch: "tbranch2",
    repository: "owner2/project2",
  };
  const originalTarget: ProjectConfiguration = {
    name: "project2",
    group: "owner2",
    branch: "tbranch2",
    repository: "owner2/project2",
  };

  const rootFolder = path.join(__dirname, "no-pr");

  beforeEach(() => {
    jest.spyOn(ConfigurationService.prototype, "getRootFolder").mockImplementation(() => rootFolder);
    jest.spyOn(ConfigurationService.prototype, "getSourceProject").mockImplementation(() => originalSource);
    jest.spyOn(ConfigurationService.prototype, "getTargetProject").mockImplementation(() => originalTarget);
    jest.spyOn(ConfigurationService.prototype, "getStarterNode").mockImplementation(() => nodeChain[1]);
    jest.spyOn(ConfigurationService.prototype, "skipParallelCheckout").mockImplementation(() => skipParallelCheckout);
  });

  afterEach(() => {
    rmSync(rootFolder, { recursive: true });
  });

  test("PR exists from node_forked:source_branch to node:mapped_branch", async () => {
    const checkedOutNodeInfo = await checkoutService.checkoutDefinitionTree(nodeChain);

    // checking clone and merge correctness
    expect(cloneSpy).toHaveBeenCalledTimes(2);
    expect(cloneSpy).toHaveBeenCalledWith(`${serverUrl}/owner1/project1`, path.join(rootFolder, "owner1_project1"), "tbranch1");
    expect(cloneSpy).toHaveBeenCalledWith(`${serverUrl}/owner2/project2`, path.join(rootFolder, "owner2_project2"), "tbranch2");

    expect(mergeSpy).toHaveBeenCalledTimes(1);
    expect(mergeSpy).toHaveBeenCalledWith(path.join(rootFolder, "owner1_project1"), `${serverUrl}/owner2/project1-forked`, "tbranch2");

    // checking copying node (i.e. cloneNode) correctness
    await checkClone(rootFolder);

    // checking checkout information correctness
    expect(checkedOutNodeInfo.length).toBe(3);
    expect(checkedOutNodeInfo[0]).toStrictEqual({
      project: "owner1/project1",
      checkoutInfo: {
        sourceBranch: "tbranch2",
        sourceGroup: "owner2",
        sourceName: "project1-forked",
        targetBranch: "tbranch1",
        targetGroup: "owner1",
        targetName: "project1",
        repoDir: `${rootFolder}/owner1_project1`,
        merge: true,
      },
    });
    expect(checkedOutNodeInfo[1]).toStrictEqual({
      project: "owner2/project2",
      checkoutInfo: {
        sourceBranch: "tbranch2",
        sourceGroup: "owner2",
        sourceName: "project2",
        targetBranch: "tbranch2",
        targetGroup: "owner2",
        targetName: "project2",
        repoDir: `${rootFolder}/owner2_project2`,
        merge: false,
      },
    });
    expect(checkedOutNodeInfo[2]).toStrictEqual({
      project: "owner3/project3",
      checkoutInfo: undefined,
    });
  });

  test("PR exists from node:source_branch to node:mapped_branch", async () => {
    const checkedOutNodeInfo = await checkoutService.checkoutDefinitionTree(nodeChain);

    // checking clone and merge correctness
    expect(cloneSpy).toHaveBeenCalledTimes(2);
    expect(cloneSpy).toHaveBeenCalledWith(`${serverUrl}/owner1/project1`, path.join(rootFolder, "owner1_project1"), "tbranch1");
    expect(cloneSpy).toHaveBeenCalledWith(`${serverUrl}/owner2/project2`, path.join(rootFolder, "owner2_project2"), "tbranch2");

    expect(mergeSpy).toHaveBeenCalledTimes(1);
    expect(mergeSpy).toHaveBeenCalledWith(path.join(rootFolder, "owner1_project1"), `${serverUrl}/owner1/project1`, "tbranch2");

    // checking copying node (i.e. cloneNode) correctness
    await checkClone(rootFolder);

    // checking checkout information correctness
    expect(checkedOutNodeInfo.length).toBe(3);
    expect(checkedOutNodeInfo[0]).toStrictEqual({
      project: "owner1/project1",
      checkoutInfo: {
        sourceBranch: "tbranch2",
        sourceGroup: "owner1",
        sourceName: "project1",
        targetBranch: "tbranch1",
        targetGroup: "owner1",
        targetName: "project1",
        repoDir: `${rootFolder}/owner1_project1`,
        merge: true,
      },
    });
    expect(checkedOutNodeInfo[1]).toStrictEqual({
      project: "owner2/project2",
      checkoutInfo: {
        sourceBranch: "tbranch2",
        sourceGroup: "owner2",
        sourceName: "project2",
        targetBranch: "tbranch2",
        targetGroup: "owner2",
        targetName: "project2",
        repoDir: `${rootFolder}/owner2_project2`,
        merge: false,
      },
    });
    expect(checkedOutNodeInfo[2]).toStrictEqual({
      project: "owner3/project3",
      checkoutInfo: undefined,
    });
  });

  test("No PR", async () => {
    const checkedOutNodeInfo = await checkoutService.checkoutDefinitionTree(nodeChain);

    // checking clone and merge correctness
    expect(cloneSpy).toHaveBeenCalledTimes(2);
    expect(cloneSpy).toHaveBeenCalledWith(`${serverUrl}/owner1/project1`, path.join(rootFolder, "owner1_project1"), "tbranch1");
    expect(cloneSpy).toHaveBeenCalledWith(`${serverUrl}/owner2/project2`, path.join(rootFolder, "owner2_project2"), "tbranch2");

    expect(mergeSpy).toHaveBeenCalledTimes(0);

    // checking copying node (i.e. cloneNode) correctness
    await checkClone(rootFolder);

    // checking checkout information correctness
    expect(checkedOutNodeInfo.length).toBe(3);
    expect(checkedOutNodeInfo[0]).toStrictEqual({
      project: "owner1/project1",
      checkoutInfo: {
        sourceBranch: "tbranch1",
        sourceGroup: "owner1",
        sourceName: "project1",
        targetBranch: "tbranch1",
        targetGroup: "owner1",
        targetName: "project1",
        repoDir: `${rootFolder}/owner1_project1`,
        merge: false,
      },
    });
    expect(checkedOutNodeInfo[1]).toStrictEqual({
      project: "owner2/project2",
      checkoutInfo: {
        sourceBranch: "tbranch2",
        sourceGroup: "owner2",
        sourceName: "project2",
        targetBranch: "tbranch2",
        targetGroup: "owner2",
        targetName: "project2",
        repoDir: `${rootFolder}/owner2_project2`,
        merge: false,
      },
    });
    expect(checkedOutNodeInfo[2]).toStrictEqual({
      project: "owner3/project3",
      checkoutInfo: undefined,
    });
  });
});
