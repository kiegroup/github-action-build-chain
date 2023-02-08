import { UploadResponse } from "@actions/artifact";
import { CheckedOutNode } from "@bc/domain/checkout";
import { ExecuteNodeResult } from "@bc/domain/execute-node-result";

export type FlowResult = {
  checkoutInfo: CheckedOutNode[];
  artifactUploadResults: PromiseSettledResult<UploadResponse>[];
  executionResult: ExecuteNodeResult[][]
}

export const defaultFlowResult: FlowResult = {
  checkoutInfo: [],
  artifactUploadResults: [],
  executionResult: [[], [], []]
}; 