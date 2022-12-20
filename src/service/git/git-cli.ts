import simpleGit, { SimpleGit } from "simple-git";
import { Service } from "typedi";
import fs from "fs";
import { LoggerService } from "@bc/service/logger/logger-service";
import { LoggerServiceFactory } from "@bc/service/logger/logger-service-factory";
import { GitExecutorResult } from "simple-git/dist/src/lib/types";

type GitErrorHandlerFunction = (error: Buffer | Error | undefined, result: Omit<GitExecutorResult, "rejection">) => Buffer | Error | undefined;

@Service()
export class GitCLIService {
  private readonly logger: LoggerService;

  constructor() {
    this.logger = LoggerServiceFactory.getInstance();
  }

  /**
   * Returns a git instance configured to execute commands in the directory specified or in the current directory
   * @param cwd [OPTIONAL] working directory on which the git commands will be executed in
   * @return {SimpleGit} git instance
   */
  private git(cwd?: string, errorHandler?: GitErrorHandlerFunction): SimpleGit {
    const gitConfig = { ...(cwd ? { baseDir: cwd } : {}), ...(errorHandler ? { errors: errorHandler } : {}) };
    return simpleGit(gitConfig).addConfig("user.name", "Github").addConfig("user.email", "noreply@github.com");
  }

  /**
   * Returns the git version
   * @returns {Promise<string>}
   */
  async version(): Promise<string | undefined> {
    const rawOutput = await simpleGit().raw("version");
    const match = rawOutput.match(/(\d+\.\d+(\.\d+)?)/);
    return match ? match[1] : undefined;
  }

  /**
   * Clone a repository
   * @param from url or path from which the repository should be cloned from
   * @param to location at which the repository should be cloned at
   * @param branch branch which should be cloned
   */
  async clone(from: string, to: string, branch: string) {
    if (!fs.existsSync(to)) {
      // don't use this.git since it will configure git with local user.name and user.email which requires cwd to be a git repo
      await simpleGit().clone(from, to, ["--quiet", "--shallow-submodules", "--no-tags", "--branch", branch]);
    } else {
      this.logger.warn(`Folder ${to} already exist. Won't clone`);
    }
  }

  /**
   * Git fetch from a particular branch
   * @param cwd repository in which fetch should be performed
   * @param branch fetch from the given branch
   */
  async fetch(cwd: string, branch: string) {
    await this.git(cwd).fetch("origin", branch, ["--quiet"]);
  }

  /**
   * Gets the most recent common ancestor for the given branches or commits
   * Equivalent of 'git merge-base'
   * @param cwd the git repo in which merge-base should be executed
   * @param refs branches or commits for which we need to find the most recent common ancestor
   * @returns
   */
  async getCommonAncestor(cwd: string, ...refs: string[]): Promise<string> {
    if (refs.length === 1) {
      return refs[0];
    } else if (refs.length < 1) {
      throw new Error("empty refs!");
    }

    const errorHandler: GitErrorHandlerFunction = (error, result) => {
      // ignore the error if git exited with status code 1
      if (result.exitCode === 1 || result.exitCode === 0) {
        return;
      }
      if (error) {
        return error;
      }
      return Buffer.concat([...result.stdOut, ...result.stdErr]);
    };
    return (await this.git(cwd, errorHandler).raw("merge-base", "--octopus", ...refs)).trim();
  }

  /**
   * Gets the parents of commits reachable from HEAD but not ref
   * @param cwd git repo
   * @param ref ref from which the reachable commits are excluded
   * @returns Array of parent commits
   */
  async getReachableParentCommits(cwd: string, ref: string): Promise<string[]> {
    return (await this.git(cwd).raw("rev-list", "--parents", `${ref}..HEAD`))
      .split(/\n/g)
      .map(line => line.split(/ /g).slice(1))
      .flat();
  }

  /**
   * Equivalent to 'git pull --no-rebase url branch'
   * @param cwd git repo in which the merge is to be performed
   * @param repositoryUrl remote/url to pull from
   * @param branch branch to pull from
   */
  async merge(cwd: string, repositoryUrl: string, branch: string) {
    await this.git(cwd).pull(repositoryUrl, branch, ["--no-rebase", "--allow-unrelated-histories"]);
  }

  /**
   * Return the sha-1 hash of the HEAD reference
   * @param cwd git repo
   * @returns sha string
   */
  async head(cwd: string): Promise<string> {
    return this.git(cwd).raw("show-ref", "--head", "-s", "/HEAD");
  }

  /**
   * Return the sha-1 hash of the given branch reference
   * @param cwd git repo
   * @param branch branch whose sha is to be returned
   * @returns sha string
   */
  async sha(cwd: string, branch: string): Promise<string> {
    return this.git(cwd).raw("show-ref", "-s", `refs/remotes/origin/${branch}`);
  }

  /**
   * Rename the current branch
   * @param cwd git repo
   * @param newBranchName new branch name
   */
  async rename(cwd: string, newBranchName: string) {
    await this.git(cwd).branch(["--move", newBranchName]);
  }

  /**
   * autosquash commits in on the given branch
   * Equivalent to 'git rebase --quiet --autosquash branch'
   * @param cwd git repo
   * @param branch branch to be rebased
   */
  async rebase(cwd: string, branch: string) {
    await this.git(cwd).rebase(["--quiet", "--autosquash", branch]);
  }

  /**
   * Perform a push
   * Equivalent to 'git push --quiet origin branch' or if using force then
   * equivalent to 'git push --quiet --force-with-lease origin branch'
   * @param cwd git repo
   * @param force whether to use force or not
   * @param branch branch to push
   */
  async push(cwd: string, force: boolean, branch: string) {
    const options = ["--quiet"];
    if (force) {
      options.push("--force-with-lease");
    }
    await this.git(cwd).push("origin", branch, options);
  }
}
