import "@testing-library/jest-dom";
import { beforeAll, afterAll, afterEach } from "vitest";

// Make crypto.randomUUID available in jsdom (it's already available in Node 18+)
// but we add a fallback for environments that don't have it
if (!globalThis.crypto?.randomUUID) {
  Object.defineProperty(globalThis, "crypto", {
    value: {
      randomUUID: () => {
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
          /[xy]/g,
          (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          }
        );
      },
    },
  });
}

// MSW setup (server-side for API tests)
// For API tests, we use direct function calls rather than HTTP to avoid MSW setup complexity
