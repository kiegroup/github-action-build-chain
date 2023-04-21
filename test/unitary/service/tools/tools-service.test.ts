import "reflect-metadata";
import { ToolType } from "@bc/domain/cli";
import { constants } from "@bc/domain/constants";
import { EntryPoint } from "@bc/domain/entry-point";
import { ConfigurationService } from "@bc/service/config/configuration-service";
import { ProjectList } from "@bc/service/tools/project-list";
import { ToolService } from "@bc/service/tools/tools-service";
import Container from "typedi";

Container.set(constants.CONTAINER.ENTRY_POINT, EntryPoint.CLI);

let toolService: ToolService;
beforeEach(() => {
  toolService = Container.get(ToolService);
});

test("execute: project-list", async () => {
  const projectListSpy = jest.spyOn(ProjectList.prototype, "execute").mockImplementation(async () => undefined);
  jest.spyOn(ConfigurationService.prototype, "getToolType").mockReturnValue(ToolType.PROJECT_LIST);
  await toolService.execute();
  expect(projectListSpy).toHaveBeenCalledTimes(1);
});