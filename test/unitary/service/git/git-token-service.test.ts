import "reflect-metadata";
import { GitTokenService } from "@bc/service/git/git-token-service";
import Container from "typedi";

let gitTokenService: GitTokenService;
beforeEach(() => {
  Container.reset();
  gitTokenService = Container.get(GitTokenService);
});

describe("git token service", () => {
  test("get token with tokenId", () => {
    process.env["tokenId"] = "token";
    expect(gitTokenService.getToken("id", "tokenId")).toBe("token");
    delete process.env["tokenId"];
  });

  test("get token without tokenId", () => {
    gitTokenService.setToken("id", "token");
    expect(gitTokenService.getToken("id")).toBe("token");
  });

  test("set token using env: id already exists", () => {
    gitTokenService.setToken("id", "token");
    process.env["tokenId"] = "other token";
    gitTokenService.setTokenUsingEnv("id", "tokenId");
    expect(gitTokenService.getToken("id")).toBe("token");
    delete process.env["tokenId"];
  });

  test("set token using env: token does not exist in env", () => {
    gitTokenService.setTokenUsingEnv("id", "tokenId");
    expect(gitTokenService.getToken("id")).toBe(undefined);
  });

  test("set token using env", () => {
    process.env["tokenId"] = "other token";
    gitTokenService.setTokenUsingEnv("id", "tokenId");
    expect(gitTokenService.getToken("id")).toBe("other token");
    delete process.env["tokenId"];
  });
});