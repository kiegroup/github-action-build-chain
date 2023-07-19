import { SerializedCheckoutService } from "@bc/domain/checkout";
import { SerializedConfigurationService } from "@bc/domain/configuration";
import { SerializedFlowService } from "@bc/domain/flow";

export interface ResumeState {
  configurationService: SerializedConfigurationService
  checkoutService: SerializedCheckoutService
  flowService: SerializedFlowService
}

export const DEFAULT_STATE_FILENAME = ".state.build-chain.json";