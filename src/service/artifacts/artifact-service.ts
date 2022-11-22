import Container, { Service } from "typedi";
import { Node, ArchiveDependencies } from "@kie/build-chain-configuration-reader";
import { UploadService } from "@bc/service/artifacts/upload-service";
import { LoggerService } from "@bc/service/logger/logger-service";
import { LoggerServiceFactory } from "@bc/service/logger/logger-service-factory";
import { UploadResponse } from "@actions/artifact";

@Service()
export class ArtifactService {
  private readonly uploadService: UploadService;
  private readonly logger: LoggerService;

  constructor() {
    this.uploadService = Container.get(UploadService);
    this.logger = LoggerServiceFactory.getInstance();
  }

  private getNodesToArchive(nodeChain: Node[], startingNode: Node): Node[] {
    const dependencies = startingNode.archiveArtifacts?.dependencies ?? ArchiveDependencies.NONE;
    let result: Node[];
    switch (dependencies) {
      case ArchiveDependencies.NONE:
        result = [startingNode];
        break;
      case ArchiveDependencies.ALL:
        result = nodeChain.filter(node => !!node.archiveArtifacts);
        break;
      default:
        result = nodeChain.filter(node => node.archiveArtifacts && (dependencies.includes(node.project) || node.project === startingNode.project));
    }
    return result;
  }

  async uploadNodes(nodeChain: Node[], startingNode: Node): Promise<PromiseSettledResult<UploadResponse>[]> {
    const nodesToArchive = this.getNodesToArchive(nodeChain, startingNode);
    this.logger.info(nodesToArchive.length > 0 ? `Archiving artifacts for ${nodesToArchive.map(node => node.project)}` : "No artifacts to archive");
    const promises = nodesToArchive.map(async node => {
      this.logger.info(`Project [${node.project}]. Uploading artifacts...`);
      // archiveArtifacts will exist as it is verified by getNodesToArchive
      return this.uploadService.upload(node.archiveArtifacts!, node.project);
    });

    const result = await Promise.allSettled(promises);

    result.forEach(res => {
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
