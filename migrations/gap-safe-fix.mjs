#!/usr/bin/env node
// gap-safe-fix.mjs — bring a behind workspace current when NO chain migration
// covers it (SX-789, s01-542b99). The chain walks migration FILES; if a soma
// sits in a version gap (e.g. v0.29–v0.31 had no phase files), `doctor --fix`
// found "no pending migrations" and did nothing — the upgrade path silently
// no-op'd. This runs the same gap-safe work the BOOT sentinels do, but invokable
// from the doctor:
//   1. settings backfill — addIfMissing every default key (never overwrites).
//   2. version fast-forward — settings.version → agent version (clears "update available").
//   3. template auto-update — ONLY for pristine templates (a workspace _*.md that
//      byte-matches a KNOWN archived version templates/default/v*/). Customized
//      copies match no archive → SKIPPED (your edits are never clobbered).
//
// Usage: node gap-safe-fix.mjs <somaDir> <agentDir> <agentVersion>
import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";

const [, , somaDir, agentDir, agentVersion] = process.argv;
if (!somaDir || !agentDir || !agentVersion) {
  console.error("usage: gap-safe-fix.mjs <somaDir> <agentDir> <agentVersion>");
  process.exit(2);
}

let changed = 0;
const log = (m) => console.log("  " + m);

// ── 1 + 2: settings backfill + version fast-forward ──
try {
  const { getDefaultSettings } = await import(join(agentDir, "dist", "core", "index.js"));
  const settingsPath = join(somaDir, "settings.json");
  const cur = existsSync(settingsPath) ? JSON.parse(readFileSync(settingsPath, "utf-8")) : {};
  const defaults = getDefaultSettings();
  for (const [k, v] of Object.entries(defaults)) {
    if (!(k in cur)) { cur[k] = v; changed++; log(`+ settings.${k} (default)`); }
  }
  if (cur.version !== agentVersion) {
    log(`version ${cur.version || "?"} → ${agentVersion}`);
    cur.version = agentVersion; changed++;
  }
  writeFileSync(settingsPath, JSON.stringify(cur, null, "\t") + "\n");
} catch (e) { log("settings backfill skipped: " + e.message); }

// ── 3: template auto-update — pristine (archive-matching) only ──
try {
  const bundledDir = join(agentDir, "templates", "default");
  const bodyDir = join(somaDir, "body");
  if (existsSync(bundledDir) && existsSync(bodyDir)) {
    // Collect archived versions per template name: templates/default/v*/<name>.md
    const archiveDirs = readdirSync(bundledDir)
      .filter((d) => /^v[\d.]+$/.test(d))
      .map((d) => join(bundledDir, d));
    for (const file of readdirSync(bundledDir).filter((f) => f.startsWith("_") && f.endsWith(".md"))) {
      const bundledPath = join(bundledDir, file);
      const projectPath = join(bodyDir, file);
      if (!existsSync(projectPath)) continue;
      const bundled = readFileSync(bundledPath, "utf-8");
      const project = readFileSync(projectPath, "utf-8");
      if (bundled === project) continue; // already current
      // Pristine ⇔ the workspace copy byte-matches SOME archived version.
      const isPristine = archiveDirs.some((ad) => {
        const ap = join(ad, file);
        return existsSync(ap) && readFileSync(ap, "utf-8") === project;
      });
      if (isPristine) {
        writeFileSync(projectPath, bundled);
        changed++; log(`updated template ${file} (pristine → current)`);
      } else {
        log(`kept ${file} (customized or unknown version — not overwritten)`);
      }
    }
  }
} catch (e) { log("template update skipped: " + e.message); }

console.log(changed > 0 ? `  ✓ gap-safe fix applied ${changed} change(s)` : "  · already current");
process.exit(0);
