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
  // spawnMock.setDefault(spawnMock.simple(0));

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
