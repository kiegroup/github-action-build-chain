import { EventData } from "@bc/domain/configuration";
import { GitTokenService } from "@bc/service/git/git-token-service";
import { BaseLoggerService } from "@bc/service/logger/base-logger-service";
import { LoggerService } from "@bc/service/logger/logger-service";
import Container from "typedi";

type Response<T> = {
  status: number;
  data: T;
};

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
    getBranch: (args: {
      owner: string;
      repo: string;
      branch: string;
    }) => Promise<Response<unknown>>;
    get: (args: { owner: string; repo: string }) => Promise<Response<unknown>>;
    listForkName: (args: {
      owner: string;
      repo: string;
      per_page?: number;
      page?: number;
    }) => Promise<Response<{owner: string, repo: string}[]>>;
    getForkNameForTargetRepoGivenSourceOwner: (args: {
      targetOwner: string;
      targetRepo: string;
      sourceOwner: string;
      per_page?: number;
    }) => Promise<Response<string | undefined>>;
  };

  abstract get pulls(): {
    list: (args: {
      owner: string;
      repo: string;
      state?: "opened" | "closed" | "merged";
      base?: string;
      head?: string;
    }) => Promise<Response<unknown[]>>;
    get: (args: {
      owner: string;
      repo: string;
      pull_number: number;
    }) => Promise<Response<EventData>>;
  };
}
