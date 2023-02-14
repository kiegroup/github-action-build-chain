import { EventData, GitConfiguration, ProjectConfiguration } from "@bc/domain/configuration";
import { constants } from "@bc/domain/constants";
import { FlowType } from "@bc/domain/inputs";
import { BaseConfiguration } from "@bc/service/config/base-configuration";
import { GithubAPIService } from "@bc/service/git/github-api";
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
      process.env["GITHUB_HEAD_REF"] = this.parsedInputs.branch;
      process.env["GITHUB_BASE_REF"] = this.parsedInputs.branch;
      process.env["GITHUB_REPOSITORY"] = this.parsedInputs.startProject;
      process.env["GITHUB_ACTOR"] = this.parsedInputs.group ?? this.parsedInputs.startProject!.split("/")[0];
      return {};
    }
    if (!this.parsedInputs.url) {
      logAndThrow("If running from the CLI, event url needs to be defined");
    }
    const PR_URL = /^(https?:\/\/.+\/)([^/\s]+)\/([^/\s]+)\/pull\/(\d+)$/;
    const prCheck = this.parsedInputs.url.match(PR_URL);
    if (prCheck) {
      this.logger.debug("Getting pull request information");
      
      const data = await Container.get(GithubAPIService).getPullRequest(
        prCheck[2],
        prCheck[3],
        parseInt(prCheck[4]),
      );
        
      process.env["GITHUB_SERVER_URL"] = prCheck[1];
      delete process.env["GITHUB_ACTION"]; // doing process.env["GITHUB_ACTION"] = undefined will set to the string "undefined"
      process.env["GITHUB_ACTOR"] = data.head.user.login;
      process.env["GITHUB_HEAD_REF"] = data.head.ref;
      process.env["GITHUB_BASE_REF"] = data.base.ref;
      process.env["GITHUB_REPOSITORY"] = data.base.repo.full_name;
      process.env["GITHUB_REF"] = `refs/pull/${prCheck[4]}/merge`;

      return data;
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
