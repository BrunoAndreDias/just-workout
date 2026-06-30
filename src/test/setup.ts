import "fake-indexeddb/auto";
import * as matchers from "@testing-library/jest-dom/matchers";
import type {} from "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeAll, expect } from "vitest";

expect.extend(matchers);

beforeAll(() => {
  Object.defineProperty(window, "scrollTo", {
    configurable: true,
    value: () => {},
    writable: true,
  });
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});
