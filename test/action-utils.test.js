const { getChildDependencies, getParentDependencies } = require("../src/lib/action-utils");
jest.mock('@actions/core', () => ({
  getInput: (param) => { return param === 'parent-dependencies' ? 'lienzo-core, lienzo-test,drools' : param === 'child-dependencies' ? 'appformer' : undefined; }
}));

test("getParentDependencies", () => {
  // Act
  const result = getParentDependencies();

  // Assert
  expect(result).toEqual(['lienzo-core', 'lienzo-test', 'drools']);
});

test("getChildDependencies", () => {
  // Act
  const result = getChildDependencies();

  // Assert
  expect(result).toEqual(['appformer']);
});



