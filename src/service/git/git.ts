import simpleGit, { SimpleGit } from "simple-git";
import { Service } from "typedi";
import fs from "fs";
import { LoggerService } from "@bc/service/logger/logger-service";
import { LoggerServiceFactory } from "@bc/service/logger/logger-service-factory";
import { GitExecutorResult } from "simple-git/dist/src/lib/types";
import { NotFoundError } from "@bc/domain/errors";
import { Octokit } from "@octokit/rest";
import { OctokitFactory } from "@bc/service/git/octokit";

type GitErrorHandlerFunction = (error: Buffer | Error | undefined, result: Omit<GitExecutorResult, "rejection">) => Buffer | Error | undefined;

@Service()
export class Git {
    private readonly logger: LoggerService;
    private readonly octokit: Octokit;

    constructor () {
        this.logger = LoggerServiceFactory.getInstance();
        this.octokit = OctokitFactory.getOctokitInstance();
    }

    /**
     * Returns a git instance configured to execute commands in the directory specified or in the current directory
     * @param cwd [OPTIONAL] working directory on which the git commands will be executed in
     * @return {SimpleGit} git instance
     */
    private git(cwd?: string, errorHandler?: GitErrorHandlerFunction): SimpleGit {
        if (cwd && errorHandler) {
            return simpleGit({
                baseDir: cwd,
                errors(error, result) {
                    return errorHandler(error, result);
                }
            })
            .addConfig("user.name", "Github")
            .addConfig("user.email", "noreply@github.com");
        } else if (cwd) {
            return simpleGit({
                baseDir: cwd,
            })
            .addConfig("user.name", "Github")
            .addConfig("user.email", "noreply@github.com");
        } else if (errorHandler) {
            return simpleGit({
                errors(error, result) {
                    return errorHandler(error, result);
                }
            })
            .addConfig("user.name", "Github")
            .addConfig("user.email", "noreply@github.com");
        }
        return simpleGit()
                        .addConfig("user.name", "Github")
                        .addConfig("user.email", "noreply@github.com");
    }
    
    /**
     * Returns the git version
     * @returns {Promise<string>}
     */
    async version(): Promise<string | undefined> {
        const rawOutput = await this.git().raw("version");
        const match = rawOutput.match(/(\d+\.\d+(\.\d+)?)/);
        return match && match.length > 1 ? match[1] : undefined;
    }

    /**
     * Clone a repository
     * @param from url or path from which the repository should be cloned from
     * @param to location at which the repository should be cloned at
     * @param branch branch which should be cloned
     */
    async clone(from: string, to: string, branch: string) {
        if (!fs.existsSync(to)){
            await this.git().clone(from, to, ["--quiet", "--shallow-submodules", "--no-tags", "--branch", branch]);
        } 
        else {
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
            if (error) {return error;}
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
    async getReachableParentCommits(cwd: string, ref: string): Promise<string[]>{
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
        await this.git(cwd).pull(repositoryUrl, branch, ["--no-rebase"]);
    }
    
    /**
     * Return the sha-1 hash of the HEAD reference
     * @param cwd git repo
     * @returns sha string
     */
    async head(cwd: string): Promise<string> {
        return await this.git(cwd).raw("show-ref", "--head", "-s", "/HEAD");
    }
     
    /**
     * Return the sha-1 hash of the given branch reference
     * @param cwd git repo
     * @param branch branch whose sha is to be returned
     * @returns sha string
     */
    async sha(cwd: string, branch: string): Promise<string> {
        return await this.git(cwd).raw("show-ref", "-s", `refs/remotes/origin/${branch}`);
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
        if (force) {options.push("--force-with-lease");}
        await this.git(cwd).push("origin", branch, options);
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
                `project github.com/${owner}/${repo}:${branch} does not exist. It's not necessarily an error.`
            );
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
                head
            });
            return status === 200 && data.length > 0;
        } catch(err) {
            this.logger.error(
                `Error getting pull request list from https://api.github.com/repos/${owner}/${repo}/pulls?head=${head}&state=open'".`
            );
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
    async hasPullRequest(owner: string, repo: string, headBranch: string, source?: {sourceOwner: string, sourceRepo: string}): Promise<boolean> {
        // check for PRs from the repo itself
        const promises = [this._hasPullRequest(owner, repo, `${owner}:${headBranch}`)];

        // check for PRs from the forked repo
        if (source) {promises.push(this._hasPullRequest(owner, repo, `${source.sourceOwner}/${source.sourceRepo}:${headBranch}`));}
        return (await Promise.all(promises)).reduce((finalResult: boolean, result: boolean) => (finalResult || result), false);
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
                    repo
                });
                return repo;
            } else {
                // find repo from fork list
                for await (const response of this.octokit.paginate.iterator(
                    this.octokit.repos.listForks,
                    {
                        owner: targetOwner,
                        repo
                    }
                )){
                    const forkedRepo = response.data.find(project => project.owner.login === sourceOwner);
                    if (forkedRepo) {return forkedRepo.name;}
                }
                
                throw new NotFoundError();
            }
        } catch(err) {
            this.logger.error(
                `Error getting project name for ${targetOwner}/${repo} with owner ${sourceOwner}`
            );
            throw err;
        }
    }
}