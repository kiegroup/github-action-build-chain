import { ExecuteCommandResult } from "@bc/domain/execute-command-result";
import { Node } from "@bc/domain/node";

export interface ExecuteNodeResult {
  node: Node;
  executeCommandResults?: ExecuteCommandResult[];
}
