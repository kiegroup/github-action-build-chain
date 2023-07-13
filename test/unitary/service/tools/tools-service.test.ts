import "reflect-metadata";
import { ToolType } from "@bc/domain/cli";
import { constants } from "@bc/domain/constants";
import { EntryPoint } from "@bc/domain/entry-point";
import { ConfigurationService } from "@bc/service/config/configuration-service";
import { ProjectList } from "@bc/service/tools/project-list";
import { ToolService } from "@bc/service/tools/tools-service";
import Container from "typedi";
import { Plan } from "@bc/service/tools/plan";
import { Resume } from "@bc/service/tools/resume";

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

test("execute: plan", async () => {
  const planSpy = jest.spyOn(Plan.prototype, "execute").mockImplementation(async () => undefined);
  jest.spyOn(ConfigurationService.prototype, "getToolType").mockReturnValue(ToolType.PLAN);
  await toolService.execute();
  expect(planSpy).toHaveBeenCalledTimes(1);
});

test("execute: resume", async () => {
  const resumeSpy = jest.spyOn(Resume.prototype, "execute").mockImplementation(async () => undefined);
  jest.spyOn(ConfigurationService.prototype, "getToolType").mockReturnValue(ToolType.RESUME);
  await toolService.execute();
  expect(resumeSpy).toHaveBeenCalledTimes(1);
});