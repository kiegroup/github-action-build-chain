import { constants } from "@bc/domain/constants";
import { EntryPoint } from "@bc/domain/entry-point";
import { OctokitFactory } from "@bc/service/git/octokit";
import { Octokit } from "@octokit/rest";
import Container from "typedi";

test("Github", () => {
    Container.set(constants.CONTAINER.ENTRY_POINT, EntryPoint.GITHUB_EVENT);
    Container.set(constants.GITHUB.TOKEN, "fake_token");
    const get = jest.spyOn(Container, "get");

    expect(OctokitFactory.getOctokitInstance()).toBeInstanceOf(Octokit);
    expect(get).toHaveBeenCalledTimes(2);

    get.mockRestore();
    OctokitFactory.clearOctokitInstance();
});

test("CLI", () => {
    Container.set(constants.CONTAINER.ENTRY_POINT, EntryPoint.CLI);
    const get = jest.spyOn(Container, "get");

    expect(OctokitFactory.getOctokitInstance()).toBeInstanceOf(Octokit);
    expect(get).toHaveBeenCalledTimes(1);

    get.mockRestore();
    OctokitFactory.clearOctokitInstance();
});

test("Invalid entry point", () => {
    Container.set(constants.CONTAINER.ENTRY_POINT, "invalid");
    const get = jest.spyOn(Container, "get");

    expect(() => OctokitFactory.getOctokitInstance()).toThrowError();
    expect(get).toHaveBeenCalledTimes(1);

    get.mockRestore();
    OctokitFactory.clearOctokitInstance();
});

test("Already initialized instance", () => {
    Container.set(constants.CONTAINER.ENTRY_POINT, EntryPoint.CLI);
    let get = jest.spyOn(Container, "get");

    expect(OctokitFactory.getOctokitInstance()).toBeInstanceOf(Octokit);
    expect(get).toHaveBeenCalledTimes(1);
    get.mockRestore();

    get = jest.spyOn(Container, "get");
    Container.set(constants.CONTAINER.ENTRY_POINT, EntryPoint.GITHUB_EVENT);
    Container.set(constants.GITHUB.TOKEN, "fake_token");

    expect(OctokitFactory.getOctokitInstance()).toBeInstanceOf(Octokit);
    expect(get).toHaveBeenCalledTimes(0);

    get.mockRestore();
    OctokitFactory.clearOctokitInstance();
});