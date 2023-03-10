import "reflect-metadata";
import { constants } from "@bc/domain/constants";
import { EntryPoint } from "@bc/domain/entry-point";
import Container from "typedi";
import { GithubAPIService } from "@bc/service/git/github-api";
import { Moctokit } from "@kie/mock-github";

let git: GithubAPIService;

beforeAll(async () => {
  // disable logs
  jest.spyOn(global.console, "log");
});

beforeEach(() => {
  // create a fresh instance of git before each test
  Container.set(constants.CONTAINER.ENTRY_POINT, EntryPoint.CLI);
  Container.set(constants.GITHUB.TOKEN, "fake_token");
  Container.set(constants.GITHUB.TOKEN_POOL, ["fake_token"]);
  git = new GithubAPIService();
});

test.each([
  ["branch exists", true, ["testgroup", "repoA", "main"], 200],
  [
    "branch does not exist",
    false,
    ["testgroup", "repoA", "non_existent_branch"],
    404,
  ],
  [
    "repo does not exist",
    false,
    ["testgroup", "non-existant-repo", "main"],
    404,
  ],
])(
  "doesBranchExist %p",
  async (
    _title: string,
    branchExists: boolean,
    args: string[],
    status: number
  ) => {
    const moctokit = new Moctokit();
    moctokit.rest.repos
      .getBranch({ owner: args[0], repo: args[1], branch: args[2] })
      .reply({ status: status as 200 | 404, data: {} });
    await expect(git.doesBranchExist(args[0], args[1], args[2])).resolves.toBe(
      branchExists
    );
  }
);

test.each([
  [
    "success: head",
    true,
    ["testgroup", "repoA"],
    ["sbranch", undefined],
    [{ title: "pr" }],
  ],
  [
    "success: base",
    true,
    ["testgroup", "repoA"],
    [undefined, "sbranch"],
    [{ title: "pr" }],
  ],
  [
    "success: head and base",
    true,
    ["testgroup", "repoA"],
    ["tbranch", "sbranch"],
    [{ title: "pr" }],
  ],
  ["success: no pr", false, ["testgroup", "repoA"], ["tbranch", "sbranch"], []],
])(
  "hasPullRequest %p",
  async (
    _title: string,
    hasPR: boolean,
    args: string[],
    optionalArgs: (string | undefined)[],
    data
  ) => {
    const moctokit = new Moctokit();
    let query = {};
    if (optionalArgs[0]) {
      query = { ...query, head: optionalArgs[0] };
    }
    if (optionalArgs[1]) {
      query = { ...query, base: optionalArgs[1] };
    }
    moctokit.rest.pulls
      .list({ owner: args[0], repo: args[1], state: "open", ...query })
      .reply({ status: 200, data });
    await expect(
      git.hasPullRequest(args[0], args[1], optionalArgs[0], optionalArgs[1])
    ).resolves.toBe(hasPR);
  }
);

test.each([
  ["failure: no head or base", ["testgroup", "repoA"], [undefined, undefined]],
  ["failure: api error", ["testgroup", "repoA"], ["tbranch", "sbranch"]],
])(
  "hasPullRequest %p",
  async (
    _title: string,
    args: string[],
    optionalArgs: (string | undefined)[]
  ) => {
    await expect(
      git.hasPullRequest(args[0], args[1], optionalArgs[0], optionalArgs[1])
    ).rejects.toThrowError();
  }
);

test.each([
  [
    "success: same source and target owner",
    true,
    ["target1", "target1", "repoA"],
  ],
  [
    "failure: same source and target owner",
    false,
    ["target2", "target2", "repoA"],
  ],
  [
    "success: different source and target owner",
    true,
    ["target3", "source", "repoA"],
  ],
  [
    "failure: different source and target owner",
    false,
    ["target4", "source", "repoA"],
  ],
])(
  "getForkName %p",
  async (_title: string, testForSuccess: boolean, args: string[]) => {
    const moctokit = new Moctokit();
    if (testForSuccess) {
      moctokit.rest.repos
        .get({ owner: args[1], repo: args[2] })
        .reply({ status: 200, data: {} });
      moctokit.rest.repos.listForks({ owner: args[0], repo: args[2] }).reply({
        status: 200,
        data: [{ name: args[2], owner: { login: args[1] } }],
      });

      await expect(git.getForkName(args[0], args[1], args[2])).resolves.toBe(
        args[2]
      );
    } else {
      moctokit.rest.repos
        .get({ owner: args[1], repo: args[2] })
        .reply({ status: 404, data: {} });
      moctokit.rest.repos
        .listForks({ owner: args[0], repo: args[2] })
        .reply({ status: 200, data: [] });

      await expect(
        git.getForkName(args[0], args[1], args[2])
      ).rejects.toThrowError();
    }
  }
);

test.each([
  ["success", 200],
  ["failure", 404],
])("getPullRequest %p", async (_title: string, status: number) => {
  const moctokit = new Moctokit();
  moctokit.rest.pulls.get({
    owner: "owner",
    repo: "repo",
    pull_number: 128
  }).reply({
    status: status as 200 | 404,
    data: {title: "some_pr"}
  });

  if (status == 200) {
    await expect(git.getPullRequest("owner", "repo", 128)).resolves.toStrictEqual(
      {
        title: "some_pr"
      }
    );
  } else {
    await expect(git.getPullRequest("owner", "repo", 128)).rejects.toThrowError();
  }
});
