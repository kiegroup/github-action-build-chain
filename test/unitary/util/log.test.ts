import "reflect-metadata";
import { constants } from "@bc/domain/constants";
import { EntryPoint } from "@bc/domain/entry-point";
import { BaseLoggerService } from "@bc/service/logger/base-logger-service";
import { logAndThrow } from "@bc/utils/log";
import Container from "typedi";

// disable logs
jest.spyOn(global.console, "log");

test.each([
  ["cli", EntryPoint.CLI],
  ["action", EntryPoint.GITHUB_EVENT],
])("log and throw: %p", (_title: string, entryPoint: EntryPoint) => {
  Container.set(constants.CONTAINER.ENTRY_POINT, entryPoint);
  const spy = jest.spyOn(BaseLoggerService.prototype, "error");
  expect(() => logAndThrow("message")).toThrowError();
  expect(spy).toHaveBeenCalledTimes(1);
  expect(spy).toHaveBeenCalledWith("message");
});
