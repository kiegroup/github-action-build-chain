import { ExecuteCommandResult } from "@bc/domain/execute-command-result";
import { PrePostExecutor } from "@bc/service/pre-post/pre-post";
import { Inject, Service } from "typedi";

@Service()
export class PostExecutor extends PrePostExecutor {
  private executionSuccess: boolean;

  constructor(@Inject("post.executionSuccess") executionSuccess: boolean) {
    super();
    this.executionSuccess = executionSuccess;
  }

  async run(): Promise<ExecuteCommandResult[]> {
    const post = this.configService.getPost();
    let result: ExecuteCommandResult[] = [];
    if (post) {
      this.logger.startGroup("Executing post section");
      if (this.executionSuccess) {
        this.logger.info("execution result is OK, so 'success' and 'always' sections will be executed");
        if (post.success) {
          result = await this.execute(post.success);
        }
      } else {
        this.logger.info("execution result is NOT OK, so 'failure' and 'always' sections will be executed");
        if (post.failure) {
          result = await this.execute(post.failure);
        }
      }
      if (post.always) {
        result = [...result, ...await this.execute(post.always)];
      }
      this.logger.endGroup();
    }
    return result;
  }
}
