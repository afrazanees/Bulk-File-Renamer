# Bulk File Renamer

A command-line tool that renames many files at once using a regex find-and-replace pattern. Dry-run by default, so nothing changes until you confirm.

## Features
- Regex find-and-replace across filenames
- Dry-run preview by default (use `--apply` to commit the changes)
- Optional extension filter
- Skips and warns on name collisions
- Summary of what was renamed and skipped

## Tech
Node.js, TypeScript, commander

## Install & build
```bash
npm install
npm run build

# optional: register the `renamer` command on your PATH
npm link
```

## Usage
If you ran `npm link`, you can call `renamer` directly:
```bash
# preview only (safe, default)
renamer ./photos --find "IMG_" --replace "vacation_" --ext .jpg

# actually rename
renamer ./photos --find "IMG_" --replace "vacation_" --ext .jpg --apply
```

Without `npm link`, run the built file directly:
```bash
node dist/index.js ./photos --find "IMG_" --replace "vacation_" --ext .jpg
node dist/index.js ./photos --find "IMG_" --replace "vacation_" --ext .jpg --apply
```

### Options
| Flag | Description |
| --- | --- |
| `-f, --find <regex>` | Regex pattern to search for in filenames (required) |
| `-r, --replace <replacement>` | Replacement string, supports `$1`, `$2` backreferences (required) |
| `-e, --ext <ext>` | Only rename files with this extension (e.g. `.jpg`) |
| `-i, --ignore-case` | Make the regex case-insensitive |
| `--apply` | Actually perform the renames (default is a safe dry-run preview) |
| `--dry-run` | Preview only; never change files (this is the default) |
| `-y, --yes` | Skip the confirmation prompt when applying |
| `--no-color` | Disable colored output |

### Terminal output
Output is colorized and column-aligned when run in an interactive terminal.
Colors are turned off automatically when the output is piped or redirected, when
the [`NO_COLOR`](https://no-color.org/) environment variable is set, or with
`--no-color`. When applying changes interactively you'll be asked to confirm
first; use `-y` to skip the prompt (it is skipped automatically in scripts/pipes).
