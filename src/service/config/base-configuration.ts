import { EventData, GitConfiguration, ProjectConfiguration } from "@bc/domain/configuration";
import { defaultInputValues, InputValues } from "@bc/domain/inputs";
import { InputService } from "@bc/service/inputs/input-service";
import { LoggerService } from "@bc/service/logger/logger-service";
import { LoggerServiceFactory } from "@bc/service/logger/logger-service-factory";
import { logAndThrow } from "@bc/utils/log";
import { DefinitionFile, getOrderedListForTree, getTree, readDefinitionFile, Tree } from "@kie/build-chain-configuration-reader";
import Container from "typedi";

export abstract class BaseConfiguration {
    protected _gitEventData: EventData;
    protected _gitConfiguration: GitConfiguration;
    protected _sourceProject: ProjectConfiguration;
    protected _targetProject: ProjectConfiguration;
    protected _parsedInputs: InputValues;
    protected _definitionFile: DefinitionFile;
    protected _projectList: Tree;
    protected _projectTree: Tree;
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

    abstract loadProject(): {source: ProjectConfiguration, target: ProjectConfiguration};

    abstract loadGitConfiguration(): GitConfiguration;

    abstract loadGitEvent(): Promise<EventData>;

    abstract loadToken(): void;

    loadParsedInput(): InputValues {
        // parsed inputs will always have the default value. No need to check whether it is empty or not
        return Container.get(InputService).inputs;
    }

    async loadDefinitionFile(): Promise<{definitionFile: DefinitionFile, projectList: Tree, projectTree: Tree}>{
        try {
            const [definitionFile, projectList, projectTree] = await Promise.all([
                readDefinitionFile(this.parsedInputs.definitionFile),
                getOrderedListForTree(this.parsedInputs.definitionFile),
                getTree(this.parsedInputs.definitionFile)
            ]);
            return { definitionFile, projectList, projectTree };
        } catch(err){
            logAndThrow("Invalid definition file");
        }   
    }
}