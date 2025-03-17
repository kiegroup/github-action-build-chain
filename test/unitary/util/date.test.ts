import { hrtimeToMs } from "@bc/utils/date";

describe("hrtimeToMs", () => {

  afterEach(() => {
    jest.useRealTimers();
  });

  test("start no end", () => {
    // Arrange    
    jest.useFakeTimers({doNotFake: ["performance"]});
    const start: [number, number] = [1000000, 5];

    // Act
    const result = hrtimeToMs(start);

    // Assert
    expect(result).toBe(-1000000000.000005);
  });

  test("start and end", () => {
    // Arrange
    jest.useFakeTimers({doNotFake: ["performance"]});    
    const start: [number, number] = [1000000, 5];
    const end: [number, number] = [1000000, 5];

    // Act
    const result = hrtimeToMs(start, end);

    // Assert
    expect(result).toBe(1000000000.000005);    
  });
});