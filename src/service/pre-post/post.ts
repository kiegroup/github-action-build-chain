import { PrePostExecutor } from "@bc/service/pre-post/pre-post";
import { Inject, Service } from "typedi";

@Service()
export class PostExecutor extends PrePostExecutor {
  private executionSuccess: boolean;

  constructor(@Inject("post.executionSuccess") executionSuccess: boolean) {
    super();
    this.executionSuccess = executionSuccess;
  }

  async run() {
    const post = this.configService.getPost();
    if (post) {
      this.logger.startGroup("[POST] Executing post section");
      if (this.executionSuccess) {
        this.logger.info("[POST] execution result is OK, so 'success' and 'always' sections will be executed");
        if (post.success) {
          await this.execute(post.success);
        }
      } else {
        this.logger.info("[POST] execution result is NOT OK, so 'failure' and 'always' sections will be executed");
        if (post.failure) {
          await this.execute(post.failure);
        }
      }
      if (post.always) {
        await this.execute(post.always);
      }
      this.logger.endGroup();
    }
  }
}
