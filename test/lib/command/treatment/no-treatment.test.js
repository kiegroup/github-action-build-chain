const { treat } = require("../../../../src/lib/command/treatment/no-treatment");

test("treat", () => {
  // Act
  const result = treat("mvn clean install");

  // Assert
  expect(result).toEqual("mvn clean install");
});
