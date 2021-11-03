const {
  archiveArtifacts
} = require("../../../src/lib/artifacts/build-chain-flow-archive-artifact-helper");
const {
  run: uploadArtifacts
} = require("../../../src/lib/artifacts/upload-artifacts");
jest.mock("../../../src/lib/artifacts/upload-artifacts");
jest.mock("../../../src/lib/common");

afterEach(() => {
  jest.clearAllMocks();
});

test("start no parent dependencies archive artifacts", async () => {
  // Arrange
  const node = {
    project: "kiegroup/lienzo-core",
    build: {
      "build-command": {
        current: "current command",
        upstream: "upstream command",
        before: {
          current: "before current command",
          upstream: "before upstream command"
        },
        after: {
          current: "after current command",
          upstream: "after upstream command"
        }
      },
      "archive-artifacts": {
        paths: [
          {
            path: "whateverpath",
            on: "success"
          }
        ],
        name: "artifact1",
        dependencies: "none"
      }
    }
  };
  // Act
  await archiveArtifacts(node, [node], ["success", "always"]);
  // Assert
  expect(uploadArtifacts).toHaveBeenCalledTimes(1);
  expect(uploadArtifacts).toHaveBeenCalledWith(
    {
      paths: [{ path: "whateverpath", on: "success" }],
      name: "artifact1",
      dependencies: "none"
    },
    ["success", "always"]
  );
});

test("start with parent dependencies with archive artifacts with path", async () => {
  // Arrange
  const droolsNode = {
    project: "kiegroup/drools",
    build: {
      "build-command": {
        current: "current command",
        upstream: "upstream command",
        before: {
          current: "before current command",
          upstream: "before upstream command"
        },
        after: {
          current: "after current command",
          upstream: "after upstream command"
        }
      },
      "archive-artifacts": {
        paths: [
          {
            path: "whateverpathdrools",
            on: "success"
          }
        ],
        name: "artifactDrools",
        dependencies: ["kiegroup/lienzo-core"]
      }
    }
  };
  const lienzoCoreNode = {
    project: "kiegroup/lienzo-core",
    build: {
      "build-command": {
        current: "current command",
        upstream: "upstream command",
        before: {
          current: "before current command",
          upstream: "before upstream command"
        },
        after: {
          current: "after current command",
          upstream: "after upstream command"
        }
      },
      "archive-artifacts": {
        paths: [
          {
            path: "whateverpathlienzo",
            on: "success"
          }
        ],
        name: "artifactLienzo",
        dependencies: "none"
      }
    }
  };

  uploadArtifacts
    .mockResolvedValueOnce({
      failedItems: [],
      artifactName: "artifactName1"
    })
    .mockResolvedValueOnce({
      failedItems: [],
      artifactName: "artifactName2"
    });

  // Act
  await archiveArtifacts(
    droolsNode,
    [lienzoCoreNode, droolsNode],
    ["success", "always"]
  );
  // Assert
  expect(uploadArtifacts).toHaveBeenCalledTimes(2);
  expect(uploadArtifacts).toHaveBeenCalledWith(
    {
      paths: [
        {
          path: "whateverpathdrools",
          on: "success"
        }
      ],
      name: "artifactDrools",
      dependencies: ["kiegroup/lienzo-core"]
    },
    ["success", "always"]
  );
  expect(uploadArtifacts).toHaveBeenCalledWith(
    {
      paths: [
        {
          path: "whateverpathlienzo",
          on: "success"
        }
      ],
      name: "artifactLienzo",
      dependencies: "none"
    },
    ["success", "always"]
  );
});

test("start archive artifacts. Dependencies all", async () => {
  // Arrange
  const droolsNode = {
    project: "kiegroup/drools",
    build: {
      "build-command": {
        current: "current command",
        upstream: "upstream command",
        before: {
          current: "before current command",
          upstream: "before upstream command"
        },
        after: {
          current: "after current command",
          upstream: "after upstream command"
        }
      },
      "archive-artifacts": {
        paths: [
          {
            path: "whateverpathdrools",
            on: "success"
          }
        ],
        name: "artifactDrools",
        dependencies: "all"
      }
    }
  };
  const lienzoCoreNode = {
    project: "kiegroup/lienzo-core",
    build: {
      "build-command": {
        current: "current command",
        upstream: "upstream command",
        before: {
          current: "before current command",
          upstream: "before upstream command"
        },
        after: {
          current: "after current command",
          upstream: "after upstream command"
        }
      },
      "archive-artifacts": {
        paths: [
          {
            path: "whateverpathlienzo",
            on: "success"
          }
        ],
        name: "artifactLienzo",
        dependencies: "none"
      }
    }
  };

  uploadArtifacts
    .mockResolvedValueOnce({
      failedItems: [],
      artifactName: "artifactName1"
    })
    .mockResolvedValueOnce({
      failedItems: [],
      artifactName: "artifactName2"
    });

  // Act
  await archiveArtifacts(
    droolsNode,
    [lienzoCoreNode, droolsNode],
    ["success", "always"]
  );
  // Assert
  expect(uploadArtifacts).toHaveBeenCalledTimes(2);
  expect(uploadArtifacts).toHaveBeenCalledWith(
    {
      paths: [
        {
          path: "whateverpathdrools",
          on: "success"
        }
      ],
      name: "artifactDrools",
      dependencies: "all"
    },
    ["success", "always"]
  );
  expect(uploadArtifacts).toHaveBeenCalledWith(
    {
      paths: [
        {
          path: "whateverpathlienzo",
          on: "success"
        }
      ],
      name: "artifactLienzo",
      dependencies: "none"
    },
    ["success", "always"]
  );
});

