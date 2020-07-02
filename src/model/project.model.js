export class Project {
    constructor(name, group, parentDependencies, childDependencies, git) {
        this.name = name;
        this.group = group;
        this.parentDependencies = parentDependencies;
        this.childDependencies = childDependencies;
        this.git = git;
    }
}