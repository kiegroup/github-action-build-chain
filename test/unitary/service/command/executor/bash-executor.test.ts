import "reflect-metadata";
import { BashExecutor } from "@bc/service/command/executor/bash-executor";
import { Container } from "typedi";
import * as exec from "@actions/exec";
jest.mock("@actions/exec");

describe("Bash Executor", () => {
  test("ok. cwd", async () => {
    // Arrange
    const bashExecutor = Container.get(BashExecutor);
    (exec as jest.Mocked<typeof exec>).exec.mockResolvedValueOnce(Promise.resolve(0));

    // Act
    await bashExecutor.execute("command x", "whateverthepath");

    // Arrange
    expect(exec.exec).toHaveBeenCalledTimes(1);
    expect(exec.exec).toHaveBeenCalledWith("command x", [], { cwd: "whateverthepath" });
  });

  test("ok. no cwd", async () => {
    // Arrange
    const bashExecutor = Container.get(BashExecutor);
    (exec as jest.Mocked<typeof exec>).exec.mockResolvedValueOnce(Promise.resolve(0));

    // Act
    await bashExecutor.execute("command x");

    // Arrange
    expect(exec.exec).toHaveBeenCalledTimes(1);
    expect(exec.exec).toHaveBeenCalledWith("command x", [], { cwd: undefined });
  });
});

