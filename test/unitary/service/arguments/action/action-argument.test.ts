import { InvalidInput } from "@bc/domain/errors";
import { FlowType, InputValues, LoggerLevel } from "@bc/domain/inputs";
import { ActionArguments } from "@bc/service/arguments/action/action-arguments";
import { InputService } from "@bc/service/inputs/input-service";
import "reflect-metadata";
import Container from "typedi";
const parsedInput = Container.get(InputService);

const definitionFile = "/path/to/file";
const skipProject = ["project1", "project2", "project3"];
const skipAll = true;
const skipParallelCheckout = false;
const startProject = "project4";
const fakeFlagValue = "abc";
const additionaFlags = `--tempFlag;-z ${fakeFlagValue}`;
const customCommandTreatment = ["abc||xyz"];

const setGeneralInputs = (flowType: string) => {
  process.env = {
    "INPUT_DEFINITION-FILE": definitionFile,
    "INPUT_SKIP-PROJECT-CHECKOUT": skipProject.join(", "),
    "INPUT_SKIP-PROJECT-EXECUTION": skipProject.join(", "),
    "INPUT_SKIP-EXECUTION": skipAll.toString(),
    "INPUT_SKIP-CHECKOUT": skipAll.toString(),
    "INPUT_SKIP-PARALLEL-CHECKOUT": skipParallelCheckout.toString(),
    "INPUT_STARTING-PROJECT": startProject,
    "INPUT_ADDITIONAL-FLAGS": additionaFlags,
    "INPUT_FLOW-TYPE": flowType,
    "INPUT_CUSTOM-COMMAND-TREATMENT": customCommandTreatment.join(", "),
  };
};

describe("Different flow types", () => {
  test.each([
    ["cross_pr", FlowType.CROSS_PULL_REQUEST],
    ["full_downstream", FlowType.FULL_DOWNSTREAM],
    ["single_pr", FlowType.SINGLE_PULL_REQUEST],
    ["branch", FlowType.BRANCH],
    ["invalid", undefined],
  ])("%p", (flowType: string, expectedFlowType: FlowType | undefined) => {
    const parser = new ActionArguments();
    setGeneralInputs(flowType);
    try {
      parser.parse();
      const vals = parsedInput.inputs;
      expect(vals.definitionFile).toBe(definitionFile);
      expect(vals.skipProjectCheckout).toStrictEqual(skipProject);
      expect(vals.skipProjectExecution).toStrictEqual(skipProject);
      expect(vals.skipExecution).toBe(skipAll);
      expect(vals.skipCheckout).toBe(skipAll);
      expect(vals.skipParallelCheckout).toBe(skipParallelCheckout);
      expect(vals.startProject).toBe(startProject);
      expect(vals.tempFlag).toBe(true);
      expect(vals.z).toBe("abc");
      expect(vals.loggerLevel).toBe(LoggerLevel.INFO);
      expect(vals.flowType).toBe(expectedFlowType);
      expect(vals.customCommandTreatment).toStrictEqual(customCommandTreatment);
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidInput);
    }
  });
});

describe("Different log levels", () => {
  test.each([
    ["info", LoggerLevel.INFO],
    ["trace", LoggerLevel.TRACE],
    ["debug", LoggerLevel.DEBUG],
    ["invalid", undefined],
  ])("%p", (logLevel: string, expectedLogLevel: LoggerLevel | undefined) => {
    const parser = new ActionArguments();
    setGeneralInputs("pull-request");
    process.env = { ...process.env, "INPUT_LOGGER-LEVEL": logLevel };
    try {
      parser.parse();
      const vals = parsedInput.inputs;
      expect(vals.definitionFile).toBe(definitionFile);
      expect(vals.skipProjectCheckout).toStrictEqual(skipProject);
      expect(vals.skipProjectExecution).toStrictEqual(skipProject);
      expect(vals.skipExecution).toBe(skipAll);
      expect(vals.skipCheckout).toBe(skipAll);
      expect(vals.skipParallelCheckout).toBe(skipParallelCheckout);
      expect(vals.startProject).toBe(startProject);
      expect(vals.tempFlag).toBe(true);
      expect(vals.z).toBe("abc");
      expect(vals.flowType).toBe(FlowType.CROSS_PULL_REQUEST);
      expect(vals.loggerLevel).toBe(expectedLogLevel);
      expect(vals.customCommandTreatment).toStrictEqual(customCommandTreatment);
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidInput);
    }
  });
});

describe("undefined inputs", () => {
  test.each([
    ["empty string", "INPUT_STARTING-PROJECT", "startProject" as keyof InputValues],
    ["array of empty strings", "INPUT_SKIP-PROJECT-CHECKOUT", "skipProjectCheckout" as keyof InputValues]
  ])("undefined input should return undefined instead of %p", (_title: string, key: string, toCheckKey: keyof InputValues) => {
    setGeneralInputs(FlowType.CROSS_PULL_REQUEST);
    delete process.env[key];
    const parser = new ActionArguments();
    parser.parse();
    const vals = parsedInput.inputs;
    expect(vals[toCheckKey]).toBe(undefined);
  });
});
