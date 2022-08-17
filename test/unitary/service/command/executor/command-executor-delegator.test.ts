import { CommandExecutorDelegator } from "@bc/service/command/executor/command-executor-delegator";
import { BashExecutor } from "@bc/service/command/executor/bash-executor";
import { ExportExecutor } from "@bc/service/command/executor/export-executor";
import { TestLoggerService } from "@bc/service/logger/__mocks__/test-logger-service";
import { ExecutionResult } from "@bc/domain/execute-command-result";
import { hrtimeToMs } from "@bc/utils/date";

jest.mock("@bc/service/logger/logger-service-factory");
jest.mock("@bc/utils/date");

describe("constructor", () => {
  test("ok", () => {
    // Arrange
    const bashExecutor = jest.mocked<BashExecutor>(BashExecutor.prototype, true);
    const exportExecutor = jest.mocked<ExportExecutor>(ExportExecutor.prototype, true);

    // Act
    const commandExecutorDelegator = new CommandExecutorDelegator(bashExecutor, exportExecutor);

    // Assert
    expect(commandExecutorDelegator["_bashExecutor"]).toBe(bashExecutor);
    expect(commandExecutorDelegator["_exportExecutor"]).toBe(exportExecutor);
  });
});

describe("isExport", () => {
  test("OK without cwd", async () => {
    // Arrange
    const command = "export VARIABLE=VALUE";

    const bashExecutor = jest.mocked<BashExecutor>(BashExecutor.prototype, true);
    const exportExecutor = jest.mocked<ExportExecutor>(ExportExecutor.prototype, true);
    const commandExecutorDelegator = new CommandExecutorDelegator(bashExecutor, exportExecutor);

    jest.spyOn(bashExecutor, "execute").mockResolvedValueOnce();
    jest.spyOn(exportExecutor, "execute").mockResolvedValueOnce();

    (hrtimeToMs as jest.Mocked<jest.Mock>).mockReturnValue(1000);

    // Act
    const result = await commandExecutorDelegator.executeCommand(command);

    // Assert
    expect(result).toStrictEqual({
      command: "export VARIABLE=VALUE",
      result: ExecutionResult.OK,
      startingDate: expect.any(Number),
      endingDate: expect.any(Number),
      errorMessage: "",
      time: 1000,
    });
    expect(bashExecutor.execute).toHaveBeenCalledTimes(0);
    expect(exportExecutor.execute).toHaveBeenCalledTimes(1);
    expect(exportExecutor.execute).toHaveBeenCalledWith(command, undefined);
  });

  test("OK with cwd", async () => {
    // Arrange
    const command = "export VARIABLE=VALUE";
    const cwd = "path";

    const bashExecutor = jest.mocked<BashExecutor>(BashExecutor.prototype, true);
    const exportExecutor = jest.mocked<ExportExecutor>(ExportExecutor.prototype, true);
    const commandExecutorDelegator = new CommandExecutorDelegator(bashExecutor, exportExecutor);

    jest.spyOn(bashExecutor, "execute").mockResolvedValueOnce();
    jest.spyOn(exportExecutor, "execute").mockResolvedValueOnce();

    (hrtimeToMs as jest.Mocked<jest.Mock>).mockReturnValue(2000);

    // Act
    const result = await commandExecutorDelegator.executeCommand(command, cwd);

    // Assert
    expect(result).toStrictEqual({
      command: "export VARIABLE=VALUE",
      result: ExecutionResult.OK,
      startingDate: expect.any(Number),
      endingDate: expect.any(Number),
      errorMessage: "",
      time: 2000,
    });
    expect(bashExecutor.execute).toHaveBeenCalledTimes(0);
    expect(exportExecutor.execute).toHaveBeenCalledTimes(1);
    expect(exportExecutor.execute).toHaveBeenCalledWith(command, cwd);
  });

  test("Error", async () => {
    // Arrange
    const command = "export VARIABLE=VALUE";
    const errorMessage = "whatever the error message";
    const bashExecutor = jest.mocked<BashExecutor>(BashExecutor.prototype, true);

    const exportExecutor = jest.mocked<ExportExecutor>(ExportExecutor.prototype, true);
    const commandExecutorDelegator = new CommandExecutorDelegator(bashExecutor, exportExecutor);
    jest.spyOn(bashExecutor, "execute").mockResolvedValueOnce();
    jest.spyOn(exportExecutor, "execute").mockRejectedValue(new Error(errorMessage));

    (hrtimeToMs as jest.Mocked<jest.Mock>).mockReturnValue(1000);

    // Act
    const result = await commandExecutorDelegator.executeCommand(command);

    // Assert
    expect(result).toStrictEqual({
      command: "export VARIABLE=VALUE",
      errorMessage: "whatever the error message",
      result: ExecutionResult.NOT_OK,
      startingDate: expect.any(Number),
      endingDate: expect.any(Number),
      time: 1000
    });
    expect(bashExecutor.execute).toHaveBeenCalledTimes(0);
    expect(exportExecutor.execute).toHaveBeenCalledTimes(1);
    expect(exportExecutor.execute).toHaveBeenCalledWith(command, undefined);
    expect(TestLoggerService.prototype.error).toHaveBeenCalledTimes(1);
    expect(TestLoggerService.prototype.error).toHaveBeenCalledWith(`Error executing command ${command}. ${errorMessage}`);
  });
});

