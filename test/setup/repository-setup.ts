import simpleGit, { SimpleGit } from "simple-git";
import fs from "fs";
import path from "path";

export type RepoFile = {
    path: string,
    branch: string
}

export type RepoDetails = {
    path: string,
    branch: string,
    pushedBranches: string[],
    localBranches: string[],
    files: RepoFile[]
}

// path to where repos will be setup
const setupPath = path.join(__dirname, "setup");

/**
 * Sets up fake local repositories for testing
 * @param configPath path to configuration file containing details to construct the repository
 * @returns Array of object containing path as well as current branch details of all the repositories created
 */
export async function setup(configPath: string): Promise<RepoDetails[]>{
    // create setup dir
    if (fs.existsSync(setupPath)) {fs.rmSync(setupPath, { recursive: true });}

    // get config files and repositories' data
    const config = JSON.parse(fs.readFileSync(configPath, {encoding: "utf8"}));
    const repositories = config.repositories;

    // get all names of the repositories
    const repoNames = Object.keys(repositories);
    const repoPaths: RepoDetails[] = [];

    // loop through all the repositories and construct them according to the state specified in config file
    for (let i = 0; i < repoNames.length; i++){
        // get repository, remote, remote/origin and remote/upstream paths
        const repoPath = path.join(setupPath, repoNames[i]);
        const remotePath = path.join(repoPath, "remote");
        const originPath = path.join(remotePath, "origin");
        const upstreamPath = path.join(remotePath, "upstream");

        // create origin and upstream folders
        fs.mkdirSync(originPath, { recursive: true });
        fs.mkdirSync(upstreamPath, { recursive: true });

        // load git instances for the repository, origin and upstream
        const git: SimpleGit = simpleGit(repoPath);
        const originGit: SimpleGit = simpleGit(originPath);
        const upstreamGit: SimpleGit = simpleGit(upstreamPath);

        await Promise.all([
            originGit.init(true), // initialize origin as a git repository
            upstreamGit.init(true), // initialize upstream as a git repository
            fs.writeFileSync(path.join(repoPath, ".gitignore"), "remote") // add remote to gitignore of the repository so that upstream and origin aren't pushed
        ]);
        
        // initialize the repository and add origin, upstream and perform first push on main
        await git.init()
                    .addRemote("origin", originPath)
                    .addRemote("upstream", upstreamPath)
                    .add(".")
                    .commit("initialization")
                    .push("origin", "main", ["--set-upstream"]);
        
        // get branch info and create all the branches and push them to remote
        const pushedBranches = repositories[repoNames[i]].pushedBranches ? repositories[repoNames[i]].pushedBranches : [];
        
        const promises: unknown[] = [];
        pushedBranches.forEach((branch: string) => {
            promises.push(
                git.checkoutLocalBranch(branch)
                   .push("origin", branch, ["--set-upstream"])
            );
        });        

        // get branch info and create all the branches and push them to remote
        const localBranches = repositories[repoNames[i]].localBranches ? repositories[repoNames[i]].localBranches : [];
        localBranches.forEach((branch: string) => {
            promises.push(git.checkoutLocalBranch(branch));
        });
        
        await Promise.all(promises);
        

        // create the required history for the repo
        const history = repositories[repoNames[i]].history;
        const files: RepoFile[] = [];
        if (history) {
            for (let j = 0; j < history.length; j++) {
                // checkout to the required branch
                await git.checkout(history[j].branch);

                // perform known actions
                if (history[j].action === "push") {
                    if (!history[j].file) {
                        fs.writeFileSync(path.join(repoPath, `dummy-file${j}`), "dummy data");
                        files.push({path: path.join(repoPath, `dummy-file${j}`), branch: history[j].branch});
                    }
                    else {
                        fs.copyFileSync(history[j].filePath, repoPath);
                        files.push({path: path.join(repoPath, history[j].file.name), branch: history[j].branch});
                    }
                    await git.add(".")
                             .commit(`adding files to mimic history ${j}`)
                             .push(history[j].remote, history[j].branch);
                } 
                // peform unknown actions as raw git commands
                else {
                    if (history[j].file) {
                        fs.copyFileSync(history[j].filePath, repoPath);
                        files.push({path: path.join(repoPath, history[j].file.name), branch: history[j].branch});
                    }
                    await git.raw(history[j].action);
                }
            }
        }

        // set the active branch if defined otherwise let it be main
        const currBranch = repositories[repoNames[i]].currentBranch;
        if (currBranch) {await git.checkout(currBranch);}

        // add the repo details which are to be returned
        repoPaths.push({ path: repoPath, branch: currBranch ? currBranch : "main", pushedBranches: ["main", ...pushedBranches], localBranches, files });
    }
    return repoPaths;
}

/**
 * Clean up all the repos
 */
export function teardown() {
    if (fs.existsSync(setupPath)) {fs.rmSync(setupPath, { recursive: true });}
}