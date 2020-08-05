const {
  treatCommand
} = require("../../src/lib/command/command-treatment-factory");
jest.mock("../../src/lib/command/maven-treatment", () => ({
  treat: () => {
    return "maven command";
  }
}));

jest.mock("../../src/lib/command/no-treatment", () => ({
  treat: () => {
    return "same command";
  }
}));

test("treatCommand maven", () => {
  // Act
  const result = treatCommand("mvn clean install");

  // Assert
  expect(result).toEqual("maven command");
});

test("treatCommand maven with previous space", () => {
  // Act
  const result = treatCommand(" mvn clean install");

  // Assert
  expect(result).toEqual("maven command");
});

test("treatCommand maven with envs", () => {
  // Act
  const result = treatCommand("env VAR=1 mvn clean install");

  // Assert
  expect(result).toEqual("maven command");
});

test("treatCommand no command", () => {
  // Act
  const result = treatCommand("./shell.sh");

  // Assert
  expect(result).toEqual("same command");
});
