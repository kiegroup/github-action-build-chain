import { BuildActionType, CLIActionType } from "@bc/domain/cli";
import { MainCommandFactory } from "@bc/service/arguments/main-command";
import { ParsedOptions } from "@bc/service/arguments/parsed-options";
import { formatDate } from "@bc/service/utils/date";
import { Command, CommanderError } from "commander";

let program: Command;
let url: string, definitionFile: string;
const command = `${CLIActionType.BUILD} ${BuildActionType.FULL_DOWNSTREAM}`;

beforeEach(() => {
    // Construct the a fresh instance of the cli each time
    program = MainCommandFactory.getCommand({exitOverride: true, suppressOutput: true});

    // Define required arguments to be reused for each test
    url = "test.com";
    definitionFile = "/path/to/file";
});

describe("build full downstream pull request flow cli", () => {

    test("only required options", () => {
        program.parse([command, "-f", definitionFile, "-u", url], { from: "user" });
        
        // check all the required options are set and all the optional ones have the right default value if any
        const option = ParsedOptions.getOpts();        
        expect(option.url).toBe(url);
        expect(option.defintionFile).toBe(definitionFile);
        expect(option.outputFolder).toMatch(new RegExp(`^build_chain_${formatDate(new Date()).slice(0, -2)}\\d\\d`));
        expect(option.debug).toBe(false);
        expect(option.skipExecution).toBe(false);
        expect(option.skipParallelCheckout).toBe(false);

        // check that the executed command info is set correctly
        const cmd = ParsedOptions.getExecutedCommand();
        expect(cmd.command).toBe(CLIActionType.BUILD);
        expect(cmd.action).toBe(BuildActionType.FULL_DOWNSTREAM);
    });

    test("missing required options", () => { 
        try{
            // missing definition file
            program.parse([command, "-u", url], { from: "user" });
        } catch (err) {
            expect(err).toBeInstanceOf(CommanderError);
            if (err instanceof CommanderError) {
                expect(err.code).toBe("commander.missingMandatoryOptionValue");
            }
        }
        try{
            // missing url
            program.parse([command, "-f", definitionFile], { from: "user" });
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
        const replace = "abc||def";
        const skipCheckout = ["pr1", "pr2"];

        program.parse([command, "-f", definitionFile, "-u", url, "-p", startProject, "-t", 
                        token, "-o", outputFolder, "-r", replace, "--skipCheckout", ...skipCheckout,
                        "--debug", "--skipParallelCheckout", "--skipExecution"], { from: "user" });
        
        // check all the required options and optional options are set correctly
        const option = ParsedOptions.getOpts();
        expect(option.url).toBe(url);
        expect(option.defintionFile).toBe(definitionFile);
        expect(option.outputFolder).toBe(outputFolder);
        expect(option.debug).toBe(true);
        expect(option.skipExecution).toBe(true);
        expect(option.skipParallelCheckout).toBe(true);
        expect(option.startProject).toBe(startProject);
        expect(option.token).toBe(token);
        expect(option.replace).toBe(replace);
        expect(option.skipCheckout).toStrictEqual(skipCheckout);

        // check that the executed command info is set correctly
        const cmd = ParsedOptions.getExecutedCommand();
        expect(cmd.command).toBe(CLIActionType.BUILD);
        expect(cmd.action).toBe(BuildActionType.FULL_DOWNSTREAM);
    });
});