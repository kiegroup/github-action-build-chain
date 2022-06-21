import { constants } from "@bc/domain/constants";
import { EntryPoint } from "@bc/domain/entry-point";
import { Git } from "@bc/service/git/git";
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { RepoFile, RepoDetails } from "../../../setup/mock-github-types";
import Container from "typedi";
import { assert } from "console";
import { MockGithub } from "../../../setup/mock-github";

let git: Git;
let cwd: string;
let currentBranch: string;
let pushedBranches: string[];
let localBranches: string[];
let files: RepoFile[];
const mockGithub = new MockGithub(path.join(__dirname, "config.json"), "setup");

beforeAll(async () => {
    //setup
    const repoDetails: RepoDetails = (await mockGithub.setup())[0];
    cwd = repoDetails.path;
    currentBranch = repoDetails.branch;
    pushedBranches = repoDetails.pushedBranches;
    localBranches = repoDetails.localBranches;
    files = repoDetails.files;
    
    //make sure the setup is correct to run this test suite
    assert(pushedBranches.length > 1, "your configuration must have a repository with pushed branches other than main");
    assert(localBranches.length > 0, "your configuration must have a repository with local branches i.e. not pushed branches");
    assert(files.length > 0, "your configuration needs at least 1 file committed to some branch which is not the current branch");


    // disable logs
    jest.spyOn(global.console, "log");
});

afterAll(() => {
    mockGithub.teardown();

    // remove local config changes to git
    spawnSync("git", ["config", "--unset", "user.name"]);
    spawnSync("git", ["config", "--unset", "user.email"]);
});

beforeEach(() => {
    // create a fresh instance of git before each test
    Container.set(constants.CONTAINER.ENTRY_POINT, EntryPoint.CLI);
    git = new Git();
});

test("version", async () => {
    const result = await git.version();
    const actualVersion = spawnSync("git", ["version"]).stdout.toString();
    const match = actualVersion.match(/(\d+\.\d+(\.\d+)?)/);
    if (match)
        {expect(result).toEqual(match[1]);}
    else 
        {expect(result).toBe(undefined);}
});

test.each([
    ["succes: destination does not exist", false],
    ["failure: destination exists", true]
])("clone %p", async (title: string, destExist: boolean) => {
    // Setup
    const dest = path.join(__dirname, "git-clone-test");

    // test for failure
    if (destExist) {
        fs.mkdirSync(dest);
        await git.clone(cwd, dest, "main");
        const files = fs.readdirSync(dest);
        expect(files.length).toBe(0);
    }
    // test for success 
    else {
        await git.clone(cwd, dest, "main");
        expect(fs.existsSync(dest)).toBe(true);
    }
    // Clean up
    fs.rmSync(dest, { recursive: true });
});

test("fetch", async () => {
    await expect(git.fetch(cwd, currentBranch)).resolves.not.toThrowError();
});

test("getCommonAncestor",async () => {
    // using the code from original codebase to test whether the results match
    const mergeBase = async (dir: string, ...refs: string[]) => {
        if (refs.length === 1) {
            return refs[0];
        } else if (refs.length < 1) {
            throw new Error("empty refs!");
        }
        let todo = refs;
        
        while (todo.length > 1) {
            const rawCommand = spawnSync("git",  ["merge-base", todo[0], todo[1]], {cwd: dir});
            if (rawCommand.status === 1) {return null;}
            const base = rawCommand.stdout.toString().trim();
            todo = [base].concat(todo.slice(2));
        }
        return todo[0];        
    };
    const result = await Promise.all([mergeBase(cwd, ...pushedBranches), git.getCommonAncestor(cwd, ...pushedBranches)]);
    expect(result[1]).toEqual(result[0]);
});

test("getReachableParentCommits",async () => {
    const ref = pushedBranches[1];

    // using code from original codebase to compare results
    const rawCommand = spawnSync("git", ["rev-list", "--parents", `${ref}..HEAD`], {cwd});
    const output = rawCommand.stdout
                             .toString()
                             .split(/\n/g)
                             .map(line => line.split(/ /g).slice(1))
                             .filter(commit => commit.length > 0)
                             .flat();
    const result = await git.getReachableParentCommits(cwd, ref);
    expect(result).toStrictEqual(output);
});

