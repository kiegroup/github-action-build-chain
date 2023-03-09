import { EventData, GitConfiguration, ProjectConfiguration } from "@bc/domain/configuration";
import { constants } from "@bc/domain/constants";
import { BaseConfiguration } from "@bc/service/config/base-configuration";
import { logAndThrow } from "@bc/utils/log";
import Container from "typedi";
import { readFile } from "node:fs/promises";
import { FlowType } from "@bc/domain/inputs";

export class ActionConfiguration extends BaseConfiguration {

  override loadProject(): { source: ProjectConfiguration; target: ProjectConfiguration } {
    if (this.parsedInputs.flowType === FlowType.BRANCH) {
      const projectName = this.parsedInputs.startProject ?? this.gitConfiguration.repository;
      const decomposedName = projectName!.split("/");
      const projectConfig = {
        branch: this.parsedInputs.branch ?? this.gitConfiguration.ref,
        repository: projectName,
        name: decomposedName[decomposedName.length - 1],
        group: this.parsedInputs.group ?? decomposedName[0],
      };
      return {
        source: projectConfig,
        target: projectConfig,
      };
    } else {
      return super.loadProject();
    }
  }

  /**
   * Process the various github env variables
   * @returns a new GitConfiguration instance
   */
  loadGitConfiguration(): GitConfiguration {
    const serverUrl = process.env.GITHUB_SERVER_URL ? process.env.GITHUB_SERVER_URL.replace(/\/$/, "") : "https://github.com";
    return {
      action: process.env.GITHUB_ACTION,
      actor: process.env.GITHUB_ACTOR,
      author: process.env.GITHUB_AUTHOR,
      serverUrl: serverUrl,
      serverUrlWithToken: serverUrl.replace("://", `://${Container.get(constants.GITHUB.TOKEN)}@`),
      jobId: process.env.GITHUB_JOB,
      ref: process.env.GITHUB_REF,
      workflow: process.env.GITHUB_WORKFLOW,
      repository: process.env.GITHUB_REPOSITORY,
    };
  }

  /**
   * Read the event payload file
   * @returns the github event
   */
  async loadGitEvent(): Promise<EventData> {
    if (this.parsedInputs.flowType === FlowType.BRANCH) {
      return {};
    }
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
   * Set the github token to the context
   */
  loadToken(): void {
    if (process.env.GITHUB_TOKEN) {
      Container.set(constants.GITHUB.TOKEN, process.env.GITHUB_TOKEN);
      Container.set(constants.GITHUB.TOKEN_POOL, [process.env.GITHUB_TOKEN]);
    } else {
      logAndThrow("A github token is needed");
    }
  }

  /**
   * Get the flow type for the github event
   * @returns 
   */
  getFlowType(): FlowType {
      return this.parsedInputs.flowType!;
  }
}
