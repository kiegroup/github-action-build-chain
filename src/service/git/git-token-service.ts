import { Service } from "typedi";

@Service()
export class GitTokenService {
  private githubTokenPools: Record<string, string[]>;
  private tokens: Record<string, string>;

  constructor() {
    this.githubTokenPools = {};
    this.tokens = {};
  }

  setToken(id: string, token: string) {
    this.tokens[id] = token;
  }

  /**
   * Will only set the token if it was defined in the env and
   * if a token for the given id didn't already exist.
   * Will not throw an error if it failed to set token. It will just
   * return back silently.
   * @param id
   * @param tokenId
   */
  setTokenUsingEnv(id: string, tokenId: string) {
    const token = process.env[tokenId];
    if (!this.tokens[id] && token) {
      this.tokens[id] = token;
    }
  }

  /**
   * Set the token from env and return back the set token
   * @param id
   * @param tokenId
   */
  getToken(id: string, tokenId: string): string | undefined;
  /**
   * Return back the set token for the given id
   * @param id
   */
  getToken(id: string): string | undefined;
  getToken(id: string, tokenId?: string) {
    if (tokenId) {
      this.setTokenUsingEnv(id, tokenId);
    }
    return this.tokens[id];
  }

  setGithubTokenPool(id: string, tokens: string[]) {
    this.githubTokenPools[id] = tokens;
  }

  getGithubTokenPool(id: string) {
    return this.githubTokenPools[id];
  }
}
