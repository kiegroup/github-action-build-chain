import { NotFoundError } from "@bc/domain/errors";
import { OctokitService } from "@bc/service/git/octokit";
import { BaseLoggerService } from "@bc/service/logger/base-logger-service";
import { LoggerService } from "@bc/service/logger/logger-service";
import { logAndThrow } from "@bc/utils/log";
import { Octokit } from "@octokit/rest";
import { Endpoints } from "@octokit/types";
import { RequestError } from "@octokit/request-error";
import Container, { Service } from "typedi";

@Service()
export class GithubAPIService {
  private readonly logger: BaseLoggerService;
  private readonly octokit: Octokit;

  constructor() {
    this.logger = Container.get(LoggerService).logger;
    this.octokit = Container.get(OctokitService).octokit;
  }

  /**
   * Check whether the given branch exists for the given repo and owner
   * @param owner repo owner
   * @param repo repo name
   * @param branch branch that we need to check for existence
   * @returns whether branch exists or not
   */
  async doesBranchExist(owner: string, repo: string, branch: string): Promise<boolean> {
    try {
      await this.octokit.repos.getBranch({ owner, repo, branch });
      return true;
    } catch (err) {
      this.logger.warn(
        this.getErrorMessage(
          err, 
          `project github.com/${owner}/${repo}:${branch} does not exist. It's not necessarily an error.`
        )
      );
      return false;
    }
  }

  /**
   * Checks whether the given repo has any open pull requests for a given head branch either in the forked repo or in the original repo
   * @param owner repo owner
   * @param repo repo name
   * @param head source/head branch to filter PRs by
   * @param base base branch to filter PRs by
   * @returns whether there is any open pull request
   */
  async hasPullRequest(owner: string, repo: string, head?: string, base?: string): Promise<boolean> {
    let query: Endpoints["GET /repos/{owner}/{repo}/pulls"]["parameters"] = { owner, repo, state: "open" };
    if (!base && !head) {
      logAndThrow(`[${owner}/${repo}] Either head or base needs to be defined while requesting pull request information`);
    }
    if (base) {
      query = { ...query, base };
    }
    if (head) {
      query = { ...query, head };
    }
    try {
      const { status, data } = await this.octokit.pulls.list(query);
      return status === 200 && data.length > 0;
    } catch (err) {
      let msg = `Error getting pull request list from https://api.github.com/repos/${owner}/${repo}/pulls?state=open`;
      if (base) {
        msg += `&base=${base}`;
      }
      if (head) {
        msg += `&head=${head}`;
      }

      this.logger.error(this.getErrorMessage(err, msg));
      throw err;
    }
  }

  /**
   * Possible replacement of getRepository, getForkedProject and build-chain-flow-helper,js/getForkedProjectName
   *
   * getForkedProjectName basically gets the name if source and target owner are same. Otherwise it finds all the forked projects
   * for target owner's repo and returns the name of the forked project whose owner is source owner
   */
  /**
   * Returns the project name of the forked repo
   * @param targetOwner the actual owner of the given repo
   * @param sourceOwner the owner of the forked repo
   * @param repo repo name
   * @returns project name of the forked repo
   */
  async getForkName(targetOwner: string, sourceOwner: string, repo: string): Promise<string> {
    try {
      // ensure that repo exists
      if (targetOwner === sourceOwner) {
        await this.octokit.repos.get({
          owner: sourceOwner,
          repo,
        });
        return repo;
      } else {
        // find repo from fork list
        for await (const response of this.octokit.paginate.iterator(this.octokit.repos.listForks, {
          owner: targetOwner,
          repo,
        })) {
          const forkedRepo = response.data.find(project => project.owner.login === sourceOwner);
          if (forkedRepo) {
            return forkedRepo.name;
          }
        }

        throw new NotFoundError();
      }
    } catch (err) {
      this.logger.error(
        this.getErrorMessage(
          err, 
          `Error getting fork name for ${targetOwner}/${repo} where owner is ${sourceOwner}`
        )
      );
      throw err;
    }
  }

  private getErrorMessage(err: unknown, msg: string): string {
    let reason;
    if (err instanceof RequestError) {
      switch (err.status) {
        case 401:
          reason = "Failed to authenticate with provided token, please use -token argument to provide a new one. You can also check your GITHUB_TOKEN environment variable and check whether the provided token is still valid.";
          break;
        case 404:
          reason = "Failed to fetch GitHub URL, please check if the URL used in -url argument is valid and if the token you are using have permissions to access it.";
          break;
        case 403:
          reason = "Failed to fetch resource. Either your github token does not have access to the requested resource or you have reached your github api rate limit.";
      }
    }
    return reason ? `${msg} Reason: ${reason}` : msg;
  }
}
