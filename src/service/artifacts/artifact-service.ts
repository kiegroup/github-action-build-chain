import Container, { Service } from "typedi";
import { Node } from "@bc/domain/node";
import { ConfigurationService } from "@bc/service/config/configuration-service";
import { UploadService } from "@bc/service/artifacts/upload-service";
import { ArchiveDependencies } from "@bc/domain/archive";
import { LoggerService } from "@bc/service/logger/logger-service";
import { LoggerServiceFactory } from "@bc/service/logger/logger-service-factory";
import { UploadResponse } from "@actions/artifact";

@Service()
export class ArtifactService {
  private readonly configService: ConfigurationService;
  private readonly uploadService: UploadService;
  private readonly logger: LoggerService;

  constructor() {
    this.configService = Container.get(ConfigurationService);
    this.uploadService = Container.get(UploadService);
    this.logger = LoggerServiceFactory.getInstance();
  }

  private getNodesToArchive(nodeChain: Node[]): Node[] {
    const startingProject = this.configService.getStarterNode();
    const dependencies = startingProject.archiveArtifacts?.dependencies ?? ArchiveDependencies.NONE;
    let result: Node[];
    if (dependencies === ArchiveDependencies.NONE) {
      result = [startingProject];
    } else if (dependencies === ArchiveDependencies.ALL) {
      result = nodeChain.filter((node) => !!node.archiveArtifacts);
    } else {
      result = nodeChain.filter((node) => node.archiveArtifacts && (dependencies.includes(node.project) || this.configService.isNodeStarter(node)));
    }
    return result;
  }

  async uploadNodes(nodesChain: Node[]): Promise<PromiseSettledResult<UploadResponse>[]> {
    const nodesToArchive = this.getNodesToArchive(nodesChain);
    this.logger.info(nodesToArchive.length > 0 ? `Archiving artifacts for ${nodesToArchive.map((node) => node.project)}` : "No artifacts to archive");
    const promises = nodesToArchive.map(async (node) => {
      this.logger.info(`Project [${node.project}]. Uploading artifacts...`);
      // archiveArtifacts will exist as it is verified by getNodesToArchive
      return this.uploadService.upload(node.archiveArtifacts!);
    });

    const result = await Promise.allSettled(promises);

    result.forEach((res) => {
      if (res.status === "fulfilled") {
        if (res.value.artifactItems.length > 0) {
          this.logger.info(`Artifact ${res.value.artifactName} uploaded ${res.value.artifactItems.length} files: ${res.value.artifactItems}`);
        }
        if (res.value.failedItems.length > 0) {
          this.logger.info(`Artifact ${res.value.artifactName} failed to upload ${res.value.failedItems.length} files: ${res.value.failedItems}`);
        }
      } else {
        this.logger.info(`Failure in uploading artifacts for one or more nodes: ${res.reason}`);
      }
    });
    return result;
  }
}
