import { constants } from "@bc/domain/constants";
import { Octokit } from "@octokit/rest";
import Container, { Service } from "typedi";
import { HttpProxyAgent } from "http-proxy-agent";
import { throttling  } from "@octokit/plugin-throttling";
import { LoggerService } from "@bc/service/logger/logger-service";
import { BaseLoggerService } from "@bc/service/logger/base-logger-service";
import { AnyResponse, Authentication, EndpointDefaults, EndpointOptions, RequestInterface, RequestParameters, Route, StrategyInterface, ThrottleOptions } from "@bc/domain/octokit";

@Service()
export class OctokitService {
  private _octokit: Octokit;
  private currentToken: string;
  private whitelist: string[];
  private blacklist: Record<string, number>;
  private logger: BaseLoggerService;

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
    this.currentToken = Container.get(constants.GITHUB.TOKEN);
    this.whitelist = Container.get(constants.GITHUB.TOKEN_POOL);
    this.logger = Container.get(LoggerService).logger;
    this.blacklist = {};

    const ThrottledOctokit = Octokit.plugin(throttling);
    this._octokit = new ThrottledOctokit({
      authStrategy: this.createTokenAuth.bind(this),
      userAgent: "kiegroup/github-build-chain-action",
      request: { 
        agent: proxy ? new HttpProxyAgent(proxy) : undefined,
      },
      throttle: {
        onRateLimit: this.onRateLimit.bind(this),
        onSecondaryRateLimit: this.onSecondaryRateLimit.bind(this),
        retryAfterBaseValue: 0
      }
    });
  }

  get octokit() {
    return this._octokit;
  }

  /**
   * Rotates through tokens and retries request if there are tokens left when we reach rate limit
   * @param retryAfter 
   * @param options 
   * @returns 
   */
  private onRateLimit(retryAfter: number, options: ThrottleOptions) {
    this.logger.warn(`Request quota exhausted for request ${options.method} ${options.url}. Trying other tokens in the pool`);

    // check if we have any new available tokens. if there are then add them to whitelist and remove them from blacklist
    this.blacklist = Object.keys(this.blacklist).reduce((blacklist: Record<string, number>, token) => {
      if (this.blacklist[token] >= new Date().getTime()) {
        blacklist[token] = this.blacklist[token];
      } else {
        this.whitelist.push(token);
      }
      return blacklist;
    }, {});
    
    // move current token to blacklist and keep track of after how much time we can use it again
    this.blacklist[this.currentToken] = retryAfter * 1000 + new Date().getTime();

    // remove token from whitelist
    this.whitelist = this.whitelist.filter(token => token !== this.currentToken);
    
    // a token is available lets retry the request
    if (this.whitelist.length > 0) {
      this.logger.debug("Found a token. retrying...");

      // set new token as current one
      this.currentToken = this.whitelist.pop()!;

      // set the new token globally
      Container.set(constants.GITHUB.TOKEN, this.currentToken);
      return true;
    } else {
      this.logger.error("Request quota exhausted. No tokens available");
      return false;
    }
  }

  /**
   * Handles secondary rate limits
   * @param retryAfter 
   * @param options 
   * @returns 
   */
  private onSecondaryRateLimit(retryAfter: number, options: ThrottleOptions) {
    this.logger.warn(`Secondary rate limit detected for request ${options.method} ${options.url}. Will retry after ${retryAfter}`);
    return true;
  }

  /**
   * Used to create custom auth strategy for octokit.
   * We can't use the traditional auth token method since once we initialize octokit with an auth token it
   * will stick that and won't dynamically change as we change currentToken
   * Refer: https://github.com/octokit/authentication-strategies.js/#how-authentication-strategies-work
   * @returns 
   */
  private createTokenAuth: StrategyInterface = () => {
    return Object.assign(this.auth.bind(this), {
      hook: this.hook.bind(this)
    });
  };

  /**
   * Utility function to satisfy octokit's auth strategy interface
   * Don't really need it otherwise
   * @returns 
   */
  private async auth(): Promise<Authentication> {
    return {
      type: "token",
      token: this.currentToken,
      tokenType: "oauth"
    };
  }

  /**
   * The main logic for the custom auth strategy. Called before each request
   * It will use whatever the current token is and set it as the authorization token
   * @param request 
   * @param route 
   * @param parameters 
   * @returns 
   */
  private async hook(
    request: RequestInterface, 
    route: Route | EndpointOptions, 
    parameters?: RequestParameters
  ): Promise<AnyResponse> {
    const endpoint: EndpointDefaults = request.endpoint.merge(
      route as string,
      parameters
    );
    endpoint.headers.authorization = `token ${this.currentToken}`;
    return request(endpoint as EndpointOptions);
  }
}
