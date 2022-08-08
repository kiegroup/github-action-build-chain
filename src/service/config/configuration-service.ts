import Container, { Service } from "typedi";
import { NodeExecutionLevel } from "@bc/domain/node-execution-level";
import { constants } from "@bc/domain/constants";
import { EntryPoint } from "@bc/domain/entry-point";
import { CLIConfiguration } from "@bc/service/config/cli-configuration";
import { ActionConfiguration } from "@bc/service/config/action-configuration";
import { logAndThrow } from "@bc/utils/log";
import { BaseConfiguration } from "@bc/service/config/base-configuration";
import { TreatmentOptions } from "@bc/domain/treatment-options";
import { Node } from "@bc/domain/node";
import { ProjectConfiguration } from "@bc/domain/configuration";
import { FlowType } from "@bc/domain/inputs";

@Service()
export class ConfigurationService {
  private configuration: BaseConfiguration;

  constructor() {
    switch (Container.get(constants.CONTAINER.ENTRY_POINT)) {
      case EntryPoint.CLI:
        this.configuration = new CLIConfiguration();
        break;
      case EntryPoint.GITHUB_EVENT:
        this.configuration = new ActionConfiguration();
        break;
      default:
        logAndThrow("Invalid entrypoint. Please contact with the administrator or report and issue to build-chain tool repository");
    }
  }

  /**
   * Load all necessary data for the configuration object
   */
  async init() {
    await this.configuration.init();
  }

  /**
   * Get the name of the project starting the build-chain
   * @returns {string}
   */
  getStarterProjectName(): string {
    const startProject = this.configuration.parsedInputs.startProject ?? process.env.GITHUB_REPOSITORY;
    if (!startProject) {
      logAndThrow("Start project needs to be defined or build chain must be run in a Github environment");
    }
    return startProject;
  }

  /**
   * Check whether the given node is the starter project
   * @param node
   * @returns {Boolean} true if the node is the starter project
   */
  isNodeStarter(node: Node): boolean {
    return node.project === this.getStarterProjectName();
  }

  /**
   * Finds the starter node
   * @returns {Node} starter node
   */
  getStarterNode(): Node {
    const starterNode = this.configuration.projectList.find((node) => this.isNodeStarter(node));
    if (!starterNode) {
      logAndThrow(`There's no project ${this.getStarterProjectName()} in the chain
            This is normally due the project starting the job (or the one selected to behave like so it's not in the project tree information.
            Please choose a different project like starter or define the project ${this.getStarterProjectName()} in the tree.`);
    }
    return starterNode;
  }

  /**
   * Gets the execution level (current, upstream or downstream) for the given node
   * @param node
   * @returns {NodeExecutionLevel} Upstream, current or downstream
   */
  getNodeExecutionLevel(node: Node): NodeExecutionLevel {
    const starterNodeIndex = this.configuration.projectList.indexOf(this.getStarterNode());
    const currentNodeIndex = this.configuration.projectList.indexOf(node);
    if (currentNodeIndex < starterNodeIndex) {
      return NodeExecutionLevel.UPSTREAM;
    } else if (currentNodeIndex > starterNodeIndex) {
      return NodeExecutionLevel.DOWNSTREAM;
    } else {
      return NodeExecutionLevel.CURRENT;
    }
  }

  /**
   * Checks whether execution needs to be skipped for the given node
   * @param node
   * @returns {Boolean} true if execution needs to be skipped otherwise false
   */
  skipExecution(node: Node): boolean {
    if (this.configuration.parsedInputs.skipExecution) {
      return true;
    }
    return this.configuration.parsedInputs.skipProjectExecution ? this.configuration.parsedInputs.skipProjectExecution.includes(node.project) : false;
  }

  /**
   * Checks whether given node needs to be checked out or not
   * @param node
   * @returns {Boolean} true if checking out needs to be skipped for the given node otherwise false
   */
  skipCheckout(node: Node): boolean {
    if (this.configuration.parsedInputs.skipCheckout) {
      return true;
    }
    return this.configuration.parsedInputs.skipProjectCheckout ? this.configuration.parsedInputs.skipProjectCheckout.includes(node.project) : false;
  }

  /**
   * Checks whether checkout should be sequential or parallel
   * @returns {Boolean} true if checkout should be sequential otherwise false
   */
  skipParallelCheckout(): boolean {
    return this.configuration.parsedInputs.skipParallelCheckout;
  }

  /**
   * Parses user input from custom command treatment option to create the treatment option object
   * @returns {TreatmentOptions} Construct the treatment options domain object
   */
  getTreatmentOptions(): TreatmentOptions {
    if (this.configuration.parsedInputs.customCommandTreatment) {
      return {
        replaceExpressions: this.configuration.parsedInputs.customCommandTreatment,
      };
    }
    return {};
  }

  /**
   * Returns the information for the target repository. For PR flow types it is the base branch
   * @returns
   */
  getTargetProject(): ProjectConfiguration {
    return this.configuration.targetProject;
  }

  /**
   * Returns the information for the source repository. For PR flow types it is the head branch
   * @returns
   */
  getSourceProject(): ProjectConfiguration {
    return this.configuration.sourceProject;
  }

  /**
   * Root folder is outputFolder if defined via options otherwise GITHUB_WORKSPACE.
   * If both of these are undefined, it is the current working directory
   * @returns
   */
  getRootFolder(): string {
    return this.configuration.parsedInputs.outputFolder ?? process.env.GITHUB_WORKSPACE ?? process.cwd();
  }

  /**
   * Return the flow type of the current build or throw an error is the build is not
   * of any flow type
   * @returns
   */
  getFlowType(): FlowType {
    return this.configuration.getFlowType();
  }

  /**
   * Returns the clone url for the given repo group and name
   * @param group owner of the repository
   * @param repoName name of the repository
   * @returns
   */
  getCloneUrl(group: string, repoName: string): string {
    return `${this.configuration.gitConfiguration.serverUrlWithToken}/${group}/${repoName}`;
  }
}
