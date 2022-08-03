import Container, { Service } from "typedi";
import { Node } from "@bc/domain/node";
import { ConfigurationService } from "@bc/service/config/configuration-service";
import { UploadService } from "@bc/service/archive/upload-service";
import { ArchiveDependencies } from "@bc/domain/archive";
import { LoggerService } from "@bc/service/logger/logger-service";
import { LoggerServiceFactory } from "@bc/service/logger/logger-service-factory";

@Service()
export class ArchiveService {
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
    if (dependencies === ArchiveDependencies.NONE) {
      return [startingProject];
    } else if (dependencies === ArchiveDependencies.ALL) {
      return nodeChain.filter((node) => {
        !!node.archiveArtifacts;
      });
    } else {
      return nodeChain.filter((node) => {
        node.archiveArtifacts && (dependencies.includes(node.project) || node.project === startingProject.project);
      });
    }
  }

  async uploadNodes(nodesChain: Node[]) {
    const nodesToArchive = this.getNodesToArchive(nodesChain);
    this.logger.info(nodesToArchive.length > 0 ? `Archiving artifacts for ${nodesToArchive.map((node) => node.project)}` : "No artifacts to archive");
    const promises = nodesToArchive.map((node) => {
      this.logger.info(`Project [${node.project}]. Uploading artifacts...`);
      // archiveArtifacts will exist as it is verified by getNodesToArchive
      return this.uploadService.upload(node.archiveArtifacts!).then((res) => {
        if (res.artifactItems.length > 0) {
          this.logger.info(`Uploaded items ${res.artifactItems.length}: ${res.artifactItems}`);
        }
      });
    });

    return Promise.allSettled(promises);
    // let printing of archive summary be done by the job summary service
  }
}
