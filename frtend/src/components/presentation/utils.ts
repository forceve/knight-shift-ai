export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * clamp01(t);

export const easeInOut = (t: number) => {
  const clamped = clamp01(t);
  return clamped < 0.5 ? 2 * clamped * clamped : -1 + (4 - 2 * clamped) * clamped;
};

export const isFormElement = (target: EventTarget | null) => {
  if (!target || !(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const interactive = target.closest("input, textarea, select, option, button, [contenteditable]");
  if (interactive) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON";
};

export const formatMs = (ms: number) => `${Math.round(ms / 100) / 10}s`;
