import "reflect-metadata";
import { CLIActionType } from "@bc/domain/cli";
import { CLIArguments } from "@bc/service/arguments/cli/cli-arguments";
import { InputService } from "@bc/service/inputs/input-service";
import { formatDate } from "@bc/utils/date";
import { Command, CommanderError } from "commander";
import Container from "typedi";
import { FlowType, LoggerLevel } from "@bc/domain/inputs";

let program: Command;

// Define required arguments to be reused for each test
const startProject = "test";
const definitionFile = "/path/to/file";
const branch = "main";

// command to be executed
const command = [CLIActionType.BUILD, FlowType.BRANCH];
const parsedInputs = Container.get(InputService);

beforeEach(() => {
  // Construct the a fresh instance of the cli each time
  program = Container.get(CLIArguments).getCommand({ exitOverride: true, suppressOutput: true });
});

describe("build branch flow cli", () => {
  test("only required options", () => {
    program.parse([...command, "-f", definitionFile, "-p", startProject, "-b", branch], { from: "user" });

    // check all the required options are set and all the optional ones have the right default value if any
    const option = parsedInputs.inputs;
    expect(option.startProject).toBe(startProject);
    expect(option.branch).toBe(branch);
    expect(option.definitionFile).toBe(definitionFile);
    expect(option.outputFolder).toMatch(new RegExp(`^build_chain_${formatDate(new Date()).slice(0, -2)}\\d\\d`));
    expect(option.loggerLevel).toBe(LoggerLevel.INFO);
    expect(option.skipExecution).toBe(false);
    expect(option.skipCheckout).toBe(false);
    expect(option.skipParallelCheckout).toBe(false);
    expect(option.enableParallelExecution).toBe(false);
    expect(option.fullProjectDependencyTree).toBe(false);

    // check that the executed command info is set correctly
    expect(option.CLICommand).toBe(CLIActionType.BUILD);
    expect(option.CLISubCommand).toBe(FlowType.BRANCH);
  });

  // check for missing required options
  test.each([
    ["definition file", [...command, "-p", startProject, "-b", branch]],
    ["starting project", [...command, "-f", definitionFile, "-b", branch]],
    ["branch", [...command, "-f", definitionFile, "-p", startProject]],
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
    const token = "abc";
    const outputFolder = "qaz";
    const customCommandTreatment = ["abc||def"];
    const skipProject = ["pr1", "pr2"];
    const commandOption = ["cmd1", "cmd2"];
    const group = "gr1";

    program.parse(
      [
        ...command,
        "-f",
        definitionFile,
        "-p",
        startProject,
        "--token",
        token,
        "--token",
        token,
        "-b",
        branch,
        "-o",
        outputFolder,
        "-t",
        ...customCommandTreatment,
        "--skipProjectCheckout",
        ...skipProject,
        "--skipProjectExecution",
        ...skipProject,
        "-g",
        group,
        "-c",
        ...commandOption,
        "--debug",
        "--skipParallelCheckout",
        "--skipExecution",
        "--skipCheckout",
        "--fullProjectDependencyTree",
        "--enableParallelExecution"
      ],
      { from: "user" }
    );

    // check all the required options and optional options are set correctly
    const option = parsedInputs.inputs;
    expect(option.definitionFile).toBe(definitionFile);
    expect(option.outputFolder).toBe(outputFolder);
    expect(option.loggerLevel).toBe(LoggerLevel.DEBUG);
    expect(option.skipExecution).toBe(true);
    expect(option.skipCheckout).toBe(true);
    expect(option.skipParallelCheckout).toBe(true);
    expect(option.enableParallelExecution).toBe(true);
    expect(option.fullProjectDependencyTree).toBe(true);
    expect(option.startProject).toBe(startProject);
    expect(option.token).toStrictEqual([token, token]);
    expect(option.customCommandTreatment).toStrictEqual(customCommandTreatment);
    expect(option.skipProjectCheckout).toStrictEqual(skipProject);
    expect(option.skipProjectExecution).toStrictEqual(skipProject);
    expect(option.branch).toBe(branch);
    expect(option.group).toBe(group);
    expect(option.command).toStrictEqual(commandOption);

    // check that the executed command info is set correctly
    expect(option.CLICommand).toBe(CLIActionType.BUILD);
    expect(option.CLISubCommand).toBe(FlowType.BRANCH);
  });
});
