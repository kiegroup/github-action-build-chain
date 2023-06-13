import { EventData } from "@bc/domain/configuration";

export type Response<T> = {
  status: number;
  data: T;
};

export type Repo = {
  getBranch: {
    parameters: {
      owner: string;
      repo: string;
      branch: string;
    };
    response: Response<unknown>;
  };
  get: {
    parameters: {
      owner: string;
      repo: string;
    };
    response: Response<unknown>;
  };
  listForkName: {
    parameters: {
      owner: string;
      repo: string;
      per_page?: number; // using snake_case to maintain consitency with octokit
      page?: number;
    };
    response: Response<{ owner: string; repo: string }[]>;
  };
  getForkNameForTargetRepoGivenSourceOwner: {
    parameters: {
      targetOwner: string;
      targetRepo: string;
      sourceOwner: string;
      per_page?: number;
    };
    response: Response<string | undefined>;
  };
};

export type Pulls = {
  list: {
    parameters: {
      owner: string;
      repo: string;
      state?: "opened" | "closed" | "merged";
      base?: string;
      head?: string;
    };
    response: Response<unknown[]>;
  };
  get: {
    parameters: {
      owner: string;
      repo: string;
      pull_number: number;
    };
    response: Response<EventData>;
  };
};
