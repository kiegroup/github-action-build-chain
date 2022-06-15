import { BuildActionType, CLIActionType } from "@bc/domain/cli";
import { MainCommandFactory } from "@bc/service/arguments/main-command-factory";
import { ParsedOptions } from "@bc/service/arguments/parsed-options";
import { formatDate } from "@bc/utils/date";
import { Command, CommanderError } from "commander";

let program: Command;

 // Define required arguments to be reused for each test
const startProject: string = "test";
const definitionFile: string = "/path/to/file";
const branch: string = "main";

// command to be executed
const command = `${CLIActionType.BUILD} ${BuildActionType.BRANCH}`;

beforeEach(() => {
    // Construct the a fresh instance of the cli each time
    program = MainCommandFactory.getCommand({exitOverride: true, suppressOutput: true});
});

describe("build branch flow cli", () => {

    test("only required options", () => {
        program.parse([command, "-f", definitionFile, "-p", startProject, "-b", branch], { from: "user" });
        
        // check all the required options are set and all the optional ones have the right default value if any
        const option = ParsedOptions.getOpts();        
        expect(option.startProject).toBe(startProject);
        expect(option.branch).toBe(branch);
        expect(option.defintionFile).toBe(definitionFile);
        expect(option.outputFolder).toMatch(new RegExp(`^build_chain_${formatDate(new Date()).slice(0, -2)}\\d\\d`));
        expect(option.debug).toBe(false);
        expect(option.skipExecution).toBe(false);
        expect(option.skipParallelCheckout).toBe(false);
        expect(option.fullProjectDependencyTree).toBe(false);

        // check that the executed command info is set correctly
        const cmd = ParsedOptions.getExecutedCommand();
        expect(cmd.command).toBe(CLIActionType.BUILD);
        expect(cmd.action).toBe(BuildActionType.BRANCH);
    });

    // check for missing required options
    test.each([
        ["definition file", [command, "-p", startProject, "-b", branch]],
        ["starting project", [command, "-f", definitionFile, "-b", branch]],
        ["branch", [command, "-f", definitionFile, "-p", startProject]]
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
        const customCommandTreatment = "abc||def";
        const skipCheckout = ["pr1", "pr2"];
        const commandOption = ["cmd1", "cmd2"];
        const group = "gr1";

        program.parse([command, "-f", definitionFile, "-p", startProject, "-t", token, "-b", branch,
                        "-o", outputFolder, "-c", customCommandTreatment, "--skipCheckout", ...skipCheckout, 
                        "-g", group, "-m", ...commandOption, "--debug", "--skipParallelCheckout", 
                        "--skipExecution", "--fullProjectDependencyTree"], { from: "user" });
        
        // check all the required options and optional options are set correctly
        const option = ParsedOptions.getOpts();
        expect(option.defintionFile).toBe(definitionFile);
        expect(option.outputFolder).toBe(outputFolder);
        expect(option.debug).toBe(true);
        expect(option.skipExecution).toBe(true);
        expect(option.skipParallelCheckout).toBe(true);
        expect(option.fullProjectDependencyTree).toBe(true);
        expect(option.startProject).toBe(startProject);
        expect(option.token).toBe(token);
        expect(option.customCommandTreatment).toBe(customCommandTreatment);
        expect(option.skipCheckout).toStrictEqual(skipCheckout);
        expect(option.branch).toBe(branch);
        expect(option.group).toBe(group);
        expect(option.command).toStrictEqual(commandOption);



        // check that the executed command info is set correctly
        const cmd = ParsedOptions.getExecutedCommand();
        expect(cmd.command).toBe(CLIActionType.BUILD);
        expect(cmd.action).toBe(BuildActionType.BRANCH);
    });
});