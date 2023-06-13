import { CLIActionType, ToolType } from "@bc/domain/cli";
import { EventData, GitConfiguration, ProjectConfiguration } from "@bc/domain/configuration";
import { FlowType, InputValues } from "@bc/domain/inputs";
import { BaseConfiguration } from "@bc/service/config/base-configuration";
import { GitAPIService } from "@bc/service/git/git-api-service";
import { logAndThrow } from "@bc/utils/log";
import { DEFAULT_GITHUB_PLATFORM, DEFAULT_GITLAB_PLATFORM, PlatformType } from "@kie/build-chain-configuration-reader";
import Container from "typedi";

const PR_URL = /^(https?:\/\/.+\/)([^/\s]+)\/([^/\s]+)\/pull\/(\d+)$/;
const MR_URL = /^(https?:\/\/.+\/)([^/\s]+)\/([^/\s]+)\/-\/merge_requests\/(\d+)$/;

export class CLIConfiguration extends BaseConfiguration { 
  override loadProject(): { source: ProjectConfiguration; target: ProjectConfiguration } {
    if (this.parsedInputs.CLICommand === CLIActionType.TOOLS) {
      return { source: {}, target: {} };
    }
    else if (this.parsedInputs.CLISubCommand === FlowType.BRANCH) {
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
    // user have the option to set the default server url as gitlab's url by setting the CI_SERVER_URL variable
    const githubServerUrl = process.env.GITHUB_SERVER_URL ? process.env.GITHUB_SERVER_URL.replace(/\/$/, "") : "https://github.com";
    const gitlabServerUrl = process.env.CI_SERVER_URL?.replace(/\/$/, "");
    const serverUrl = gitlabServerUrl ? gitlabServerUrl : githubServerUrl;
    const token = this.tokenService.getToken(
      gitlabServerUrl ? 
        DEFAULT_GITLAB_PLATFORM.id : 
        DEFAULT_GITHUB_PLATFORM.id
    );
    let gitConfig: GitConfiguration = {
      serverUrl: serverUrl,
      serverUrlWithToken: serverUrl.replace("://", `://${token}@`),
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
    if (this.parsedInputs.CLICommand === CLIActionType.TOOLS) {
      return {};
    }

    if (this.parsedInputs.CLISubCommand === FlowType.BRANCH) {
      // set github env variables
      process.env["GITHUB_HEAD_REF"] = this.parsedInputs.branch;
      process.env["GITHUB_BASE_REF"] = this.parsedInputs.branch;
      process.env["GITHUB_REPOSITORY"] = this.parsedInputs.startProject;
      process.env["GITHUB_ACTOR"] = this.parsedInputs.group ?? this.parsedInputs.startProject!.split("/")[0];
      
      // set gitlab env variables
      process.env["CI_MERGE_REQUEST_SOURCE_BRANCH_NAME"] = this.parsedInputs.branch;
      process.env["CI_MERGE_REQUEST_TARGET_BRANCH_NAME"] = this.parsedInputs.branch;
      process.env["CI_PROJECT_ID"] = this.parsedInputs.startProject;
      process.env["CI_PROJECT_NAMESPACE"] = this.parsedInputs.group ?? this.parsedInputs.startProject!.split("/")[0];
      return {};
    }

    if (!this.parsedInputs.url) {
      logAndThrow("If running from the CLI, event url needs to be defined");
    }

    const urlCheck = this.isGitlabUrl(this.parsedInputs.url) ? 
      this.parsedInputs.url.match(MR_URL) :
      this.parsedInputs.url.match(PR_URL);
    
    if (urlCheck) {
      this.logger.debug("Getting pull request information");
      

      // cannot use the GitAPIService since it needs config service to get the
      // platform. To get the platform i need to read the definition file. To 
      // read the definition file I need know the source and target projects. To
      // know the source and target projects i need to load pull request data
      const data = await Container.get(GitAPIService).getPullRequest(
        urlCheck[2],
        urlCheck[3],
        parseInt(urlCheck[4]),
      );
        
      process.env["GITHUB_SERVER_URL"] = urlCheck[1];
      delete process.env["GITHUB_ACTION"]; // doing process.env["GITHUB_ACTION"] = undefined will set to the string "undefined"
      process.env["GITHUB_ACTOR"] = data.head.user.login;
      process.env["GITHUB_HEAD_REF"] = data.head.ref;
      process.env["GITHUB_BASE_REF"] = data.base.ref;
      process.env["GITHUB_REPOSITORY"] = data.base.repo.full_name;
      process.env["GITHUB_REF"] = `refs/pull/${urlCheck[4]}/merge`;
      process.env["CI_SERVER_URL"] = urlCheck[1];
      process.env["CI_PROJECT_NAMESPACE"] = data.head.user.login;
      process.env["CI_MERGE_REQUEST_SOURCE_BRANCH_NAME"] = data.head.ref;
      process.env["CI_MERGE_REQUEST_TARGET_BRANCH_NAME"] = data.base.ref;
      process.env["CI_PROJECT_ID"] = data.base.repo.full_name;
      process.env["CI_MERGE_REQUEST_REF_PATH"] = `refs/merge-requests/${urlCheck[4]}/merge`;

      return data;
    }
    logAndThrow(`Invalid event url ${this.parsedInputs.url}. URL must be a github pull request event url or a github tree url`);
  }

  /**
   * Set the github token
   * @returns
   */
  loadToken(): void {
    const platform = this.getDefaultPlatformConfig();
    let token: string[] | undefined;

    if (process.env[platform.tokenId]) {
      token = [process.env[platform.tokenId]!];
    }

    if (this.parsedInputs.token && this.parsedInputs.token.length > 0) {
      token = this.parsedInputs.token;
    }

    if (!token) {
      logAndThrow("Either a github or gitlab token must be set");
    }

    if (platform.type === PlatformType.GITHUB) {
      this.tokenService.setGithubTokenPool(platform.id, token);
    } 
    this.tokenService.setToken(platform.id, token[0]);
  }

  override loadParsedInput(): InputValues {
    this._defaultPlatform = this.isGitlabUrl(this.parsedInputs.url) ? 
    PlatformType.GITLAB :
    PlatformType.GITHUB;
    return super.loadParsedInput();
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
    logAndThrow("The CLI subcommand is a tool command. No flow defined");
  }

  /**
   * Get the flow type if defined otherwise throw an error
   * @returns
   */
  override getToolType(): ToolType {
    const subcmd = this.parsedInputs.CLISubCommand!;
    if (Object.values(ToolType).includes(subcmd as ToolType)) {
      return subcmd as ToolType;
    }
    logAndThrow("The CLI subcommand is a build command. No tools defined");
  }

  private isGitlabUrl(url?: string) {
    return url && MR_URL.test(url);
  }
}
