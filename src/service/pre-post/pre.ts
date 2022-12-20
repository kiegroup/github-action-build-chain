import { ExecuteCommandResult } from "@bc/domain/execute-command-result";
import { PrePostExecutor } from "@bc/service/pre-post/pre-post";
import { Service } from "typedi";

@Service()
export class PreExecutor extends PrePostExecutor {
  async run(): Promise<ExecuteCommandResult[]> {
    const pre = this.configService.getPre();
    let result: ExecuteCommandResult[] = [];
    if (pre) {
      this.logger.startGroup("Executing pre section");
      result = await this.execute(pre);
      this.logger.endGroup();
    }
    return result;
  }
}