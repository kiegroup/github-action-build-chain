import { ExecuteCommandResult } from "@bc/domain/execute-command-result";
import { Node } from "@kie/build-chain-configuration-reader";

export interface ExecuteNodeResult {
  node: Node;
  executeCommandResults: ExecuteCommandResult[];
}
