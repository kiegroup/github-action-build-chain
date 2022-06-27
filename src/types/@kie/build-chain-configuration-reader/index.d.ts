declare module "@kie/build-chain-configuration-reader" {
    export type UrlPlaceholders = {
        [key: string]: string
    }

    export type BuildChainReaderOptions = {
        url: UrlPlaceholders | Record<string, never>,
        token: string
    }

    export type ProjectMapping = {
        exclude?: string[]
        dependencies: {
            default: { source: string, target: string }[],
            [key: string]: { source: string, target?: string, targetExpression?: string }[]
        },
        depenpendant: {
            default: { source: string, target: string }[],
            [key: string]: { source: string, target?: string, targetExpression?: string }[]
        }
    }

    export type ProjectDependency = {
        project: string,
        mapping?: ProjectMapping
        dependencies?: ProjectDependency[]
    }

    /** Tried to recontruct from https://github.com/kiegroup/build-chain-configuration-reader/blob/36edb075bff8d8644f1b4cb721898aa892d8e347/docs/tree-example.json */
    export type ProjectTreeNode = {
        project: string,
        dependencies?: "none" | { project: string }[],
        warning: string,
        parents: ProjectTree,
        children: ProjectTree,
        repo: {
            group: string,
            name: string
        },
        build: {
            "build-command": {
                current: string[] | string,
                upstream?: string[] | string,
                downstream?: string[] | string,
                after?: {
                    upstream?: string,
                    downstream?: string,
                    current?: string
                }
            },
            "archive-artifacts"?: {
                path: string[],
                "if-no-files-found": string,
                dependencies: "none" | { project: string }[],
                name: string,
                paths: {
                    path: string,
                    on: string
                }[],
                skip?: boolean
            }
        },
        mapping?: ProjectMapping
    } 

    export type ProjectTree = ProjectTreeNode[];

    export function getTree(file: string, options?: BuildChainReaderOptions): ProjectTree;

    export function getTreeForProject(file: string, project: string, options?: BuildChainReaderOptions): ProjectTreeNode;

    export function parentChainFromNode(node: ProjectTreeNode): ProjectTreeNode;

    export function getOrderedListForTree(file: string, options?: BuildChainReaderOptions): ProjectTree;

    export function getOrderedListForProject(file: string, options?: BuildChainReaderOptions): ProjectTree;
    
    export function treatUrl(url: string, placeholders: UrlPlaceholders): string;

    export function getBaseBranch(
        projectTriggeringTheJob: string,
        projectTriggeringTheJobMapping: ProjectMapping,
        currentProject: string,
        currentProjectMapping: ProjectMapping,
        expectedBaseBranch: string
    ): string;

    export function readDefinitionFile(file: string, options?: BuildChainReaderOptions): ProjectDependency[];
}