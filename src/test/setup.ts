import "fake-indexeddb/auto";
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeAll, expect } from "vitest";

expect.extend({
  toBeChecked(received: unknown) {
    const element = received as {
      checked?: unknown;
      getAttribute?: (name: string) => string | null;
    };
    const pass = element?.checked === true || element?.getAttribute?.("aria-checked") === "true";

    return {
      message: () => `expected element ${pass ? "not " : ""}to be checked`,
      pass,
    };
  },
  toBeDisabled(received: unknown) {
    const element = received as {
      disabled?: unknown;
      getAttribute?: (name: string) => string | null;
    };
    const pass = element?.disabled === true || element?.getAttribute?.("aria-disabled") === "true";

    return {
      message: () => `expected element ${pass ? "not " : ""}to be disabled`,
      pass,
    };
  },
  toBeEnabled(received: unknown) {
    const element = received as {
      disabled?: unknown;
      getAttribute?: (name: string) => string | null;
    };
    const pass = element?.disabled !== true && element?.getAttribute?.("aria-disabled") !== "true";

    return {
      message: () => `expected element ${pass ? "not " : ""}to be enabled`,
      pass,
    };
  },
  toBeInTheDocument(received: unknown) {
    const node = received as Node | null | undefined;
    const pass = Boolean(node?.ownerDocument?.contains(node));

    return {
      message: () => `expected element ${pass ? "not " : ""}to be in the document`,
      pass,
    };
  },
  toBeVisible(received: unknown) {
    const element = received as Element | null | undefined;
    const view = element?.ownerDocument?.defaultView;

    if (!element || !view) {
      return {
        message: () => "expected value to be a DOM element",
        pass: false,
      };
    }

    const style = view.getComputedStyle(element);
    const pass = [
      element.ownerDocument.contains(element),
      !element.hasAttribute("hidden"),
      style.display !== "none",
      style.visibility !== "hidden",
      style.visibility !== "collapse",
      style.opacity !== "0",
    ].every(Boolean);

    return {
      message: () => `expected element ${pass ? "not " : ""}to be visible`,
      pass,
    };
  },
  toHaveAttribute(received: unknown, name: string, expectedValue?: string) {
    const element = received as Element | null | undefined;
    const actualValue = element?.getAttribute(name) ?? null;
    const pass =
      typeof expectedValue === "undefined" ? actualValue !== null : actualValue === expectedValue;

    return {
      message: () =>
        typeof expectedValue === "undefined"
          ? `expected element ${pass ? "not " : ""}to have attribute "${name}"`
          : `expected element ${pass ? "not " : ""}to have attribute "${name}" with value "${expectedValue}"`,
      pass,
    };
  },
  toHaveValue(received: unknown, expectedValue: number | string) {
    const element = received as { value?: unknown } | null | undefined;
    const actualValue = element?.value;
    const pass =
      typeof actualValue === "number"
        ? actualValue === expectedValue
        : Number(actualValue) === expectedValue || String(actualValue) === String(expectedValue);

    return {
      message: () => `expected element ${pass ? "not " : ""}to have value "${expectedValue}"`,
      pass,
    };
  },
});

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
