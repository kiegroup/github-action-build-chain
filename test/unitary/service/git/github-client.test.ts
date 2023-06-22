import "reflect-metadata";
import { constants } from "@bc/domain/constants";
import Container from "typedi";
import { EntryPoint } from "@bc/domain/entry-point";
import { Moctokit } from "@kie/mock-github";
import { GitTokenService } from "@bc/service/git/git-token-service";
import { DEFAULT_GITHUB_PLATFORM } from "@kie/build-chain-configuration-reader";
import { GitHubAPIClient } from "@bc/service/git/github-api-client";

jest.spyOn(global.console, "log");
Container.set(constants.CONTAINER.ENTRY_POINT, EntryPoint.CLI);

describe("pulls", () => {
  let octokit: GitHubAPIClient;

  beforeEach(() => {
    octokit = new GitHubAPIClient(
      DEFAULT_GITHUB_PLATFORM.apiUrl,
      DEFAULT_GITHUB_PLATFORM.id
    );
  });

  test.each([
    ["opened", "open"],
    ["closed", "closed"],
    ["merged", "closed"],
    [undefined, "all"],
  ])("list - %p", async (state, expectedState) => {
    const moctokit = new Moctokit();
    moctokit.rest.pulls
      .list({
        owner: "owner",
        repo: "repo",
        state: expectedState as "open" | "closed" | "all" | undefined,
      })
      .reply({
        status: 200,
        data: [],
      });
    await expect(
      octokit.pulls.list({
        owner: "owner",
        repo: "repo",
        state: state as "opened" | "closed" | "merged" | undefined,
      })
    ).resolves.toMatchObject({
      status: 200,
      data: [],
    });
  });

  test("get", async () => {
    const moctokit = new Moctokit();
    moctokit.rest.pulls
      .get({
        owner: "owner",
        repo: "repo",
        pull_number: 1,
      })
      .reply({
        status: 200,
        data: {
          head: {
            user: {},
          },
          base: {
            repo: {
              owner: {},
            },
          },
        },
      });
    await expect(
      octokit.pulls.get({
        owner: "owner",
        repo: "repo",
        pull_number: 1,
      })
    ).resolves.toMatchObject({
      status: 200,
      data: {},
    });
  });
});

describe("repos", () => {
  let octokit: GitHubAPIClient;

  beforeEach(() => {
    octokit = new GitHubAPIClient(
      DEFAULT_GITHUB_PLATFORM.apiUrl,
      DEFAULT_GITHUB_PLATFORM.id
    );
  });

  test.each([
    ["found", "source", "forked"],
    ["not found", "not source", undefined],
  ])(
    "getForkNameForTargetRepoGivenSourceOwner - %p",
    async (_title, data, expected) => {
      const moctokit = new Moctokit();
      moctokit.rest.repos
        .listForks({
          owner: "owner",
          repo: "repo",
        })
        .reply({
          status: 200,
          data: [
            {
              name: "forked",
              owner: {
                login: data,
              },
            },
          ],
        })
        .reply({
          status: 200,
          data: [],
        });
      await expect(
        octokit.repos.getForkNameForTargetRepoGivenSourceOwner({
          targetOwner: "owner",
          targetRepo: "repo",
          sourceOwner: "source",
        })
      ).resolves.toMatchObject({
        status: 200,
        data: expected,
      });
    }
  );

  test("listForkName", async () => {
    const moctokit = new Moctokit();
    moctokit.rest.repos
      .listForks({
        owner: "owner1",
        repo: "repo1",
      })
      .reply({
        status: 200,
        data: [
          {
            owner: {
              login: "owner1",
            },
            name: "repo1",
          },
        ],
      });
    await expect(
      octokit.repos.listForkName({
        owner: "owner1",
        repo: "repo1",
      })
    ).resolves.toStrictEqual({
      status: 200,
      data: [{ owner: "owner1", repo: "repo1" }],
    });
  });
});

