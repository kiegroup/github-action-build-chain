declare module "@kie/build-chain-configuration-reader" {
  export type UrlPlaceholders = {
    [key: string]: string;
  };

  export type BuildChainReaderOptions = {
    url: UrlPlaceholders | Record<string, never>;
    token: string;
  };

  export type Mapping = {
    exclude?: string[];
    dependencies?: {
      [key: string]: { source: string; target?: string; targetExpression?: string }[];
    };
    depenpendant?: {
      [key: string]: { source: string; target?: string; targetExpression?: string }[];
    };
  };

  export type ArchiveArtifacts = {
    path?: string | string[];
    "if-no-files-found"?: string;
    dependencies?: string | { project: string }[] | string[];
    name?: string;
    paths?: {
      path?: string;
      on?: string;
    }[];
  };

  export type Build = {
    "build-command"?: {
      before?: {
        current?: string | string[];
        upstream?: string | string[];
        downstream?: string | string[];
        merge?: string[];
      };
      current?: string | string[];
      upstream?: string | string[];
      downstream?: string | string[];
      after?: {
        current?: string | string[];
        upstream?: string | string[];
        downstream?: string | string[];
        merge?: string[];
      };
      merge?: string[];
    };
    skip?: boolean;
    "archive-artifacts": ArchiveArtifacts;
  };

  export type Dependency = {
    project: string;
    mapping?: Mapping;
    dependencies?: string | string[] | { project: string }[];
  };

  export type DefinitionFile = {
    version: string;
    pre?: string | string[];
    post?: string | string[];
    default?: Build;
    build?: Build;
    dependencies?: Dependency[];
  };

  /** Tried to recontruct from https://github.com/kiegroup/build-chain-configuration-reader/blob/36edb075bff8d8644f1b4cb721898aa892d8e347/docs/tree-example.json */
  export type ProjectNode = {
    project: string;
    dependencies?: { project: string }[];
    children?: ProjectNode[];
    parent?: ProjectNode[];
    repo?: {
      group: string;
      name: string;
    };
    build?: Build;
    mapping?: Mapping;
  };

  export type ProjectTree = ProjectNode[];

  export function getTree(file: string, options?: BuildChainReaderOptions): Promise<ProjectTree>;

  export function getTreeForProject(file: string, project: string, options?: BuildChainReaderOptions): ProjectNode;

  export function parentChainFromNode(node: ProjectNode): ProjectTree;

  export function getOrderedListForTree(file: string, options?: BuildChainReaderOptions): Promise<ProjectNode[]>;

  export function getOrderedListForProject(file: string, options?: BuildChainReaderOptions): ProjectNode[];

  export function treatUrl(url: string, placeholders: UrlPlaceholders): string;

  export function getBaseBranch(
    projectTriggeringTheJob: string,
    projectTriggeringTheJobMapping: Mapping,
    currentProject: string,
    currentProjectMapping: Mapping,
    expectedBaseBranch: string
  ): string;

  export function readDefinitionFile(file: string, options?: BuildChainReaderOptions): Promise<DefinitionFile>;
}
