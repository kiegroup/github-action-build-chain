import { CLIActionType, ToolType } from "@bc/domain/cli";
import { MainCommandFactory } from "@bc/service/arguments/main-command";
import { ParsedOptions } from "@bc/service/arguments/parsed-options";
import { Command } from "commander";

let program: Command;
const command = `${CLIActionType.TOOLS} ${ToolType.PROJECT_LIST}`;

beforeEach(() => {
    // Construct the a fresh instance of the cli each time
    program = MainCommandFactory.getCommand({exitOverride: true, suppressOutput: true});
});

describe("build single pull request flow cli", () => {
    test("only required options", () => {
        program.parse([command], { from: "user" });

        // check that the executed command info is set correctly
        const cmd = ParsedOptions.getExecutedCommand();
        expect(cmd.command).toBe(CLIActionType.TOOLS);
        expect(cmd.action).toBe(ToolType.PROJECT_LIST);
    });

    test("optional arguments", () => {
        const skipGroup = ["gr1", "gr2"];

        program.parse([command, "-s", ...skipGroup], { from: "user" });
        
        // check all the required options and optional options are set correctly
        const option = ParsedOptions.getOpts();
        expect(option.skipGroup).toStrictEqual(skipGroup);

        // check that the executed command info is set correctly
        const cmd = ParsedOptions.getExecutedCommand();
        expect(cmd.command).toBe(CLIActionType.TOOLS);
        expect(cmd.action).toBe(ToolType.PROJECT_LIST);
    });
});