describe("token pool auth", () => {
  test("Rotate through all tokens", async () => {
    const tokenService = Container.get(GitTokenService);
    tokenService.setToken(DEFAULT_GITHUB_PLATFORM.id, "token1");
    tokenService.setGithubTokenPool(DEFAULT_GITHUB_PLATFORM.id, [
      "token1",
      "token3",
      "token2",
    ]);
    const resetAfter = `${~~(new Date().getTime() / 1000) + 3600}`; // now + 1 hour
    const octokit = new GitHubAPIClient(
      DEFAULT_GITHUB_PLATFORM.apiUrl,
      DEFAULT_GITHUB_PLATFORM.id
    );
    const moctokit = new Moctokit();

    moctokit.rest.repos
      .get({
        owner: "kie",
        repo: "kie",
      })
      .matchReqHeaders({
        authorization: "token token1",
      })
      .setResponse([
        {
          status: 200,
          data: { full_name: "kie/kie" },
        },
        {
          status: 403,
          data: { message: "You have exceeded your rate limit" },
          headers: {
            "x-ratelimit-remaining": "0",
            "x-ratelimit-reset": resetAfter,
          },
        },
      ])
      .reply()
      .matchReqHeaders({
        authorization: "token token2",
      })
      .setResponse([
        {
          status: 200,
          data: { full_name: "kie/kie" },
          repeat: 2,
        },
        {
          status: 403,
          data: { full_name: "kie/kie" },
          headers: {
            "x-ratelimit-remaining": "0",
            "x-ratelimit-reset": resetAfter,
          },
        },
      ])
      .reply()
      .matchReqHeaders({
        authorization: "token token3",
      })
      .setResponse([
        {
          status: 200,
          data: { full_name: "kie/kie" },
          repeat: 2,
        },
        {
          status: 403,
          data: { message: "You have exceeded your rate limit" },
          headers: {
            "x-ratelimit-remaining": "0",
            "x-ratelimit-reset": resetAfter,
          },
        },
      ])
      .reply();

    for (let i = 0; i < 5; i += 1) {
      const { data } = await octokit.repos.get({
        owner: "kie",
        repo: "kie",
      });
      expect(data).toStrictEqual({ full_name: "kie/kie" });
    }
    await expect(
      octokit.repos.get({
        owner: "kie",
        repo: "kie",
      })
    ).rejects.toThrowError();
  });

  test("Rotate through all tokens and reuse reset ones", async () => {
    const tokenService = Container.get(GitTokenService);
    tokenService.setToken(DEFAULT_GITHUB_PLATFORM.id, "token1");
    tokenService.setGithubTokenPool(DEFAULT_GITHUB_PLATFORM.id, [
      "token1",
      "token3",
      "token2",
    ]);
    const octokit = new GitHubAPIClient(
      DEFAULT_GITHUB_PLATFORM.apiUrl,
      DEFAULT_GITHUB_PLATFORM.id
    );
    const moctokit = new Moctokit();
    moctokit.rest.repos
      .get({
        owner: "kie",
        repo: "kie",
      })
      .matchReqHeaders({
        authorization: "token token1",
      })
      .setResponse([
        {
          status: 200,
          data: { full_name: "kie/kie with token1" },
        },
        {
          status: 403,
          data: { message: "You have exceeded your rate limit" },
          headers: {
            "x-ratelimit-remaining": "0",
            "x-ratelimit-reset": `${~~(new Date().getTime() / 1000)}`,
          },
        },
        {
          status: 200,
          data: { full_name: "kie/kie with token1 after resetting" },
        },
        {
          status: 403,
          data: { message: "You have exceeded your rate limit" },
          headers: {
            "x-ratelimit-remaining": "0",
            "x-ratelimit-reset": `${~~(new Date().getTime() / 1000) + 3600}`, // now + 1 hr
          },
        },
      ])
      .reply()
      .matchReqHeaders({
        authorization: "token token2",
      })
      .setResponse([
        {
          status: 200,
          data: { full_name: "kie/kie with token2" },
        },
        {
          status: 403,
          data: { message: "You have exceeded your rate limit" },
          headers: {
            "x-ratelimit-remaining": "0",
            "x-ratelimit-reset": `${~~(new Date().getTime() / 1000) + 3600}`, // now + 1 hr
          },
        },
      ])
      .reply();

    const res1 = await octokit.repos.get({
      owner: "kie",
      repo: "kie",
    });
    expect(res1.data).toStrictEqual({ full_name: "kie/kie with token1" });

    const res2 = await octokit.repos.get({
      owner: "kie",
      repo: "kie",
    });
    expect(res2.data).toStrictEqual({ full_name: "kie/kie with token2" });

    const res3 = await octokit.repos.get({
      owner: "kie",
      repo: "kie",
    });
    expect(res3.data).toStrictEqual({
      full_name: "kie/kie with token1 after resetting",
    });

    await expect(
      octokit.repos.get({
        owner: "kie",
        repo: "kie",
      })
    ).rejects.toThrowError();
  });
});