test("merge", async () => {
    // get a branch which is not the current branch and has a file committed
    let branchToMergeFrom = "";
    for (let i = 0; i < files.length; i++) {
        if (files[i].branch !== currentBranch) {
            branchToMergeFrom = files[i].branch;
            break;
        }
    }
    assert(branchToMergeFrom !== "", "your configuration needs at least 1 file committed to some branch which is not on the current branch");

    // merge the found branch to the current branch
    await expect(git.merge(cwd, "origin", branchToMergeFrom)).resolves.not.toThrowError();
    
    // verify that files actually exist after branch is merged
    for (let i = 0; i < files.length; i++) {
        if (files[i].branch === branchToMergeFrom) {
            expect(fs.existsSync(files[i].path)).toBe(true);
        }
    }
});

test("head",async () => {
    const output = spawnSync("git", ["show-ref", "--head", "-s", "/HEAD"], {cwd}).stdout.toString();
    const result = await git.head(cwd);
    expect(result).toEqual(output);
});

test("sha",async () => {
    const ref = pushedBranches[1];
    const output = spawnSync("git", ["show-ref", "-s", `refs/remotes/origin/${ref}`], {cwd}).stdout.toString();
    const result = await git.sha(cwd, ref);
    expect(result).toEqual(output);
});

test("rename",async () => {
    const ref = localBranches[0];
    const newName = "newBranchName";

    //switch to local branch
    spawnSync("git", ["checkout", ref], { cwd });

    // change name
    await git.rename(cwd, newName);

    // get the current branch name
    const output = spawnSync("git", ["branch", "--show-current"], {cwd}).stdout.toString().trim();
    
    expect(output).toEqual(newName);

    // go back to the original current branch
    spawnSync("git", ["checkout", currentBranch], { cwd });
});

test("rebase",async () => {
   await expect(git.rebase(cwd, currentBranch)).resolves.not.toThrowError(); 
});

test.each([
    ["with force", true],
    ["without force", false]
])("push %p", async (title: string, withForce: boolean) => {
    const expressionToTest = "GIT_CHERRY_SHOULD_NOT_INCLUDE_THIS_MSG";
    // create file to push
    fs.writeFileSync(path.join(cwd, "test-push"), "testing git push");

    // add and commit the file
    spawnSync("git", ["add", "."], { cwd });
    spawnSync("git", ["commit", "-m", expressionToTest], { cwd });

    await git.push(cwd, withForce, currentBranch);

    // use git cherry to verify this commit was pushed
    const output = spawnSync("git", ["cherry", "-v"], { cwd }).stdout.toString();
    expect(output.includes(expressionToTest)).toBe(false);
});

test.each([
    ["branch exists", true, ["testgroup", "repoA", "main"]],
    ["branch does not exist", false, ["testgroup", "repoA", "non_existent_branch"]],
    ["repo does not exist", false, ["testgroup", "non-existant-repo", "main"]]
])("doesBranchExist %p", async (title:string, branchExists: boolean, args: string[]) => {
    await expect(git.doesBranchExist(args[0], args[1], args[2])).resolves.toBe(branchExists);
});

test.each([
    ["success: origin", true, ["testgroup", "repoA", "sbranch"]],
    ["success: fork", true, ["testgroup", "repoA", "sbranch", "testgroup-forked", "repoA-forked"]],
    ["failure: origin", false, ["testgroup", "repoA", "tbranch"]],
    ["failure: fork", false, ["testgroup", "repoA", "tbranch", "testgroup-forked", "repoA-forked"]]
])("hasPullRequest %p", async (title:string, hasPR: boolean, args: string[]) => {
    if (args.length < 4)
        {await expect(git.hasPullRequest(args[0], args[1], args[2])).resolves.toBe(hasPR);}
    else
        {await expect(git.hasPullRequest(args[0], args[1], args[2], { sourceOwner: args[3], sourceRepo: args[4] })).resolves.toBe(hasPR);}

});

test.each([
    ["success: same source and target owner", true, ["target1", "target1", "repoA"]],
    ["failure: same source and target owner", false, ["target2", "target2", "repoA"]],
    ["success: different source and target owner", true, ["target3", "source", "repoA"]],
    ["failure: different source and target owner", false, ["target4", "source", "repoA"]]
])("getSourceProjectName %p", async (title:string, testForSuccess: boolean, args: string[]) => {
    if (testForSuccess) {
        await expect(git.getSourceProjectName(args[0], args[1], args[2])).resolves.toBe(args[2]);
    } else {
        await expect(git.getSourceProjectName(args[0], args[1], args[2])).rejects.toThrowError();
    }
});

