const {
  treat
} = require("../../../../src/lib/command/treatment/concat-treatment");

test("treat", () => {
  // Act
  const result = treat("mvn clean install");

  // Assert
  expect(result).toEqual("mvn clean install");
});

test("treat with concat", () => {
  // Act
  const result = treat("mvn clean install", "-s settings.xml");

  // Assert
  expect(result).toEqual("mvn clean install -s settings.xml");
});
