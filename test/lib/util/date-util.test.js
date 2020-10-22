const { formatDate } = require("../../../src/lib/util/date-util");

test("format date", () => {
  // Arrange
  const moonLanding = new Date("July 20, 69 00:20:18");

  // Act
  const result = formatDate(moonLanding);

  // Assert
  expect(result).toBe("196962002018");
});
