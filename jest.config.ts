import type { Config } from "@jest/types";
// Sync object
const config: Config.InitialOptions = {
  verbose: true,
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  moduleNameMapper: {
    "^@bc/(.*)$": "<rootDir>/src/$1",
  },
  clearMocks: true,
  resetMocks: true
};
export default config;