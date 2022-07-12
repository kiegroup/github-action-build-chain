import { NotFoundError } from "@bc/domain/errors";
import { OctokitFactory } from "@bc/service/git/octokit";
import { LoggerService } from "@bc/service/logger/logger-service";
import { LoggerServiceFactory } from "@bc/service/logger/logger-service-factory";
import { Octokit } from "@octokit/rest";
import { Service } from "typedi";

@Service()
export class GithubAPIService {
  private readonly logger: LoggerService;
  private readonly octokit: Octokit;

  constructor() {
    this.logger = LoggerServiceFactory.getInstance();
    this.octokit = OctokitFactory.getOctokitInstance();
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
      this.logger.warn(`project github.com/${owner}/${repo}:${branch} does not exist. It's not necessarily an error.`);
      return false;
    }
  }

  /**
   * Checks whether the given repo has any open pull requests for a given head ref
   * @param owner repo owner
   * @param repo repo name
   * @param head head ref
   * @returns whether there is any open pull request
   */
  private async _hasPullRequest(owner: string, repo: string, head: string): Promise<boolean> {
    try {
      const { status, data } = await this.octokit.pulls.list({
        owner,
        repo,
        state: "open",
        head,
      });
      return status === 200 && data.length > 0;
    } catch (err) {
      this.logger.error(`Error getting pull request list from https://api.github.com/repos/${owner}/${repo}/pulls?head=${head}&state=open'".`);
      throw err;
    }
  }

  /**
   * Checks whether the given repo has any open pull requests for a given head branch either in the forked repo or in the original repo
   * @param owner repo owner
   * @param repo repo name
   * @param headBranch source/head branch
   * @param source Object containing information on sourceOwner (owner of the forked repo) and (sourceRepo name of the forked repo)
   * @returns whether there is any open pull request
   */
  async hasPullRequest(owner: string, repo: string, headBranch: string, source?: { sourceOwner: string; sourceRepo: string }): Promise<boolean> {
    // check for PRs from the repo itself
    const promises = [this._hasPullRequest(owner, repo, `${owner}:${headBranch}`)];

    // check for PRs from the forked repo
    if (source) {
      promises.push(this._hasPullRequest(owner, repo, `${source.sourceOwner}/${source.sourceRepo}:${headBranch}`));
    }
    return (await Promise.all(promises)).reduce((finalResult: boolean, result: boolean) => finalResult || result, false);
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
  async getSourceProjectName(targetOwner: string, sourceOwner: string, repo: string): Promise<string> {
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
          const forkedRepo = response.data.find((project) => project.owner.login === sourceOwner);
          if (forkedRepo) {
            return forkedRepo.name;
          }
        }

        throw new NotFoundError();
      }
    } catch (err) {
      this.logger.error(`Error getting project name for ${targetOwner}/${repo} with owner ${sourceOwner}`);
      throw err;
    }
  }
}
