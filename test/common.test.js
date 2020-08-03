const { dependenciesToObject } = require("../src/lib/common");

test("dependenciesToObject without branch", () => {
  // Arrange
  const expected = { projectA: {}, projectB: {}, projectC: {}, projectD: {} };
  // Act
  const dependencies = dependenciesToObject(
    "projectA,projectB, projectC,projectD"
  );
  // Assert
  expect(dependencies).toEqual(expected);
});

test("dependenciesToObject with branch", () => {
  // Arrange
  const expected = {
    projectA: {},
    projectB: { mapping: { source: "7.x", target: "master" } },
    projectC: {},
    projectD: {}
  };
  // Act
  const dependencies = dependenciesToObject(
    "projectA,projectB@7.x:master, projectC,projectD"
  );
  // Assert
  expect(dependencies).toEqual(expected);
});
