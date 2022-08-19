import { UploadResponse } from "@actions/artifact";
import { CheckedOutNode } from "@bc/domain/checkout";
import { ExecuteNodeResult } from "@bc/domain/execute-node-result";
import { ExecutionPhase } from "@bc/domain/execution-phase";

export type FlowResult = {
  checkoutInfo: CheckedOutNode[];
  artifactUploadResults: PromiseSettledResult<UploadResponse>[];
  executionResult: {
    [key in ExecutionPhase]: ExecuteNodeResult[]
  }
}