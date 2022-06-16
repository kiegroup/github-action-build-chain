import { Configuration } from "@bc/domain/configuration";
import { Service } from "typedi";
import { Node } from "@bc/domain/node";
import { NodeExecutionLevel } from "@bc/domain/node-execution-level";
import { LoggerServiceFactory } from "@bc/service/logger/logger-service-factory";

@Service()
export class ConfigurationService {

  private _configuration?: Configuration;

  public initializeConfiguration(configuration: Configuration): void {
    this._configuration = configuration;
  }

  get configuration(): Configuration | undefined {
    return this._configuration;
  }

  public getStarterProjectName(): string {
    if (!this.configuration) {
      const errorMessage = "The configuration has not been initialized. Please contact with the administrator or report and issue to build-chain tool repository";
      LoggerServiceFactory.getInstance().error(errorMessage);
      throw new Error(errorMessage);
    }
    return this.configuration.startingProject ?? this.configuration.projectTriggeringTheJob;
  }

  public isNodeStarter(node: Node): boolean {
    return node.project === this.getStarterProjectName();
  }

  public getStarterNode(chain: Node[]): Node {
    const starterNode = chain.find(node => this.isNodeStarter(node));
    if (!starterNode) {
      const errorMessage = `There's no project ${this.getStarterProjectName()} in the chain. This is normally due the project starting the job (or the one selected to behave like so it's not in the project tree information. Please choose a different project like starter or define the project ${this.getStarterProjectName()} in the tree.`;
      LoggerServiceFactory.getInstance().error(errorMessage);
      throw new Error(errorMessage);
    }
    return starterNode;
  }

  public getNodeExecutionLevel(node: Node, chain: Node[]): NodeExecutionLevel {
    const starterNodeIndex = chain.indexOf(this.getStarterNode(chain));
    const currentNodeIndex = chain.indexOf(node);
    return currentNodeIndex < starterNodeIndex ? NodeExecutionLevel.UPSTREAM : currentNodeIndex > starterNodeIndex ? NodeExecutionLevel.DOWNSTREAM : NodeExecutionLevel.CURRENT;
  }

  public skipExecution(node: Node): boolean {
    if (!this.configuration) {
      const errorMessage = "The configuration has not been initialized. Please contact with the administrator or report and issue to build-chain tool repository";
      LoggerServiceFactory.getInstance().error(errorMessage);
      throw new Error(errorMessage);
    }
    return this.configuration.skipExecution ?
      this.configuration.skipExecution :
      this.configuration.skipProjectExecution ?
        this.configuration.skipProjectExecution.includes(node.project) :
        false;
  }
}