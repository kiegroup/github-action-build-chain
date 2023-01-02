import type { Config } from "@jest/types";
// Sync object
const jestConfig: Config.InitialOptions = {
  verbose: true,
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  moduleNameMapper: {
    "^@bc/(.*)$": "<rootDir>/src/$1",
  },
  clearMocks: true,
  resetMocks: true,
  coveragePathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/test/"],
  testTimeout: 120000
};
export default jestConfig;