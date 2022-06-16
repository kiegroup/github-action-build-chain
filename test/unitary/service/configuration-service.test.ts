import { ConfigurationService } from "@bc/service/configuration-service";
import { Configuration, defaultValue as defaultConfigurationValue } from "@bc/domain/configuration";
import { TestLoggerService } from "@bc/service/logger/__mocks__/test-logger-service";
import { defaultValue as defaultNodeValue, Node } from "@bc/domain/node";
import { NodeExecutionLevel } from "@bc/domain/node-execution-level";

jest.mock("@bc/service/logger/logger-service-factory");

describe("initializeConfiguration", () => {
  test("ok", () => {
    // Arrange
    const configurationService = new ConfigurationService();
    const configuration: Configuration = defaultConfigurationValue;

    // Act
    configurationService.initializeConfiguration(configuration);

    // Assert
    expect(configuration).toBe(configurationService.configuration);
  });
});

describe("getStarterProjectName", () => {
  test("no configuration initialized", () => {
    // Arrange
    const configurationService = new ConfigurationService();
    const expectedErrorMessage = "The configuration has not been initialized. Please contact with the administrator or report and issue to build-chain tool repository";

    // Act
    try {
      configurationService.getStarterProjectName();
      expect(true).toBe(false);
    } catch (ex: unknown) {
      expect((ex as Error).message).toBe(expectedErrorMessage);
    }

    expect(TestLoggerService.prototype.error).toHaveBeenCalledTimes(1);
    expect(TestLoggerService.prototype.error).toHaveBeenCalledWith(expectedErrorMessage);
  });

  test("with startingProject", () => {
    // Arrange
    const configurationService = new ConfigurationService();
    Object.defineProperty(configurationService, "configuration", {
      get: () => ({ ...defaultConfigurationValue, startingProject: "startingProjectName" }),
    });

    // Act
    const result = configurationService.getStarterProjectName();

    // Assert
    expect(result).toBe("startingProjectName");
    expect(TestLoggerService.prototype.error).toHaveBeenCalledTimes(0);

  });

  test("without startingProject", () => {
    // Arrange
    const configurationService = new ConfigurationService();
    Object.defineProperty(configurationService, "configuration", {
      get: () => ({ ...defaultConfigurationValue, projectTriggeringTheJob: "projectTriggeringTheJobName" }),
    });

    // Act
    const result = configurationService.getStarterProjectName();

    // Assert
    expect(result).toBe("projectTriggeringTheJobName");
    expect(TestLoggerService.prototype.error).toHaveBeenCalledTimes(0);
  });
});

describe("isNodeStarter", () => {
  test("It is", () => {
    // Arrange
    const configurationService = new ConfigurationService();
    const node: Node = { ...defaultNodeValue, project: "whateverprojectname" };
    jest.spyOn(configurationService, "getStarterProjectName").mockReturnValueOnce("whateverprojectname");

    // Act
    const result = configurationService.isNodeStarter(node);

    // Assert
    expect(result).toBe(true);
  });

  test("It is not", () => {
    // Arrange
    const configurationService = new ConfigurationService();
    const node: Node = { ...defaultNodeValue, project: "whateverprojectname" };
    jest.spyOn(configurationService, "getStarterProjectName").mockReturnValueOnce("somethingdifferent");

    // Act
    const result = configurationService.isNodeStarter(node);

    // Assert
    expect(result).toBe(false);
  });
});

