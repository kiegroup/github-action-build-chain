import Container, { Service } from "typedi";
import { Node } from "@bc/domain/node";
import { NodeExecutionLevel } from "@bc/domain/node-execution-level";
import { LoggerServiceFactory } from "@bc/service/logger/logger-service-factory";
import { constants } from "@bc/domain/constants";
import { LoggerService } from "@bc/service/logger/logger-service";
import { EntryPoint } from "@bc/domain/entry-point";
import { CLIConfiguration } from "@bc/service/config/cli-configuration";
import { ActionConfiguration } from "@bc/service/config/action-configuration";
import { logAndThrow } from "@bc/utils/log";
import { BaseConfiguration } from "@bc/service/config/base-configuration";

@Service()
export class ConfigurationService {

    private logger: LoggerService;
    private configuration: BaseConfiguration;

    constructor() {
        this.logger = LoggerServiceFactory.getInstance();
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

    async init() {
        await this.configuration.init();
    }

    /**
     * Get the name of the project starting the build-chain
     * @returns {string}
     */
    getStarterProjectName(): string {
        const startProject = this.configuration.parsedInputs.startProject ?? process.env.GITHUB_REPOSITORY;
        if (startProject) {return startProject;}
        logAndThrow("Start project needs to be defined or build chain must be run in a Github environment");
    }

    isNodeStarter(node: Node): boolean {
        return node.project === this.getStarterProjectName();
    }

    getStarterNode(chain: Node[]): Node {
        const starterNode = chain.find(node => this.isNodeStarter(node));
        if (!starterNode) {
            const errorMessage = `There's no project ${this.getStarterProjectName()} in the chain. This is normally due the project starting 
                                  the job (or the one selected to behave like so it's not in the project tree information. Please choose a 
                                  different project like starter or define the project ${this.getStarterProjectName()} in the tree.`;
            logAndThrow(errorMessage);
        }
        return starterNode;
    }

    getNodeExecutionLevel(node: Node, chain: Node[]): NodeExecutionLevel {
        const starterNodeIndex = chain.indexOf(this.getStarterNode(chain));
        const currentNodeIndex = chain.indexOf(node);
        return currentNodeIndex < starterNodeIndex ? NodeExecutionLevel.UPSTREAM : currentNodeIndex > starterNodeIndex ? NodeExecutionLevel.DOWNSTREAM : NodeExecutionLevel.CURRENT;
    }

    skipExecution(node: Node): boolean {
        return this.configuration.parsedInputs.skipExecution ?
                this.configuration.parsedInputs.skipExecution :
                this.configuration.parsedInputs.skipProjectExecution ?
                this.configuration.parsedInputs.skipProjectExecution.includes(node.project) :
                false;
    }
}