import "@testing-library/jest-dom/vitest";
import { beforeEach } from "vitest";

// Tests run with reduced motion ON by default so animated values land instantly.
// Individual tests can set window.__reduceMotion = false to exercise the animations.
beforeEach(() => {
  window.__reduceMotion = true;
  window.matchMedia = (query) => ({
    matches: !!window.__reduceMotion,
    media: query,
    addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
  });
});
