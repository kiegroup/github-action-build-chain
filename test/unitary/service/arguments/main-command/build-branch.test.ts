import { BuildActionType, CLIActionType } from "@bc/domain/cli";
import { MainCommandFactory } from "@bc/service/arguments/main-command";
import { ParsedOptions } from "@bc/service/arguments/parsed-options";
import { formatDate } from "@bc/service/utils/date";
import { Command, CommanderError } from "commander";

let program: Command;
let startProject: string, definitionFile: string, branch: string;
const command = `${CLIActionType.BUILD} ${BuildActionType.BRANCH}`;

beforeEach(() => {
    // Construct the a fresh instance of the cli each time
    program = MainCommandFactory.getCommand({exitOverride: true, suppressOutput: true});

    // Define required arguments to be reused for each test
    startProject = "test";
    definitionFile = "/path/to/file";
    branch = "main";
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

    test("missing required options", () => { 
        try{
            // missing definition file
            program.parse([command, "-p", startProject, "-b", branch], { from: "user" });
        } catch (err) {
            expect(err).toBeInstanceOf(CommanderError);
            if (err instanceof CommanderError) {
                expect(err.code).toBe("commander.missingMandatoryOptionValue");
            }
        }
        try{
            // missing start project
            program.parse([command, "-f", definitionFile, "-b", branch], { from: "user" });
        } catch (err) {
            expect(err).toBeInstanceOf(CommanderError);
            if (err instanceof CommanderError) {
                expect(err.code).toBe("commander.missingMandatoryOptionValue");
            }
        }
        try{
            // missing branch
            program.parse([command, "-f", definitionFile, "-p", startProject], { from: "user" });
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
        const replace = "abc||def";
        const skipCheckout = ["pr1", "pr2"];

        program.parse([command, "-f", definitionFile, "-p", startProject, "-t", token, "-b", branch,
                        "-o", outputFolder, "-r", replace, "--skipCheckout", ...skipCheckout, "--debug", 
                        "--skipParallelCheckout", "--skipExecution", "--fullProjectDependencyTree"], { from: "user" });
        
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
        expect(option.replace).toBe(replace);
        expect(option.skipCheckout).toStrictEqual(skipCheckout);
        expect(option.branch).toBe(branch);


        // check that the executed command info is set correctly
        const cmd = ParsedOptions.getExecutedCommand();
        expect(cmd.command).toBe(CLIActionType.BUILD);
        expect(cmd.action).toBe(BuildActionType.BRANCH);
    });
});