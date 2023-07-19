import Container, { Service } from "typedi";
import { Tools } from "@bc/service/tools/abstract-tools";
import { readFileSync } from "fs-extra";
import path from "path";
import { DEFAULT_STATE_FILENAME, ResumeState } from "@bc/domain/resume";
import { ConfigurationService } from "@bc/service/config/configuration-service";
import { CheckoutService } from "@bc/service/checkout/checkout-service";
import { FlowService } from "@bc/service/flow/flow-service";
import { CLIArguments } from "@bc/service/arguments/cli/cli-arguments";
import { Command } from "commander";
import { CLIRunner } from "@bc/bin/runners/cli-runner";

@Service()
export class Resume extends Tools {
  async execute(): Promise<void> {   
    // detect state file
    const workspace = Container.get(ConfigurationService).getRootFolder();
    const state = JSON.parse(
      readFileSync(path.join(workspace, DEFAULT_STATE_FILENAME), "utf8")
    ) as ResumeState;

    // update output folder
    state.configurationService.configuration._parsedInputs = {
      ...state.configurationService.configuration._parsedInputs,
      outputFolder: workspace
    };

    // reconstruct services
    const configService = ConfigurationService.fromJSON(state.configurationService);
    // patch init to avoid config service initialization
    configService.init = async () => undefined;
    Container.set(ConfigurationService, configService);  
    const checkoutService = CheckoutService.fromJSON(state.checkoutService);
    Container.set(CheckoutService, checkoutService);
    const flowService = FlowService.fromJSON(state.flowService);
    Container.set(FlowService, flowService);

    // patch cli argument service to prevent argument parsing again
    const args = Container.get(CLIArguments);
    args.getCommand = () => ({ parse: () => undefined! } as unknown as Command);
    Container.set(CLIArguments, args);
    
    // re-run cli runner
    return new CLIRunner().execute();
  }
  
}