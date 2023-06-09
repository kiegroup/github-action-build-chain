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

  setGithubTokenUsingEnv(id: string, tokenId: string) {
    this.setTokenUsingEnv(id, tokenId, this.githubTokens);
  }

  getGithubToken(id: string, tokenId: string): string | undefined;
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

  setGitlabTokenUsingEnv(id: string, tokenId: string) {
    this.setTokenUsingEnv(id, tokenId, this.gitlabTokens);
  }

  getGitlabToken(id: string, tokenId: string): string | undefined;
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
