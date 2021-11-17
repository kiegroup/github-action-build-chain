const { getRemoteSha } = require("../../../src/lib/service/git-service");
const { remoteSha } = require("../../../src/lib/git");
jest.mock("../../../src/lib/git");
jest.mock("../../../src/lib/common");

afterEach(() => {
  jest.clearAllMocks();
});

describe("getRemoteSha", () => {
  test("ok", async () => {
    // Arrange
    const repositoryUrl = "https://repositoryUrl";
    const branch = "branchName";
    remoteSha.mockResolvedValueOnce(
      "9a7f82f4b090a37a855aa582d2160951853a9141        refs/heads/main"
    );

    // Act
    const result = await getRemoteSha(repositoryUrl, branch);

    // Assert
    expect(remoteSha).toHaveBeenCalledTimes(1);
    expect(remoteSha).toHaveBeenCalledWith(repositoryUrl, branch);
    expect(result).toBe("@9a7f82f");
  });

  test("ok different length", async () => {
    // Arrange
    const repositoryUrl = "https://repositoryUrlX";
    const branch = "branchNameX";
    remoteSha.mockResolvedValueOnce(
      "9a7f82f4b090a37a855aa582d2160951853a9141        refs/heads/main"
    );

    // Act
    const result = await getRemoteSha(repositoryUrl, branch, 10);

    // Assert
    expect(remoteSha).toHaveBeenCalledTimes(1);
    expect(remoteSha).toHaveBeenCalledWith(repositoryUrl, branch);
    expect(result).toBe("@9a7f82f4b0");
  });

  test("not existing", async () => {
    // Arrange
    const repositoryUrl = "https://repositoryUrlY";
    const branch = "branchNameY";
    remoteSha.mockResolvedValueOnce(undefined);

    // Act
    const result = await getRemoteSha(repositoryUrl, branch);

    // Assert
    expect(remoteSha).toHaveBeenCalledTimes(1);
    expect(remoteSha).toHaveBeenCalledWith(repositoryUrl, branch);
    expect(result).toBe(undefined);
  });
});
