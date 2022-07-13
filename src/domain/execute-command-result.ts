export interface ExecuteCommandResult {
  startingDate?: number;
  endingDate?: number;
  time?: number;
  result?: ExecutionResult;
  errorMessage?: string;
  command?: string;
}

export enum ExecutionResult {
  OK,
  NOT_OK,
  SKIP,
}
