export interface ExecuteCommandResult {
  time: number;
  result: ExecutionResult;
  errorMessage?: string;
  command: string;
}

export enum ExecutionResult {
  OK, NOT_OK
}