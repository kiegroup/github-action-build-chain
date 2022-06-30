import "reflect-metadata";
import { BuildActionType, CLIActionType } from "@bc/domain/cli";
import { MainCommandFactory } from "@bc/service/arguments/cli/main-command-factory";
import { ParsedInputs } from "@bc/service/inputs/parsed-inputs"; 
import { formatDate } from "@bc/utils/date";
import { Command, CommanderError } from "commander";
import Container from "typedi";

let program: Command;

// Define required arguments to be reused for each test
const url = "test.com";
const definitionFile = "/path/to/file";

// Command to be executed
const command = `${CLIActionType.BUILD} ${BuildActionType.CROSS_PULL_REQUEST}`;
const parsedInputs = Container.get(ParsedInputs);


beforeEach(() => {
    // Construct the a fresh instance of the cli each time
    program = MainCommandFactory.getCommand({exitOverride: true, suppressOutput: true});
});

describe("build cross pull request flow cli", () => {

    test("only required options", () => {
        program.parse([command, "-f", definitionFile, "-u", url], { from: "user" });
        
        // check all the required options are set and all the optional ones have the right default value if any
        const option = parsedInputs.inputs;        
        expect(option.url).toBe(url);
        expect(option.defintionFile).toBe(definitionFile);
        expect(option.outputFolder).toMatch(new RegExp(`^build_chain_${formatDate(new Date()).slice(0, -2)}\\d\\d`));
        expect(option.debug).toBe(false);
        expect(option.skipExecution).toBe(false);
        expect(option.skipParallelCheckout).toBe(false);

        // check that the executed command info is set correctly
        expect(option.CLICommand).toBe(CLIActionType.BUILD);
        expect(option.CLISubCommand).toBe(BuildActionType.CROSS_PULL_REQUEST);
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
        const customCommandTreatment = "abc||def";
        const skipCheckout = ["pr1", "pr2"];

        program.parse([command, "-f", definitionFile, "-u", url, "-p", startProject, "--token", 
                        token, "-o", outputFolder, "-t", customCommandTreatment, "--skipCheckout", ...skipCheckout,
                        "--debug", "--skipParallelCheckout", "--skipExecution"], { from: "user" });
        
        // check all the required options and optional options are set correctly
        const option = parsedInputs.inputs;
        expect(option.url).toBe(url);
        expect(option.defintionFile).toBe(definitionFile);
        expect(option.outputFolder).toBe(outputFolder);
        expect(option.debug).toBe(true);
        expect(option.skipExecution).toBe(true);
        expect(option.skipParallelCheckout).toBe(true);
        expect(option.startProject).toBe(startProject);
        expect(option.token).toBe(token);
        expect(option.customCommandTreatment).toBe(customCommandTreatment);
        expect(option.skipCheckout).toStrictEqual(skipCheckout);

        // check that the executed command info is set correctly
        expect(option.CLICommand).toBe(CLIActionType.BUILD);
        expect(option.CLISubCommand).toBe(BuildActionType.CROSS_PULL_REQUEST);
    });
});