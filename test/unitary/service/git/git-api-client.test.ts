import { constants } from "@bc/domain/constants";
import { EntryPoint } from "@bc/domain/entry-point";
import { ConfigurationService } from "@bc/service/config/configuration-service";
import { GitAPIClient } from "@bc/service/git/git-api-client";
import { GitTokenService } from "@bc/service/git/git-token-service";
import { GitHubAPIClient } from "@bc/service/git/github-api-client";
import { GitlabAPIClient } from "@bc/service/git/gitlab-api-client";
import {
  DEFAULT_GITHUB_PLATFORM,
  DEFAULT_GITLAB_PLATFORM,
  Platform,
} from "@kie/build-chain-configuration-reader";
import "reflect-metadata";
import Container from "typedi";

Container.set(constants.CONTAINER.ENTRY_POINT, EntryPoint.CLI);

describe("rest", () => {
  test.each([
    ["github client", DEFAULT_GITHUB_PLATFORM, GitHubAPIClient, 1, 0],
    ["gitlab client", DEFAULT_GITLAB_PLATFORM, GitlabAPIClient, 0, 1],
  ])(
    "%p",
    (
      _title,
      platform,
      clientInstance,
      numGithubTokenCalls,
      numGitlabTokenCalls
    ) => {
      jest
        .spyOn(ConfigurationService.prototype, "getPlatform")
        .mockReturnValue(platform);
      const githubTokenSpy = jest.spyOn(
        GitTokenService.prototype,
        "setGithubTokenUsingEnv"
      );
      const gitlabTokenSpy = jest.spyOn(
        GitTokenService.prototype,
        "setGitlabTokenUsingEnv"
      );

      const client = new GitAPIClient();
      const client1 = client.rest("owner", "project");
      const client2 = client.rest("owner", "project");

      expect(client1).toBeInstanceOf(
        clientInstance
      );
      expect(client2).toBeInstanceOf(
        clientInstance
      );
      expect(client1).toEqual(client2);
      expect(githubTokenSpy).toHaveBeenCalledTimes(numGithubTokenCalls);
      expect(gitlabTokenSpy).toHaveBeenCalledTimes(numGitlabTokenCalls);
    }
  );

  test("invalid platform", () => {
    jest
      .spyOn(ConfigurationService.prototype, "getPlatform")
      .mockReturnValueOnce({
        type: "some-platform",
      } as unknown as Platform);
    expect(() => new GitAPIClient().rest("owner", "project")).toThrowError();
  });
});
