/**
 * Whether Left/Right arrow keys should be left to the focused control
 * instead of advancing Guided Input steps.
 */
const NATIVE_ARROW_INPUT_TYPES = new Set([
  "text",
  "search",
  "tel",
  "url",
  "email",
  "password",
  "number",
  "date",
  "datetime-local",
  "month",
  "week",
  "time",
  "range",
])

const EDITABLE_ANCESTOR_SELECTOR = [
  "[data-guided-inline-edit]",
  "[data-guided-slider]",
  "[data-keyboard-editable]",
  '[role="slider"]',
  '[role="spinbutton"]',
  '[role="textbox"]',
  '[contenteditable="true"]',
  '[contenteditable=""]',
  "textarea",
  "select",
  "input:not([type])",
  'input[type="text"]',
  'input[type="search"]',
  'input[type="tel"]',
  'input[type="url"]',
  'input[type="email"]',
  'input[type="password"]',
  'input[type="number"]',
  'input[type="date"]',
  'input[type="datetime-local"]',
  'input[type="month"]',
  'input[type="week"]',
  'input[type="time"]',
  'input[type="range"]',
].join(", ")

export function shouldIgnoreGuidedArrowNavigation(
  target: EventTarget | null,
): boolean {
  if (target == null || typeof Element === "undefined") return false
  if (!(target instanceof Element)) return false

  if (target instanceof HTMLInputElement) {
    if (target.dataset.guidedInlineEdit != null) return true
    return NATIVE_ARROW_INPUT_TYPES.has(target.type)
  }

  if (
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  ) {
    return true
  }

  if (target instanceof HTMLElement && target.isContentEditable) {
    return true
  }

  return target.closest(EDITABLE_ANCESTOR_SELECTOR) != null
}
