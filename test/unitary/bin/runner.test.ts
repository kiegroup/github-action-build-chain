import "reflect-metadata";
import { Runner } from "@bc/bin/runner";
import { constants } from "@bc/domain/constants";
import { EntryPoint } from "@bc/domain/entry-point";
import { ConfigurationService } from "@bc/service/config/configuration-service";
import Container from "typedi";

class DummyRunner extends Runner {}

describe("runner initialization", () => {
  test("cli entrypoint", () => {
    // make sure the entry point is not cli before the initialization
    Container.set(constants.CONTAINER.ENTRY_POINT, EntryPoint.GITHUB_EVENT);
    new DummyRunner(EntryPoint.CLI);
    expect(Container.get(constants.CONTAINER.ENTRY_POINT)).toBe(EntryPoint.CLI);
  });

  test("github event entrypoint", () => {
    // make sure the entry point is not cli before the initialization
    Container.set(constants.CONTAINER.ENTRY_POINT, EntryPoint.CLI);
    new DummyRunner(EntryPoint.GITHUB_EVENT);
    expect(Container.get(constants.CONTAINER.ENTRY_POINT)).toBe(EntryPoint.GITHUB_EVENT);
  });
});

describe("config initialization", () => {
  test("cli", async () => {
    // cant mock the entire service since it overrides the @Service and typedi cannot access it then
    const spy = jest.spyOn(ConfigurationService.prototype, "init").mockImplementation(async () => undefined);
    const runner = new DummyRunner(EntryPoint.CLI);
    await runner.initializeConfig();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  test("github event", async () => {
    // cant mock the entire service since it overrides the @Service and typedi cannot access it then
    const spy = jest.spyOn(ConfigurationService.prototype, "init").mockImplementation(async () => undefined);
    const runner = new DummyRunner(EntryPoint.GITHUB_EVENT);
    await runner.initializeConfig();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
