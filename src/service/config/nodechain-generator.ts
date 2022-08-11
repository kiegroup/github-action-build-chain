import { Commands } from "@bc/domain/commands";
import { ProjectConfiguration } from "@bc/domain/configuration";
import { constants } from "@bc/domain/constants";
import { FlowType } from "@bc/domain/inputs";
import { Node } from "@bc/domain/node";
import { BaseConfiguration } from "@bc/service/config/base-configuration";
import { LoggerService } from "@bc/service/logger/logger-service";
import { LoggerServiceFactory } from "@bc/service/logger/logger-service-factory";
import { logAndThrow } from "@bc/utils/log";
import {
  Build,
  BuildChainReaderOptions,
  getOrderedListForProject,
  getTreeForProject,
  parentChainFromNode,
  ProjectNode,
  UrlPlaceholders,
} from "@kie/build-chain-configuration-reader";
import Container from "typedi";

export class NodeChainGenerator {
  private configuration: BaseConfiguration;
  private logger: LoggerService;

  constructor(configuration: BaseConfiguration) {
    this.configuration = configuration;
    this.logger = LoggerServiceFactory.getInstance();
  }

  /**
   * converts a string or array of string or undefined into an array of string
   * @param cmd
   * @returns an array of string
   */
  private convertToArray(cmd: string | string[] | undefined): string[] {
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
        upstream: this.convertToArray(after.upstream),
        downstream: this.convertToArray(after.downstream),
        current: this.convertToArray(after.current),
      };
    }
    if (buildInfo?.before) {
      const before = buildInfo.before;
      parsedBuild.before = {
        upstream: this.convertToArray(before.upstream),
        downstream: this.convertToArray(before.downstream),
        current: this.convertToArray(before.current),
      };
    }
    parsedBuild.commands = {
      upstream: this.convertToArray(buildInfo?.upstream),
      downstream: this.convertToArray(buildInfo?.downstream),
      current: this.convertToArray(buildInfo?.current),
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
      // build-chain-configuration-reader package ensures that project is of form owner/name
      project: node.project,
    };
    if (node.dependencies) {
      parsedNode.dependencies = node.dependencies;
    }
    if (node.mapping) {
      parsedNode.mapping = node.mapping;
    }
    if (node.build?.clone) {
      parsedNode.clone = this.convertToArray(node.build.clone);
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
    if (!urlRegex.test(this.configuration.parsedInputs.definitionFile)) {
      return {};
    }

    // all url place holders are of the form ${KEY:DEFAULT} where :DEFAULT is optional
    const placeholderRegex = /\${([^{}:]+)(:([^{}]*))?}/g;
    const matches = [...this.configuration.parsedInputs.definitionFile.matchAll(placeholderRegex)];
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

  private async generateNodeChainWithOptions(starterProject: string, options: BuildChainReaderOptions): Promise<Node[]> {
    let nodeChain: Node[];
    switch (this.configuration.getFlowType()) {
      case FlowType.BRANCH: {
        if (this.configuration.parsedInputs.fullProjectDependencyTree) {
          nodeChain = await getOrderedListForProject(this.configuration.parsedInputs.definitionFile, options);
        } else {
          const node = await getTreeForProject(this.configuration.parsedInputs.definitionFile, starterProject);
          nodeChain = await parentChainFromNode(node);
        }
        break;
      }
      case FlowType.CROSS_PULL_REQUEST: {
        const node = await getTreeForProject(this.configuration.parsedInputs.definitionFile, starterProject);
        nodeChain = await parentChainFromNode(node);
        break;
      }
      case FlowType.FULL_DOWNSTREAM: {
        nodeChain = await getOrderedListForProject(this.configuration.parsedInputs.definitionFile);
        break;
      }
      case FlowType.SINGLE_PULL_REQUEST: {
        nodeChain = [await getTreeForProject(this.configuration.parsedInputs.definitionFile, starterProject)];
      }
    }
    return nodeChain.map((node) => this.parseNode(node));
  }

  async generateNodeChain(starterProject: string): Promise<Node[]> {
    // generate placeholders for definition file url if any (something to consider to shift to buil-chain-configuration-reader project in the future)
    let placeholder: UrlPlaceholders;

    // generate from source
    placeholder = this.generatePlaceholder(this.configuration.sourceProject);
    try {
      return await this.generateNodeChainWithOptions(starterProject, { placeholder, token: Container.get(constants.GITHUB.TOKEN) });
    } catch (err) {
      this.logger.debug("Did not find correct definition on file, trying target");
    }

    // generate from target
    placeholder = this.generatePlaceholder(this.configuration.targetProject);
    try {
      return await this.generateNodeChainWithOptions(starterProject, { placeholder, token: Container.get(constants.GITHUB.TOKEN) });
    } catch (err) {
      logAndThrow("Invalid definition file");
    }
  }
}
