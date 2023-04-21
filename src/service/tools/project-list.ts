import { Tools } from "@bc/service/tools/abstract-tools";

export class ProjectList extends Tools {
  async execute(): Promise<void> {
    this.logger.logger.log(this.configService.nodeChain.map(node => node.project).join("\n"));
  }
}