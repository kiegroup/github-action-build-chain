import { EventData, GitConfiguration, ProjectConfiguration } from "@bc/domain/configuration";
import { constants } from "@bc/domain/constants";
import { BaseConfiguration } from "@bc/service/config/base-configuration";
import { logAndThrow } from "@bc/utils/log";
import Container from "typedi";
import { readFile } from "node:fs/promises";

export class ActionConfiguration extends BaseConfiguration {
  /**
   * Create the source and target project configuration from the github event payload
   * @returns
   */
  loadProject(): { source: ProjectConfiguration; target: ProjectConfiguration } {
    return {
      source: {
        branch: this.gitEventData.head.ref,
        repository: this.gitEventData.head.repo?.full_name,
        name: this.gitEventData.head.repo?.name,
        group: this.gitEventData.head.repo?.owner.login,
      },
      target: {
        branch: this.gitEventData.base.ref,
        repository: this.gitEventData.base.repo.full_name,
        name: this.gitEventData.base.repo.name,
        group: this.gitEventData.base.repo.owner.login,
      },
    };
  }

  /**
   * Process the various github env variables
   * @returns
   */
  loadGitConfiguration(): GitConfiguration {
    const serverUrl = process.env.GITHUB_SERVER_URL ? process.env.GITHUB_SERVER_URL.replace(/\/$/, "") : "https://github.com";
    return {
      action: process.env.GITHUB_ACTION,
      actor: process.env.GITHUB_ACTOR,
      author: process.env.GITHUB_AUTHOR,
      serverUrl: serverUrl,
      serverUrlWithToken: serverUrl?.replace("://", `://${Container.get(constants.GITHUB.TOKEN)}@`),
      jobId: process.env.GITHUB_JOB,
      ref: process.env.GITHUB_REF,
      workflow: process.env.GITHUB_WORKFLOW,
    };
  }

  /**
   * Read the event payload file
   * @returns
   */
  async loadGitEvent(): Promise<EventData> {
    if (process.env.GITHUB_EVENT_PATH) {
      this.logger.debug("Getting pull request information");
      const data = await readFile(process.env.GITHUB_EVENT_PATH, {
        encoding: "utf8",
      });
      return JSON.parse(data).pull_request;
    }
    logAndThrow("Make sure you are running it in a github environment");
  }

  /**
   * Set the github token
   * @returns
   */
  loadToken(): void {
    if (process.env.GITHUB_TOKEN) {
      Container.set(constants.GITHUB.TOKEN, process.env.GITHUB_TOKEN);
      return;
    }
    logAndThrow("A github token is needed");
  }
}
