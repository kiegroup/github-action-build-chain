import { Commands } from "@bc/domain/commands";
import { EventData, GitConfiguration, ProjectConfiguration } from "@bc/domain/configuration";
import { defaultInputValues, InputValues } from "@bc/domain/inputs";
import { Node } from "@bc/domain/node";
import { InputService } from "@bc/service/inputs/input-service";
import { LoggerService } from "@bc/service/logger/logger-service";
import { LoggerServiceFactory } from "@bc/service/logger/logger-service-factory";
import { logAndThrow } from "@bc/utils/log";
import { Build, DefinitionFile, getOrderedListForTree, getTree, ProjectNode, readDefinitionFile } from "@kie/build-chain-configuration-reader";
import Container from "typedi";

export abstract class BaseConfiguration {
    protected _gitEventData: EventData;
    protected _gitConfiguration: GitConfiguration;
    protected _sourceProject: ProjectConfiguration;
    protected _targetProject: ProjectConfiguration;
    protected _parsedInputs: InputValues;
    protected _definitionFile: DefinitionFile;
    protected _projectList: Node[];
    protected _projectTree: Node[];
    protected readonly logger: LoggerService;
    
    constructor() {
        this.logger = LoggerServiceFactory.getInstance();
        this._parsedInputs = defaultInputValues;
        this._gitEventData = {};
        this._gitConfiguration = {};
        this._sourceProject = {};
        this._targetProject = {};
        this._definitionFile = {version: "2.1"};
        this._projectList = [];
        this._projectTree = [];
    }

    async init() {
        this.loadToken();
        this._parsedInputs = this.loadParsedInput();
        this._gitEventData = await this.loadGitEvent();
        this._gitConfiguration = this.loadGitConfiguration();
        const { source, target } = this.loadProject();
        this._sourceProject = source;
        this._targetProject = target;
        const { definitionFile, projectList, projectTree } = await this.loadDefinitionFile(); 
        this._definitionFile = definitionFile;
        this._projectList = projectList;
        this._projectTree = projectTree;
    }

    get gitEventData(): EventData {
        return this._gitEventData;
    }

    get gitConfiguration(): GitConfiguration {
        return this._gitConfiguration;
    }

    get sourceProject(): ProjectConfiguration {
        return this._sourceProject;
    }

    get targetProject(): ProjectConfiguration {
        return this._targetProject;
    }
    
    get parsedInputs(): InputValues {
        return this._parsedInputs;
    }

    get definitionFile(): DefinitionFile {
        return this._definitionFile;
    }

    get projectList(): Node[] {
        return this._projectList;
    }

    get projectTree(): Node[] {
        return this._projectTree;
    }

    abstract loadProject(): {source: ProjectConfiguration, target: ProjectConfiguration};

    abstract loadGitConfiguration(): GitConfiguration;

    abstract loadGitEvent(): Promise<EventData>;

    abstract loadToken(): void;

    loadParsedInput(): InputValues {
        // parsed inputs will always have the default value. No need to check whether it is empty or not
        return Container.get(InputService).inputs;
    }

    private parseCommand(cmd: string | string[] | undefined): string[] {
        return cmd ? (Array.isArray(cmd) ? cmd : [cmd]) : [];
    }

    private parseBuild(build: Build): {before?: Commands, commands?: Commands, after?: Commands} {
        const buildInfo = build["build-command"];
        const parsedBuild: {before?: Commands, commands?: Commands, after?: Commands} = {};
        if (buildInfo?.after) {
            const after = buildInfo.after;
            parsedBuild.after = {
                upstream: this.parseCommand(after.upstream),
                downstream: this.parseCommand(after.downstream),
                current: this.parseCommand(after.current)
            };
        }
        if (buildInfo?.before) {
            const before = buildInfo.before;
            parsedBuild.before = {
                upstream: this.parseCommand(before.upstream),
                downstream: this.parseCommand(before.downstream),
                current: this.parseCommand(before.current)
            };
        }
        parsedBuild.commands = {
            upstream: this.parseCommand(buildInfo?.upstream),
            downstream: this.parseCommand(buildInfo?.downstream),
            current: this.parseCommand(buildInfo?.current)
        };
        return parsedBuild;
    }

    private parseNode(node: ProjectNode): Node {
        const parsedNode: Node = {
            project: node.project,
        };
        if (node.dependencies) {parsedNode.dependencies = node.dependencies;}
        if (node.parent) {
            const parent = node.parent.map((parentNode) => this.parseNode(parentNode));
            parsedNode.parents = parent;
        }
        if (node.children) {
            const children = node.children.map((childNode) => this.parseNode(childNode));
            parsedNode.children = children;
        }
        if (node.build && node.build["build-command"]) {
            const {before, commands, after} = this.parseBuild(node.build);
            parsedNode.after = after;
            parsedNode.before = before;
            parsedNode.commands = commands;
        }
        return parsedNode;
    }
     
    async loadDefinitionFile(): Promise<{definitionFile: DefinitionFile, projectList: Node[], projectTree: Node[]}>{
        try {
            const [definitionFile, projectList, projectTree] = await Promise.all([
                readDefinitionFile(this.parsedInputs.definitionFile),
                getOrderedListForTree(this.parsedInputs.definitionFile),
                getTree(this.parsedInputs.definitionFile)
            ]);
            return { definitionFile, projectList: projectList.map((node) => this.parseNode(node)), projectTree: projectTree.map((node) => this.parseNode(node)) };
        } catch(err){
            logAndThrow("Invalid definition file");
        }   
    }
}