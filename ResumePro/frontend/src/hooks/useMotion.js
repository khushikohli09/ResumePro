// Small animation hooks. All of them respect the user's "reduce motion" OS setting.
import { useEffect, useState } from "react";

// True if the user asked their system to minimise animations (accessibility).
export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Counts from 0 up to `target` with an ease-out curve. Jumps straight to the value if motion is reduced. */
// Animated number: returns a value that rises from 0 to `target` (e.g. a score). `delay` waits before starting.
export function useCountUp(target, { duration = 900, delay = 0 } = {}) {
  // Start at the final value when motion is reduced, otherwise at 0.
  const [value, setValue] = useState(prefersReducedMotion() ? target : 0);

  useEffect(() => {
    if (prefersReducedMotion()) { setValue(target); return; }
    // requestAnimationFrame id and start time, kept so we can cancel and measure progress.
    let raf;
    let start;
    const timer = setTimeout(() => {
      // Called every frame with a timestamp t. `start ??=` records the first timestamp only.
      const tick = (t) => {
        start ??= t;
        // p = progress from 0 to 1. The formula 1-(1-p)^3 is an "ease-out" curve: fast at first, slowing at the end.
        const p = Math.min(1, (t - start) / duration);
        setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    // Cleanup: stop timers/animation if the component unmounts or inputs change.
    return () => { clearTimeout(timer); cancelAnimationFrame(raf); };
  }, [target, duration, delay]);

  return value;
}

// Typewriter effect: reveals `text` one character every `speed` ms. Returns the visible part and whether it finished.
/** Types `text` out one character at a time. */
export function useTypewriter(text, { speed = 18, delay = 300 } = {}) {
  // n = how many characters are currently shown.
  const [n, setN] = useState(prefersReducedMotion() ? text.length : 0);

  useEffect(() => {
    if (prefersReducedMotion()) { setN(text.length); return; }
    // Restart from zero whenever the text changes.
    setN(0);
    let i = 0;
    let interval;
    const timer = setTimeout(() => {
      interval = setInterval(() => {
        i += 1;
        setN(i);
        if (i >= text.length) clearInterval(interval);
      }, speed);
    }, delay);
    return () => { clearTimeout(timer); clearInterval(interval); };
  }, [text, speed, delay]);

  return { shown: text.slice(0, n), done: n >= text.length };
}
