import * as OctokitTypes from "@octokit/types";

export type AnyResponse = OctokitTypes.OctokitResponse<unknown>;
export type StrategyInterface = OctokitTypes.StrategyInterface<
  [Token],
  [],
  Authentication
>;
export type EndpointDefaults = OctokitTypes.EndpointDefaults;
export type EndpointOptions = OctokitTypes.EndpointOptions;
export type RequestParameters = OctokitTypes.RequestParameters;
export type RequestInterface = OctokitTypes.RequestInterface;
export type Route = OctokitTypes.Route;

export type Token = string;

export type Authentication = {
  type: "token";
  tokenType: "oauth";
  token: Token;
};

export type ThrottleOptions = {
  method: string;
  url: string; 
}