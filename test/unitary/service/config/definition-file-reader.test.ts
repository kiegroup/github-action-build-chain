import "reflect-metadata";
import { EventData, GitConfiguration } from "@bc/domain/configuration";
import { constants } from "@bc/domain/constants";
import { EntryPoint } from "@bc/domain/entry-point";
import { defaultInputValues, FlowType, InputValues } from "@bc/domain/inputs";
import { BaseConfiguration } from "@bc/service/config/base-configuration";
import { getTreeForProject, readDefinitionFile, Node, getFullDownstreamProjects, getUpstreamProjects } from "@kie/build-chain-configuration-reader";
import fs from "fs";
import path from "path";
import Container from "typedi";
import { DefinitionFileReader } from "@bc/service/config/definition-file-reader";
import { CLIActionType, ToolType } from "@bc/domain/cli";
jest.mock("@kie/build-chain-configuration-reader");

// disable logs
jest.spyOn(global.console, "log");

Container.set(constants.CONTAINER.ENTRY_POINT, EntryPoint.GITHUB_EVENT);
Container.set(constants.GITHUB.TOKEN, "faketoken");


class TestConfiguration extends BaseConfiguration {
  getFlowType(): FlowType {
    return FlowType.BRANCH;
  }

  getToolType(): ToolType {
    return ToolType.PROJECT_LIST;
  }

  loadGitConfiguration(): GitConfiguration {
    return {};
  }

  loadToken(): void {return;}

  async loadGitEvent(): Promise<EventData> {
    return {};
  }
}

let definitionFileReader: DefinitionFileReader;

beforeEach(() => {
  definitionFileReader = new DefinitionFileReader(new TestConfiguration());
});

describe.each([
  ["branch flow fdb", FlowType.BRANCH],
  ["full downstream", FlowType.FULL_DOWNSTREAM]
])("generate node chain: %p", (_title: string, flowType: FlowType) => {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, "projectNodes.json"), "utf8"));
  const mockData: Node[] = data.mock;

  beforeEach(() => {
    jest.spyOn(TestConfiguration.prototype, "getFlowType").mockImplementation(() => flowType);
    jest.spyOn(BaseConfiguration.prototype, "parsedInputs", "get").mockImplementation(() => {
      return { ...defaultInputValues, fullProjectDependencyTree: true };
    });
  });

  test("success: from source generated placeholder", async () => {
    const getFullDownstreamProjectsMock = getFullDownstreamProjects as jest.Mock;
    getFullDownstreamProjectsMock.mockReturnValueOnce(mockData);

    await definitionFileReader.generateNodeChain(mockData[0].project);
    expect(getFullDownstreamProjectsMock).toHaveBeenCalledTimes(1);
  });

  test("success: from target generated placeholder", async () => {
    const getFullDownstreamProjectsMock = getFullDownstreamProjects as jest.Mock;
    getFullDownstreamProjectsMock
      .mockImplementationOnce(() => {
        throw new Error("Invalid definition file");
      })
      .mockReturnValueOnce(mockData);

    await definitionFileReader.generateNodeChain(mockData[0].project);
    expect(getFullDownstreamProjectsMock).toHaveBeenCalledTimes(2);
  });

  test("failure", async () => {
    const getFullDownstreamProjectsMock = getFullDownstreamProjects as jest.Mock;
    getFullDownstreamProjectsMock.mockImplementation(() => {
      throw new Error("Invalid definition file");
    });
    await expect(definitionFileReader.generateNodeChain("test")).rejects.toThrowError();
  });
});

describe.each([
  ["branch flow no fdb", FlowType.BRANCH],
  ["cross pr", FlowType.CROSS_PULL_REQUEST],
])("generate node chain: %p", (_title: string, flowType: FlowType) => {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, "projectNodes.json"), "utf8"));
  const mockData: Node[] = data.mock;

  beforeEach(() => {
    jest.spyOn(TestConfiguration.prototype, "getFlowType").mockImplementation(() => flowType);
    jest.spyOn(BaseConfiguration.prototype, "parsedInputs", "get").mockImplementation(() => defaultInputValues);
  });

  test("success: from source generated placeholder", async () => {
    const getUpstreamProjectsMock = getUpstreamProjects as jest.Mock;
    getUpstreamProjectsMock.mockReturnValueOnce(mockData);

    await definitionFileReader.generateNodeChain(mockData[0].project);
    expect(getUpstreamProjectsMock).toHaveBeenCalledTimes(1);
  });

  test("success: from target generated placeholder", async () => {
    const getUpstreamProjectsMock = getUpstreamProjects as jest.Mock;
    getUpstreamProjectsMock.mockImplementationOnce(() => {
      throw new Error("Invalid definition file");
    }).mockReturnValueOnce(mockData);

    await definitionFileReader.generateNodeChain(mockData[0].project);
    expect(getUpstreamProjectsMock).toHaveBeenCalledTimes(2);
  });

  test("failure", async () => {
    const getUpstreamProjectsMock = getUpstreamProjects as jest.Mock;
    getUpstreamProjectsMock.mockImplementation(() => {
      throw new Error("Invalid definition file");
    });
    await expect(definitionFileReader.generateNodeChain("test")).rejects.toThrowError();
  });
});

