import "reflect-metadata";
import { Container } from "typedi";
import * as exec from "@actions/exec";
import { ExportExecutor } from "@bc/service/command/executor/export-executor";
import { CLILoggerService } from "@bc/service/logger/cli-logger-service";
import { constants } from "@bc/domain/constants";
import { EntryPoint } from "@bc/domain/entry-point";

jest.mock("@actions/exec");
jest.mock("@bc/service/logger/cli-logger-service");

describe("Export Command Executor", () => {
  Container.set(constants.CONTAINER.ENTRY_POINT, EntryPoint.CLI);


  test("no export command", async () => {
    // Arrange
    const exportCommandExecutor = Container.get(ExportExecutor);

    // Act
    try {
      await exportCommandExecutor.execute("command x", "whateverthepath");
      expect(true).toBe(false);
    } catch (ex: unknown) {
      expect((ex as Error).message).toBe("The export command command x is not properly defined. It should be something like \"export VARIBLE=expression\". Please fix it an try again.");
    }

    // Arrange
    expect(exec.exec).toHaveBeenCalledTimes(0);
    expect(CLILoggerService.prototype.error).toHaveBeenCalledTimes(1);
    expect(CLILoggerService.prototype.error).toHaveBeenCalledWith("The export command command x is not properly defined. It should be something like \"export VARIBLE=expression\". Please fix it an try again.");
  });

  test("simple export command", async () => {
    // Arrange
    const exportCommandExecutor = Container.get(ExportExecutor);
    (exec as jest.Mocked<typeof exec>).exec.mockResolvedValueOnce(Promise.resolve(0));

    // Act
    await exportCommandExecutor.execute("export VARIABLE1=newvalue", "whateverthepath");

    // Arrange
    expect(exec.exec).toHaveBeenCalledTimes(0);
    expect(CLILoggerService.prototype.warn).toHaveBeenCalledTimes(0);
    expect(CLILoggerService.prototype.debug).toHaveBeenCalledTimes(1);
    expect(CLILoggerService.prototype.debug).toHaveBeenCalledWith("The variable `VARIABLE1` has been set to the env with the value `newvalue`");
    expect(process.env["VARIABLE1"]).toBe("newvalue");
  });

  test("simple export command with quotes", async () => {
    // Arrange
    const exportCommandExecutor = Container.get(ExportExecutor);
    (exec as jest.Mocked<typeof exec>).exec.mockResolvedValueOnce(Promise.resolve(0));

    // Act
    await exportCommandExecutor.execute("export VARIABLE2=\"VALUE1 VALUE 2\"", "whateverthepath");

    // Arrange
    expect(exec.exec).toHaveBeenCalledTimes(0);
    expect(CLILoggerService.prototype.warn).toHaveBeenCalledTimes(0);
    expect(CLILoggerService.prototype.debug).toHaveBeenCalledTimes(1);
    expect(CLILoggerService.prototype.debug).toHaveBeenCalledWith("The variable `VARIABLE2` has been set to the env with the value `VALUE1 VALUE 2`");
    expect(process.env["VARIABLE2"]).toBe("VALUE1 VALUE 2");
  });

  test("simple export command with simple quotes", async () => {
    // Arrange
    const exportCommandExecutor = Container.get(ExportExecutor);
    (exec as jest.Mocked<typeof exec>).exec.mockResolvedValueOnce(Promise.resolve(0));

    // Act
    await exportCommandExecutor.execute("export VARIABLE3='VALUE1 VALUE 2'", "whateverthepath");

    // Arrange
    expect(exec.exec).toHaveBeenCalledTimes(0);
    expect(CLILoggerService.prototype.warn).toHaveBeenCalledTimes(0);
    expect(CLILoggerService.prototype.debug).toHaveBeenCalledTimes(1);
    expect(CLILoggerService.prototype.debug).toHaveBeenCalledWith("The variable `VARIABLE3` has been set to the env with the value `VALUE1 VALUE 2`");
    expect(process.env["VARIABLE3"]).toBe("VALUE1 VALUE 2");
  });

  test("export command", async () => {
    // Arrange
    const exportCommandExecutor = Container.get(ExportExecutor);
    (exec as jest.Mocked<typeof exec>).exec.mockResolvedValueOnce(Promise.resolve(0));

    // Act
    await exportCommandExecutor.execute("export VARIABLE4=`whateverthecommand`", "whateverthepath");

    // Arrange
    expect(exec.exec).toHaveBeenCalledTimes(1);
    expect(exec.exec).toHaveBeenCalledWith("whateverthecommand", [], {
        "cwd": "whateverthepath",
        "listeners": { "stdout": expect.anything() },
      },
    );
    expect(CLILoggerService.prototype.warn).toHaveBeenCalledTimes(0);
  });

  test("no export command", async () => {
    // Arrange
    const exportCommandExecutor = Container.get(ExportExecutor);

    // Act
    try {
      await exportCommandExecutor.execute("whatever the command", "whateverthepath");
      expect(false).toBe(true);
    } catch (ex: unknown) {
      expect((ex as Error).message).toBe("The export command whatever the command is not properly defined. It should be something like \"export VARIBLE=expression\". Please fix it an try again.");
    }
  });
});

