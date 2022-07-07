import "reflect-metadata";
import { constants } from "@bc/domain/constants";
import { EntryPoint } from "@bc/domain/entry-point";
import { defaultInputValues, InputValues } from "@bc/domain/inputs";
import { ConfigurationService } from "@bc/service/config/configuration-service";
import { MockGithub } from "../../../setup/mock-github";
import Container from "typedi";
import path from "path";
import { BaseConfiguration } from "@bc/service/config/base-configuration";
import fs from "fs";

// disable logs
jest.spyOn(global.console, "log");

const mockGithub = new MockGithub(path.join(__dirname, "config.json"), "event");

beforeEach(async () => {
    await mockGithub.setup();
});

afterEach(() =>{
    mockGithub.teardown();
});

describe("cli", () => {
    let config: ConfigurationService;
    let currentInput: InputValues;
    
    beforeAll(() => {
        Container.set(constants.CONTAINER.ENTRY_POINT, EntryPoint.CLI);
    });
    
    beforeEach(async () => {
        currentInput = {...defaultInputValues, startProject: "owner/project", url: "https://github.com/owner/project/pull/270"};
        jest.spyOn(BaseConfiguration.prototype, "parsedInputs", "get").mockImplementation(() => currentInput);
        config = new ConfigurationService();
        await config.init();
    });

    test("getStarterProjectName: success", () => {
        expect(config.getStarterProjectName()).toBe("owner/project");
    });

    test("getStarterProjectName: failure", () => {
        delete process.env["GITHUB_REPOSITORY"];
        delete currentInput["startProject"];
        expect(() => config.getStarterProjectName()).toThrowError();
    });
});

describe("action", () => {
    let config: ConfigurationService;
    let currentInput: InputValues;
    
    beforeAll(() => {
        Container.set(constants.CONTAINER.ENTRY_POINT, EntryPoint.GITHUB_EVENT);
    });
    
    beforeEach(async () => {
        currentInput = defaultInputValues;
        jest.spyOn(BaseConfiguration.prototype, "parsedInputs", "get").mockImplementation(() => currentInput);
        config = new ConfigurationService();
        await config.init();
    });

    test("getStarterProjectName: success", () => {
        const actualData = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8")).env.repository;
        expect(config.getStarterProjectName()).toBe(actualData);
    });

    test("getStarterProjectName: failure", () => {
        delete process.env["GITHUB_REPOSITORY"];
        expect(() => config.getStarterProjectName()).toThrowError();
    });
});