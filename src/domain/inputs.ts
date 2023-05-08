import { CLIActionType, ToolType } from "@bc/domain/cli";
import { OptionValues } from "commander";

/** Defines all the types of build flows */
export enum FlowType {
  CROSS_PULL_REQUEST = "cross_pr",
  FULL_DOWNSTREAM = "full_downstream",
  SINGLE_PULL_REQUEST = "single_pr",
  BRANCH = "branch",
}

/**
 * Defines the available level of logs
 */
export enum LoggerLevel {
  INFO,
  TRACE,
  DEBUG,
}

/**
 * Defines all parsed input values for cli and github action
 */
export interface InputValues extends OptionValues {
  definitionFile: string;
  outputFolder?: string;
  flowType?: FlowType;
  CLICommand?: CLIActionType;
  CLISubCommand?: FlowType | ToolType;
  enableParallelExecution: boolean;
  skipExecution: boolean;
  skipParallelCheckout: boolean;
  skipCheckout: boolean;
  skipProjectCheckout?: string[];
  skipProjectExecution?: string[];
  startProject?: string;
  loggerLevel: LoggerLevel;
  annotationsPrefix?: string;
  customCommandTreatment?: string[];
  token?: string[];
  url?: string;
  branch?: string;
  group?: string;
}

/**
 * Default value used for initialization
 */
export const defaultInputValues: Readonly<InputValues> = {
  definitionFile: "",
  skipExecution: false,
  skipCheckout: false,
  skipParallelCheckout: false,
  enableParallelExecution: false,
  loggerLevel: LoggerLevel.INFO,
};
