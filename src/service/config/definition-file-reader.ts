import { constants } from "@bc/domain/constants";
import { FlowType } from "@bc/domain/inputs";
import { BaseConfiguration } from "@bc/service/config/base-configuration";
import { BaseLoggerService } from "@bc/service/logger/base-logger-service";
import { LoggerService } from "@bc/service/logger/logger-service";
import { logAndThrow } from "@bc/utils/log";
import {
  DefinitionFile,
  getOrderedListForProject,
  getTreeForProject,
  parentChainFromNode,
  readDefinitionFile,
  Node,
  ReaderOpts,
} from "@kie/build-chain-configuration-reader";
import Container from "typedi";

export class DefinitionFileReader {
  private configuration: BaseConfiguration;
  private logger: BaseLoggerService;

  constructor(configuration: BaseConfiguration) {
    this.configuration = configuration;
    this.logger = Container.get(LoggerService).logger;
  }

  private async generateNodeChainWithOptions(
    starterProject: string,
    options: ReaderOpts
  ): Promise<Node[]> {
    let nodeChain: Node[];
    switch (this.configuration.getFlowType()) {
      case FlowType.BRANCH: {
        if (this.configuration.parsedInputs.fullProjectDependencyTree) {
          nodeChain = await getOrderedListForProject(
            this.configuration.parsedInputs.definitionFile,
            starterProject,
            options
          );
        } else {
          const node = await getTreeForProject(
            this.configuration.parsedInputs.definitionFile,
            starterProject,
            options
          );
          if (!node) {
            throw new Error("Starting project not found");
          }
          nodeChain = parentChainFromNode(node);
        }
        break;
      }
      case FlowType.CROSS_PULL_REQUEST: {
        const node = await getTreeForProject(
          this.configuration.parsedInputs.definitionFile,
          starterProject,
          options
        );
        if (!node) {
          throw new Error("Starting project not found");
        }
        nodeChain = parentChainFromNode(node);
        break;
      }
      case FlowType.FULL_DOWNSTREAM: {
        nodeChain = await getOrderedListForProject(
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

  async getDefinitionFile(): Promise<DefinitionFile> {
    try {
      return await readDefinitionFile(
        this.configuration.parsedInputs.definitionFile,
        {
          ...this.configuration.sourceProject,
          token: Container.get(constants.GITHUB.TOKEN),
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
          token: Container.get(constants.GITHUB.TOKEN),
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
          token: Container.get(constants.GITHUB.TOKEN)
        }
      );
    } catch(err) {
      logAndThrow(`Invalid definition file. ${err}`);
    }
  }

  async generateNodeChain(starterProject: string): Promise<Node[]> {
    try {
      return await this.generateNodeChainWithOptions(starterProject, {
        ...this.configuration.sourceProject,
        token: Container.get(constants.GITHUB.TOKEN),
      });
    } catch (err) {
      this.logger.debug(
        "Did not find correct definition on file, trying target"
      );
    }

    try {
      return await this.generateNodeChainWithOptions(starterProject, {
        ...this.configuration.targetProject,
        token: Container.get(constants.GITHUB.TOKEN),
      });
    } catch (err) {
      this.logger.debug(
        "Did not find correct definition file, trying with default placeholder values"
      );
    }

    try {
      return await this.generateNodeChainWithOptions(starterProject, {
        token: Container.get(constants.GITHUB.TOKEN),
      });
    } catch(err) {
      logAndThrow(`Invalid definition file. ${err}`);
    }
  }
}
