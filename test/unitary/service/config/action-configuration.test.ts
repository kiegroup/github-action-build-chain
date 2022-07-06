import { MockGithub } from "../../../setup/mock-github";
import path from "path";
import { ActionConfiguration } from "@bc/service/config/action-configuration";
import Container from "typedi";
import { constants } from "@bc/domain/constants";
import { EntryPoint } from "@bc/domain/entry-point";
import fs from "fs";
import { InputService } from "@bc/service/inputs/input-service";

Container.set(constants.CONTAINER.ENTRY_POINT, EntryPoint.GITHUB_EVENT);
const mockGithub = new MockGithub(path.join(__dirname, "config.json"), "event");
let actionConfig = new ActionConfiguration();

// disable logs
jest.spyOn(global.console, "log");

beforeEach(async () => {
    await mockGithub.setup();
    actionConfig = new ActionConfiguration();
});

afterEach(() => {
    mockGithub.teardown();
});

test("success: load event data", async () => {
    const eventData = await actionConfig.loadGitEvent();
    const actualData = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8"));
    expect(eventData).toStrictEqual(actualData.action.eventPayload.pull_request);
});

test("failure: load event data", async () => {
    delete process.env["GITHUB_EVENT_PATH"];
    await expect(actionConfig.loadGitEvent()).rejects.toThrow(Error);
});

test("load git config without default github url", () => {
    const token = "fakenotenvtoken";
    Container.set(constants.GITHUB.TOKEN, token);
    const config = actionConfig.loadGitConfiguration();
    const expectedData = {
        action: process.env.GITHUB_ACTION,
        actor: process.env.GITHUB_ACTOR,
        author: process.env.GITHUB_AUTHOR,
        serverUrl: "https://git.ca",
        serverUrlWithToken: `https://${token}@git.ca`,
        jobId: process.env.GITHUB_JOB,
        ref: process.env.GITHUB_REF,
        workflow: process.env.GITHUB_WORKFLOW
    };
    expect(config).toStrictEqual(expectedData);
});

test("load git config with default github url", () => {
    delete process.env["GITHUB_SERVER_URL"];
    const token = "fakenotenvtoken";
    Container.set(constants.GITHUB.TOKEN, token);
    const config = actionConfig.loadGitConfiguration();
    const expectedData = {
        action: process.env.GITHUB_ACTION,
        actor: process.env.GITHUB_ACTOR,
        author: process.env.GITHUB_AUTHOR,
        serverUrl: "https://github.com",
        serverUrlWithToken: `https://${token}@github.com`,
        jobId: process.env.GITHUB_JOB,
        ref: process.env.GITHUB_REF,
        workflow: process.env.GITHUB_WORKFLOW
    };
    expect(config).toStrictEqual(expectedData);
});

test("load source and target project", async () => {
    Container.set(InputService, new InputService());
    await actionConfig.init();
    const { source, target } = actionConfig.loadProject();
    const actualData = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8")).action.eventPayload.pull_request;
    const expectedSource = {
        branch: actualData.head.ref,
        repository: actualData.head.repo.full_name,
        name: actualData.head.repo.name,
        group: actualData.head.repo.owner.login
    };

    const expectedTarget = {
        branch: actualData.base.ref,
        repository: actualData.base.repo.full_name,
        name: actualData.base.repo.name,
        group: actualData.base.repo.owner.login
    };

    expect(source).toStrictEqual(expectedSource);
    expect(target).toStrictEqual(expectedTarget);

});
