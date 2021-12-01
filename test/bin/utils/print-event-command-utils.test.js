const {
  printLocalCommand
} = require("../../../src/bin/utils/print-event-command-utils");
const { logger } = require("../../../src/lib/common");
jest.mock("../../../src/lib/common");

const {
  eventFlowTypeToCliFlowType,
  getDefinitionFile,
  getStartingProject,
  getFlowType,
  additionalFlagsToCLI
} = require("../../../src/lib/util/action-utils");
jest.mock("../../../src/lib/util/action-utils");

jest.mock("../../../package.json", () => ({
  bin: { build_action_bin_command: "whatever" }
}));
jest.mock("@actions/core");

afterEach(() => {
  jest.clearAllMocks();
});

describe("printLocalCommand pull request.", () => {
  test("basic", () => {
    // Arrange
    const eventData = {
      pull_request: { html_url: "pull_request_html_url" }
    };
    getDefinitionFile.mockReturnValueOnce("definitionFile.yaml");
    eventFlowTypeToCliFlowType.mockReturnValueOnce("flow-type");
    additionalFlagsToCLI.mockReturnValueOnce("");

    // Act
    printLocalCommand(eventData);

    // Assert
    expect(getFlowType).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(
      "build_action_bin_command -df 'definitionFile.yaml' build flow-type -url pull_request_html_url "
    );
  });

  test("basic additionalFlags", () => {
    // Arrange
    const eventData = {
      pull_request: { html_url: "pull_request_html_url" }
    };
    const additionalFlags = "additionalFlags value";
    getDefinitionFile.mockReturnValueOnce("definitionFile.yaml");
    eventFlowTypeToCliFlowType.mockReturnValueOnce("flow-type");
    additionalFlagsToCLI.mockReturnValueOnce(additionalFlags);

    // Act
    printLocalCommand(eventData);

    // Assert
    expect(getFlowType).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(
      `build_action_bin_command -df 'definitionFile.yaml' build flow-type -url pull_request_html_url ${additionalFlags}`
    );
  });

  test("starting project", () => {
    // Arrange
    const eventData = {
      pull_request: { html_url: "pull_request_html_url" }
    };
    getDefinitionFile.mockReturnValueOnce("definitionFile.yaml");
    eventFlowTypeToCliFlowType.mockReturnValueOnce("flow-type");
    getStartingProject
      .mockReturnValueOnce("starting-project-name")
      .mockReturnValueOnce("starting-project-name");
    additionalFlagsToCLI.mockReturnValueOnce("");

    // Act
    printLocalCommand(eventData);

    // Assert
    expect(getFlowType).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(
      "build_action_bin_command -df 'definitionFile.yaml' build flow-type -url pull_request_html_url -sp starting-project-name "
    );
  });
});

describe("printLocalCommand push.", () => {
  test("basic", () => {
    // Arrange
    const eventData = {
      repository: { full_name: "group_name/project_name" },
      ref: "refs/heads/main"
    };
    getDefinitionFile.mockReturnValueOnce("definitionFile.yaml");
    eventFlowTypeToCliFlowType.mockReturnValueOnce("flow-type");
    additionalFlagsToCLI.mockReturnValueOnce("");

    // Act
    printLocalCommand(eventData);

    // Assert
    expect(getFlowType).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(
      "build_action_bin_command -df 'definitionFile.yaml' build flow-type -p group_name/project_name -b main "
    );
  });

  test("basic additionalFlags", () => {
    // Arrange
    const eventData = {
      repository: { full_name: "group_name/project_name" },
      ref: "refs/heads/main"
    };
    const additionalFlags = "additional flags value";
    getDefinitionFile.mockReturnValueOnce("definitionFile.yaml");
    eventFlowTypeToCliFlowType.mockReturnValueOnce("flow-type");
    additionalFlagsToCLI.mockReturnValueOnce(additionalFlags);

    // Act
    printLocalCommand(eventData);

    // Assert
    expect(getFlowType).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(
      `build_action_bin_command -df 'definitionFile.yaml' build flow-type -p group_name/project_name -b main ${additionalFlags}`
    );
  });

  test("starting project", () => {
    // Arrange
    const eventData = {
      repository: { full_name: "group_name/project_name" },
      ref: "refs/heads/mainX"
    };
    getDefinitionFile.mockReturnValueOnce("definitionFile.yaml");
    eventFlowTypeToCliFlowType.mockReturnValueOnce("flow-type");
    getStartingProject.mockReturnValue("starting-project-name");
    additionalFlagsToCLI.mockReturnValueOnce("");

    // Act
    printLocalCommand(eventData);

    // Assert
    expect(getFlowType).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(
      "build_action_bin_command -df 'definitionFile.yaml' build flow-type -p group_name/project_name -b mainX -sp starting-project-name "
    );
  });

  test("undefined ref", () => {
    // Arrange
    const eventData = {
      repository: { full_name: "group_name/project_name" },
      ref: undefined
    };
    getDefinitionFile.mockReturnValueOnce("definitionFile.yaml");
    eventFlowTypeToCliFlowType.mockReturnValueOnce("flow-type");
    additionalFlagsToCLI.mockReturnValueOnce("");

    // Act
    printLocalCommand(eventData);

    // Assert
    expect(getFlowType).toHaveBeenCalledTimes(0);
    expect(logger.warn).toHaveBeenCalledWith(
      "The event data is not prepared for CLI execution. Command can't be printed."
    );
  });

  test("not proper ref", () => {
    // Arrange
    const eventData = {
      repository: { full_name: "group_name/project_name" },
      ref: "whatever"
    };
    getDefinitionFile.mockReturnValueOnce("definitionFile.yaml");
    eventFlowTypeToCliFlowType.mockReturnValueOnce("flow-type");
    additionalFlagsToCLI.mockReturnValueOnce("");

    // Act
    printLocalCommand(eventData);

    // Assert
    expect(getFlowType).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(
      "build_action_bin_command -df 'definitionFile.yaml' build flow-type -p group_name/project_name -b whatever -sp starting-project-name "
    );
  });
});
