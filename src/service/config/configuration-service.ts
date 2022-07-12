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
        const starterNode = this.configuration.projectList.find(node => this.isNodeStarter(node));
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
        return currentNodeIndex < starterNodeIndex ? NodeExecutionLevel.UPSTREAM : currentNodeIndex > starterNodeIndex ? NodeExecutionLevel.DOWNSTREAM : NodeExecutionLevel.CURRENT;
    }

    /**
     * Checks whether execution needs to be skipped for the given node
     * @param node 
     * @returns {Boolean} true if execution needs to be skipped otherwise false
     */
    skipExecution(node: Node): boolean {
        return this.configuration.parsedInputs.skipExecution ?
                this.configuration.parsedInputs.skipExecution :
                this.configuration.parsedInputs.skipProjectExecution ?
                this.configuration.parsedInputs.skipProjectExecution.includes(node.project) :
                false;
    }

    /**
     * Parses user input from custom command treatment option to create the treatment option object
     * @returns {TreatmentOptions} Construct the treatment options domain object
     */
    getTreatmentOptions(): TreatmentOptions {
        if (this.configuration.parsedInputs.customCommandTreatment) {
            return {
                replaceExpressions: this.configuration.parsedInputs.customCommandTreatment
            };
        }
        return {};
    }
}