describe("not export command", () => {
  test("OK without cwd", async () => {
    // Arrange
    const command = "whatever the command";

    const bashExecutor = jest.mocked<BashExecutor>(BashExecutor.prototype, true);
    const exportExecutor = jest.mocked<ExportExecutor>(ExportExecutor.prototype, true);
    const commandExecutorDelegator = new CommandExecutorDelegator(bashExecutor, exportExecutor);

    jest.spyOn(bashExecutor, "execute").mockResolvedValueOnce();
    jest.spyOn(exportExecutor, "execute").mockResolvedValueOnce();

    (hrtimeToMs as jest.Mocked<jest.Mock>).mockReturnValue(1000);

    // Act
    const result = await commandExecutorDelegator.executeCommand(command);

    // Assert
    expect(result).toStrictEqual({
      command: "whatever the command",
      result: ExecutionResult.OK,
      startingDate: expect.any(Number),
      time: 1000,
      endingDate: expect.any(Number),
      errorMessage: "",
    });
    expect(bashExecutor.execute).toHaveBeenCalledTimes(1);
    expect(exportExecutor.execute).toHaveBeenCalledTimes(0);
    expect(bashExecutor.execute).toHaveBeenCalledWith(command, undefined);
  });

  test("OK with cwd", async () => {
    // Arrange
    const command = "whatever the command";
    const cwd = "path";

    const bashExecutor = jest.mocked<BashExecutor>(BashExecutor.prototype, true);
    const exportExecutor = jest.mocked<ExportExecutor>(ExportExecutor.prototype, true);
    const commandExecutorDelegator = new CommandExecutorDelegator(bashExecutor, exportExecutor);

    jest.spyOn(bashExecutor, "execute").mockResolvedValueOnce();
    jest.spyOn(exportExecutor, "execute").mockResolvedValueOnce();

    (hrtimeToMs as jest.Mocked<jest.Mock>).mockReturnValue(1000);

    // Act
    const result = await commandExecutorDelegator.executeCommand(command, cwd);

    // Assert
    expect(result).toStrictEqual({
      command: "whatever the command",
      result: ExecutionResult.OK,
      startingDate: expect.any(Number),
      time: 1000,
      endingDate: expect.any(Number),
      errorMessage: "",
    });
    expect(bashExecutor.execute).toHaveBeenCalledTimes(1);
    expect(exportExecutor.execute).toHaveBeenCalledTimes(0);
    expect(bashExecutor.execute).toHaveBeenCalledWith(command, cwd);
  });

  test("Error", async () => {
    // Arrange
    const command = "whatever the command";
    const errorMessage = "whatever the error message";
    const bashExecutor = jest.mocked<BashExecutor>(BashExecutor.prototype, true);

    const exportExecutor = jest.mocked<ExportExecutor>(ExportExecutor.prototype, true);
    const commandExecutorDelegator = new CommandExecutorDelegator(bashExecutor, exportExecutor);
    jest.spyOn(bashExecutor, "execute").mockRejectedValue(new Error(errorMessage));
    jest.spyOn(exportExecutor, "execute").mockResolvedValueOnce();

    (hrtimeToMs as jest.Mocked<jest.Mock>).mockReturnValue(1000);

    // Act
    const result = await commandExecutorDelegator.executeCommand(command);

    // Assert
    expect(result).toStrictEqual({
      command: "whatever the command",
      errorMessage: "whatever the error message",
      result: ExecutionResult.NOT_OK,
      startingDate: expect.any(Number),
      time: 1000,
      endingDate: expect.any(Number),
    });
    expect(bashExecutor.execute).toHaveBeenCalledTimes(1);
    expect(exportExecutor.execute).toHaveBeenCalledTimes(0);
    expect(bashExecutor.execute).toHaveBeenCalledWith(command, undefined);
    expect(TestLoggerService.prototype.error).toHaveBeenCalledTimes(1);
    expect(TestLoggerService.prototype.error).toHaveBeenCalledWith(`Error executing command ${command}. ${errorMessage}`);
  });
});