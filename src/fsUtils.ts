import * as fs from "fs";
import * as path from "path";

/**
 * Returns true if the given path exists and is a directory.
 */
export function isDirectory(dir: string): boolean {
  try {
    return fs.statSync(dir).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Normalizes an extension filter so it always starts with a dot,
 * e.g. "jpg" -> ".jpg". Returns undefined if no filter was given.
 */
export function normalizeExt(ext?: string): string | undefined {
  if (!ext) return undefined;
  return ext.startsWith(".") ? ext : `.${ext}`;
}

/**
 * Lists the file names (not sub-directories) directly inside `dir`.
 * If `ext` is provided, only files with that extension are returned
 * (case-insensitive). Names are returned sorted for stable output.
 */
export function listFiles(dir: string, ext?: string): string[] {
  const normExt = normalizeExt(ext);
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  let files = entries.filter((e) => e.isFile()).map((e) => e.name);

  if (normExt) {
    const wanted = normExt.toLowerCase();
    files = files.filter((name) => path.extname(name).toLowerCase() === wanted);
  }

  return files.sort((a, b) => a.localeCompare(b));
}

/**
 * Returns true if a file/dir with the given name already exists in `dir`.
 */
export function nameExists(dir: string, name: string): boolean {
  return fs.existsSync(path.join(dir, name));
}
