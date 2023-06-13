import { Service } from "typedi";

@Service()
export class GitTokenService {
  private githubTokens: Record<string, string>;
  private gitlabTokens: Record<string, string>;
  private githubTokenPools: Record<string, string[]>;

  constructor() {
    this.githubTokens = {};
    this.gitlabTokens = {};
    this.githubTokenPools = {};
  }

  setGithubToken(id: string, token: string) {
    this.githubTokens[id] = token;
  }

  /**
   * Will only set the token if it was defined in the env and
   * if a token for the given id didn't already exist.
   * Will not throw an error if it failed to set token. It will just
   * return back silently.
   * @param id
   * @param tokenId
   */
  setGithubTokenUsingEnv(id: string, tokenId: string) {
    this.setTokenUsingEnv(id, tokenId, this.githubTokens);
  }

  /**
   * Set the token from env and return back the set token
   * @param id
   * @param tokenId
   */
  getGithubToken(id: string, tokenId: string): string | undefined;
  /**
   * Return back the set token for the given id
   * @param id
   */
  getGithubToken(id: string): string | undefined;
  getGithubToken(id: string, tokenId?: string) {
    if (tokenId) {
      this.setGithubTokenUsingEnv(id, tokenId);
    }
    return this.githubTokens[id];
  }

  setGitlabToken(id: string, token: string) {
    this.gitlabTokens[id] = token;
  }

  /**
   * Will only set the token if it was defined in the env and
   * if a token for the given id didn't already exist.
   * Will not throw an error if it failed to set token. It will just
   * return back silently.
   * @param id
   * @param tokenId
   */
  setGitlabTokenUsingEnv(id: string, tokenId: string) {
    this.setTokenUsingEnv(id, tokenId, this.gitlabTokens);
  }

  /**
   * Set the token from env and return back the set token
   * @param id
   * @param tokenId
   */
  getGitlabToken(id: string, tokenId: string): string | undefined;
  /**
   * Return back the set token for the given id
   * @param id
   */
  getGitlabToken(id: string): string | undefined;
  getGitlabToken(id: string, tokenId?: string) {
    if (tokenId) {
      this.setGitlabTokenUsingEnv(id, tokenId);
    }
    return this.gitlabTokens[id];
  }

  setGithubTokenPool(id: string, tokens: string[]) {
    this.githubTokenPools[id] = tokens;
  }

  getGithubTokenPool(id: string) {
    return this.githubTokenPools[id];
  }

  private setTokenUsingEnv(
    id: string,
    tokenId: string,
    tokenStore: Record<string, string>
  ) {
    const token = process.env[tokenId];
    if (!tokenStore[id] && token) {
      tokenStore[id] = token;
    }
  }
}
