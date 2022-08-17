import { EventData, GitConfiguration, ProjectConfiguration } from "@bc/domain/configuration";
import { defaultInputValues, FlowType, InputValues } from "@bc/domain/inputs";
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

  abstract loadGitConfiguration(): GitConfiguration;

  abstract loadGitEvent(): Promise<EventData>;

  abstract loadToken(): void;

  abstract getFlowType(): FlowType;

  /**
   * Create the source and target project configuration from the github event payload
   * @returns a new { source: ProjectConfiguration; target: ProjectConfiguration } instance
   */
  loadProject(): { source: ProjectConfiguration; target: ProjectConfiguration } {
    return {
      source: {
        branch: this.gitEventData.head.ref,
        repository: this.gitEventData.head.repo?.full_name,
        name: this.gitEventData.head.repo?.name,
        group: this.gitEventData.head.repo?.owner.login,
      },
      target: {
        branch: this.gitEventData.base.ref,
        repository: this.gitEventData.base.repo.full_name,
        name: this.gitEventData.base.repo.name,
        group: this.gitEventData.base.repo.owner.login,
      },
    };
  }

  /**
   * Validates any user input and returns the stored user input from InputService if there were no errors
   * @returns {InputValues}
   */
  loadParsedInput(): InputValues {
    const inputs: InputValues = Container.get(InputService).inputs;

    // customCommandTreatment values must be of the form: REGEX||REPLACE_REGEX
    inputs.customCommandTreatment?.forEach((cct) => {
      if (cct.split("||").length !== 2) {
        logAndThrow("Invalid format for custom command treatment. Required format: Regex||ReplaceRegex");
      }
    });

    // startProject must be of the form: OWNER/PROJECT
    if (inputs.startProject && inputs.startProject.split("/").length !== 2) {
      logAndThrow("Invalid start project. Start project must be of the form OWNER/PROJECT");
    }

    // parsed inputs will always have the default value. No need to check whether it is empty or not
    return inputs;
  }
}
