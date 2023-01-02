import { constants } from "@bc/domain/constants";
import { Octokit } from "@octokit/rest";
import Container, { Service } from "typedi";
import { HttpProxyAgent } from "http-proxy-agent";

@Service()
export class OctokitService {
  private _octokit: Octokit;

  constructor() {
    /**
     * Behind the scenes act-js uses proxies to mock apis. It expects that all clients respect the http_proxy env variable.
     * Most of the clients do but there are some which don't and in our case Octokit doesn't. Their reasoning being that people
     * might use Octokit in browsers which doesn't follow this convention - https://github.com/octokit/octokit.js/issues/2098#issuecomment-844673894
     *
     * So using http-proxy-agent is a workaround to force Octokit to respect proxies
     * One added advantage of this is that when build-chain is used in an enterprise setting, it might need to go through proxies and
     * this workaround will help with that.
     */
    const proxy = process.env["http_proxy"];
    this._octokit = new Octokit({
      auth: Container.get(constants.GITHUB.TOKEN),
      userAgent: "kiegroup/github-build-chain-action",
      request: { agent: proxy ? new HttpProxyAgent(proxy) : undefined },
    });
  }

  get octokit() {
    return this._octokit;
  }
}
