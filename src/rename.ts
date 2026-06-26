import * as fs from "fs";
import * as path from "path";

export type PlanStatus = "rename" | "unchanged" | "collision";

export interface PlanEntry {
  oldName: string;
  newName: string;
  status: PlanStatus;
  /** Human-readable explanation, set for collisions. */
  reason?: string;
}

export interface ApplyResult {
  renamed: number;
  skipped: number;
  unchanged: number;
  /** Files that failed to rename at the filesystem level. */
  errors: { name: string; message: string }[];
}

/**
 * Builds the old -> new name map for every file.
 *
 * Each entry is classified as:
 *  - "unchanged": the regex did not alter the name (nothing to do).
 *  - "collision": applying the rename would clash with an existing file or
 *    with another file's new name, so it must be skipped.
 *  - "rename": a safe rename to perform.
 *
 * The set of files currently in the directory is taken from `files` itself,
 * so a target that matches a name already present is treated as a collision.
 */
export function buildPlan(
  files: string[],
  find: RegExp,
  replace: string
): PlanEntry[] {
  const draft = files.map((oldName) => ({
    oldName,
    newName: oldName.replace(find, replace),
  }));

  const existing = new Set(files);

  // Count how many files want each target name, so two files mapping to the
  // same destination are caught as collisions.
  const targetCounts = new Map<string, number>();
  for (const d of draft) {
    if (d.newName !== d.oldName) {
      targetCounts.set(d.newName, (targetCounts.get(d.newName) ?? 0) + 1);
    }
  }

  return draft.map(({ oldName, newName }): PlanEntry => {
    if (newName === oldName) {
      return { oldName, newName, status: "unchanged" };
    }

    if ((targetCounts.get(newName) ?? 0) > 1) {
      return {
        oldName,
        newName,
        status: "collision",
        reason: "multiple files would be renamed to this name",
      };
    }

    if (existing.has(newName)) {
      return {
        oldName,
        newName,
        status: "collision",
        reason: `a file named "${newName}" already exists`,
      };
    }

    return { oldName, newName, status: "rename" };
  });
}

/**
 * Carries out the plan. When `apply` is false this is a no-op on disk and only
 * tallies what *would* happen (dry run). Collisions and unchanged files are
 * never touched.
 */
export function applyPlan(
  dir: string,
  plan: PlanEntry[],
  apply: boolean
): ApplyResult {
  const result: ApplyResult = {
    renamed: 0,
    skipped: 0,
    unchanged: 0,
    errors: [],
  };

  for (const entry of plan) {
    switch (entry.status) {
      case "unchanged":
        result.unchanged++;
        break;

      case "collision":
        result.skipped++;
        break;

      case "rename":
        if (apply) {
          try {
            fs.renameSync(
              path.join(dir, entry.oldName),
              path.join(dir, entry.newName)
            );
            result.renamed++;
          } catch (err) {
            result.skipped++;
            result.errors.push({
              name: entry.oldName,
              message: err instanceof Error ? err.message : String(err),
            });
          }
        } else {
          // Dry run: count the renames we would have made.
          result.renamed++;
        }
        break;
    }
  }

  return result;
}
