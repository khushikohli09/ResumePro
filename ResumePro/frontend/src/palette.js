// ResumePro brand palette, used to give icons and tiles their own colour.
// Four brand colours (as CSS variables from index.css) that icons and tiles cycle through.
export const PALETTE = ["var(--color-pink)", "var(--color-blue)", "var(--color-orange)", "var(--color-green)"];
// pick(i) returns the i-th colour, wrapping around with % so any index works.
export const pick = (i) => PALETTE[i % PALETTE.length];
