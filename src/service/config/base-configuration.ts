import { Commands } from "@bc/domain/commands";
import { EventData, GitConfiguration, ProjectConfiguration } from "@bc/domain/configuration";
import { constants } from "@bc/domain/constants";
import { defaultInputValues, InputValues } from "@bc/domain/inputs";
import { Node } from "@bc/domain/node";
import { InputService } from "@bc/service/inputs/input-service";
import { LoggerService } from "@bc/service/logger/logger-service";
import { LoggerServiceFactory } from "@bc/service/logger/logger-service-factory";
import { logAndThrow } from "@bc/utils/log";
import {
  Build,
  BuildChainReaderOptions,
  DefinitionFile,
  getOrderedListForTree,
  getTree,
  ProjectNode,
  readDefinitionFile,
  UrlPlaceholders,
} from "@kie/build-chain-configuration-reader";
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
    this._definitionFile = { version: "2.1" };
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

  abstract loadProject(): { source: ProjectConfiguration; target: ProjectConfiguration };

  abstract loadGitConfiguration(): GitConfiguration;

  abstract loadGitEvent(): Promise<EventData>;

  abstract loadToken(): void;

  /**
   * Validates any user input and returns the stored user input from InputService if there were no errors
   * @returns {InputValues}
   */
  loadParsedInput(): InputValues {
    const inputs: InputValues = Container.get(InputService).inputs;
    // validate any input that needs to be in a certain way
    inputs.customCommandTreatment?.forEach((cct) => {
      if (cct.split("||").length !== 2) {
        logAndThrow("Invalid format for custom command treatment. Required format: Regex||ReplaceRegex");
      }
    });

    // parsed inputs will always have the default value. No need to check whether it is empty or not
    return inputs;
  }

  /**
   * converts a string or array of string or undefined into an array of string
   * @param cmd
   * @returns an array of string
   */
  private parseCommand(cmd: string | string[] | undefined): string[] {
    if (cmd) {
      return Array.isArray(cmd) ? cmd : [cmd];
    }
    return [];
  }

  /**
   * parse the build-command section of ProjectNode. Produces all the 3 different execution phases
   * @param build
   * @returns
   */
  private parseBuild(build: Build): { before?: Commands; commands?: Commands; after?: Commands } {
    const buildInfo = build["build-command"];
    const parsedBuild: { before?: Commands; commands?: Commands; after?: Commands } = {};
    if (buildInfo?.after) {
      const after = buildInfo.after;
      parsedBuild.after = {
        upstream: this.parseCommand(after.upstream),
        downstream: this.parseCommand(after.downstream),
        current: this.parseCommand(after.current),
      };
    }
    if (buildInfo?.before) {
      const before = buildInfo.before;
      parsedBuild.before = {
        upstream: this.parseCommand(before.upstream),
        downstream: this.parseCommand(before.downstream),
        current: this.parseCommand(before.current),
      };
    }
    parsedBuild.commands = {
      upstream: this.parseCommand(buildInfo?.upstream),
      downstream: this.parseCommand(buildInfo?.downstream),
      current: this.parseCommand(buildInfo?.current),
    };
    return parsedBuild;
  }

  /**
   * Convert ProjectNode to Node so that other services can use the info produced from build-chain-configuration reader
   * @param node
   * @returns
   */
  private parseNode(node: ProjectNode): Node {
    const parsedNode: Node = {
      project: node.project,
    };
    if (node.dependencies) {
      parsedNode.dependencies = node.dependencies;
    }
    if (node.parent) {
      const parent = node.parent.map((parentNode) => this.parseNode(parentNode));
      parsedNode.parents = parent;
    }
    if (node.children) {
      const children = node.children.map((childNode) => this.parseNode(childNode));
      parsedNode.children = children;
    }
    if (node.build && node.build["build-command"]) {
      const { before, commands, after } = this.parseBuild(node.build);
      parsedNode.after = after;
      parsedNode.before = before;
      parsedNode.commands = commands;
    }
    return parsedNode;
  }

  /**
   * Generates placeholders values required to replace any place holders in the definition file url
   * @param project source or target project configuration data
   * @returns
   */
  generatePlaceholder(project: ProjectConfiguration): UrlPlaceholders {
    // check whether definition file is a url or not
    const urlRegex = /^https?/;
    if (!urlRegex.test(this.parsedInputs.definitionFile)) { return {}; }

    // all url place holders are of the form ${KEY:DEFAULT} where :DEFAULT is optional
    const placeholderRegex = /\${([^{}:]+)(:([^{}]*))?}/g;
    const matches = [...this.parsedInputs.definitionFile.matchAll(placeholderRegex)];
    const placeholder: UrlPlaceholders = {};
    matches.forEach((match) => {
      const key = match[1];
      // if env variable exists for the key use that otherwise use default value
      const defaultValue = process.env[key] ?? match[3];
      if (key === "GROUP") {
        placeholder["GROUP"] = project.group ?? defaultValue;
      } else if (key === "PROJECT_NAME") {
        placeholder["PROJECT_NAME"] = project.name ?? defaultValue;
      } else if (key === "BRANCH") {
        placeholder["BRANCH"] = project.branch ?? defaultValue;
      } else {
        placeholder[key] = defaultValue;
      }
    });
    return placeholder;
  }

  /**
   * Parse definition file with url placeholder and token passed as option
   * @param options placeholder values and token
   * @returns
   */
  private async loadDefinitionFileWithOptions(
    options: BuildChainReaderOptions
  ): Promise<{ definitionFile: DefinitionFile; projectList: Node[]; projectTree: Node[] }> {
    const [definitionFile, projectList, projectTree] = await Promise.all([
      readDefinitionFile(this.parsedInputs.definitionFile, options),
      getOrderedListForTree(this.parsedInputs.definitionFile, options),
      getTree(this.parsedInputs.definitionFile, options),
    ]);
    return {
      definitionFile,
      projectList: projectList.map((node) => this.parseNode(node)),
      projectTree: projectTree.map((node) => this.parseNode(node)),
    };
  }

  /**
   * Load the definition file as is in the form of an object, get the project tree and project list
   * @returns
   */
  async loadDefinitionFile(): Promise<{ definitionFile: DefinitionFile; projectList: Node[]; projectTree: Node[] }> {
    // generate placeholders for definition file url if any (something to consider to shift to buil-chain-configuration-reader project in the future)
    let placeholder: UrlPlaceholders;

    // generate from source
    placeholder = this.generatePlaceholder(this.sourceProject);
    try {
      return await this.loadDefinitionFileWithOptions({ placeholder, token: Container.get(constants.GITHUB.TOKEN) });
    } catch (err) {
      this.logger.debug("Did not find correct definition on file, trying target");
    }

    // generate from target
    placeholder = this.generatePlaceholder(this.targetProject);
    try {
      return await this.loadDefinitionFileWithOptions({ placeholder, token: Container.get(constants.GITHUB.TOKEN) });
    } catch (err) {
      logAndThrow("Invalid definition file");
    }
  }
}
