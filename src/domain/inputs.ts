import {CLIActionType, ToolType } from "@bc/domain/cli";
import { OptionValues } from "commander";

/** Defines all the types of build flows */
export enum FlowType {
    CROSS_PULL_REQUEST = "cross_pr",
    FULL_DOWNSTREAM = "full_downstream",
    SINGLE_PULL_REQUEST = "single_pr",
    BRANCH = "branch"
}

export enum LoggerLevel {
    INFO,
    TRACE,
    DEBUG
}

export interface InputValues extends OptionValues {
    definitionFile: string,
    flowType?: FlowType,
    CLICommand?: CLIActionType
    CLISubCommand?: FlowType | ToolType,
    skipExecution: boolean,
    skipParallelCheckout: boolean
    skipCheckout?: string[],
    startProject?: string,
    loggerLevel: LoggerLevel,
    annotationsPrefix?: string,
    customCommandTreatment?: string
}

export const defaultInputValues: Readonly<InputValues> = {
    definitionFile: "",
    skipExecution: false,
    skipParallelCheckout: false,
    loggerLevel: LoggerLevel.INFO,
};
