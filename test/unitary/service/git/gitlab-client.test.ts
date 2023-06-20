import "reflect-metadata";
import { GitlabAPIClient } from "@bc/service/git/gitlab-api-client";
import axios from "axios";
import Container from "typedi";
import { constants } from "@bc/domain/constants";
import { EntryPoint } from "@bc/domain/entry-point";
jest.mock("axios");
const axiosSpy = axios.create as jest.Mock;
const baseUrl = "baseUrl";
const id = "id";
const owner = "owner";
const repo = "repo";
let gitlabAPIClient: GitlabAPIClient;

Container.set(constants.CONTAINER.ENTRY_POINT, EntryPoint.CLI);

describe("repos", () => {
  test("getBranch", async () => {
    const getSpy = setupSpy("data", 200);
    gitlabAPIClient = new GitlabAPIClient(baseUrl, id);

    const branch = "branch";
    await expect(
      gitlabAPIClient.repos.getBranch({
        owner,
        repo,
        branch,
      })
    ).resolves.toStrictEqual({ data: "data", status: 200 });
    expect(getSpy).toHaveBeenCalledWith(
      `/projects/${encodeURIComponent(
        `${owner}/${repo}`
      )}/repository/branches/${branch}`
    );
  });

  test("getRepo", async () => {
    const getSpy = setupSpy("data", 200);
    gitlabAPIClient = new GitlabAPIClient(baseUrl, id);

    await expect(
      gitlabAPIClient.repos.get({
        owner,
        repo,
      })
    ).resolves.toStrictEqual({ data: "data", status: 200 });
    expect(getSpy).toHaveBeenCalledWith(
      `/projects/${encodeURIComponent(`${owner}/${repo}`)}`
    );
  });

  test("listForkName", async () => {
    const getSpy = setupSpy(
      [
        {
          path: "repo1",
          namespace: {
            path: "owner1",
          },
        },
        {
          path: "repo2",
          namespace: {
            path: "owner2",
          },
        },
      ],
      200
    );
    gitlabAPIClient = new GitlabAPIClient(baseUrl, id);

    await expect(
      gitlabAPIClient.repos.listForkName({
        owner,
        repo,
        page: 1,
      })
    ).resolves.toStrictEqual({
      data: [
        { owner: "owner1", repo: "repo1" },
        { owner: "owner2", repo: "repo2" },
      ],
      status: 200,
    });
    expect(getSpy).toHaveBeenCalledWith(
      `/projects/${encodeURIComponent(`${owner}/${repo}`)}/forks`,
      {
        params: {
          per_page: 100,
          page: 1,
        },
      }
    );
  });

  test.each([
    ["found", [{ path: "repo3", namespace: { path: "owner3" } }], "repo3"],
    ["not found", [], undefined],
  ])(
    "getForkNameForTargetRepoGivenSourceOwner - %p",
    async (_title, data, expected) => {
      const getSpy = jest.fn((_url, options) => {
        return options.params.page === 1
          ? {
              data: [
                {
                  path: "repo1",
                  namespace: {
                    path: "owner1",
                  },
                },
                {
                  path: "repo2",
                  namespace: {
                    path: "owner2",
                  },
                },
              ],
              status: 200,
            }
          : { data, status: 200 };
      });

      axiosSpy.mockReturnValueOnce({ get: getSpy });

      gitlabAPIClient = new GitlabAPIClient(baseUrl, id);

      await expect(
        gitlabAPIClient.repos.getForkNameForTargetRepoGivenSourceOwner({
          targetOwner: owner,
          targetRepo: repo,
          sourceOwner: "owner3",
        })
      ).resolves.toStrictEqual({ data: expected, status: 200 });
      expect(getSpy).toHaveBeenCalledWith(
        `/projects/${encodeURIComponent(`${owner}/${repo}`)}/forks`,
        {
          params: {
            per_page: 100,
            page: 1,
          },
        }
      );
      expect(getSpy).toHaveBeenCalledWith(
        `/projects/${encodeURIComponent(`${owner}/${repo}`)}/forks`,
        {
          params: {
            per_page: 100,
            page: 2,
          },
        }
      );
    }
  );
});

describe("pulls", () => {
  test("get", async () => {
    const getSpy = setupSpy(
      {
        web_url: "web_url",
        target_branch: "target_branch",
        head_branch: "head_branch",
        author: {
          username: "username",
        },
      },
      200
    );
    gitlabAPIClient = new GitlabAPIClient(baseUrl, id);

    const pullNumber = 1;
    await expect(
      gitlabAPIClient.pulls.get({
        owner,
        repo,
        pull_number: pullNumber,
      })
    ).resolves.toStrictEqual({
      data: {
        html_url: "web_url",
        head: {
          user: {
            login: "username",
          },
          ref: "head_branch",
        },
        base: {
          ref: "target_branch",
          repo: {
            full_name: `${owner}/${repo}`,
            name: repo,
            owner: {
              login: owner,
            },
          },
        },
      },
      status: 200,
    });
    expect(getSpy).toHaveBeenCalledWith(
      `/projects/${encodeURIComponent(
        `${owner}/${repo}`
      )}/merge_requests/${pullNumber}`
    );
  });

  test("list", async () => {
    const getSpy = setupSpy(["data"], 200);
    gitlabAPIClient = new GitlabAPIClient(baseUrl, id);

    await expect(
      gitlabAPIClient.pulls.list({
        owner,
        repo,
        state: "opened",
      })
    ).resolves.toStrictEqual({ data: ["data"], status: 200 });
    expect(getSpy).toHaveBeenCalledWith(
      `/projects/${encodeURIComponent(`${owner}/${repo}`)}/merge_requests`,
      {
        params: {
          state: "opened",
          base: undefined,
          head: undefined,
        },
      }
    );
  });
});

function setupSpy(data: unknown, status: number) {
  const getSpy = jest.fn(_url => ({
    data,
    status,
  }));
  axiosSpy.mockReturnValueOnce({ get: getSpy });
  return getSpy;
}
