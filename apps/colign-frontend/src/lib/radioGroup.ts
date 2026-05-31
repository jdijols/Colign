import { type KeyboardEvent } from "react";

/**
 * Roving-focus keyboard handler for an ARIA radiogroup whose options are
 * rendered as a flat list of buttons with {@code role="radio"}.
 *
 * Selection follows focus, matching the spec for "automatic" radio groups
 * (https://www.w3.org/WAI/ARIA/apg/patterns/radio/). Arrow Left/Up moves to
 * the previous option (wrapping); Arrow Right/Down moves to the next; Home
 * and End jump to the ends; Space and Enter select without moving (useful
 * when a click handler is doing more than {@code onChange} — see CommitForm's
 * toggle-on-click chess pills).
 *
 * Focus management uses a DOM lookup against the rendered siblings rather
 * than a ref array, so consumers don't have to thread refs through every
 * button or change the call-site rendering pattern.
 */
export function radioGroupKeyDown<T>(
    options: ReadonlyArray<T>,
    currentIdx: number,
    onChange: (next: T) => void,
): (e: KeyboardEvent<HTMLButtonElement>) => void {
    return (e) => {
        let nextIdx: number | null = null;
        switch (e.key) {
            case "ArrowRight":
            case "ArrowDown":
                nextIdx = ((currentIdx < 0 ? -1 : currentIdx) + 1 + options.length) % options.length;
                break;
            case "ArrowLeft":
            case "ArrowUp":
                nextIdx = ((currentIdx < 0 ? 0 : currentIdx) - 1 + options.length) % options.length;
                break;
            case "Home":
                nextIdx = 0;
                break;
            case "End":
                nextIdx = options.length - 1;
                break;
            case " ":
            case "Enter":
                // Space/Enter select the currently focused option. Let the
                // button's native onClick run rather than re-implementing it.
                return;
        }
        if (nextIdx == null) return;
        e.preventDefault();
        onChange(options[nextIdx]);
        const siblings = e.currentTarget.parentElement?.querySelectorAll<HTMLElement>(
            "[role='radio']",
        );
        siblings?.item(nextIdx)?.focus();
    };
}

/**
 * Tabindex to give a radio in a roving-focus group. The currently checked
 * option (or the first, when none is checked) is in the tab order; the rest
 * are reachable only via arrow keys. Without this every option is a tab stop,
 * which violates the radiogroup pattern and frustrates keyboard users.
 */
export function radioTabIndex(isChecked: boolean, isFirstAndNoneChecked: boolean): -1 | 0 {
    return isChecked || isFirstAndNoneChecked ? 0 : -1;
}