describe("getStarterNode", () => {
  const nodes: Node[] = [{ ...defaultNodeValue, project: "project1" }, {
    ...defaultNodeValue,
    project: "project2",
  }, { ...defaultNodeValue, project: "project3" }];

  test("no starterNode", () => {
    // Arrange
    const configurationService = new ConfigurationService();
    jest.spyOn(configurationService, "isNodeStarter").mockReturnValue(false);
    jest.spyOn(configurationService, "getStarterProjectName").mockReturnValue("starterProjectName");
    const expectedErrorMessage = "There's no project starterProjectName in the chain. This is normally due the project starting the job (or the one selected to behave like so it's not in the project tree information. Please choose a different project like starter or define the project starterProjectName in the tree.";

    // Act
    try {
      configurationService.getStarterNode(nodes);
      expect(true).toBe(false);
    } catch (ex: unknown) {
      expect((ex as Error).message).toBe(expectedErrorMessage);
    }

    // Assert
    expect(TestLoggerService.prototype.error).toHaveBeenCalledTimes(1);
    expect(TestLoggerService.prototype.error).toHaveBeenCalledWith(expectedErrorMessage);
  });

  test("starterNode at first time", () => {
    // Arrange
    const configurationService = new ConfigurationService();
    jest.spyOn(configurationService, "isNodeStarter").mockReturnValueOnce(true);

    // Act
    const starterNode = configurationService.getStarterNode(nodes);

    // Assert
    expect(TestLoggerService.prototype.error).toHaveBeenCalledTimes(0);
    expect(starterNode.project).toBe("project1");
  });

  test("starterNode at second time", () => {
    // Arrange
    const configurationService = new ConfigurationService();
    jest.spyOn(configurationService, "isNodeStarter").mockReturnValueOnce(false).mockReturnValueOnce(true);

    // Act
    const starterNode = configurationService.getStarterNode(nodes);

    // Assert
    expect(TestLoggerService.prototype.error).toHaveBeenCalledTimes(0);
    expect(starterNode.project).toBe("project2");
  });
});

describe("getNodeExecutionLevel", () => {
  const nodes: Node[] = [{ ...defaultNodeValue, project: "project1" }, {
    ...defaultNodeValue,
    project: "project2",
  }, { ...defaultNodeValue, project: "project3" }];
  test.each([
      ["second node upstream", nodes[1], nodes[2], NodeExecutionLevel.UPSTREAM],
      ["second node current", nodes[1], nodes[1], NodeExecutionLevel.CURRENT],
      ["second node downstream", nodes[1], nodes[0], NodeExecutionLevel.DOWNSTREAM],
    ],
  )("%p", (title: string, node: Node, starterNode: Node, expectedExecutionLevel: NodeExecutionLevel) => {
    // Arrange
    const configurationService = new ConfigurationService();
    jest.spyOn(configurationService, "getStarterNode").mockReturnValueOnce(starterNode);

    // Act
    const nodeExecutionLevel = configurationService.getNodeExecutionLevel(node, nodes);

    // Assert
    expect(nodeExecutionLevel).toBe(expectedExecutionLevel);
  });
});

describe("skipExecution", () => {
  const node = { defaultNodeValue, project: "node1" };
  test("no configuration", () => {
    // Arrange
    const configurationService = new ConfigurationService();
    const expectedErrorMessage = "The configuration has not been initialized. Please contact with the administrator or report and issue to build-chain tool repository";

    // Act
    try {
      configurationService.skipExecution(node);
      expect(true).toBe(false);
    } catch (ex: unknown) {
      expect((ex as Error).message).toBe(expectedErrorMessage);
    }

    // Assert
    expect(TestLoggerService.prototype.error).toHaveBeenCalledTimes(1);
    expect(TestLoggerService.prototype.error).toHaveBeenCalledWith(expectedErrorMessage);
  });

  test.each([
      ["skipExecution true", { ...defaultConfigurationValue, skipExecution: true }, true],
      ["skipExecution false, skipProjectExecution including node", {
        ...defaultConfigurationValue,
        skipExecution: false,
        skipProjectExecution: ["node1", "node2", "node3"],
      }, true],
      ["skipExecution false, skipProjectExecution not including node", {
        ...defaultConfigurationValue,
        skipExecution: false,
        skipProjectExecution: ["node2", "node3", "node4"],
      }, false],
      ["skipExecution false, skipProjectExecution empty", {
        ...defaultConfigurationValue,
        skipExecution: false,
        skipProjectExecution: [],
      }, false],
      ["skipExecution false, skipProjectExecution undefined", {
        ...defaultConfigurationValue,
        skipExecution: false,
        skipProjectExecution: undefined,
      }, false],
    ],
  )("%p", (title: string, configuration: Configuration, expectedResult: boolean) => {
    // Arrange
    const configurationService = new ConfigurationService();
    Object.defineProperty(configurationService, "configuration", {
      get: () => configuration,
    });

    // Act
    const nodeExecutionLevel = configurationService.skipExecution(node);

    // Assert
    expect(nodeExecutionLevel).toBe(expectedResult);
  });
});