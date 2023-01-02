import { Endpoints } from "@octokit/types";

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

export type EventData = Endpoints["GET /repos/{owner}/{repo}/pulls/{pull_number}"]["response"]["data"] | Record<string, never>;
