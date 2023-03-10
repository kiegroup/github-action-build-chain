import "reflect-metadata";
import { constants } from "@bc/domain/constants";
import { OctokitService } from "@bc/service/git/octokit";
import { Octokit } from "@octokit/rest";
import Container from "typedi";
import { EntryPoint } from "@bc/domain/entry-point";
import { Moctokit } from "@kie/mock-github";

beforeEach(() => {
  Container.reset();
  // disable logs
  jest.spyOn(global.console, "log");
});

test("Initialize a new instance without proxy", () => {
    Container.set(constants.CONTAINER.ENTRY_POINT, EntryPoint.CLI);
  Container.set(constants.GITHUB.TOKEN, "token1");
  Container.set(constants.GITHUB.TOKEN_POOL, ["token1"]);

  expect(Container.get(OctokitService).octokit).toBeInstanceOf(Octokit);
});

test("Initialize a new instance with proxy", () => {
  Container.set(constants.CONTAINER.ENTRY_POINT, EntryPoint.CLI);
  Container.set(constants.GITHUB.TOKEN, "token1");
  Container.set(constants.GITHUB.TOKEN_POOL, ["token1"]);
  process.env["http_proxy"] = "http://localhost:8080";

  expect(Container.get(OctokitService).octokit).toBeInstanceOf(Octokit);
  delete process.env["http_proxy"];
});

test("Rotate through all tokens", async () => {
  Container.set(constants.CONTAINER.ENTRY_POINT, EntryPoint.CLI);
  Container.set(constants.GITHUB.TOKEN, "token1");
  Container.set(constants.GITHUB.TOKEN_POOL, ["token1", "token3", "token2"]);
  const resetAfter = `${~~(new Date().getTime() / 1000) + 3600}`; // now + 1 hour
  const octokit = Container.get(OctokitService).octokit;
  const moctokit = new Moctokit();
  
  moctokit.rest.repos.get({
    owner: "kie",
    repo: "kie"
  })
    .matchReqHeaders({
      authorization: "token token1"
    })
    .setResponse([
      {
        status: 200,
        data: {full_name: "kie/kie"}
      },
      {
        status: 403,
        data: { message: "You have exceeded your rate limit" },
        headers: {
          "x-ratelimit-remaining": "0",
          "x-ratelimit-reset": resetAfter
        },
      }
    ])
    .reply()
    .matchReqHeaders({
      authorization: "token token2"
    })
    .setResponse([
      {
        status: 200,
        data: {full_name: "kie/kie"},
        repeat: 2
      },
      {
        status: 403,
        data: {full_name: "kie/kie"},
        headers: {
          "x-ratelimit-remaining": "0",
          "x-ratelimit-reset": resetAfter
        },
      }
    ])
    .reply()
    .matchReqHeaders({
      authorization: "token token3"
    })
    .setResponse([
      {
        status: 200,
        data: {full_name: "kie/kie"},
        repeat: 2
      },
      {
        status: 403,
        data: { message: "You have exceeded your rate limit" },
        headers: {
          "x-ratelimit-remaining": "0",
          "x-ratelimit-reset": resetAfter
        },
      }
    ])
    .reply();

  for (let i = 0; i < 5; i += 1) {
    const { data } = await octokit.repos.get({
      owner: "kie",
      repo: "kie",
    });
    expect(data).toStrictEqual({full_name: "kie/kie"});
  }
  await expect(octokit.repos.get({
    owner: "kie",
    repo: "kie",
  })).rejects.toThrowError();  
});

test("Rotate through all tokens and reuse reset ones", async () => {
  Container.set(constants.CONTAINER.ENTRY_POINT, EntryPoint.CLI);
  Container.set(constants.GITHUB.TOKEN, "token1");
  Container.set(constants.GITHUB.TOKEN_POOL, ["token1", "token2"]);
  const octokit = Container.get(OctokitService).octokit;
  const moctokit = new Moctokit();
  moctokit.rest.repos.get({
    owner: "kie",
    repo: "kie"
  })
    .matchReqHeaders({
      authorization: "token token1"
    })
    .setResponse([
      {
        status: 200,
        data: {full_name: "kie/kie with token1"}
      },
      {
        status: 403,
        data: { message: "You have exceeded your rate limit" },
        headers: {
          "x-ratelimit-remaining": "0",
          "x-ratelimit-reset": `${~~(new Date().getTime() / 1000)}`
        },
      },
      {
        status: 200,
        data: {full_name: "kie/kie with token1 after resetting"}
      },
      {
        status: 403,
        data: { message: "You have exceeded your rate limit" },
        headers: {
          "x-ratelimit-remaining": "0",
          "x-ratelimit-reset": `${~~(new Date().getTime() / 1000) + 3600}` // now + 1 hr
        },
      }
    ])
    .reply()
    .matchReqHeaders({
      authorization: "token token2"
    })
    .setResponse([
      {
        status: 200,
        data: {full_name: "kie/kie with token2"},
      },
      {
        status: 403,
        data: { message: "You have exceeded your rate limit" },
        headers: {
          "x-ratelimit-remaining": "0",
          "x-ratelimit-reset": `${~~(new Date().getTime() / 1000) + 3600}` // now + 1 hr
        },
      }
    ])
    .reply();

  const res1 = await octokit.repos.get({
    owner: "kie",
    repo: "kie"
  });
  expect(res1.data).toStrictEqual({full_name: "kie/kie with token1"});

  const res2 = await octokit.repos.get({
    owner: "kie",
    repo: "kie"
  });
  expect(res2.data).toStrictEqual({full_name: "kie/kie with token2"});

  const res3 = await octokit.repos.get({
    owner: "kie",
    repo: "kie"
  });
  expect(res3.data).toStrictEqual({full_name: "kie/kie with token1 after resetting"});
 
  await expect(octokit.repos.get({
    owner: "kie",
    repo: "kie"
  })).rejects.toThrowError();
  
});
