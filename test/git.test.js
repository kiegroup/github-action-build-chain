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

test("fetch branch from remote repository. Default name", async () => {
  // Arrange
  const cwd = path.join(__dirname, "ws");
  const origin = path.join(__dirname, "origin");
  spawnMock.sequence.add(spawnMock.simple(0));
  spawnMock.sequence.add(spawnMock.simple(0));
  // spawnMock.setDefault(spawnMock.simple(0));

  // Act
  await git.fetchFromRemote(cwd, `file://${origin}`, "main");

  // Assert
  expect(spawnMock.calls.length).toBe(2);
  const firstCall = spawnMock.calls[0];
  const secondCall = spawnMock.calls[1];
  expect(firstCall.command).toBe("git");
  expect(secondCall.command).toBe("git");
  expect(firstCall.args).toStrictEqual([
    "-c",
    "user.name=GitHub",
    "-c",
    "user.email=noreply@github.com",
    "remote",
    "add",
    "upstream",
    "file:///home/emingora/development/projects/RedHat/kiegroup/github-action-build-chain/test/origin"
  ]);
  expect(secondCall.args).toStrictEqual([
    "-c",
    "user.name=GitHub",
    "-c",
    "user.email=noreply@github.com",
    "fetch",
    "--quiet",
    "--no-tags",
    "upstream",
    "main"
  ]);
});

test("fetch branch from remote repository. No default name", async () => {
  // Arrange
  const cwd = path.join(__dirname, "ws");
  const origin = path.join(__dirname, "origin");
  spawnMock.sequence.add(spawnMock.simple(0));
  spawnMock.sequence.add(spawnMock.simple(0));
  // spawnMock.setDefault(spawnMock.simple(0));

  // Act
  await git.fetchFromRemote(cwd, `file://${origin}`, "main", "origin");

  // Assert
  expect(spawnMock.calls.length).toBe(2);
  const firstCall = spawnMock.calls[0];
  const secondCall = spawnMock.calls[1];
  expect(firstCall.command).toBe("git");
  expect(secondCall.command).toBe("git");
  expect(firstCall.args).toStrictEqual([
    "-c",
    "user.name=GitHub",
    "-c",
    "user.email=noreply@github.com",
    "remote",
    "add",
    "origin",
    "file:///home/emingora/development/projects/RedHat/kiegroup/github-action-build-chain/test/origin"
  ]);
  expect(secondCall.args).toStrictEqual([
    "-c",
    "user.name=GitHub",
    "-c",
    "user.email=noreply@github.com",
    "fetch",
    "--quiet",
    "--no-tags",
    "origin",
    "main"
  ]);
});

test("rebase onto remote branch default remote", async () => {
  // Arrange
  const cwd = path.join(__dirname, "ws");
  spawnMock.sequence.add(spawnMock.simple(0));

  // Act
  await git.rebase(cwd, "main");

  // Assert
  expect(spawnMock.calls.length).toBe(1);
  const firstCall = spawnMock.calls[0];
  expect(firstCall.command).toBe("git");
  expect(firstCall.args).toStrictEqual([
    "-c",
    "user.name=GitHub",
    "-c",
    "user.email=noreply@github.com",
    "rebase",
    "--quiet",
    "--autosquash",
    "upstream/main"
  ]);
});

test("rebase onto remote branch diferent remote", async () => {
  // Arrange
  const cwd = path.join(__dirname, "ws");
  spawnMock.sequence.add(spawnMock.simple(0));

  // Act
  await git.rebase(cwd, "main", "origin");

  // Assert
  expect(spawnMock.calls.length).toBe(1);
  const firstCall = spawnMock.calls[0];
  expect(firstCall.command).toBe("git");
  expect(firstCall.args).toStrictEqual([
    "-c",
    "user.name=GitHub",
    "-c",
    "user.email=noreply@github.com",
    "rebase",
    "--quiet",
    "--autosquash",
    "origin/main"
  ]);
});
