const { dependenciesToObject } = require("../src/lib/common");

test("dependenciesToObject without branch", () => {
  // Arrange
  const expected = {
    projectA: { group: "defaultGroup" },
    projectB: { group: "defaultGroup" },
    projectC: { group: "defaultGroup" },
    projectD: { group: "defaultGroup" }
  };
  // Act
  const dependencies = dependenciesToObject(
    `projectA
projectB
 projectC
projectD`,
    "defaultGroup"
  );
  // Assert
  expect(dependencies).toEqual(expected);
});

test("dependenciesToObject without branch and with group", () => {
  // Arrange
  const expected = {
    projectA: { group: "groupx" },
    projectB: { group: "groupy" },
    projectC: { group: "groupz" },
    projectD: { group: "defaultGroup" }
  };
  // Act
  const dependencies = dependenciesToObject(
    `groupx/projectA
groupy/projectB
 groupz/projectC
projectD`,
    "defaultGroup"
  );
  // Assert
  expect(dependencies).toEqual(expected);
});

test("dependenciesToObject single dependency without group", () => {
  // Arrange
  const expected = { projectA: { group: "defaultGroup" } };
  // Act
  const dependencies = dependenciesToObject("projectA", "defaultGroup");
  // Assert
  expect(dependencies).toEqual(expected);
});

test("dependenciesToObject single dependency with group", () => {
  // Arrange
  const expected = { projectA: { group: "groupx" } };
  // Act
  const dependencies = dependenciesToObject("groupx/projectA", "defaultGroup");
  // Assert
  expect(dependencies).toEqual(expected);
});

test("dependenciesToObject with branch", () => {
  // Arrange
  const expected = {
    projectA: { group: "defaultGroup" },
    projectB: {
      group: "defaultGroup",
      mapping: { source: "7.x", target: "master" }
    },
    projectC: { group: "defaultGroup" },
    projectD: {
      group: "defaultGroup",
      mapping: { source: "8.0.0", target: "9.1.1" }
    }
  };
  // Act
  const dependencies = dependenciesToObject(
    `projectA
projectB@7.x:master
 projectC
projectD@8.0.0:9.1.1`,
    "defaultGroup"
  );
  // Assert
  expect(dependencies).toEqual(expected);
});
