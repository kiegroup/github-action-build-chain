import { constants } from "@bc/domain/constants";
import { OctokitFactory } from "@bc/service/git/octokit";
import { Octokit } from "@octokit/rest";
import Container from "typedi";

test("Initialize a new instance", () => {
  Container.set(constants.GITHUB.TOKEN, "fake_token");
  const get = jest.spyOn(Container, "get");

  expect(OctokitFactory.getOctokitInstance()).toBeInstanceOf(Octokit);
  expect(get).toHaveBeenCalledTimes(1);

  get.mockRestore();
  OctokitFactory.clearOctokitInstance();
});

test("Already initialized instance", () => {
  Container.set(constants.GITHUB.TOKEN, "fake_token");
  let get = jest.spyOn(Container, "get");

  expect(OctokitFactory.getOctokitInstance()).toBeInstanceOf(Octokit);
  expect(get).toHaveBeenCalledTimes(1);
  get.mockRestore();

  get = jest.spyOn(Container, "get");
  Container.set(constants.GITHUB.TOKEN, "fake_token");

  expect(OctokitFactory.getOctokitInstance()).toBeInstanceOf(Octokit);
  expect(get).toHaveBeenCalledTimes(0);

  get.mockRestore();
  OctokitFactory.clearOctokitInstance();
});
