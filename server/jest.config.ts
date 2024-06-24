import type { JestConfigWithTsJest } from "ts-jest";

export default {
  preset: "ts-jest",
  testEnvironment: "node",
  silent: true,
  moduleNameMapper: {
    "^~/(.*)$": "<rootDir>/src/$1",
  },
} satisfies JestConfigWithTsJest;
