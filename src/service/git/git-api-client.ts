import { ConfigurationService } from "@bc/service/config/configuration-service";
import { BaseGitAPIClient } from "@bc/service/git/base-git-api-client";
import { GitTokenService } from "@bc/service/git/git-token-service";
import { GitHubAPIClient } from "@bc/service/git/github-api-client";
import { GitlabAPIClient } from "@bc/service/git/gitlab-api-client";
import { PlatformType } from "@kie/build-chain-configuration-reader";
import Container from "typedi";

export class GitAPIClient {
  private config: ConfigurationService;
  private gitTokenService: GitTokenService;
  private clients: Record<string, BaseGitAPIClient>;

  constructor() {
    this.config = Container.get(ConfigurationService);
    this.gitTokenService = Container.get(GitTokenService);
    this.clients = {};
  }

  rest(owner: string, repo: string): BaseGitAPIClient {
    const platform = this.config.getPlatform(owner, repo);

    if (!this.clients[platform.id]) {
      this.gitTokenService.setTokenUsingEnv(platform.id, platform.tokenId);
      switch (platform.type) {
        case PlatformType.GITHUB:
          this.clients[platform.id] = new GitHubAPIClient(
            platform.apiUrl,
            platform.id
          );
          break;
        case PlatformType.GITLAB:
          this.clients[platform.id] = new GitlabAPIClient(
            platform.apiUrl,
            platform.id
          );
          break;
        default:
          throw new Error(`${platform} is not supported`);
      }
    }
    return this.clients[platform.id];
  }
}
