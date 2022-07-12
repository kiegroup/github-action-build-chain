import { TreatmentOptions } from "@bc/domain/treatment-options";
import { Endpoints } from "@octokit/types";

export interface Configuration {
  // TODO: to implement
  token: string;
  treatmentOptions?: TreatmentOptions;
  startingProject?: string;
  projectTriggeringTheJob: string;
  skipProjectCheckout?: string[];
  skipProjectExecution?: string[];
  skipCheckout: boolean;
  skipExecution: boolean;
}

export const defaultValue: Readonly<Configuration> = {
  token: "",
  projectTriggeringTheJob: "",
  skipCheckout: false,
  skipExecution: false,
};

export type GitConfiguration = {
  serverUrl?: string;
  serverUrlWithToken?: string;
  action?: string;
  actor?: string;
  author?: string;
  jobId?: string;
  ref?: string;
  workflow?: string;
};

export type ProjectConfiguration = {
  repository?: string;
  name?: string;
  group?: string;
  branch?: string;
};

export type EventData = Endpoints["GET /repos/{owner}/{repo}/pulls/{pull_number}"]["response"]["data"] | Record<string, never>;
