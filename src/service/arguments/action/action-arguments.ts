import { FlowType, InputValues, LoggerLevel } from "@bc/domain/inputs";
import * as core from "@actions/core";
import { OptionValues } from "commander";
import Container from "typedi";
import { InputService } from "@bc/service/inputs/input-service";
import { InvalidInput } from "@bc/domain/errors";

/**
 * Parses all inputs from github action workflow files
 */
export class ActionArguments {
  /**
   * Converts user input to corresponding FlowType enum
   * @param flowType value for "flow-type" input
   * @returns corresponding enum
   */
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

  /**
   * Converts user input to corresponding LoggerLevel enum
   * @param logLevel value for "logger-level" input
   * @returns corresponding enum
   */
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

  /**
   * Gets and sets the any additional flags defined in the workflow
   * @param additionaFlags "additional flags for the execution, as it is done on the CLI side. Just semicolon (;) separated, like '--skipParallelCheckout;--skipExecution;-cct (mvn .*)||$1 -s settings.xml'"
   * @returns parsed option values
   */
  private getAdditionalFlags(additionaFlags: string): OptionValues {
    if (additionaFlags === "") {
      return {};
    }
    const flags: OptionValues = {};
    additionaFlags
      .trim()
      .split(";")
      .forEach(flag => {
        const opt: string[] = flag.split(" ");
        if (opt[0].startsWith("--")) {
          opt[0] = opt[0].substring(2);
        } else if (opt[0].startsWith("-")) {
          opt[0] = opt[0].substring(1);
        }
        if (opt.length === 1) {
          // its a boolean flag
          flags[opt[0]] = true;
        } else {
          flags[opt[0]] = opt.slice(1).join(" ");
        }
      });
    return flags;
  }

  /**
   * Gets the actual input from github action event and sets it in parsed input object
   */
  parseInput() {
    const input: InputValues = {
      definitionFile: core.getInput("definition-file"),
      flowType: this.getFlowType(core.getInput("flow-type")),
      skipExecution: core.getBooleanInput("skip-execution"),
      skipParallelCheckout: core.getBooleanInput("skip-parallel-checkout"),
      skipProjectCheckout: core.getInput("skip-project-checkout").split(",").map(str => str.trim()),
      skipProjectExecution: core.getInput("skip-project-execution").split(",").map(str => str.trim()),
      skipCheckout: core.getBooleanInput("skip-checkout"),
      startProject: core.getInput("starting-project"),
      loggerLevel: this.getLoggerLevel(core.getInput("logger-level")),
      annotationsPrefix: core.getInput("annotations-prefix"),
      customCommandTreatment: core.getInput("custom-command-treatment") === "" ? [] : core.getInput("custom-command-treatment").split(","),
      ...this.getAdditionalFlags(core.getInput("additional-flags")),
    };

    const parsedInput = Container.get(InputService);
    parsedInput.updateInputs(input);
  }
}
