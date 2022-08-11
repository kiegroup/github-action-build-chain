import "reflect-metadata";
import { EventData, GitConfiguration } from "@bc/domain/configuration";
import { constants } from "@bc/domain/constants";
import { EntryPoint } from "@bc/domain/entry-point";
import { defaultInputValues, FlowType } from "@bc/domain/inputs";
import { Node } from "@bc/domain/node";
import { BaseConfiguration } from "@bc/service/config/base-configuration";
import { getOrderedListForProject, getTreeForProject, parentChainFromNode } from "@kie/build-chain-configuration-reader";
import fs from "fs";
import path from "path";
import Container from "typedi";
import { DefinitionFileReader } from "@bc/service/config/definition-file-reader";
jest.mock("@kie/build-chain-configuration-reader");

// disable logs
jest.spyOn(global.console, "log");

Container.set(constants.CONTAINER.ENTRY_POINT, EntryPoint.GITHUB_EVENT);
Container.set(constants.GITHUB.TOKEN, "faketoken");


class TestConfiguration extends BaseConfiguration {
  getFlowType(): FlowType {
    return FlowType.BRANCH;
  }

  loadGitConfiguration(): GitConfiguration {
    return {};
  }

  loadToken(): void {return;}

  async loadGitEvent(): Promise<EventData> {
    return {};
  }
}

let nodeChainGenerator: DefinitionFileReader;

beforeEach(() => {
  nodeChainGenerator = new DefinitionFileReader(new TestConfiguration());
});

describe("generate placeholders", () => {
  test("generated from source", () => {
    const definitionFileUrl = "https://abc/${GROUP}/${PROJECT_NAME}/${BRANCH}";
    jest.spyOn(BaseConfiguration.prototype, "parsedInputs", "get").mockImplementation(() => {
      return { ...defaultInputValues, definitionFile: definitionFileUrl };
    });

    const actualData = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8")).action.eventPayload.pull_request;
    const source = {
      branch: actualData.head.ref,
      repository: actualData.head.repo.full_name,
      name: actualData.head.repo.name,
      group: actualData.head.repo.owner.login,
    };

    expect(nodeChainGenerator.generatePlaceholder(source)).toStrictEqual({ BRANCH: source.branch, GROUP: source.group, PROJECT_NAME: source.name });
  });

  test("generated from target", () => {
    const definitionFileUrl = "https://abc/${GROUP}/${PROJECT_NAME}/${BRANCH}";
    jest.spyOn(BaseConfiguration.prototype, "parsedInputs", "get").mockImplementation(() => {
      return { ...defaultInputValues, definitionFile: definitionFileUrl };
    });

    const actualData = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8")).action.eventPayload.pull_request;
    const target = {
      branch: actualData.base.ref,
      repository: actualData.base.repo.full_name,
      name: actualData.base.repo.name,
      group: actualData.base.repo.owner.login,
    };

    expect(nodeChainGenerator.generatePlaceholder(target)).toStrictEqual({ BRANCH: target.branch, GROUP: target.group, PROJECT_NAME: target.name });
  });

  test("no source or target. generated from env", () => {
    const definitionFileUrl = "https://abc/${GROUP}/${PROJECT_NAME}/${BRANCH}/${TEST}";
    jest.spyOn(BaseConfiguration.prototype, "parsedInputs", "get").mockImplementation(() => {
      return { ...defaultInputValues, definitionFile: definitionFileUrl };
    });

    const env = {
      TEST: "test1",
      GROUP: "group",
      PROJECT_NAME: "name",
      BRANCH: "main",
    };

    process.env = { ...process.env, ...env };

    expect(nodeChainGenerator.generatePlaceholder({})).toStrictEqual(env);
  });

  test("no source or target or env. generated from default", () => {
    const definitionFileUrl = "https://abc/${GROUP:group}/${PROJECT_NAME:name}/${BRANCH:branch}/";
    jest.spyOn(BaseConfiguration.prototype, "parsedInputs", "get").mockImplementation(() => {
      return { ...defaultInputValues, definitionFile: definitionFileUrl };
    });

    const env = {
      GROUP: "group",
      PROJECT_NAME: "name",
      BRANCH: "main",
    };

    expect(nodeChainGenerator.generatePlaceholder({})).toStrictEqual(env);
  });

  test("no placeholders required", () => {
    const definitionFileUrl = "https://abc/group/branch";
    jest.spyOn(BaseConfiguration.prototype, "parsedInputs", "get").mockImplementation(() => {
      return { ...defaultInputValues, definitionFile: definitionFileUrl };
    });
    expect(nodeChainGenerator.generatePlaceholder({})).toStrictEqual({});
  });

  test("no definition file url", () => {
    const definitionFileUrl = "definitionfile";
    jest.spyOn(BaseConfiguration.prototype, "parsedInputs", "get").mockImplementation(() => {
      return { ...defaultInputValues, definitionFile: definitionFileUrl };
    });
    expect(nodeChainGenerator.generatePlaceholder({})).toStrictEqual({});
  });
});

