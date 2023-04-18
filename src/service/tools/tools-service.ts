import { ToolType } from "@bc/domain/cli";
import { Tools } from "@bc/service/tools/abstract-tools";
import { ProjectList } from "@bc/service/tools/project-list";
import { logAndThrow } from "@bc/utils/log";
import { Service } from "typedi";

@Service()
export class ToolService extends Tools {
  async execute(): Promise<void> {
    let tool: Tools;
    switch(this.configService.getToolType()) {
      case ToolType.PROJECT_LIST:
        tool = new ProjectList();
        break;
      default:
        logAndThrow("Tool not found");
    }
    return tool.execute();
  }
} 