import "reflect-metadata";
import axios from "axios";
import Container from "typedi";
import { constants } from "@bc/domain/constants";
import { EntryPoint } from "@bc/domain/entry-point";
import { GerritAPIClient } from "@bc/service/git/gerrit-api-client";
jest.mock("axios");
const axiosSpy = axios.create as jest.Mock;
const baseUrl = "baseUrl";
const id = "id";
const owner = "owner";
const repo = "repo";
let gerritAPIClient: GerritAPIClient;

Container.set(constants.CONTAINER.ENTRY_POINT, EntryPoint.CLI);

describe("repos", () => {
  test("getBranch", async () => {
    const getSpy = setupSpy("data", 200);
    gerritAPIClient = new GerritAPIClient(baseUrl, id);

    const branch = "branch";
    await expect(
      gerritAPIClient.repos.getBranch({
        owner,
        repo,
        branch,
      })
    ).resolves.toStrictEqual({ data: "data", status: 200 });
    expect(getSpy).toHaveBeenCalledWith(
      `/projects/${encodeURIComponent(`${owner}/${repo}`)}/branches/${branch}`
    );
  });

  test("getRepo", async () => {
    const getSpy = setupSpy("data", 200);
    gerritAPIClient = new GerritAPIClient(baseUrl, id);

    await expect(
      gerritAPIClient.repos.get({
        owner,
        repo,
      })
    ).resolves.toStrictEqual({ data: "data", status: 200 });
    expect(getSpy).toHaveBeenCalledWith(
      `/projects/${encodeURIComponent(`${owner}/${repo}`)}`
    );
  });

  test("listForkName", async () => {
    const getSpy = setupSpy("data", 200);
    gerritAPIClient = new GerritAPIClient(baseUrl, id);

    await expect(
      gerritAPIClient.repos.listForkName({
        owner,
        repo,
        page: 1,
      })
    ).resolves.toStrictEqual({
      data: [],
      status: 200,
    });
    expect(getSpy).toBeCalledTimes(0);
  });

  test("getForkNameForTargetRepoGivenSourceOwner", async () => {
    const getSpy = setupSpy("data", 200);
    gerritAPIClient = new GerritAPIClient(baseUrl, id);

    await expect(
      gerritAPIClient.repos.getForkNameForTargetRepoGivenSourceOwner({
        targetOwner: owner,
        targetRepo: repo,
        sourceOwner: "owner3",
      })
    ).resolves.toStrictEqual({ status: 200, data: undefined });
    expect(getSpy).toBeCalledTimes(0);
  });
});

describe("pulls", () => {
  test("get", async () => {
    const getSpy = setupSpy(
      {
        branch: "branch",
        current_revision: "abc",
        abc: {
          fetch: {
            "anonymous http": {
              url: "http://url",
            },
          },
          web_links: [
            {},
            {
              url: "/path",
            },
          ],
        },
      },
      200
    );
    gerritAPIClient = new GerritAPIClient(baseUrl, id);

    const pullNumber = 1;
    await expect(
      gerritAPIClient.pulls.get({
        owner,
        repo,
        pull_number: pullNumber,
      })
    ).resolves.toStrictEqual({
      data: {
        html_url: "http://url/path",
        head: {
          user: {
            login: owner,
          },
          ref: "abc",
        },
        base: {
          ref: "branch",
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
      `/changes/${encodeURIComponent(`${owner}/${repo}`)}~${pullNumber}`
    );
  });

  test.each([
    ["opened", "base", "status:open+branch:base"],
    ["closed", undefined, "status:merged"],
    ["merged", undefined, "status:merged"],
  ])("list: %p", async (state, branch, expectedQuery) => {
    const getSpy = setupSpy(["data"], 200);
    gerritAPIClient = new GerritAPIClient(baseUrl, id);

    await expect(
      gerritAPIClient.pulls.list({
        owner,
        repo,
        base: branch,
        state: state as unknown as "opened" | "closed" | "merged",
      })
    ).resolves.toStrictEqual({ data: ["data"], status: 200 });
    expect(getSpy).toHaveBeenCalledWith("/changes", {
      params: {
        q: `project:${encodeURIComponent(`${owner}/${repo}`)}+${expectedQuery}`,
      },
    });
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
