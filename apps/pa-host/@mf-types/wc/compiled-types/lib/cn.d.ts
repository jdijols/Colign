/**
 * Tiny className composer. Filters out falsy values so conditional class
 * expressions read naturally without pulling in `clsx`/`classnames` as a dep.
 *
 *   cn("base", isActive && "active", null, undefined, false, "more")
 *   // → "base active more"
 */
export declare function cn(...args: Array<string | number | undefined | null | false>): string;
