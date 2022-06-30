import { BuildActionType, CLIActionType, ToolType } from "@bc/domain/cli";
import { OptionValues } from "commander";

export interface InputValues extends OptionValues {
    CLICommand?: CLIActionType
    CLISubCommand?: BuildActionType | ToolType
}