import Container, { Service } from "typedi";
import { Tools } from "@bc/service/tools/abstract-tools";
import { existsSync, readFileSync } from "fs-extra";
import path from "path";
import { DEFAULT_STATE_FILENAME, ResumeState } from "@bc/domain/resume";
import { ConfigurationService } from "@bc/service/config/configuration-service";
import { CheckoutService } from "@bc/service/checkout/checkout-service";
import { FlowService } from "@bc/service/flow/flow-service";
import { CLIArguments } from "@bc/service/arguments/cli/cli-arguments";
import { Command } from "commander";
import { CLIRunner } from "@bc/bin/runners/cli-runner";
import { SerializedCheckoutService } from "@bc/domain/checkout";
import { GitCLIService } from "@bc/service/git/git-cli";
import { SerializedFlowService } from "@bc/domain/flow";
import { Node } from "@kie/build-chain-configuration-reader";
import { logAndThrow } from "@bc/utils/log";

@Service()
export class Resume extends Tools {
  async execute(): Promise<void> {
    // detect state file
    const workspace = this.configService.getRootFolder();
    const state = JSON.parse(
      readFileSync(path.join(workspace, DEFAULT_STATE_FILENAME), "utf8")
    ) as ResumeState;

    // update output folder
    state.configurationService.configuration._parsedInputs = {
      ...state.configurationService.configuration._parsedInputs,
      outputFolder: workspace,
    };

    // verify checkout state
    const verifiedCheckoutState = await this.verifyCheckout(
      state.checkoutService
    );
    const { updatedCheckoutService, updatedFlowService } = this.updateCheckout(
      verifiedCheckoutState,
      state.flowService,
      this.configService.getProjectsToRecheckout()
    );
    const updatedFlowServiceState = this.updateResumeFrom(
      updatedFlowService,
      state.configurationService._nodeChain,
      state.configurationService.configuration._parsedInputs.failAtEnd
    );

    // reconstruct services
    const configService = ConfigurationService.fromJSON(
      state.configurationService
    );
    // patch init to avoid config service initialization
    configService.init = async () => undefined;
    Container.set(ConfigurationService, configService);
    const checkoutService = CheckoutService.fromJSON(updatedCheckoutService);
    Container.set(CheckoutService, checkoutService);
    const flowService = FlowService.fromJSON(updatedFlowServiceState);
    Container.set(FlowService, flowService);

    // patch cli argument service to prevent argument parsing again
    const args = Container.get(CLIArguments);
    args.getCommand = () => ({ parse: () => undefined! } as unknown as Command);
    Container.set(CLIArguments, args);

    // re-run cli runner
    return new CLIRunner().execute();
  }

  private async verifyCheckout(
    serializedCheckoutInfo: SerializedCheckoutService
  ): Promise<SerializedCheckoutService> {
    return Promise.all(
      serializedCheckoutInfo.map(checkout => {
        if (checkout.checkedOut && existsSync(checkout.checkoutInfo.repoDir)) {
          return Container.get(GitCLIService)
            .branch(checkout.checkoutInfo.repoDir)
            .then(branchSummary => {
              if (
                branchSummary.current === checkout.checkoutInfo.sourceBranch
              ) {
                return checkout;
              } else {
                this.logger.warn(
                  `Workspace does not match expected state. Will re-checkout project ${checkout.node.project}`
                );
                return {
                  ...checkout,
                  checkedOut: false,
                };
              }
            });
        }
        this.logger.warn(
          `Workspace does not match expected state. Will re-checkout project ${checkout.node.project}`
        );
        return {
          ...checkout,
          checkedOut: false,
        };
      })
    );
  }

  private updateResumeFrom(
    flowService: SerializedFlowService,
    nodeChain: Node[],
    failAtEnd = false
  ) {
    const startProject = this.configService.getStarterProjectNameFromInput();
    if (!startProject) {
      if (failAtEnd) {
        this.logger.warn(
          "The build we are resuming had enabled fail at end. Will resume building after the last project that had failed"
        );
        return {
          ...flowService,
          resumeFrom: flowService.executionResult.length,
        };
      }
      return flowService;
    }

    // check if start project even exists
    if (!nodeChain.find(n => n.project === startProject)) {
      logAndThrow(`Given starting project ${startProject} does not exist`);
    }

    const startProjectIndex = flowService.executionResult.findIndex(
      res => !!res.find(r => r.node.project === startProject)
    );

    if (startProjectIndex === -1) {
      if (failAtEnd) {
        this.logger.warn(
          `The start project ${startProject} you wanted to resume from has un-built dependencies
          and the previous build has fail at end enabled.
          Will resume building after the last project that had failed.`
        );
        return {
          ...flowService,
          resumeFrom: flowService.executionResult.length,
        };
      } else {
        this.logger.warn(
          `The start project ${startProject} you wanted to resume from has un-built dependencies.
          Will resume building from the first point of failure.`
        );
        return flowService;
      }
    } else {
      return {
        ...flowService,
        resumeFrom: startProjectIndex,
      };
    }
  }

  private updateCheckout(
    serializedCheckoutInfo: SerializedCheckoutService,
    serializedFlowService: SerializedFlowService,
    recheckout: string[]
  ) {
    let resumeFromIndex: number | undefined;

    const checkoutService = serializedCheckoutInfo.map((c, index) => {
      if (recheckout.includes(c.node.project)) {
        if (!resumeFromIndex) {
          resumeFromIndex = index;
        }
        return { ...c, checkedOut: false };
      }
      return c;
    });
    return {
      updatedCheckoutService: checkoutService,
      updatedFlowService: {
        ...serializedFlowService,
        resumeFrom: resumeFromIndex ?? serializedFlowService.resumeFrom,
      } as SerializedFlowService,
    };
  }
}
