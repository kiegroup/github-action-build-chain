const { GitInfo } = require('./git-info.model');
const { GitPullRequestInfo } = require('./git-pullrequest-info.model');
const { GitPullRequest } = require('./git-pullrequest.model');
const { ProjectBuild } = require('./project-build.model');
const { Project } = require('./project.model');

export class ProjectBuilder {
    constructor(name, command) {
        this.name = name;
        this.command = command;
        this.group = undefined;
        this.parentDependencies = undefined;
        this.childDependencies = undefined;
        this.url = undefined;
        this.branch = undefined;
        this.pullRequestId = undefined;
        this.pullRequestDate = undefined;
        this.pullRequestAuthor = undefined;
        this.sourceBranch = undefined;
        this.targetBranch = undefined;
    }

    setGroup(group) {
        this.group = group;
    }

    addParentDependecies(...dependencies) {
        this.parentDependencies = (this.parentDependencies || []).addAll(dependencies);
    }

    addChildDependecies(...dependencies) {
        this.childDependencies = (this.childDependencies || []).addAll(dependencies);
    }

    setUrl(url) {
        this.url = url;
    }

    setBranch(branch) {
        this.branch = branch;
    }

    setPullRequestId(id) {
        this.pullRequestId = id;
    }

    setPullRequestDate(date) {
        this.pullRequestDate = date;
    }

    setPullRequestAuthor(author) {
        this.pullRequestAuthor = author;
    }

    setTargetBranch(branch) {
        this.targetBranch = branch;
    }

    setSourceBranch(branch) {
        this.sourceBranch = branch;
    }

    build() {
        let pullRequestInfo = new GitPullRequestInfo(this.author, this.sourceBranch, this.targetBranch);
        let pullRequest = new GitPullRequest(this.pullRequestId, this.pullRequestDate, pullRequestInfo);
        let gitInfo = new GitInfo(this.url, pullRequest, this.branch);
        let project = new Project(this.name, this.group, this.parentDependencies, this.childDependencies, gitInfo);
        return new ProjectBuild(project, this.command);
    }
}