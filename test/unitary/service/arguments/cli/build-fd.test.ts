import "reflect-metadata";
import { CLIActionType } from "@bc/domain/cli";
import { MainCommandFactory } from "@bc/service/arguments/cli/main-command-factory";
import { InputService } from "@bc/service/inputs/input-service";
import { formatDate } from "@bc/utils/date";
import { Command, CommanderError } from "commander";
import Container from "typedi";
import { FlowType, LoggerLevel } from "@bc/domain/inputs";

let program: Command;

// Define required arguments to be reused for each test
const url = "test.com";
const definitionFile = "/path/to/file";

// Command to be executed
const command = `${CLIActionType.BUILD} ${FlowType.FULL_DOWNSTREAM}`;
const parsedInputs = Container.get(InputService);

beforeEach(() => {
  // Construct the a fresh instance of the cli each time
  program = MainCommandFactory.getCommand({ exitOverride: true, suppressOutput: true });
});

describe("build full downstream pull request flow cli", () => {
  test("only required options", () => {
    program.parse([command, "-f", definitionFile, "-u", url], { from: "user" });

    // check all the required options are set and all the optional ones have the right default value if any
    const option = parsedInputs.inputs;
    expect(option.url).toBe(url);
    expect(option.defintionFile).toBe(definitionFile);
    expect(option.outputFolder).toMatch(new RegExp(`^build_chain_${formatDate(new Date()).slice(0, -2)}\\d\\d`));
    expect(option.loggerLevel).toBe(LoggerLevel.INFO);
    expect(option.skipExecution).toBe(false);
    expect(option.skipCheckout).toBe(false);
    expect(option.skipParallelCheckout).toBe(false);

    // check that the executed command info is set correctly
    expect(option.CLICommand).toBe(CLIActionType.BUILD);
    expect(option.CLISubCommand).toBe(FlowType.FULL_DOWNSTREAM);
  });

  // check for missing required options
  test.each([
    ["definition file", [command, "-u", url]],
    ["url", [command, "-f", definitionFile]],
  ])("missing %p", (title: string, cmd: string[]) => {
    try {
      program.parse(cmd, { from: "user" });
    } catch (err) {
      expect(err).toBeInstanceOf(CommanderError);
      if (err instanceof CommanderError) {
        expect(err.code).toBe("commander.missingMandatoryOptionValue");
      }
    }
  });

  test("optional arguments", () => {
    const startProject = "xyz";
    const token = "abc";
    const outputFolder = "qaz";
    const customCommandTreatment = ["abc||def"];
    const skipProject = ["pr1", "pr2"];

    program.parse(
      [
        command,
        "-f",
        definitionFile,
        "-u",
        url,
        "-p",
        startProject,
        "--token",
        token,
        "--skipProjectExecution",
        ...skipProject,
        "-o",
        outputFolder,
        "-t",
        ...customCommandTreatment,
        "--skipProjectCheckout",
        ...skipProject,
        "--debug",
        "--skipParallelCheckout",
        "--skipExecution",
        "--skipCheckout",
      ],
      { from: "user" }
    );

    // check all the required options and optional options are set correctly
    const option = parsedInputs.inputs;
    expect(option.url).toBe(url);
    expect(option.defintionFile).toBe(definitionFile);
    expect(option.outputFolder).toBe(outputFolder);
    expect(option.loggerLevel).toBe(LoggerLevel.DEBUG);
    expect(option.skipExecution).toBe(true);
    expect(option.skipCheckout).toBe(true);
    expect(option.skipParallelCheckout).toBe(true);
    expect(option.startProject).toBe(startProject);
    expect(option.token).toBe(token);
    expect(option.customCommandTreatment).toStrictEqual(customCommandTreatment);
    expect(option.skipProjectCheckout).toStrictEqual(skipProject);
    expect(option.skipProjectExecution).toStrictEqual(skipProject);

    // check that the executed command info is set correctly
    expect(option.CLICommand).toBe(CLIActionType.BUILD);
    expect(option.CLISubCommand).toBe(FlowType.FULL_DOWNSTREAM);
  });
});
