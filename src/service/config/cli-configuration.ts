import { EventData, GitConfiguration, ProjectConfiguration } from "@bc/domain/configuration";
import { constants } from "@bc/domain/constants";
import { FlowType } from "@bc/domain/inputs";
import { BaseConfiguration } from "@bc/service/config/base-configuration";
import { OctokitService } from "@bc/service/git/octokit";
import { logAndThrow } from "@bc/utils/log";
import Container from "typedi";

export class CLIConfiguration extends BaseConfiguration {
  
  override loadProject(): { source: ProjectConfiguration; target: ProjectConfiguration } {
    if (this.parsedInputs.CLISubCommand === FlowType.BRANCH) {
      const projectName = this.parsedInputs.startProject!.split("/");
      const projectConfig = {
        branch: this.parsedInputs.branch,
        name: projectName[projectName.length - 1],
        group: this.parsedInputs.group ?? projectName[0],
        repository: this.parsedInputs.startProject,
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
   * Process user input to produce git configuration
   * @returns
   */
  loadGitConfiguration(): GitConfiguration {
    const serverUrl = process.env.GITHUB_SERVER_URL ? process.env.GITHUB_SERVER_URL.replace(/\/$/, "") : "https://github.com";
    let gitConfig: GitConfiguration = {
      serverUrl: serverUrl,
      serverUrlWithToken: serverUrl.replace("://", `://${Container.get(constants.GITHUB.TOKEN)}@`),
    };
    if (this.parsedInputs.CLISubCommand === FlowType.BRANCH) {
      const group = this.parsedInputs.group ?? this.parsedInputs.startProject?.split("/")[0];
      if (!group) {
        logAndThrow("Specify group option or set project name as GROUP_NAME/REPO_NAME");
      }
      gitConfig = {
        ...gitConfig,
        actor: group,
        ref: this.parsedInputs.branch,
      };
    }
    return gitConfig;
  }

  /**
   * Produce the event payload file for PR build using the events url. For branch build github event is empty
   * @returns
   */
  async loadGitEvent(): Promise<EventData> {
    if (this.parsedInputs.CLISubCommand === FlowType.BRANCH) {
      return {};
    }
    if (!this.parsedInputs.url) {
      logAndThrow("If running from the CLI, event url needs to be defined");
    }
    const PR_URL = /^https?:\/\/.+\/([^/\s]+)\/([^/\s]+)\/pull\/(\d+)$/;
    const prCheck = this.parsedInputs.url.match(PR_URL);
    if (prCheck) {
      this.logger.debug("Getting pull request information");
      try {
        const { data } = await Container.get(OctokitService).octokit.pulls.get({
          owner: prCheck[1],
          repo: prCheck[2],
          pull_number: parseInt(prCheck[3]),
        });
        return data;
      } catch (err) {
        logAndThrow(`Invalid event url ${this.parsedInputs.url}`);
      }
    }
    logAndThrow(`Invalid event url ${this.parsedInputs.url}. URL must be a github pull request event url or a github tree url`);
  }

  /**
   * Set the github token
   * @returns
   */
  loadToken(): void {
    if (this.parsedInputs.token) {
      Container.set(constants.GITHUB.TOKEN, this.parsedInputs.token);
    } else if (process.env.GITHUB_TOKEN) {
      Container.set(constants.GITHUB.TOKEN, process.env.GITHUB_TOKEN);
    } else {
      logAndThrow("A github token is needed");
    }
  }

  /**
   * Get the flow type if defined otherwise throw an error
   * @returns
   */
  getFlowType(): FlowType {
    const subcmd = this.parsedInputs.CLISubCommand!;
    if (Object.values(FlowType).includes(subcmd as FlowType)) {
      return subcmd as FlowType;
    }
    logAndThrow("The CLI subcommand is a tool commaand. No flow defined");
  }
}
