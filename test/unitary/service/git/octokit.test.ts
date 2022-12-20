import "reflect-metadata";
import { constants } from "@bc/domain/constants";
import { OctokitService } from "@bc/service/git/octokit";
import { Octokit } from "@octokit/rest";
import Container from "typedi";

test("Initialize a new instance without proxy", () => {
  Container.set(constants.GITHUB.TOKEN, "fake_token");

  expect(Container.get(OctokitService).octokit).toBeInstanceOf(Octokit);
});

test("Initialize a new instance with proxy", () => {
  Container.set(constants.GITHUB.TOKEN, "fake_token");
  process.env["http_proxy"] = "http://localhost:8080";

  expect(Container.get(OctokitService).octokit).toBeInstanceOf(Octokit);
  delete process.env["http_proxy"];
});
