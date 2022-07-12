import fs from "fs";
import path from "path";
import simpleGit, { SimpleGit } from "simple-git";
import { Api, Config, History, RepoDetails, RepoFile } from "test/setup/mock-github-types";
import nock from "nock";


/**
 * Creates and mocks a github env by creating local repos and mocking github api
 */
export class MockGithub {
    private readonly config: Config;
    private readonly setupPath: string;
    private numNocks: number;

    /**
     * Class initializer
     * @param configPath path to config file used to define the state of local repos and what apis to mock
     * @param setupDirName path to directory where all the the local repos should be created in
     */
    constructor(configPath: string, setupDirName: string) {
        this.config = JSON.parse(fs.readFileSync(configPath, {encoding: "utf8"}));
        this.setupPath = path.join(__dirname, setupDirName);
        this.numNocks = 0;
    }

    /**
     * Create and initialize repo
     * @param repoName name of the repo to initialize
     * @returns git instance and path to repo
     */
    private async initRepo(repoName: string): Promise<{git: SimpleGit, repoPath: string}> {
        // get repository, remote, remote/origin and remote/upstream paths
        const repoPath = path.join(this.setupPath, repoName);
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
            originGit.init(true, ["-b", "main"]).addConfig("user.name", "Github").addConfig("user.email", "noreply@github.com"), // initialize origin as a git repository
            upstreamGit.init(true, ["-b", "main"]).addConfig("user.name", "Github").addConfig("user.email", "noreply@github.com"), // initialize upstream as a git repository
            fs.writeFileSync(path.join(repoPath, ".gitignore"), "remote") // add remote to gitignore of the repository so that upstream and origin aren't pushed
        ]);

        // initialize the repository and add origin, upstream and perform first push on main
        await git.init(["-b", "main"])
                    .addConfig("user.name", "Github")
                    .addConfig("user.email", "noreply@github.com")
                    .addRemote("origin", originPath)
                    .addRemote("upstream", upstreamPath)
                    .add(".")
                    .commit("initialization")
                    .push("origin", "main", ["--set-upstream"]);
        
        return { git, repoPath };
    }

    /**
     * Create branches and push them if necessary
     * @param git git instance
     * @param lb array of branches to be kept local (unpushed)
     * @param pb array of branches to be pushed
     * @returns 
     */
    private async setBranches(git: SimpleGit, lb: string[] | undefined, pb: string[] | undefined): Promise<{localBranches: string[], pushedBranches: string[]}> {
        // get branch info and create all the branches and push them to remote
        const pushedBranches = pb ? pb : [];
        
        const promises: unknown[] = [];
        pushedBranches.forEach((branch: string) => {
            promises.push(
                git.checkoutLocalBranch(branch)
                    .push("origin", branch, ["--set-upstream"])
            );
        });        

        // get branch info and create all the branches and push them to remote
        const localBranches = lb ? lb : [];
        localBranches.forEach((branch: string) => {
            promises.push(git.checkoutLocalBranch(branch));
        });
    
        await Promise.all(promises);
        return { localBranches, pushedBranches };
    }

    /**
     * Reconstruct git history
     * @param git git instance
     * @param history array of object describing how to construct the history
     * @param repoPath path to repo
     * @returns Array of objects describing what files were created and on which branch
     */
    private async setHistory(git: SimpleGit, history: History[] | undefined, repoPath: string): Promise<RepoFile[]> {
        const files: RepoFile[] = [];
        if (history) {
            for (let j = 0; j < history.length; j++) {
                const hist = history[j];

                // checkout to the required branch
                await git.checkout(hist.branch);
                    

                // perform known actions
                switch (hist.action.toLowerCase()) {
                    case "push":
                        if (!hist.file) {
                            fs.writeFileSync(path.join(repoPath, `dummy-file${j}`), "dummy data");
                            files.push({path: path.join(repoPath, `dummy-file${j}`), branch: hist.branch});
                        } else {
                            fs.copyFileSync(hist.file.path, repoPath);
                            files.push({path: path.join(repoPath, hist.file.name), branch: hist.branch});
                        }
                        await git.add(".")
                                 .commit(`adding files to mimic history ${j}`)
                                 .push(hist.remote, hist.branch);
                        break;

                    // perform unknown actions
                    default:
                        if (hist.file) {
                            fs.copyFileSync(hist.file.path, repoPath);
                            files.push({path: path.join(repoPath, hist.file.name), branch: hist.branch});
                        }
                        await git.raw(hist.action);
                }
            }
        }
        return files;
    }

    /**
    * Sets up fake local repositories
    * @returns Array of object containing path as well as current branch details of all the repositories created
    */
    private async setupRepos(): Promise<RepoDetails[]>{
        if (!this.config.repositories) {return [];}

        // get repositories' data
        const repositories = this.config.repositories;

        // get all names of the repositories
        const repoNames = Object.keys(repositories);
        const repoPaths: RepoDetails[] = [];

        // loop through all the repositories and construct them according to the state specified in config file
        for (let i = 0; i < repoNames.length; i++){
            const currRepo = repositories[repoNames[i]];
            
            // initialize the repo and return git instance configured for the repo and return repo path
            const { git, repoPath } = await this.initRepo(repoNames[i]);
        
            // create all local and remote branches
            const { localBranches, pushedBranches } = await this.setBranches(git, currRepo.localBranches, currRepo.pushedBranches);
        

            // create the required history for the repo
            const files: RepoFile[] = await this.setHistory(git, currRepo.history, repoPath);

            // set the active branch if defined otherwise let it be main
            const currBranch = currRepo.currentBranch;
            if (currBranch) {await git.checkout(currBranch);}

            // add the repo details which are to be returned
            repoPaths.push({ path: repoPath, branch: currBranch ? currBranch : "main", pushedBranches: ["main", ...pushedBranches], localBranches, files });
        }
        return repoPaths;
    }

    /**
     * Use given scope and api details to add an interceptor to the scope
     * @param scope nock scope
     * @param api Object describing the api
     * @returns nock interceptor
     */
    private getInterceptor(scope: nock.Scope, api: Api): nock.Interceptor {
        let mockedApi: nock.Interceptor;
        switch (api.method.toLowerCase()) {
            case "get":
                mockedApi = scope.get(new RegExp(api.path));
                if (api.query) {mockedApi = mockedApi.query(api.query);}
                else {mockedApi = mockedApi.query(true);}
                break;
            case "post":
                mockedApi = scope.post(new RegExp(api.path));
                break;
            case "patch":
                mockedApi = scope.patch(new RegExp(api.path));
                break;
            case "put":
                mockedApi = scope.put(new RegExp(api.path));
                break;
            case "delete":
                mockedApi = scope.delete(new RegExp(api.path));
                break;
            default:
                throw new Error("Invalid http method");               
        }
        return mockedApi;
    }

    /**
     * Set up nock to mock github apis mentioned in the config file
     */
    private setupMockApi() {
        if (!this.config.mocks) {return;}
        const baseUrl = this.config.mocks.baseUrl;
        let scope: nock.Scope = nock(baseUrl);
        for (let i = 0; i < this.config.mocks.api.length; i++) {
            const api: Api = this.config.mocks.api[i];            
            api.response.forEach(res => {
                if (res.times) {scope = this.getInterceptor(scope, api).times(res.times).reply(res.code, res.data);}
                else {scope = this.getInterceptor(scope, api).reply(res.code, res.data);}
                this.numNocks += 1;
            });
            
        }
    }

    private setupEnvironment() {
        if (!this.config.env) {return;}
        const env = this.config.env;
        Object.keys(env).forEach(key => {
            process.env[`GITHUB_${key.toUpperCase()}`] = env[key];
        });
    }

    private setupAction() {
        if (!this.config.action) {return;}
        const action = this.config.action;
        const filename = path.join(this.setupPath, action.eventPayloadFileName ? action.eventPayloadFileName : "event.json");
        fs.writeFileSync(filename, JSON.stringify(action.eventPayload));
        process.env["GITHUB_EVENT_PATH"] = filename;
    }

    /**
     * Clear all mocked github apis
     */
    private async teardownMocks() {
        if (this.numNocks > 0) {nock.cleanAll();}
    }

    private teardownEnv() {
        if (!this.config.env) {return;}
        const actualEnv = process.env;
        const mockEnv = this.config.env;
        Object.keys(actualEnv).forEach(key => {
            Object.keys(mockEnv).forEach(k => {
                if (key.localeCompare(`GITHUB_${k.toUpperCase()}`) === 0) {delete process.env[key];}
            });
        });
    }

    /**
     * Setup local repos and mock github apis
     * @return Array of object containing path as well as current branch details of all the repositories created
     */
    async setup() {
        // create setup dir
        if (fs.existsSync(this.setupPath)) {fs.rmSync(this.setupPath, { recursive: true });}
        fs.mkdirSync(this.setupPath, { recursive: true });

        this.setupMockApi();
        this.setupEnvironment();
        this.setupAction();
        return await this.setupRepos();
    }

    /**
     * Teardown github repos and mocked apis
     */
    async teardown() {
        if (fs.existsSync(this.setupPath)) {fs.rmSync(this.setupPath, { recursive: true });}
        this.teardownMocks();
        this.teardownEnv();
    }
}