import { InputValues } from "@bc/domain/inputs";
import { DefinitionFile, Node, PlatformType } from "@kie/build-chain-configuration-reader";

export type GitConfiguration = {
  serverUrl?: string;
  serverUrlWithToken?: string;
  action?: string;
  actor?: string;
  author?: string;
  jobId?: string;
  ref?: string;
  workflow?: string;
  repository?: string;
};

export type ProjectConfiguration = {
  repository?: string;
  name?: string;
  group?: string;
  branch?: string;
};

export type EventData = {
  html_url: string,
  head: {
    user: {
      login: string
    },
    ref: string,
    repo?: {
      full_name?: string,
      name?: string,
      owner?: {
        login?: string
      }
    }
  },
  base: {
    ref: string,
    repo: {
      full_name: string,
      name: string,
      owner: {
        login: string
      }
    }
  }
} | Record<string, never>;

export interface SerializedConfiguration {
  _gitEventData: EventData;
  _gitConfiguration: GitConfiguration;
  _sourceProject: ProjectConfiguration;
  _targetProject: ProjectConfiguration;
  _parsedInputs: InputValues;
  _defaultPlatform: PlatformType;
}

export interface SerializedConfigurationService {
  configuration: SerializedConfiguration,
  _nodeChain: Node[],
  _definitionFile: DefinitionFile
}