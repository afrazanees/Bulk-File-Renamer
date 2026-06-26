/**
 * Tiny, dependency-free ANSI color helper.
 *
 * Colors are auto-disabled when output is not a TTY (e.g. piped to a file),
 * when the NO_COLOR env var is set, and can be forced on/off explicitly.
 * See https://no-color.org/ for the NO_COLOR convention.
 */

function autoDetect(): boolean {
  const env = process.env;
  if (env.NO_COLOR !== undefined && env.NO_COLOR !== "") return false;
  if (env.FORCE_COLOR !== undefined && env.FORCE_COLOR !== "0") return true;
  return Boolean(process.stdout.isTTY);
}

let enabled = autoDetect();

/** Force colors on or off, overriding auto-detection (used by --no-color). */
export function setColorEnabled(on: boolean): void {
  enabled = on;
}

function wrap(open: number, close: number, text: string): string {
  return enabled ? `\x1b[${open}m${text}\x1b[${close}m` : text;
}

export const color = {
  green: (s: string) => wrap(32, 39, s),
  yellow: (s: string) => wrap(33, 39, s),
  red: (s: string) => wrap(31, 39, s),
  cyan: (s: string) => wrap(36, 39, s),
  dim: (s: string) => wrap(2, 22, s),
  bold: (s: string) => wrap(1, 22, s),
};
