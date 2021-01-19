const { treatSkipProjectCheckout } = require("../../bin/bin-utils");

test("treatSkipProjectCheckout empty", () => {
  // Arrange
  const args = undefined;

  // Act
  const result = treatSkipProjectCheckout(args);

  // Assert
  expect(result.size).toEqual(0);
});

test("treatSkipProjectCheckout list", () => {
  // Arrange
  const args = [
    "kiegroup/projectA=./",
    "groupx/projectX=/folderA/folderB/folderC"
  ];

  // Act
  const result = treatSkipProjectCheckout(args);

  // Assert
  expect(result.size).toEqual(2);
  expect(result.get("kiegroup/projectA")).toEqual("./");
  expect(result.get("groupx/projectX")).toEqual("/folderA/folderB/folderC");
});
