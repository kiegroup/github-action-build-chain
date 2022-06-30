import { InvalidInput } from "@bc/domain/errors";
import { FlowType, LoggerLevel } from "@bc/domain/inputs";
import { ActionArguments } from "@bc/service/arguments/action/action-arguments";
import { ParsedInputs } from "@bc/service/inputs/parsed-inputs";
import "reflect-metadata";
import Container from "typedi";
const parsedInput = Container.get(ParsedInputs);

const definitionFile = "/path/to/file";
const skipCheckout = ["project1", "project2", "project3"];
const skipExecution = true;
const skipParallelCheckout = false;
const startProject = "project4";
const fakeFlagValue = "abc";
const additionaFlags = `--tempFlag;-z ${fakeFlagValue}`;

const setGeneralInputs = (flowType: string) => {
    process.env = {
        "INPUT_DEFINITION-FILE": definitionFile,
        "INPUT_SKIP-CHECKOUT": skipCheckout.join(", "),
        "INPUT_SKIP-EXECUTION": skipExecution.toString(),
        "INPUT_SKIP-PARALLEL-CHECKOUT": skipParallelCheckout.toString(),
        "INPUT_STARTING-PROJECT": startProject,
        "INPUT_ADDITIONAL-FLAGS": additionaFlags,
        "INPUT_FLOW-TYPE": flowType
    };
};

test.each([
    ["pull-request"],
    ["full-downstream"],
    ["single"],
    ["branch"],
    ["invalid"]
])("%p", (flowType: string) => {
    const parser = new ActionArguments();
    setGeneralInputs(flowType);
    try {
        parser.parseInput();
        const vals = parsedInput.inputs;
        expect(vals.definitionFile).toBe(definitionFile);
        expect(vals.skipCheckout).toStrictEqual(skipCheckout);
        expect(vals.skipExecution).toBe(skipExecution);
        expect(vals.skipParallelCheckout).toBe(skipParallelCheckout);
        expect(vals.startProject).toBe(startProject);
        expect(vals.tempFlag).toBe(true);
        expect(vals.z).toBe("abc");
        expect(vals.loggerLevel).toBe(LoggerLevel.INFO);

        switch (flowType) {
            case "pull-request":
                expect(vals.flowType).toBe(FlowType.CROSS_PULL_REQUEST);
                break;
            case "full-downstream":
                expect(vals.flowType).toBe(FlowType.FULL_DOWNSTREAM);
                break;
            case "single":
                expect(vals.flowType).toBe(FlowType.SINGLE_PULL_REQUEST);
                break;
            case "branch":
                expect(vals.flowType).toBe(FlowType.BRANCH);
        }
    } catch (err) {
        expect(err).toBeInstanceOf(InvalidInput);
    }
});

test.each([
    ["info"],
    ["trace"],
    ["debug"],
    ["invalid"]
])("%p", (logLevel: string) => {
    const parser = new ActionArguments();
    setGeneralInputs("pull-request");
    process.env = {...process.env,  "INPUT_LOGGER-LEVEL": logLevel};
    try {
        parser.parseInput();
        const vals = parsedInput.inputs;
        expect(vals.definitionFile).toBe(definitionFile);
        expect(vals.skipCheckout).toStrictEqual(skipCheckout);
        expect(vals.skipExecution).toBe(skipExecution);
        expect(vals.skipParallelCheckout).toBe(skipParallelCheckout);
        expect(vals.startProject).toBe(startProject);
        expect(vals.tempFlag).toBe(true);
        expect(vals.z).toBe("abc");
        expect(vals.flowType).toBe(FlowType.CROSS_PULL_REQUEST);

        switch (logLevel) {
            case "info":
                expect(vals.loggerLevel).toBe(LoggerLevel.INFO);
                break;
            case "trace":
                expect(vals.loggerLevel).toBe(LoggerLevel.TRACE);
                break;
            case "debug":
                expect(vals.loggerLevel).toBe(LoggerLevel.DEBUG);
                break;
        }
    } catch (err) {
        expect(err).toBeInstanceOf(InvalidInput);
    }
});