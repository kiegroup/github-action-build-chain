import { PrePostExecutor } from "@bc/service/pre-post/pre-post";
import { Service } from "typedi";

@Service()
export class PreExecutor extends PrePostExecutor {
  async run() {
    const pre = this.configService.getPre();
    if (pre) {
      this.logger.startGroup("[PRE] Executing pre section");
      await this.execute(pre);
      this.logger.endGroup();
    }
  }
}