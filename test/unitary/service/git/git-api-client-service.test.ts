import { constants } from "@bc/domain/constants";
import { EntryPoint } from "@bc/domain/entry-point";
import { ConfigurationService } from "@bc/service/config/configuration-service";
import { GitAPIClient } from "@bc/service/git/git-api-client";
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
    ["github client", DEFAULT_GITHUB_PLATFORM, GitHubAPIClient],
    ["gitlab client", DEFAULT_GITLAB_PLATFORM, GitlabAPIClient],
  ])("%p", (_title, platform, clientInstance) => {
    jest
      .spyOn(ConfigurationService.prototype, "getPlatform")
      .mockReturnValueOnce(platform);
    expect(
      new GitAPIClient().rest("owner", "project")
    ).toBeInstanceOf(clientInstance);
  });

  test("invalid platform", () => {
    jest
      .spyOn(ConfigurationService.prototype, "getPlatform")
      .mockReturnValueOnce({
        type: "some-platform",
      } as unknown as Platform);
    expect(() =>
      new GitAPIClient().rest("owner", "project")
    ).toThrowError();
  });
});
