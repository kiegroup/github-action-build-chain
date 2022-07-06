import { EventData, GitConfiguration, ProjectConfiguration } from "@bc/domain/configuration";
import { defaultInputValues, InputValues } from "@bc/domain/inputs";
import { InputService } from "@bc/service/inputs/input-service";
import { LoggerService } from "@bc/service/logger/logger-service";
import { LoggerServiceFactory } from "@bc/service/logger/logger-service-factory";
import { logAndThrow } from "@bc/utils/log";
import Container from "typedi";

export abstract class BaseConfiguration {
    protected _gitEventData: EventData;
    protected _gitConfiguration: GitConfiguration;
    protected _sourceProject: ProjectConfiguration;
    protected _targetProject: ProjectConfiguration;
    protected _parsedInputs: InputValues;
    protected readonly logger: LoggerService;
    
    constructor() {
        this.logger = LoggerServiceFactory.getInstance();
        this._parsedInputs = defaultInputValues;
        this._gitEventData = {};
        this._gitConfiguration = {};
        this._sourceProject = {};
        this._targetProject = {};
    }

    async init() {
        this.loadToken();
        this._parsedInputs = this.loadParsedInput();
        this._gitEventData = await this.loadGitEvent();
        this._gitConfiguration = this.loadGitConfiguration();
        const { source, target } = this.loadProject();
        this._sourceProject = source;
        this._targetProject = target;
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
        const input = Container.get(InputService).inputs;
        if (Object.keys(input).length === 0) {
            const errorMessage = "The configuration has not been initialized. Please contact with the administrator or report and issue to build-chain tool repository";
            logAndThrow(errorMessage);
        }
        return input;
    }
}