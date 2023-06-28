import { Pulls, Repo } from "@bc/domain/base-git-api-client";
import { BaseGitAPIClient } from "@bc/service/git/base-git-api-client";
import axios, { Axios } from "axios";

export class GerritAPIClient extends BaseGitAPIClient {
  private client: Axios;

  constructor(baseUrl: string, id: string) {
    super(baseUrl, id);
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `Basic ${this.tokenService.getToken(id)}`,
        "User-Agent": "kiegroup/github-build-chain-action",
      },
    });
  }

  get repos() {
    return {
      getBranch: this.getBranch.bind(this),
      get: this.getRepo.bind(this),
      listForkName: this.listForkName.bind(this),
      getForkNameForTargetRepoGivenSourceOwner:
        this.getForkNameForTargetRepoGivenSourceOwner.bind(this),
    };
  }

  get pulls() {
    return {
      list: this.listPulls.bind(this),
      get: this.getPullRequest.bind(this),
    };
  }

  private async getBranch(args: Repo["getBranch"]["parameters"]) {
    const projectId = this.getProjectId(args.owner, args.repo);
    const { data, status } = await this.client.get(
      `/projects/${projectId}/branches/${args.branch}`
    );
    return { data, status };
  }

  private async getRepo(args: Repo["get"]["parameters"]) {
    const projectId = this.getProjectId(args.owner, args.repo);
    const { data, status } = await this.client.get(`/projects/${projectId}`);
    return { data, status };
  }

  private async listForkName(_args: Repo["listForkName"]["parameters"]) {
    this.logger.debug(
      "Gerrit does not have the concept of forking. Returning empty array"
    );
    return { status: 200, data: [] };
  }

  private async getForkNameForTargetRepoGivenSourceOwner(
    _args: Repo["getForkNameForTargetRepoGivenSourceOwner"]["parameters"]
  ) {
    this.logger.debug(
      "Gerrit does not have the concept of forking. Returning undefined"
    );
    return { status: 200, data: undefined };
  }

  private async listPulls(args: Pulls["list"]["parameters"]) {
    let state;
    switch (args.state) {
      case "opened":
        state = "open";
        break;
      case "closed":
      case "merged":
        state = "merged";
    }

    // looks like gerrit does not have any query for head branch
    let query = `project:${args.owner}/${args.repo}`;
    if (state) {
      query += `+status:${state}`;
    }
    if (args.base) {
      query += `+branch:${args.base}`;
    }
    const { data, status } = await this.client.get("/changes/", {
      params: {
        q: query,
      },
    });
    return { data, status };
  }

  private async getPullRequest(args: Pulls["get"]["parameters"]) {
    const projectId = this.getProjectId(args.owner, args.repo);
    const { data, status } = await this.client.get(
      `/changes/${projectId}~${args.pull_number}`
    );
    const eventData = data as {
      branch: string;
      current_revision: string;
    } & {
      [key: string]: {
        fetch: {
          "anonymous http": {
            url: string;
            ref: string;
          };
        };
        web_links: [
          {
            name: "gitweb";
            url: string;
          },
          {
            name: "browse";
            url: string;
          }
        ];
      };
    };

    return {
      data: {
        html_url: `${
          eventData[eventData.current_revision].fetch["anonymous http"].url
        }${eventData[eventData.current_revision].web_links[1].url}`,
        head: {
          user: {
            login: args.owner, // there are no forks so owner is same as base
          },
          ref: eventData.current_revision,
        },
        base: {
          ref: eventData.branch,
          repo: {
            full_name: `${args.owner}/${args.repo}`,
            name: args.repo,
            owner: {
              login: args.owner,
            },
          },
        },
      },
      status,
    };
  }

  private getProjectId(owner: string, repo: string) {
    return encodeURIComponent(`${owner}/${repo}`);
  }
}