test("start with parent dependencies not matching any project", async () => {
  // Arrange
  const droolsNode = {
    project: "kiegroup/drools",
    build: {
      "build-command": {
        current: "current command",
        upstream: "upstream command",
        before: {
          current: "before current command",
          upstream: "before upstream command"
        },
        after: {
          current: "after current command",
          upstream: "after upstream command"
        }
      },
      "archive-artifacts": {
        paths: [
          {
            path: "whateverpathdrools",
            on: "success"
          }
        ],
        name: "artifactDrools",
        dependencies: ["notknownproject"]
      }
    }
  };
  const lienzoCoreNode = {
    project: "kiegroup/lienzo-core",
    build: {
      "build-command": {
        current: "current command",
        upstream: "upstream command",
        before: {
          current: "before current command",
          upstream: "before upstream command"
        },
        after: {
          current: "after current command",
          upstream: "after upstream command"
        }
      },
      "archive-artifacts": {
        paths: [
          {
            path: "whateverpathlienzo",
            on: "success"
          }
        ],
        name: "artifactLienzo",
        dependencies: "none"
      }
    }
  };

  uploadArtifacts
    .mockResolvedValueOnce({
      failedItems: [],
      artifactName: "artifactName1"
    })
    .mockResolvedValueOnce({
      failedItems: [],
      artifactName: "artifactName2"
    });

  // Act
  await archiveArtifacts(
    droolsNode,
    [lienzoCoreNode, droolsNode],
    ["success", "always"]
  );
  // Assert
  expect(uploadArtifacts).toHaveBeenCalledTimes(1);
  expect(uploadArtifacts).toHaveBeenCalledWith(
    {
      paths: [
        {
          path: "whateverpathdrools",
          on: "success"
        }
      ],
      name: "artifactDrools",
      dependencies: ["notknownproject"]
    },
    ["success", "always"]
  );
});

test("start archive artifacts. One of the projects without paths", async () => {
  // Arrange
  const droolsNode = {
    project: "kiegroup/drools",
    build: {
      "build-command": {
        current: "current command",
        upstream: "upstream command",
        before: {
          current: "before current command",
          upstream: "before upstream command"
        },
        after: {
          current: "after current command",
          upstream: "after upstream command"
        }
      },
      "archive-artifacts": {
        name: "artifactDrools",
        dependencies: "all"
      }
    }
  };
  const lienzoCoreNode = {
    project: "kiegroup/lienzo-core",
    build: {
      "build-command": {
        current: "current command",
        upstream: "upstream command",
        before: {
          current: "before current command",
          upstream: "before upstream command"
        },
        after: {
          current: "after current command",
          upstream: "after upstream command"
        }
      },
      "archive-artifacts": {
        paths: [
          {
            path: "whateverpathlienzo",
            on: "success"
          }
        ],
        name: "artifactLienzo",
        dependencies: "none"
      }
    }
  };

  uploadArtifacts
    .mockResolvedValueOnce({
      failedItems: [],
      artifactName: "artifactName1"
    })
    .mockResolvedValueOnce({
      failedItems: [],
      artifactName: "artifactName2"
    });

  // Act
  await archiveArtifacts(
    droolsNode,
    [lienzoCoreNode, droolsNode],
    ["success", "always"]
  );
  // Assert
  expect(uploadArtifacts).toHaveBeenCalledTimes(1);
  expect(uploadArtifacts).toHaveBeenCalledWith(
    {
      paths: [
        {
          path: "whateverpathlienzo",
          on: "success"
        }
      ],
      name: "artifactLienzo",
      dependencies: "none"
    },
    ["success", "always"]
  );
});
