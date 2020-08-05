const { treat } = require("../../src/lib/command/no-treatment");

test("treat", () => {
  // Act
  const result = treat("mvn clean install");

  // Assert
  expect(result).toEqual("mvn clean install");
});
