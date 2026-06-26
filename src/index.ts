#!/usr/bin/env node
import * as readline from "readline";
import { Command } from "commander";
import { isDirectory, listFiles, normalizeExt } from "./fsUtils";
import { buildPlan, applyPlan, PlanEntry } from "./rename";
import { color, setColorEnabled } from "./colors";

interface CliOptions {
  find: string;
  replace: string;
  ext?: string;
  ignoreCase?: boolean;
  apply?: boolean;
  dryRun?: boolean;
  yes?: boolean;
  /** Set to false by commander when --no-color is passed. */
  color?: boolean;
}

function fail(message: string): never {
  console.error(color.red(`Error: ${message}`));
  process.exit(1);
}

/**
 * Compiles the user-supplied pattern into a global RegExp, optionally
 * case-insensitive. Exits with a clear message if the pattern is invalid.
 */
function compileRegex(pattern: string, ignoreCase: boolean): RegExp {
  const flags = ignoreCase ? "gi" : "g";
  try {
    return new RegExp(pattern, flags);
  } catch (err) {
    return fail(
      `invalid --find regex: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

/** Prints the planned changes in aligned, colored columns. */
function printPlan(plan: PlanEntry[]): void {
  const changing = plan.filter((e) => e.status !== "unchanged");

  if (changing.length === 0) {
    console.log(
      color.dim("No filenames matched the pattern — nothing to rename.")
    );
    return;
  }

  const width = Math.max(...changing.map((e) => e.oldName.length));

  for (const entry of changing) {
    const oldPadded = entry.oldName.padEnd(width);
    const arrow = color.dim("→");

    if (entry.status === "rename") {
      console.log(
        `  ${color.green("✔")} ${oldPadded}  ${arrow}  ${color.cyan(entry.newName)}`
      );
    } else {
      console.log(
        `  ${color.yellow("⚠")} ${color.dim(oldPadded)}  ${arrow}  ${color.dim(
          entry.newName
        )}  ${color.yellow(`skipped: ${entry.reason}`)}`
      );
    }
  }
}

/** Asks a yes/no question on the terminal; resolves true only for y/yes. */
function confirm(question: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(question, (answer) => {
      rl.close();
      resolve(/^y(es)?$/i.test(answer.trim()));
    });
  });
}

async function run(dir: string, opts: CliOptions): Promise<void> {
  // Honor --no-color (commander sets opts.color === false).
  if (opts.color === false) setColorEnabled(false);

  if (!isDirectory(dir)) {
    fail(`"${dir}" is not a directory (or does not exist).`);
  }

  // Dry run is the default. A real rename only happens with --apply and
  // without an explicit --dry-run override (which always wins, for safety).
  const isDryRun = Boolean(opts.dryRun) || !opts.apply;

  const regex = compileRegex(opts.find, Boolean(opts.ignoreCase));
  const ext = normalizeExt(opts.ext);

  const files = listFiles(dir, ext);
  if (files.length === 0) {
    const where = ext ? `${dir} (with extension ${ext})` : dir;
    console.log(color.dim(`No files found in ${where}.`));
    return;
  }

  const plan = buildPlan(files, regex, opts.replace);

  console.log(
    isDryRun
      ? color.cyan("Dry run") +
          color.dim(" — no files will be changed. Use ") +
          color.bold("--apply") +
          color.dim(" to perform the rename.\n")
      : color.bold("Applying renames...\n")
  );
  printPlan(plan);

  const toRename = plan.filter((e) => e.status === "rename").length;

  // Confirm before touching files when running interactively, unless --yes.
  // When piped/non-interactive, proceed without prompting (script-friendly).
  if (
    !isDryRun &&
    toRename > 0 &&
    !opts.yes &&
    process.stdin.isTTY &&
    process.stdout.isTTY
  ) {
    const ok = await confirm(
      `\nRename ${color.bold(String(toRename))} file(s)? ${color.dim("[y/N]")} `
    );
    if (!ok) {
      console.log(color.dim("Aborted — no files changed."));
      return;
    }
  }

  const result = applyPlan(dir, plan, !isDryRun);

  if (result.errors.length > 0) {
    console.log("\n" + color.red("Some files could not be renamed:"));
    for (const e of result.errors) {
      console.log(color.red(`  ${e.name}: ${e.message}`));
    }
  }

  const renamedLabel = isDryRun ? "to rename" : "renamed";
  const summary = [
    color.green(`${result.renamed} ${renamedLabel}`),
    result.skipped > 0
      ? color.yellow(`${result.skipped} skipped`)
      : color.dim("0 skipped"),
  ];
  if (result.unchanged > 0) {
    summary.push(color.dim(`${result.unchanged} unchanged`));
  }
  console.log("\n" + color.bold("Summary: ") + summary.join(color.dim(" · ")));
}

const program = new Command();

program
  .name("renamer")
  .description(
    "Bulk rename files using a regex find-and-replace pattern. Dry-run by default."
  )
  .argument("<dir>", "directory containing the files to rename")
  .requiredOption("-f, --find <regex>", "regex pattern to search for in filenames")
  .requiredOption(
    "-r, --replace <replacement>",
    "replacement string (supports $1, $2 backreferences)"
  )
  .option("-e, --ext <ext>", "only rename files with this extension (e.g. .jpg)")
  .option("-i, --ignore-case", "make the regex case-insensitive")
  .option(
    "--apply",
    "actually perform the renames (default is a safe dry-run preview)"
  )
  .option("--dry-run", "preview only; never change files (this is the default)")
  .option("-y, --yes", "skip the confirmation prompt when applying")
  .option("--no-color", "disable colored output")
  .showHelpAfterError()
  .action((dir: string, opts: CliOptions) => run(dir, opts));

program.parseAsync().catch((err) => {
  fail(err instanceof Error ? err.message : String(err));
});