describe.each([
  ["branch flow fdb", FlowType.BRANCH],
  ["full downstream", FlowType.FULL_DOWNSTREAM]
])("generate node chain: %p", (_title: string, flowType: FlowType) => {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, "projectNodes.json"), "utf8"));
  const mockData: Node[] = data.mock;
  const expectedData: Node[] = data.expected;

  beforeEach(() => {
    jest.spyOn(TestConfiguration.prototype, "getFlowType").mockImplementation(() => flowType);
    jest.spyOn(BaseConfiguration.prototype, "parsedInputs", "get").mockImplementation(() => {
      return { ...defaultInputValues, fullProjectDependencyTree: true };
    });
  });

  test("success: from source generated placeholder", async () => {
    const getOrderedListProjectMock = getOrderedListForProject as jest.Mock;
    getOrderedListProjectMock.mockReturnValueOnce(mockData);

    const nodeChain = await nodeChainGenerator.generateNodeChain(mockData[0].project);
    expect(getOrderedListProjectMock).toHaveBeenCalledTimes(1);
    expect(nodeChain).toStrictEqual(expectedData);
  });

  test("success: from target generated placeholder", async () => {
    const getOrderedListProjectMock = getOrderedListForProject as jest.Mock;
    getOrderedListProjectMock
      .mockImplementationOnce(() => {
        throw new Error("Invalid definition file");
      })
      .mockReturnValueOnce(mockData);

    const nodeChain = await nodeChainGenerator.generateNodeChain(mockData[0].project);
    expect(getOrderedListProjectMock).toHaveBeenCalledTimes(2);
    expect(nodeChain).toStrictEqual(expectedData);
  });

  test("failure", async () => {
    const getOrderedListProjectMock = getOrderedListForProject as jest.Mock;
    getOrderedListProjectMock.mockImplementation(() => {
      throw new Error("Invalid definition file");
    });
    await expect(nodeChainGenerator.generateNodeChain("test")).rejects.toThrowError();
  });
});

describe.each([
  ["branch flow no fdb", FlowType.BRANCH],
  ["cross pr", FlowType.CROSS_PULL_REQUEST],
])("generate node chain: %p", (_title: string, flowType: FlowType) => {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, "projectNodes.json"), "utf8"));
  const mockData: Node[] = data.mock;
  const expectedData: Node[] = data.expected;

  beforeEach(() => {
    jest.spyOn(TestConfiguration.prototype, "getFlowType").mockImplementation(() => flowType);
    jest.spyOn(BaseConfiguration.prototype, "parsedInputs", "get").mockImplementation(() => defaultInputValues);
  });

  test("success: from source generated placeholder", async () => {
    const getTreeForProjectMock = getTreeForProject as jest.Mock;
    const parentChainFromNodeMock = parentChainFromNode as jest.Mock;
    getTreeForProjectMock.mockReturnValueOnce({project: "abc"});
    parentChainFromNodeMock.mockReturnValueOnce(mockData);

    const nodeChain = await nodeChainGenerator.generateNodeChain(mockData[0].project);
    expect(parentChainFromNodeMock).toHaveBeenCalledTimes(1);
    expect(getTreeForProjectMock).toHaveBeenCalledTimes(1);
    expect(nodeChain).toStrictEqual(expectedData);
  });

  test("success: from target generated placeholder", async () => {
    const getTreeForProjectMock = getTreeForProject as jest.Mock;
    const parentChainFromNodeMock = parentChainFromNode as jest.Mock;
    getTreeForProjectMock.mockImplementationOnce(() => {
      throw new Error("Invalid definition file");
    }).mockReturnValueOnce({project: "abc"});
    parentChainFromNodeMock.mockReturnValueOnce(mockData);

    const nodeChain = await nodeChainGenerator.generateNodeChain(mockData[0].project);
    expect(parentChainFromNodeMock).toHaveBeenCalledTimes(1);
    expect(getTreeForProjectMock).toHaveBeenCalledTimes(2);
    expect(nodeChain).toStrictEqual(expectedData);
  });

  test("failure", async () => {
    const getTreeForProjectMock = getTreeForProject as jest.Mock;
    getTreeForProjectMock.mockImplementation(() => {
      throw new Error("Invalid definition file");
    });
    await expect(nodeChainGenerator.generateNodeChain("test")).rejects.toThrowError();
  });
});

describe("generate node chain: single pr", () => {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, "projectNodes.json"), "utf8"));
  const mockData: Node[] = data.mock;
  const expectedData: Node[] = data.expected;

  beforeEach(() => {
    jest.spyOn(TestConfiguration.prototype, "getFlowType").mockImplementation(() => FlowType.SINGLE_PULL_REQUEST);
    jest.spyOn(BaseConfiguration.prototype, "parsedInputs", "get").mockImplementation(() => {
      return { ...defaultInputValues, fullProjectDependencyTree: true };
    });
  });

  test("success: from source generated placeholder", async () => {
    const getTreeForProjectMock = getTreeForProject as jest.Mock;
    getTreeForProjectMock.mockReturnValueOnce(mockData[0]);

    const nodeChain = await nodeChainGenerator.generateNodeChain(mockData[0].project);
    expect(getTreeForProjectMock).toHaveBeenCalledTimes(1);
    expect(nodeChain).toStrictEqual([expectedData[0]]);
  });

  test("success: from target generated placeholder", async () => {
    const getTreeForProjectMock = getTreeForProject as jest.Mock;
    getTreeForProjectMock.mockImplementationOnce(() => {
      throw new Error("Invalid definition file");
    }).mockReturnValueOnce(mockData[0]);

    const nodeChain = await nodeChainGenerator.generateNodeChain(mockData[0].project);
    expect(getTreeForProjectMock).toHaveBeenCalledTimes(2);
    expect(nodeChain).toStrictEqual([expectedData[0]]);
  });

  test("failure", async () => {
    const getTreeForProjectMock = getTreeForProject as jest.Mock;
    getTreeForProjectMock.mockImplementation(() => {
      throw new Error("Invalid definition file");
    });
    await expect(nodeChainGenerator.generateNodeChain("test")).rejects.toThrowError();
  });
});