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

  constructor() {
    this.config = Container.get(ConfigurationService);
    this.gitTokenService = Container.get(GitTokenService);
  }

  rest(owner: string, repo: string): BaseGitAPIClient {
    const platform = this.config.getPlatform(owner, repo);

    switch (platform.type) {
      case PlatformType.GITHUB:
        this.gitTokenService.setGithubTokenUsingEnv(
          platform.id,
          platform.tokenId
        );
        return new GitHubAPIClient(platform.apiUrl, platform.id);
      case PlatformType.GITLAB:
        this.gitTokenService.setGitlabTokenUsingEnv(
          platform.id,
          platform.tokenId
        );
        return new GitlabAPIClient(platform.apiUrl, platform.id);
      default:
        throw new Error(`${platform} is not supported`);
    }
  }
}
