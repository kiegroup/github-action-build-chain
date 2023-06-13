import { Pulls, Repo } from "@bc/domain/base-git-api-client";
import { GitTokenService } from "@bc/service/git/git-token-service";
import { BaseLoggerService } from "@bc/service/logger/base-logger-service";
import { LoggerService } from "@bc/service/logger/logger-service";
import Container from "typedi";

export abstract class BaseGitAPIClient {
  protected tokenService: GitTokenService;
  protected tokenServiceId: string;
  protected baseUrl: string;
  protected logger: BaseLoggerService;

  constructor(baseUrl: string, tokenServiceId: string) {
    this.tokenService = Container.get(GitTokenService);
    this.tokenServiceId = tokenServiceId;
    this.baseUrl = baseUrl;
    this.logger = Container.get(LoggerService).logger;
  }

  abstract get repos(): {
    getBranch: (
      args: Repo["getBranch"]["parameters"]
    ) => Promise<Repo["getBranch"]["response"]>;
    get: (args: Repo["get"]["parameters"]) => Promise<Repo["get"]["response"]>;
    listForkName: (
      args: Repo["listForkName"]["parameters"]
    ) => Promise<Repo["listForkName"]["response"]>;
    getForkNameForTargetRepoGivenSourceOwner: (
      args: Repo["getForkNameForTargetRepoGivenSourceOwner"]["parameters"]
    ) => Promise<Repo["getForkNameForTargetRepoGivenSourceOwner"]["response"]>;
  };

  abstract get pulls(): {
    list: (
      args: Pulls["list"]["parameters"]
    ) => Promise<Pulls["list"]["response"]>;
    get: (
      args: Pulls["get"]["parameters"]
    ) => Promise<Pulls["get"]["response"]>;
  };
}
