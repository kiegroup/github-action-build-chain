import { constants } from "@bc/domain/constants";
import { EntryPoint } from "@bc/domain/entry-point";
import path from "path";
import Container from "typedi";
import { MockGithub } from "../../../setup/mock-github";
import { GithubAPIService } from "@bc/service/git/github-api";

let git: GithubAPIService;
const mockGithub = new MockGithub(path.join(__dirname, "config.json"), "setup-api");

beforeAll(async () => {
  //setup
  await mockGithub.setup();

  // disable logs
  jest.spyOn(global.console, "log");
});

afterAll(() => {
  mockGithub.teardown();
});

beforeEach(() => {
  // create a fresh instance of git before each test
  Container.set(constants.CONTAINER.ENTRY_POINT, EntryPoint.CLI);
  Container.set(constants.GITHUB.TOKEN, "fake_token");
  git = new GithubAPIService();
});

test.each([
  ["branch exists", true, ["testgroup", "repoA", "main"]],
  ["branch does not exist", false, ["testgroup", "repoA", "non_existent_branch"]],
  ["repo does not exist", false, ["testgroup", "non-existant-repo", "main"]],
])("doesBranchExist %p", async (title: string, branchExists: boolean, args: string[]) => {
  await expect(git.doesBranchExist(args[0], args[1], args[2])).resolves.toBe(branchExists);
});

test.each([
  ["success: origin", true, ["testgroup", "repoA", "sbranch"]],
  ["success: fork", true, ["testgroup", "repoA", "sbranch", "testgroup-forked", "repoA-forked"]],
  ["failure: origin", false, ["testgroup", "repoA", "tbranch"]],
  ["failure: fork", false, ["testgroup", "repoA", "tbranch", "testgroup-forked", "repoA-forked"]],
])("hasPullRequest %p", async (title: string, hasPR: boolean, args: string[]) => {
  if (args.length < 4) {
    await expect(git.hasPullRequest(args[0], args[1], args[2])).resolves.toBe(hasPR);
  } else {
    await expect(git.hasPullRequest(args[0], args[1], args[2], { sourceOwner: args[3], sourceRepo: args[4] })).resolves.toBe(hasPR);
  }
});

test.each([
  ["success: same source and target owner", true, ["target1", "target1", "repoA"]],
  ["failure: same source and target owner", false, ["target2", "target2", "repoA"]],
  ["success: different source and target owner", true, ["target3", "source", "repoA"]],
  ["failure: different source and target owner", false, ["target4", "source", "repoA"]],
])("getSourceProjectName %p", async (title: string, testForSuccess: boolean, args: string[]) => {
  if (testForSuccess) {
    await expect(git.getSourceProjectName(args[0], args[1], args[2])).resolves.toBe(args[2]);
  } else {
    await expect(git.getSourceProjectName(args[0], args[1], args[2])).rejects.toThrowError();
  }
});
