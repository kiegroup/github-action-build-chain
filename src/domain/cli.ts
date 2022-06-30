/** Defines all the types of command line actions */
export enum CLIActionType {
    BUILD = "build",
    TOOLS = "tools"
}

/** Defines all the types of build flows */
export enum BuildActionType {
    CROSS_PULL_REQUEST = "cross_pr",
    FULL_DOWNSTREAM = "full_downstream",
    SINGLE_PULL_REQUEST = "single_pr",
    BRANCH = "branch"
}

/** Defines all the types of tools available */
export enum ToolType {
    PROJECT_LIST = "project-list",
}

/** Defines the currently executed command */
export type ExecutedCommand = {
    command: CLIActionType,
    action: BuildActionType | ToolType
} | Record<string, never>