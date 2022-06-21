import { CLIActionType, ToolType } from "@bc/domain/cli";
import { MainCommandFactory } from "@bc/service/arguments/main-command-factory";
import { ParsedOptions } from "@bc/service/arguments/parsed-options";
import { Command, CommanderError } from "commander";

let program: Command;

// Command to be executed
const command = `${CLIActionType.TOOLS} ${ToolType.PROJECT_LIST}`;

// Define required arguments to be reused for each test
const definitionFile = "/path/to/file";

beforeEach(() => {
    // Construct the a fresh instance of the cli each time
    program = MainCommandFactory.getCommand({exitOverride: true, suppressOutput: true});
});

describe("build single pull request flow cli", () => {
    test("only required options", () => {
        program.parse([command, "-f", definitionFile], { from: "user" });

        // check all the required options are set and all the optional ones have the right default value if any
        const option = ParsedOptions.getOpts();        
        expect(option.defintionFile).toBe(definitionFile);
        expect(option.debug).toBe(false);

        // check that the executed command info is set correctly
        const cmd = ParsedOptions.getExecutedCommand();
        expect(cmd.command).toBe(CLIActionType.TOOLS);
        expect(cmd.action).toBe(ToolType.PROJECT_LIST);
    });

    // check for missing required options
    test.each([
        ["definition file", [command]],
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
        const skipGroup = ["gr1", "gr2"];
        const token = "abc";

        program.parse([command, "-f", definitionFile, "--token", 
                        token, "-s", ...skipGroup, "-d"], { from: "user" });
        
        // check all the required options and optional options are set correctly
        const option = ParsedOptions.getOpts();
        expect(option.skipGroup).toStrictEqual(skipGroup);
        expect(option.token).toBe(token);
        expect(option.debug).toBe(true);

        // check that the executed command info is set correctly
        const cmd = ParsedOptions.getExecutedCommand();
        expect(cmd.command).toBe(CLIActionType.TOOLS);
        expect(cmd.action).toBe(ToolType.PROJECT_LIST);
    });
});