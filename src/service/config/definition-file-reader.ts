import { CLIActionType, ToolType } from "@bc/domain/cli";
import { FlowType } from "@bc/domain/inputs";
import { BaseConfiguration } from "@bc/service/config/base-configuration";
import { GitTokenService } from "@bc/service/git/git-token-service";
import { BaseLoggerService } from "@bc/service/logger/base-logger-service";
import { LoggerService } from "@bc/service/logger/logger-service";
import { logAndThrow } from "@bc/utils/log";
import {
  DefinitionFile,
  getTreeForProject,
  readDefinitionFile,
  Node,
  ReaderOpts,
  getFullDownstreamProjects,
  getUpstreamProjects,
  Platform
} from "@kie/build-chain-configuration-reader";
import Container from "typedi";

export class DefinitionFileReader {
  private configuration: BaseConfiguration;
  private logger: BaseLoggerService;
  private tokenService: GitTokenService;
  private defaultPlatform: Platform;

  constructor(configuration: BaseConfiguration) {
    this.configuration = configuration;
    this.logger = Container.get(LoggerService).logger;
    this.tokenService = Container.get(GitTokenService);
    this.defaultPlatform = configuration.getDefaultPlatformConfig();
  }

  private async getUpstreamOrFullDownstreamProjects(starterProject: string, options: ReaderOpts): Promise<Node[]> {
    if (this.configuration.parsedInputs.fullProjectDependencyTree) {
      return getFullDownstreamProjects(
        this.configuration.parsedInputs.definitionFile,
        starterProject,
        options
      );
    } else {
      return getUpstreamProjects(
        this.configuration.parsedInputs.definitionFile,
        starterProject,
        options
      );
    }
  }

  private async generateNodeChainWithOptions(
    starterProject: string,
    options: ReaderOpts
  ): Promise<Node[]> {
    let nodeChain: Node[];
    switch (this.configuration.getFlowType()) {
      case FlowType.BRANCH: {
        nodeChain = await this.getUpstreamOrFullDownstreamProjects(
          starterProject, 
          options
        );
        break;
      }
      case FlowType.CROSS_PULL_REQUEST: {
        nodeChain = await getUpstreamProjects(
          this.configuration.parsedInputs.definitionFile,
          starterProject,
          options
        );
        break;
      }
      case FlowType.FULL_DOWNSTREAM: {
        nodeChain = await getFullDownstreamProjects(
          this.configuration.parsedInputs.definitionFile,
          starterProject,
          options
        );
        break;
      }
      case FlowType.SINGLE_PULL_REQUEST: {
        const node = await getTreeForProject(
          this.configuration.parsedInputs.definitionFile,
          starterProject,
          options
        );
        if (!node) {
          throw new Error("Starting project not found");
        }
        nodeChain = [node];
      }
    }
    return nodeChain;
  }

  async getDefinitionFileForBuild(): Promise<DefinitionFile> {
    try {
      return await readDefinitionFile(
        this.configuration.parsedInputs.definitionFile,
        {
          ...this.configuration.sourceProject,
          token: this.tokenService.getToken(this.defaultPlatform.id),
        }
      );
    } catch (err) {
      this.logger.debug(
        "Did not find correct definition file, trying target"
      );
    }

    try {
      return await readDefinitionFile(
        this.configuration.parsedInputs.definitionFile,
        {
          ...this.configuration.targetProject,
          token: this.tokenService.getToken(this.defaultPlatform.id),
        }
      );
    } catch (err) {
      this.logger.debug(
        "Did not find correct definition file, trying with default placeholder values"
      );
    }

    try {
      return await readDefinitionFile(
        this.configuration.parsedInputs.definitionFile, { 
          token: this.tokenService.getToken(this.defaultPlatform.id)
        }
      );
    } catch(err) {
      logAndThrow(`Invalid definition file. ${err}`);
    }
  }

  async getDefinitionFileForTools(): Promise<DefinitionFile> {
    switch(this.configuration.getToolType()) {
      case ToolType.PROJECT_LIST:
        return this.getDefinitionFileForBuild();
      case ToolType.PLAN:
      case ToolType.RESUME:
            return { version: "2.1" };
      default:
        logAndThrow(`Invalid tool ${this.configuration.getToolType()}`);
    }
  }

  async generateNodeChainForBuild(starterProject: string): Promise<Node[]> {
    try {
      return await this.generateNodeChainWithOptions(starterProject, {
        ...this.configuration.sourceProject,
        token: this.tokenService.getToken(this.defaultPlatform.id),
      });
    } catch (err) {
      this.logger.debug(
        "Did not find correct definition on file, trying target"
      );
    }

    try {
      return await this.generateNodeChainWithOptions(starterProject, {
        ...this.configuration.targetProject,
        token: this.tokenService.getToken(this.defaultPlatform.id),
      });
    } catch (err) {
      this.logger.debug(
        "Did not find correct definition file, trying with default placeholder values"
      );
    }

    try {
      return await this.generateNodeChainWithOptions(starterProject, {
        token: this.tokenService.getToken(this.defaultPlatform.id),
      });
    } catch(err) {
      logAndThrow(`Invalid definition file. ${err}`);
    }
  }

  async generateNodeChainForTools(starterProject?: string): Promise<Node[]> {
    switch(this.configuration.getToolType()) {
      case ToolType.PROJECT_LIST:
        if (starterProject) {
          return this.getUpstreamOrFullDownstreamProjects(
            starterProject, {token: this.tokenService.getToken(this.defaultPlatform.id)}
          );
        }
        throw logAndThrow("Start project needs to be defined or build chain must be run in a Github environment");
      case ToolType.PLAN:
      case ToolType.RESUME:
            return [];
      default:
        logAndThrow(`Invalid tool ${this.configuration.getToolType()}`);
    }
  }

  async generateNodeChain(starterProject?: string): Promise<Node[]> {
    if (this.configuration.parsedInputs.CLICommand === CLIActionType.TOOLS) {
      return this.generateNodeChainForTools(starterProject);
    } else {
      if (starterProject) {
        return this.generateNodeChainForBuild(starterProject);
      }
      throw logAndThrow("Start project needs to be defined or build chain must be run in a Github environment");
    }
  }

  async getDefinitionFile(): Promise<DefinitionFile> {
    if (this.configuration.parsedInputs.CLICommand === CLIActionType.TOOLS) {
      return this.getDefinitionFileForTools();
    } else {
      return this.getDefinitionFileForBuild();
    }
  }
}
