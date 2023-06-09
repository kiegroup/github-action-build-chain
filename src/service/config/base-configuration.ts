import { ToolType } from "@bc/domain/cli";
import { EventData, GitConfiguration, ProjectConfiguration } from "@bc/domain/configuration";
import { defaultInputValues, FlowType, InputValues } from "@bc/domain/inputs";
import { GitTokenService } from "@bc/service/git/git-token-service";
import { InputService } from "@bc/service/inputs/input-service";
import { BaseLoggerService } from "@bc/service/logger/base-logger-service";
import { LoggerService } from "@bc/service/logger/logger-service";
import { logAndThrow } from "@bc/utils/log";
import { DEFAULT_GITHUB_PLATFORM, DEFAULT_GITLAB_PLATFORM, Platform, PlatformType } from "@kie/build-chain-configuration-reader";
import Container from "typedi";

export abstract class BaseConfiguration {
  protected _gitEventData: EventData;
  protected _gitConfiguration: GitConfiguration;
  protected _sourceProject: ProjectConfiguration;
  protected _targetProject: ProjectConfiguration;
  protected _parsedInputs: InputValues;
  protected _defaultPlatform: PlatformType;
  protected readonly logger: BaseLoggerService;
  protected readonly tokenService: GitTokenService;

  constructor() {
    this.logger = Container.get(LoggerService).logger;
    this.tokenService = Container.get(GitTokenService);
    this._defaultPlatform = PlatformType.GITHUB;
    this._parsedInputs = defaultInputValues;
    this._gitEventData = {};
    this._gitConfiguration = {};
    this._sourceProject = {};
    this._targetProject = {};
  }

  async init() {
    this._parsedInputs = this.loadParsedInput();
    this.loadToken();
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
        group: this.gitEventData.head.repo?.owner?.login,
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
    inputs.customCommandTreatment?.forEach(cct => {
      if (cct.split("||").length !== 2) {
        logAndThrow("Invalid format for custom command treatment. Required format: Regex||ReplaceRegex");
      }
    });

    // startProject must be of the form: OWNER/PROJECT
    if (inputs.startProject && inputs.startProject.split("/").length !== 2) {
      logAndThrow("Invalid start project. Start project must be of the form OWNER/PROJECT");
    }

    this.logger.debug(`Received input: ${JSON.stringify(inputs)}`);

    // parsed inputs will always have the default value. No need to check whether it is empty or not
    return inputs;
  }

  getToolType(): ToolType {
    logAndThrow("tools are defined only in CLI");
  }

  getDefaultGithubConfig(): Platform {
    return {
      id: this.parsedInputs?.defaultGithubId ?? DEFAULT_GITHUB_PLATFORM.id,
      tokenId: this.parsedInputs?.defaultGithubTokenId ?? DEFAULT_GITHUB_PLATFORM.tokenId,
      apiUrl: this.parsedInputs?.defaultGithubApiUrl ?? process.env.GITHUB_API_URL ?? DEFAULT_GITHUB_PLATFORM.apiUrl,
      serverUrl: this.parsedInputs?.defaultGithubServeUrl ?? process.env.GITHUB_SERVER_URL ?? DEFAULT_GITHUB_PLATFORM.serverUrl,
      type: PlatformType.GITHUB
    };
  }

  getDefaultGitlabConfig(): Platform {
    return {
      id: this.parsedInputs?.defaultGitlabId ?? DEFAULT_GITLAB_PLATFORM.id,
      tokenId: this.parsedInputs?.defaultGitlabTokenId ?? DEFAULT_GITLAB_PLATFORM.tokenId,
      apiUrl: this.parsedInputs?.defaultGitlabApiUrl ?? process.env.CI_API_URL ?? DEFAULT_GITLAB_PLATFORM.apiUrl,
      serverUrl: this.parsedInputs?.defaultGitlabServeUrl ?? process.env.CI_SERVER_URL ?? DEFAULT_GITLAB_PLATFORM.serverUrl,
      type: PlatformType.GITLAB
    };
  }

  getDefaultPlatformConfig(): Platform {
    if (this._defaultPlatform === PlatformType.GITLAB) {
      return this.getDefaultGitlabConfig();
    }
    return this.getDefaultGithubConfig();
  }
}
