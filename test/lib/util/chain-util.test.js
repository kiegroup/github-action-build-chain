const { getNodeTriggeringJob } = require("../../../src/lib/util/chain-util");

test("getNodeTriggeringJob repository with group", () => {
  const context = {
    config: { github: { repository: "group/projectA", project: "projectA" } }
  };
  const nodeChain = [
    {
      project: "group/projectA",
      repo: { group: "group", name: "projectA" }
    },
    {
      project: "group/projectB",
      repo: { group: "group", name: "projectB" }
    }
  ];

  //Act
  const result = getNodeTriggeringJob(context, nodeChain);

  // Assert
  expect(result).toBe(Object.values(nodeChain)[0]);
});

test("getNodeTriggeringJob without group", () => {
  const context = {
    config: { github: { repository: "group/projectA", project: "projectA" } }
  };
  const nodeChain = [
    {
      project: "projectA",
      repo: { group: "group", name: "projectA" }
    },
    {
      project: "projectB",
      repo: { group: "group", name: "projectB" }
    }
  ];

  //Act
  const result = getNodeTriggeringJob(context, nodeChain);

  // Assert
  expect(result).toBe(Object.values(nodeChain)[0]);
});

test("getNodeTriggeringJob without group", () => {
  const context = {
    config: { github: { repository: "group/projectX", project: "projectX" } }
  };
  const nodeChain = [
    {
      project: "projectA",
      repo: { group: "group", name: "projectA" }
    },
    {
      project: "projectB",
      repo: { group: "group", name: "projectB" }
    }
  ];

  //Act
  const result = getNodeTriggeringJob(context, nodeChain);

  // Assert
  expect(result).toBe(undefined);
});
