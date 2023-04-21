import "reflect-metadata";
import { CLIActionType, ToolType } from "@bc/domain/cli";
import { CLIArguments } from "@bc/service/arguments/cli/cli-arguments";
import { InputService } from "@bc/service/inputs/input-service";
import { Command, CommanderError } from "commander";
import Container from "typedi";
import { LoggerLevel } from "@bc/domain/inputs";

let program: Command;

// Command to be executed
const command = [CLIActionType.TOOLS, ToolType.PROJECT_LIST];

// Define required arguments to be reused for each test
const definitionFile = "/path/to/file";
const startingProject = "project";
const parsedInputs = Container.get(InputService);

beforeEach(() => {
  // Construct the a fresh instance of the cli each time
  program = Container.get(CLIArguments).getCommand({ exitOverride: true, suppressOutput: true });
});

describe("build single pull request flow cli", () => {
  test("only required options", () => {
    program.parse([...command, "-f", definitionFile, "-p", startingProject], { from: "user" });

    // check all the required options are set and all the optional ones have the right default value if any
    const option = parsedInputs.inputs;
    expect(option.definitionFile).toBe(definitionFile);
    expect(option.loggerLevel).toBe(LoggerLevel.INFO);

    // check that the executed command info is set correctly
    expect(option.CLICommand).toBe(CLIActionType.TOOLS);
    expect(option.CLISubCommand).toBe(ToolType.PROJECT_LIST);
  });

  // check for missing required options
  test.each([
    ["definition file", [...command, "-p", startingProject]],
    ["starting project", [...command, "-f", definitionFile]],
  ])("missing %p", (_title: string, cmd: string[]) => {
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
    const token = "abc";

    program.parse([
      ...command, 
      "-f", definitionFile, 
      "-p", startingProject, 
      "--token", token, 
      "--fullProjectDependencyTree", 
      "-d"
    ], { from: "user" });

    // check all the required options and optional options are set correctly
    const option = parsedInputs.inputs;
    expect(option.token).toBe(token);
    expect(option.loggerLevel).toBe(LoggerLevel.DEBUG);

    // check that the executed command info is set correctly
    expect(option.CLICommand).toBe(CLIActionType.TOOLS);
    expect(option.CLISubCommand).toBe(ToolType.PROJECT_LIST);
  });
});
