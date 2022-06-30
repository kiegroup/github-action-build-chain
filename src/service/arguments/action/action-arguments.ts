import { FlowType, InputValues, LoggerLevel } from "@bc/domain/inputs";
import * as core from "@actions/core";
import { OptionValues } from "commander";
import Container from "typedi";
import { ParsedInputs } from "@bc/service/inputs/parsed-inputs";
import { InvalidInput } from "@bc/domain/errors";

export class ActionArguments {
    private getFlowType(flowType: string): FlowType {
        switch (flowType) {
            case "pull-request":
                return FlowType.CROSS_PULL_REQUEST;
            case "full-downstream":
                return FlowType.FULL_DOWNSTREAM;
            case "single":
                return FlowType.SINGLE_PULL_REQUEST;
            case "branch":
                return FlowType.BRANCH;
            default:
                throw new InvalidInput("Invalid flow-type");
        }
    }

    private getLoggerLevel(logLevel: string): LoggerLevel {
        switch (logLevel) {
            case "info":
            case "":
                return LoggerLevel.INFO;
            case "debug":
                return LoggerLevel.DEBUG;
            case "trace":
                return LoggerLevel.TRACE;
            default:
                throw new InvalidInput("Invalid logger-level");
        }
    }

    private getAdditionalFlags(additionaFlags: string): OptionValues {
        if (additionaFlags === "") {return {};}
        const flags: OptionValues = {};
        additionaFlags.trim().split(";").forEach((flag) => {
            const opt: string[] = flag.split(" ");
            if (opt[0].startsWith("--")) {opt[0] = opt[0].substring(2);}
            else if (opt[0].startsWith("-")) {opt[0] = opt[0].substring(1);}
            if (opt.length === 1) {
                // its a boolean flag
                flags[opt[0]] = true;
            } else {
                flags[opt[0]] = opt.slice(1).join(" ");
            }
        });
        return flags;
    }
    
    parseInput() {
        const input: InputValues = {
            definitionFile: core.getInput("definition-file"),
            flowType: this.getFlowType(core.getInput("flow-type")),
            skipExecution: core.getBooleanInput("skip-execution"),
            skipParallelCheckout: core.getBooleanInput("skip-parallel-checkout"),
            skipCheckout: core.getInput("skip-checkout").split(",").map((str) => str.trim()),
            startProject: core.getInput("starting-project"),
            loggerLevel: this.getLoggerLevel(core.getInput("logger-level")),
            annotationsPrefix: core.getInput("annotations-prefix"),
            customCommandTreatment: core.getInput("custom-command-treatment"),
            ...this.getAdditionalFlags(core.getInput("additional-flags"))
        };

        const parsedInput = Container.get(ParsedInputs);
        parsedInput.updateInputs(input);        
    }
}