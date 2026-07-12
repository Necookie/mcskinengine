#!/usr/bin/env node
// Bridges .agents/skills/ (canonical, shared by OpenCode + Gemini CLI natively)
// into .claude/skills/ so Claude Code — which only reads .claude/skills/ — sees
// the same skills. Run via `npm run sync-skills` (also runs on `npm install`).
import { existsSync, mkdirSync, readdirSync, rmSync, symlinkSync, cpSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const sourceDir = join(root, ".agents", "skills");
const targetDir = join(root, ".claude", "skills");

if (!existsSync(sourceDir)) {
  console.log("No .agents/skills directory found, nothing to sync.");
  process.exit(0);
}

mkdirSync(targetDir, { recursive: true });

const skills = readdirSync(sourceDir, { withFileTypes: true }).filter((e) => e.isDirectory());

for (const skill of skills) {
  const src = join(sourceDir, skill.name);
  const dest = join(targetDir, skill.name);

  if (existsSync(dest)) {
    rmSync(dest, { recursive: true, force: true });
  }

  try {
    // Relative symlink works on POSIX and on Windows with Developer Mode / admin.
    symlinkSync(relative(dirname(dest), src), dest, "dir");
    console.log(`linked   ${skill.name}`);
  } catch {
    try {
      // Windows junctions need an absolute target but don't require elevated privileges.
      symlinkSync(src, dest, "junction");
      console.log(`linked   ${skill.name} (junction)`);
    } catch {
      cpSync(src, dest, { recursive: true });
      console.log(`copied   ${skill.name} (symlinks unavailable — falling back to copy; re-run after editing .agents/skills)`);
    }
  }
}
