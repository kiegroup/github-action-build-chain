import "reflect-metadata";
import { BashExecutor } from "@bc/service/executor/bash-executor";
import { Container } from "typedi";
import * as exec from "@actions/exec";
import { ExportCommandExecutor } from "@bc/service/executor/export-command-executor";
import { LoggerServiceFactory } from "@bc/service/logger/logger-service-factory";
import { CLILoggerService } from "@bc/service/logger/cli-logger-service";

jest.mock("@actions/exec");
jest.mock("@bc/service/logger/cli-logger-service");
jest.mock("@bc/service/logger/logger-service-factory", () => ({
  instance: new CLILoggerService(),
}));

describe("Export Command Executor", () => {


  test("no export command", async () => {
    // Arrange
    const exportCommandExecutor = Container.get(ExportCommandExecutor);

    // Act
    try {
      await exportCommandExecutor.execute("command x", "whateverthepath");
      expect(true).toBe(false);
    } catch (ex: unknown) {
      expect((ex as Error).message).toBe("The export command command x is not properly defined. It should be something like \"export VARIBLE=expression\". Please fix it an try again.");
    }

    // Arrange
    expect(exec.exec).toHaveBeenCalledTimes(0);
  });

  test("simple export command", async () => {
    // Arrange
    const exportCommandExecutor = Container.get(ExportCommandExecutor);
    (exec as jest.Mocked<typeof exec>).exec.mockResolvedValueOnce(Promise.resolve(0));

    // Act
    await exportCommandExecutor.execute("export VARIABLE=newvalue", "whateverthepath");

    // Arrange
    expect(exec.exec).toHaveBeenCalledTimes(1);
  });

});

