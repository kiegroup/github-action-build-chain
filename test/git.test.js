const path = require("path");
const git = require("../src/lib/git");
const { spawn } = require("child_process");
const mockSpawn = require("mock-spawn");

jest.mock("child_process", () => ({
  ...jest.requireActual("child_process"),
  spawn: jest.fn()
}));
let spawnMock;

beforeEach(() => {
  spawnMock = mockSpawn();
  spawn.mockImplementation(spawnMock);
});

test("merge branch into current checkout", async () => {
  // Arrange
  const cwd = path.join(__dirname, "ws");
  const origin = path.join(__dirname, "origin");
  spawnMock.sequence.add(spawnMock.simple(0));

  // Act
  await git.merge(cwd, `file://${origin}`, "main");

  // Assert
  expect(spawnMock.calls.length).toBe(1);
  const firstCall = spawnMock.calls[0];
  expect(firstCall.command).toBe("git");
  expect(firstCall.args).toStrictEqual([
    "-c",
    "user.name=GitHub",
    "-c",
    "user.email=noreply@github.com",
    "pull",
    "--no-rebase",
    `file://${origin}`,
    "main"
  ]);
});

test("rename branch", async () => {
  // Arrange
  const cwd = path.join(__dirname, "ws");
  spawnMock.sequence.add(spawnMock.simple(0));

  // Act
  await git.rename(cwd, "feature");

  // Assert
  expect(spawnMock.calls.length).toBe(1);
  const firstCall = spawnMock.calls[0];
  expect(firstCall.command).toBe("git");
  expect(firstCall.args).toStrictEqual([
    "-c",
    "user.name=GitHub",
    "-c",
    "user.email=noreply@github.com",
    "branch",
    "--move",
    "feature"
  ]);
});

describe("version", () => {
  test("getVersion major.minor.patch", async () => {
    // Arrange
    spawnMock.sequence.add(spawnMock.simple(0, "git version 1.2.3"));
    // Act
    const result = await git.getVersion();

    // Assert
    expect(spawnMock.calls.length).toBe(1);
    const firstCall = spawnMock.calls[0];
    expect(firstCall.command).toBe("git");
    expect(firstCall.args).toStrictEqual([
      "-c",
      "user.name=GitHub",
      "-c",
      "user.email=noreply@github.com",
      "--version"
    ]);
    expect(result).toBe("1.2.3");
  });

  test("getVersion major.minor no patch", async () => {
    // Arrange
    spawnMock.sequence.add(spawnMock.simple(0, "git version 1.2"));
    // Act
    const result = await git.getVersion();

    // Assert
    expect(spawnMock.calls.length).toBe(1);
    const firstCall = spawnMock.calls[0];
    expect(firstCall.command).toBe("git");
    expect(firstCall.args).toStrictEqual([
      "-c",
      "user.name=GitHub",
      "-c",
      "user.email=noreply@github.com",
      "--version"
    ]);
    expect(result).toBe("1.2");
  });

  test("getVersion only major", async () => {
    // Arrange
    spawnMock.sequence.add(spawnMock.simple(0, "git version 1"));
    // Act
    const result = await git.getVersion();

    // Assert
    expect(spawnMock.calls.length).toBe(1);
    const firstCall = spawnMock.calls[0];
    expect(firstCall.command).toBe("git");
    expect(firstCall.args).toStrictEqual([
      "-c",
      "user.name=GitHub",
      "-c",
      "user.email=noreply@github.com",
      "--version"
    ]);
    expect(result).toBe(undefined);
  });

  test("git command not found", async () => {
    // Arrange
    spawnMock.sequence.add(
      spawnMock.simple(1, "bash: git: command not found...")
    );
    // Act
    try {
      await git.getVersion();
    } catch (ex) {
      expect(ex.message).toBe(
        "command git --version failed with code 1. Error Message: bash: git: command not found..."
      );
    }

    // Assert
    expect(spawnMock.calls.length).toBe(1);
    const firstCall = spawnMock.calls[0];
    expect(firstCall.command).toBe("git");
    expect(firstCall.args).toStrictEqual([
      "-c",
      "user.name=GitHub",
      "-c",
      "user.email=noreply@github.com",
      "--version"
    ]);
  });
});
