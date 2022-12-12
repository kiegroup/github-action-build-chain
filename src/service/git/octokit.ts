import { constants } from "@bc/domain/constants";
import { Octokit } from "@octokit/rest";
import Container from "typedi";
import { HttpProxyAgent } from "http-proxy-agent";

/**
 * Singleton factory for octokit instance
 */
export class OctokitFactory {
  private static octokit?: Octokit;

  /**
   * Get the initialized octokit instance and initialize it if not done yet
   * @returns {Octokit} a hydrated octokit instance
   */
  public static getOctokitInstance(): Octokit {
    if (!this.octokit) {
      const proxy = process.env["http_proxy"];
      this.octokit = new Octokit({
        auth: Container.get(constants.GITHUB.TOKEN),
        userAgent: "kiegroup/github-build-chain-action",
        request: { agent: proxy ? new HttpProxyAgent(proxy) : undefined },
      });
    }
    return this.octokit;
  }

  /**
   * Clear out the octokit instance
   */
  public static clearOctokitInstance() {
    this.octokit = undefined;
  }
}
