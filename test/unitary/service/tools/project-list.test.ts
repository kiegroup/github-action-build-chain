import "reflect-metadata";
import { constants } from "@bc/domain/constants";
import { EntryPoint } from "@bc/domain/entry-point";
import { ConfigurationService } from "@bc/service/config/configuration-service";
import { Logger } from "@bc/service/logger/logger";
import { ProjectList } from "@bc/service/tools/project-list";
import Container from "typedi";

Container.set(constants.CONTAINER.ENTRY_POINT, EntryPoint.CLI);

let projectList: ProjectList;
beforeEach(() => {
  projectList = new ProjectList();
  jest.spyOn(ConfigurationService.prototype, "nodeChain", "get").mockReturnValue([]);
});

test("execute", async () => {
  const loggerSpy = jest.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
  await projectList.execute();
  expect(loggerSpy).toHaveBeenCalledTimes(1);
});