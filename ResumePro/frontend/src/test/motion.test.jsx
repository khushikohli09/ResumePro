import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCountUp, useTypewriter } from "../hooks/useMotion";

afterEach(() => vi.useRealTimers());

describe("useCountUp", () => {
  it("animates from 0 to the target, then holds it", () => {
    window.__reduceMotion = false;
    vi.useFakeTimers();
    const { result } = renderHook(() => useCountUp(80, { duration: 800 }));
    expect(result.current).toBe(0);
    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current).toBeGreaterThan(0);
    expect(result.current).toBeLessThan(80);
    act(() => { vi.advanceTimersByTime(1200); });
    expect(result.current).toBe(80);
  });

  it("jumps straight to the value when the user prefers reduced motion", () => {
    window.__reduceMotion = true;
    const { result } = renderHook(() => useCountUp(55));
    expect(result.current).toBe(55);
  });

  it("re-animates when the target changes", () => {
    window.__reduceMotion = false;
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ t }) => useCountUp(t, { duration: 400 }), { initialProps: { t: 10 } });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current).toBe(10);
    rerender({ t: 90 });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current).toBe(90);
  });
});

describe("useTypewriter", () => {
  it("reveals text progressively and reports when done", () => {
    window.__reduceMotion = false;
    vi.useFakeTimers();
    const { result } = renderHook(() => useTypewriter("Hello world", { speed: 10, delay: 100 }));
    expect(result.current).toEqual({ shown: "", done: false });
    act(() => { vi.advanceTimersByTime(100 + 10 * 5); });
    expect(result.current.shown).toBe("Hello");
    expect(result.current.done).toBe(false);
    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current).toEqual({ shown: "Hello world", done: true });
  });

  it("shows the full text immediately with reduced motion", () => {
    window.__reduceMotion = true;
    const { result } = renderHook(() => useTypewriter("Hi there"));
    expect(result.current).toEqual({ shown: "Hi there", done: true });
  });
});
