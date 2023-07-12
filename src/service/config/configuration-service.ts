import Container, { Service } from "typedi";
import { NodeExecutionLevel } from "@bc/domain/node-execution";
import { constants } from "@bc/domain/constants";
import { EntryPoint } from "@bc/domain/entry-point";
import { CLIConfiguration } from "@bc/service/config/cli-configuration";
import { ActionConfiguration } from "@bc/service/config/action-configuration";
import { logAndThrow } from "@bc/utils/log";
import { BaseConfiguration } from "@bc/service/config/base-configuration";
import { TreatmentOptions } from "@bc/domain/treatment-options";
import { ProjectConfiguration, SerializedConfigurationService } from "@bc/domain/configuration";
import { FlowType } from "@bc/domain/inputs";
import { DefinitionFile, Post, Pre, Node, Platform, DEFAULT_GITLAB_PLATFORM, DEFAULT_GITHUB_PLATFORM, PlatformType } from "@kie/build-chain-configuration-reader";
import { DefinitionFileReader } from "@bc/service/config/definition-file-reader";
import { CLIActionType, ToolType } from "@bc/domain/cli";
import { GitTokenService } from "@bc/service/git/git-token-service";
import { Serializable } from "@bc/domain/serializable";

@Service()
export class ConfigurationService 
  implements Serializable<SerializedConfigurationService, ConfigurationService> 
{
  private configuration: BaseConfiguration;
  private tokenService: GitTokenService;
  private _nodeChain: Node[];
  private _definitionFile: DefinitionFile;

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
    this._nodeChain = [];
    this._definitionFile = { version: "2.1" };
    this.tokenService = Container.get(GitTokenService);
  }

  get nodeChain(): Node[] {
    return this._nodeChain;
  }

  get definitionFile(): DefinitionFile {
    return this._definitionFile;
  }

  /**
   * Load all necessary data for the configuration object
   */
  async init() {
    await this.configuration.init();
    const definitionFileReader = new DefinitionFileReader(this.configuration);
    this._definitionFile = await definitionFileReader.getDefinitionFile();
    this._nodeChain = await definitionFileReader.generateNodeChain(this.getStarterProjectName());
  }

  /**
   * Get the name of the start project which produces node chain for build-chain
   * @returns {string}
   */
  getStarterProjectName(): string | undefined {
    return this.configuration.parsedInputs.startProject ??
      process.env.GITHUB_REPOSITORY ??
      this.configuration.gitEventData.base?.repo.full_name;
  }

  /**
   * Get the name of the project triggering build-chain
   * @returns {string}
    */
  getProjectTriggeringTheJobName(): string {
    return process.env.GITHUB_REPOSITORY ??
      this.configuration.gitEventData.base.repo.full_name ??
      this.configuration.parsedInputs.startProject;
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
   * Check whether the given node is the triggering node
   * @param node
   * @returns {Boolean} true if the node is the triggering node
   */
  isNodeTriggeringTheJob(node: Node): boolean {
      return node.project === this.getProjectTriggeringTheJobName();
  }

  /**
   * Finds the starter node
   * @returns {Node} starter node
   */
  getStarterNode(): Node {
    const starterNode = this.nodeChain.find(node => this.isNodeStarter(node));
    if (!starterNode) {
      logAndThrow(`There's no project ${this.getStarterProjectName()} in the chain
            This is normally due the project starting the job (or the one selected to behave like so it's not in the project tree information.
            Please choose a different project like starter or define the project ${this.getStarterProjectName()} in the tree.`);
    }
    return starterNode;
  }

  /**
   * Finds the node triggering the job
   * @returns {Node} starter node
   */
  getProjectTriggeringTheJob(): Node {
    return this.nodeChain.find(node => this.isNodeTriggeringTheJob(node)) ?? this.getStarterNode();
  }

  /**
   * Gets the execution level (current, upstream or downstream) for the given node
   * @param node
   * @returns {NodeExecutionLevel} Upstream, current or downstream
   */
  getNodeExecutionLevel(node: Node): NodeExecutionLevel {
    const starterNodeIndex = this.nodeChain.indexOf(this.getStarterNode());
    const currentNodeIndex = this.nodeChain.indexOf(node);
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
   * Checks whether projects should be executed sequential or parallel
   * @returns {Boolean} true if project execution should be parallel otherwise false
   */
  isParallelExecutionEnabled(): boolean {
    return this.configuration.parsedInputs.enableParallelExecution;
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
    const platform = this.getPlatform(group, repoName);
    const token = this.tokenService.getToken(platform.id, platform.tokenId);
    const oauth2Prefix = platform.type === PlatformType.GITLAB ? "oauth2:" : "";
    const serverUrl = token ? 
      platform.serverUrl.replace("://", `://${oauth2Prefix}${token}@`) : 
      platform.serverUrl;
    return `${serverUrl}/${group}/${repoName}`;
  }

  getPre(): Pre | undefined {
    return this.definitionFile.pre;
  }

  getPost(): Post | undefined {
    return this.definitionFile.post;
  }

  getDefinitionFileUrl(): string {
    return this.configuration.parsedInputs.definitionFile;
  }

  getEventUrl(): string {
    return this.getFlowType() === FlowType.BRANCH ? "" : this.configuration.gitEventData.html_url;
  }

  getGroupName(): string | undefined {
    return this.getFlowType() === FlowType.BRANCH ? this.configuration.parsedInputs.group : undefined;
  }

  getToolType(): ToolType {
    return this.configuration.getToolType();
  }

  isToolsCommand(): boolean {
    return this.configuration.parsedInputs.CLICommand === CLIActionType.TOOLS; 
  }

  failAtEnd(): boolean {
    return this.configuration.parsedInputs.failAtEnd ?? false;
  }

  getPlatform(owner: string, repo: string): Platform {
    const platformId = this.nodeChain.find(n => n.project === `${owner}/${repo}`)?.platformId;
    let platform;
    if (platformId === DEFAULT_GITHUB_PLATFORM.id) {
      platform = DEFAULT_GITHUB_PLATFORM;
    } else if (platformId === DEFAULT_GITLAB_PLATFORM.id) {
      platform = DEFAULT_GITLAB_PLATFORM;
    } else {
      platform = this.getPlatformById(platformId);
    }
    return platform ?? this.configuration.getDefaultPlatformConfig();
  }

  getPlatformById(id?: string) {
    return this.definitionFile.platforms?.find(p => p.id === id);
  }

  toJSON(): SerializedConfigurationService {
    if (this.configuration instanceof CLIConfiguration) {
      return {
        configuration: this.configuration.toJSON(),
        _definitionFile: this._definitionFile,
        _nodeChain: this._nodeChain
      };
    }
    throw new Error("Serialization is enabled only for CLI");
  }

  fromJSON(_json: SerializedConfigurationService): ConfigurationService {
    throw new Error("Use static method");
  }

  static fromJSON(json: SerializedConfigurationService): ConfigurationService {
    return Object.assign(new ConfigurationService(), {
      ...json,
      configuration: CLIConfiguration.fromJSON(json.configuration)
    });
  }
}
