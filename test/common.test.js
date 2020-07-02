const { createConfig } = require("../src/lib/common");
jest.mock('../src/lib/action-utils', () => ({
  getParentDependencies: () => { return ['lienzo-core', 'lienzo-test', 'drools']; },
  getChildDependencies: () => { return ['lienzo-core', 'lienzo-test', 'drools-jbpm']; }
}));

test("createConfig", () => {
  const config = createConfig({});
  const expected = {
    'parentDependencies': ['lienzo-core', 'lienzo-test', 'drools'],
    'childDependencies': ['lienzo-core', 'lienzo-test', 'drools-jbpm']
  };
  expect(config).toEqual(expected);
});
