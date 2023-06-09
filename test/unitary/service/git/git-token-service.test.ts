import "reflect-metadata";
import { GitTokenService } from "@bc/service/git/git-token-service";
import Container from "typedi";

let gitTokenService: GitTokenService;
beforeEach(() => {
  Container.reset();
  gitTokenService = Container.get(GitTokenService);
});

describe("github", () => {
  test("get token with tokenId", () => {
    process.env["tokenId"] = "token";
    expect(gitTokenService.getGithubToken("id", "tokenId")).toBe("token");
    delete process.env["tokenId"];
  });

  test("get token without tokenId", () => {
    gitTokenService.setGithubToken("id", "token");
    expect(gitTokenService.getGithubToken("id")).toBe("token");
  });

  test("set token using env: id already exists", () => {
    gitTokenService.setGithubToken("id", "token");
    process.env["tokenId"] = "other token";
    gitTokenService.setGithubTokenUsingEnv("id", "tokenId");
    expect(gitTokenService.getGithubToken("id")).toBe("token");
    delete process.env["tokenId"];
  });

  test("set token using env: token does not exist in env", () => {
    gitTokenService.setGithubTokenUsingEnv("id", "tokenId");
    expect(gitTokenService.getGithubToken("id")).toBe(undefined);
  });

  test("set token using env", () => {
    process.env["tokenId"] = "other token";
    gitTokenService.setGithubTokenUsingEnv("id", "tokenId");
    expect(gitTokenService.getGithubToken("id")).toBe("other token");
    delete process.env["tokenId"];
  });
});

describe("gitlab", () => {
  test("get token with tokenId", () => {
    process.env["tokenId"] = "token";
    expect(gitTokenService.getGitlabToken("id", "tokenId")).toBe("token");
    delete process.env["tokenId"];
  });

  test("get token without tokenId", () => {
    gitTokenService.setGitlabToken("id", "token");
    expect(gitTokenService.getGitlabToken("id")).toBe("token");
  });

  test("set token using env: id already exists", () => {
    gitTokenService.setGitlabToken("id", "token");
    process.env["tokenId"] = "other token";
    gitTokenService.setGitlabTokenUsingEnv("id", "tokenId");
    expect(gitTokenService.getGitlabToken("id")).toBe("token");
    delete process.env["tokenId"];
  });

  test("set token using env: token does not exist in env", () => {
    gitTokenService.setGitlabTokenUsingEnv("id", "tokenId");
    expect(gitTokenService.getGitlabToken("id")).toBe(undefined);
  });

  test("set token using env", () => {
    process.env["tokenId"] = "other token";
    gitTokenService.setGitlabTokenUsingEnv("id", "tokenId");
    expect(gitTokenService.getGitlabToken("id")).toBe("other token");
    delete process.env["tokenId"];
  });
});
