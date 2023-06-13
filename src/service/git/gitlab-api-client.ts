import { Pulls, Repo } from "@bc/domain/base-git-api-client";
import { BaseGitAPIClient } from "@bc/service/git/base-git-api-client";
import axios, { Axios } from "axios";

export class GitlabAPIClient extends BaseGitAPIClient {
  private client: Axios;

  constructor(baseUrl: string, id: string) {
    super(baseUrl, id);
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `Bearer ${this.tokenService.getGitlabToken(id)}`,
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
      `/projects/${projectId}/repository/branches/${args.branch}`
    );
    return { data, status };
  }

  private async listPulls(args: Pulls["list"]["parameters"]) {
    const projectId = this.getProjectId(args.owner, args.repo);
    const { data, status } = await this.client.get(
      `/projects/${projectId}/merge_requests`,
      {
        params: {
          state: args.state,
          source_branch: args.base,
          target_branch: args.head,
        },
      }
    );
    return { data, status };
  }

  private async getRepo(args: Repo["get"]["parameters"]) {
    const projectId = this.getProjectId(args.owner, args.repo);
    const { data, status } = await this.client.get(`/projects/${projectId}`);
    return { data, status };
  }

  private async getPullRequest(args: Pulls["get"]["parameters"]) {
    const projectId = this.getProjectId(args.owner, args.repo);
    const { data, status } = await this.client.get(
      `/projects/${projectId}/merge_requests/${args.pull_number}`
    );
    const eventData = data as {
      web_url: string;
      target_branch: string;
      head_branch: string;
      author: {
        username: string;
      };
    };
    return {
      data: {
        html_url: eventData.web_url,
        head: {
          user: {
            login: eventData.author.username,
          },
          ref: eventData.head_branch,
        },
        base: {
          ref: eventData.target_branch,
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

  private async listForkName(args: Repo["listForkName"]["parameters"]) {
    const projectId = this.getProjectId(args.owner, args.repo);
    const { data, status } = await this.client.get(
      `/projects/${projectId}/forks`,
      {
        params: {
          per_page: args.per_page ?? 100,
          page: args.page,
        },
      }
    );
    return {
      status,
      data: (
        data as {
          path: string;
          namespace: { path: string };
        }[]
      ).map(d => ({ owner: d.namespace.path, repo: d.path })),
    };
  }

  private async getForkNameForTargetRepoGivenSourceOwner(
    args: Repo["getForkNameForTargetRepoGivenSourceOwner"]["parameters"]
  ) {
    let page = 1;
    let forks = (
      await this.listForkName({
        owner: args.targetOwner,
        repo: args.targetRepo,
        page,
        per_page: args.per_page,
      })
    ).data;

    while (forks.length > 0) {
      const forkName = forks.find(n => n.owner === args.sourceOwner);
      if (forkName) {
        return { status: 200, data: forkName.repo };
      }
      page += 1;

      forks = (
        await this.listForkName({
          owner: args.targetOwner,
          repo: args.targetRepo,
          page,
          per_page: args.per_page ?? 100,
        })
      ).data;
    }
    return { status: 200, data: undefined };
  }

  private getProjectId(owner: string, repo: string) {
    return encodeURIComponent(`${owner}/${repo}`);
  }
}