describe("generate node chain: single pr", () => {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, "projectNodes.json"), "utf8"));
  const mockData: Node[] = data.mock;

  beforeEach(() => {
    jest.spyOn(TestConfiguration.prototype, "getFlowType").mockImplementation(() => FlowType.SINGLE_PULL_REQUEST);
    jest.spyOn(BaseConfiguration.prototype, "parsedInputs", "get").mockImplementation(() => defaultInputValues);
  });

  test("success: from source generated placeholder", async () => {
    const getTreeForProjectMock = getTreeForProject as jest.Mock;
    getTreeForProjectMock.mockReturnValueOnce(mockData[0]);

    await definitionFileReader.generateNodeChain(mockData[0].project);
    expect(getTreeForProjectMock).toHaveBeenCalledTimes(1);
  });

  test("success: from target generated placeholder", async () => {
    const getTreeForProjectMock = getTreeForProject as jest.Mock;
    getTreeForProjectMock.mockImplementationOnce(() => {
      throw new Error("Invalid definition file");
    }).mockReturnValueOnce(mockData[0]);

    await definitionFileReader.generateNodeChain(mockData[0].project);
    expect(getTreeForProjectMock).toHaveBeenCalledTimes(2);
  });

  test("failure", async () => {
    const getTreeForProjectMock = getTreeForProject as jest.Mock;
    getTreeForProjectMock.mockImplementation(() => {
      throw new Error("Invalid definition file");
    });
    await expect(definitionFileReader.generateNodeChain("test")).rejects.toThrowError();
  });
});

describe("get definition file", () => {
  beforeEach(() => {
    jest.spyOn(BaseConfiguration.prototype, "parsedInputs", "get").mockImplementation(() => defaultInputValues);
  });

  test("success: from source generated placeholder", async () => {
    const readDefinitionFileMock = readDefinitionFile as jest.Mock;
    readDefinitionFileMock.mockReturnValueOnce({version: "2.1"});

    const nodeChain = await definitionFileReader.getDefinitionFile();
    expect(readDefinitionFileMock).toHaveBeenCalledTimes(1);
    expect(nodeChain).toStrictEqual({version: "2.1"});
  });

  test("success: from target generated placeholder", async () => {
    const readDefinitionFileMock = readDefinitionFile as jest.Mock;
    readDefinitionFileMock.mockImplementationOnce(() => {
      throw new Error("Invalid definition file");
    }).mockReturnValueOnce({version: "2.1"});

    const nodeChain = await definitionFileReader.getDefinitionFile();
    expect(readDefinitionFileMock).toHaveBeenCalledTimes(2);
    expect(nodeChain).toStrictEqual({version: "2.1"});
  });

  test("failure", async () => {
    const readDefinitionFileMock = readDefinitionFile as jest.Mock;
    readDefinitionFileMock.mockImplementation(() => {
      throw new Error("Invalid definition file");
    });
    await expect(definitionFileReader.getDefinitionFile()).rejects.toThrowError();
  });
});

describe("generate node chain: tools", () => {
  const getUpstreamProjectsMock = getUpstreamProjects as jest.Mock;
  const getFullDownstreamProjectsMock = getFullDownstreamProjects as jest.Mock;
  let currentInput: InputValues;

  beforeEach(async () => {
    currentInput = {
      ...defaultInputValues,
      CLICommand: CLIActionType.TOOLS,
    };

    jest
      .spyOn(BaseConfiguration.prototype, "parsedInputs", "get")
      .mockImplementation(() => currentInput);
  });

  afterEach(() => {
    currentInput = {
      ...defaultInputValues,
      CLICommand: CLIActionType.TOOLS,
    };
  });

  test.each([
    ["upstream", false, 1, 0],
    ["full downstream", true, 0, 1]
  ])("project list: %p", async (_title, fullProjectDependencyTree: boolean, numUpstream: number, numFDB: number) => {
    currentInput = {
      ...currentInput,
      fullProjectDependencyTree
    };
    
    jest.spyOn(TestConfiguration.prototype, "getToolType").mockImplementation(() => ToolType.PROJECT_LIST);
    getUpstreamProjectsMock.mockReturnValueOnce([]);
    getFullDownstreamProjectsMock.mockReturnValueOnce([]);
    
    await definitionFileReader.generateNodeChain("test");

    expect(getUpstreamProjectsMock).toHaveBeenCalledTimes(numUpstream);
    expect(getFullDownstreamProjectsMock).toHaveBeenCalledTimes(numFDB);
  });

  test("invalid tool", async () => {
    jest.spyOn(TestConfiguration.prototype, "getToolType").mockImplementation(() => "something" as ToolType);
    await expect(definitionFileReader.generateNodeChain("test")).rejects.toThrowError();
  });
});