#!/usr/bin/env node
/**
 * build-dist.mjs — Compile Soma extensions + core for distribution
 *
 * Produces minified + mangled JS from TypeScript sources.
 * The compiled output is what ships in the npm package — no raw .ts files.
 *
 * Usage:
 *   node scripts/build-dist.mjs           # full build
 *   node scripts/build-dist.mjs --clean   # remove dist/ first
 *   node scripts/build-dist.mjs --verify  # build + verify output loads
 *
 * Output:
 *   dist/
 *     extensions/
 *       soma-boot.js          ← minified + mangled
 *       soma-breathe.js
 *       soma-guard.js
 *       soma-header.js
 *       soma-route.js
 *       soma-scratch.js
 *       soma-statusline.js
 *     core/
 *       index.js              ← bundled core (all modules merged)
 *     content/
 *       system-core.md        ← readable (content, not code)
 *       protocols/            ← readable .md files
 */

import * as esbuild from "esbuild";
import { readdirSync, existsSync, mkdirSync, rmSync, cpSync, readFileSync, writeFileSync } from "fs";
import { join, basename, resolve, dirname, relative } from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DIST = join(ROOT, "dist");
const EXTENSIONS_DIR = join(ROOT, "extensions");
const CORE_DIR = join(ROOT, "core");

const args = process.argv.slice(2);
const CLEAN = args.includes("--clean");
const VERIFY = args.includes("--verify");

// ── Helpers ──────────────────────────────────────────────────────────

function log(msg) {
  process.stdout.write(`  ${msg}\n`);
}

function heading(msg) {
  process.stdout.write(`\n═══ ${msg} ═══\n`);
}

// ── Clean ────────────────────────────────────────────────────────────

if (CLEAN && existsSync(DIST)) {
  heading("Cleaning dist/");
  rmSync(DIST, { recursive: true, force: true });
  log("Removed dist/");
}

// ── Copy CLI dist (base layer — Pi runtime + thin-cli + welcome) ─────

heading("CLI base layer");

// Two-layer base: Pi runtime from npm + our custom files from repos/cli/dist
// Pi runtime is the ground truth — must match node_modules version.
// Our custom files (thin-cli, lib/, welcome/) only exist in repos/cli/dist.
const piDist = join(ROOT, "node_modules", "@mariozechner", "pi-coding-agent", "dist");
const cliDist = join(ROOT, "..", "cli", "dist");

// Our custom files — these come from repos/cli/dist, not from Pi npm
const OUR_DIST_FILES = [
  "cli.js", "thin-cli.js", "personality.js", "postinstall.js", "migrations.js",
  "lib/config.js", "lib/detect.js", "lib/display.js",
  "welcome/about.js", "welcome/auth.js", "welcome/intro.js", "welcome/qa.js",
];

const skipFilter = (src) => {
  if (src.endsWith(".d.ts") || src.endsWith(".js.map") || src.endsWith(".d.ts.map")) return false;
  return true;
};

// Layer 1: Pi runtime from npm (ground truth)
if (existsSync(piDist)) {
  cpSync(piDist, DIST, { recursive: true, filter: skipFilter });
  const piVersion = JSON.parse(readFileSync(join(ROOT, "node_modules", "@mariozechner", "pi-coding-agent", "package.json"), "utf8")).version;
  log(`Pi runtime ${piVersion} → base layer ✓`);
} else {
  log("⚠ Pi npm dist not found — falling back to repos/cli/dist");
  if (existsSync(cliDist)) {
    cpSync(cliDist, DIST, { recursive: true, filter: skipFilter });
    log("CLI dist → base layer (fallback) ✓");
  } else {
    log("✗ No base layer found — dist/ will only contain extensions + core");
  }
}

// Layer 2: Our custom files overlay (replaces Pi's cli.js, adds our lib/ + welcome/)
if (existsSync(cliDist)) {
  let copied = 0;
  for (const f of OUR_DIST_FILES) {
    const src = join(cliDist, f);
    if (existsSync(src)) {
      const dest = join(DIST, f);
      mkdirSync(dirname(dest), { recursive: true });
      cpSync(src, dest);
      copied++;
    }
  }
  log(`Custom files (${copied}/${OUR_DIST_FILES.length}) → overlay ✓`);
} else {
  // Also check src/cli.js as source for our CLI entry point
  const srcCli = join(ROOT, "src", "cli.js");
  if (existsSync(srcCli)) {
    mkdirSync(DIST, { recursive: true });
    cpSync(srcCli, join(DIST, "cli.js"));
    log("src/cli.js → dist/cli.js ✓");
  }
  log("⚠ repos/cli/dist not found — custom files may be missing");
}

mkdirSync(join(DIST, "extensions"), { recursive: true });
mkdirSync(join(DIST, "core"), { recursive: true });
mkdirSync(join(DIST, "content", "protocols"), { recursive: true });

// ── Discover extensions ──────────────────────────────────────────────

const extensionFiles = readdirSync(EXTENSIONS_DIR)
  .filter(f => f.startsWith("soma-") && f.endsWith(".ts"))
  .map(f => join(EXTENSIONS_DIR, f));

heading("Building extensions");
log(`Found ${extensionFiles.length} extensions`);

// ── Build core bundle first (extensions import from it) ──────────────

heading("Building core bundle");

// Core is a library — extensions import { findSomaDir } from "../core/index.js"
// We need to bundle all core modules into a single file that re-exports everything.
// Extensions will be rewritten to import from the compiled core path.

const coreEntry = join(CORE_DIR, "index.ts");

const coreResult = await esbuild.build({
  entryPoints: [coreEntry],
  bundle: true,
  outfile: join(DIST, "core", "index.js"),
  format: "esm",
  platform: "node",
  target: "node22",
  minify: true,
  mangleProps: /^_/,  // Only mangle private-convention props
  keepNames: false,    // Drop function names for stronger obfuscation
  treeShaking: true,
  sourcemap: false,
  // Don't bundle node built-ins or Pi packages
  external: [
    "fs", "path", "child_process", "url", "os", "crypto", "util", "stream",
    "node:fs", "node:path", "node:child_process", "node:url", "node:os",
    "@mariozechner/*",
    "@sinclair/*",
  ],
  // Log level
  logLevel: "warning",
  metafile: true,
});

const coreSize = readFileSync(join(DIST, "core", "index.js")).length;
log(`core/index.js → ${(coreSize / 1024).toFixed(1)} KB`);

// ── Build each extension separately ──────────────────────────────────

heading("Building extensions");

const extensionResults = [];

for (const extPath of extensionFiles) {
  const name = basename(extPath, ".ts");
  const outfile = join(DIST, "extensions", `${name}.js`);

  const result = await esbuild.build({
    entryPoints: [extPath],
    bundle: true,
    outfile,
    format: "esm",
    platform: "node",
    target: "node22",
    minify: true,
    mangleProps: /^_/,
    keepNames: false,    // Drop function names for stronger obfuscation
    treeShaking: true,
    sourcemap: false,
    external: [
      // Node built-ins
      "fs", "path", "child_process", "url", "os", "crypto", "util", "stream",
      "node:fs", "node:path", "node:child_process", "node:url", "node:os",
      // Pi packages (provided by the runtime)
      "@mariozechner/*",
      "@sinclair/*",
      // Our core — loaded separately, not bundled into each extension
      "../core/index.js",
    ],
    metafile: true,
    logLevel: "warning",
  });

  const size = readFileSync(outfile).length;
  extensionResults.push({ name, size });
  log(`${name}.js → ${(size / 1024).toFixed(1)} KB`);
}

// ── Copy Pi runtime assets (themes, export-html) ────────────────────

heading("Copying Pi runtime assets");

// piDist already declared in base layer section above

// Themes — Pi reads dark.json/light.json from $PACKAGE_DIR/dist/modes/interactive/theme/
// We ship our own Soma themes (sky-blue accent) instead of Pi defaults
const somaThemes = join(ROOT, "themes");
const piThemeSrc = join(piDist, "modes", "interactive", "theme");
const themeDest = join(DIST, "modes", "interactive", "theme");
mkdirSync(themeDest, { recursive: true });
// Copy schema from Pi (needed for validation)
const schemaFile = join(piThemeSrc, "theme-schema.json");
if (existsSync(schemaFile)) cpSync(schemaFile, join(themeDest, "theme-schema.json"));
// Copy Soma themes (ours override Pi's)
if (existsSync(somaThemes)) {
  for (const f of readdirSync(somaThemes).filter(f => f.endsWith(".json"))) {
    cpSync(join(somaThemes, f), join(themeDest, f));
  }
  log(`themes ✓ Soma brand (${readdirSync(somaThemes).length} themes)`);
} else if (existsSync(piThemeSrc)) {
  // Fallback to Pi themes if Soma themes missing
  for (const f of readdirSync(piThemeSrc).filter(f => f.endsWith(".json"))) {
    cpSync(join(piThemeSrc, f), join(themeDest, f));
  }
  log(`themes ✓ Pi fallback (${readdirSync(themeDest).length} files)`);
} else {
  log("themes — not found (skipping)");
}

// Export HTML templates — Pi reads from $PACKAGE_DIR/dist/core/export-html/
const exportSrc = join(piDist, "core", "export-html");
const exportDest = join(DIST, "core", "export-html");
if (existsSync(exportSrc)) {
  cpSync(exportSrc, exportDest, { recursive: true, filter: (src) => {
    if (src.endsWith(".d.ts") || src.endsWith(".js.map") || src.endsWith(".d.ts.map")) return false;
    return true;
  }});
  const count = readdirSync(exportDest).length;
  log(`export-html ✓ (${count} files)`);
} else {
  log("export-html — not found (skipping)");
}

// ── Copy content (readable, not compiled) ────────────────────────────

// ── Apply Soma patches to Pi dist ────────────────────────────

heading("Applying Soma patches");

import { execSync } from "child_process";
const patchScript = join(ROOT, "scripts", "_dev", "patches", "apply-patches.sh");
if (existsSync(patchScript)) {
  try {
    const output = execSync(`bash "${patchScript}" "${DIST}"`, { encoding: "utf8" });
    process.stdout.write(output);
  } catch (e) {
    log(`⚠ Patch script failed: ${e.message}`);
  }
} else {
  log("No patch script found (skipping)");
}

heading("Copying content");

// System prompt template
const systemCoreSrc = join(ROOT, ".soma", "prompts", "system-core.md");
if (existsSync(systemCoreSrc)) {
  cpSync(systemCoreSrc, join(DIST, "content", "system-core.md"));
  log("system-core.md ✓");
} else {
  log("system-core.md — not found (skipping)");
}

// Bundled protocols — prefer community repo (canonical), fallback to agent .soma/
const communityProtos = join(ROOT, "..", "community", "protocols");
const agentProtos = join(ROOT, ".soma", "protocols");
const protocolsSrc = existsSync(communityProtos) ? communityProtos : agentProtos;
if (existsSync(protocolsSrc)) {
  const protocols = readdirSync(protocolsSrc)
    .filter(f => f.endsWith(".md") && !f.startsWith("_") && f !== "README.md");
  for (const p of protocols) {
    cpSync(join(protocolsSrc, p), join(DIST, "content", "protocols", p));
  }
  const source = protocolsSrc === communityProtos ? "community" : "agent .soma/";
  log(`${protocols.length} protocols ✓ (from ${source})`);
} else {
  log("protocols/ — not found in community or agent (skipping)");
}

// ── Summary ──────────────────────────────────────────────────────────

heading("Build complete");

const totalSize = coreSize + extensionResults.reduce((sum, r) => sum + r.size, 0);
log(`Total compiled: ${(totalSize / 1024).toFixed(1)} KB (${extensionResults.length} extensions + core)`);
log(`Output: ${DIST}/`);

// ── Build Manifest (integrity fingerprint) ─────────────────────────

heading("Build manifest");

function hashFile(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function walkFiles(dir, base = dir) {
  const results = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(full, base));
    } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.md'))) {
      results.push(full);
    }
  }
  return results;
}

const manifestFiles = {};
for (const f of walkFiles(DIST)) {
  const rel = relative(DIST, f);
  manifestFiles[rel] = hashFile(f);
}

// buildId = hash of all file hashes sorted + version (deterministic)
const agentVersion = (() => {
  try {
    return JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8')).version || '0.0.0';
  } catch { return '0.0.0'; }
})();
const piVersion = (() => {
  try {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'));
    return pkg.dependencies?.['@mariozechner/pi-coding-agent']?.replace('^', '') || 'unknown';
  } catch { return 'unknown'; }
})();

const sortedHashes = Object.entries(manifestFiles).sort(([a], [b]) => a.localeCompare(b)).map(([, h]) => h).join('');
const buildId = createHash('sha256').update(sortedHashes + agentVersion).digest('hex').slice(0, 16);

const manifest = {
  version: agentVersion,
  buildId,
  buildDate: new Date().toISOString(),
  piVersion,
  fileCount: Object.keys(manifestFiles).length,
  files: manifestFiles,
};

writeFileSync(join(DIST, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
log(`manifest.json → buildId: ${buildId} (${Object.keys(manifestFiles).length} files, v${agentVersion})`);

if (VERIFY) {
  heading("Verification");
  // Quick check: all expected files exist
  let ok = true;
  const expectedCore = join(DIST, "core", "index.js");
  if (!existsSync(expectedCore)) {
    log(`✗ Missing: core/index.js`);
    ok = false;
  }
  for (const ext of extensionFiles) {
    const name = basename(ext, ".ts");
    const compiled = join(DIST, "extensions", `${name}.js`);
    if (!existsSync(compiled)) {
      log(`✗ Missing: extensions/${name}.js`);
      ok = false;
    }
  }
  if (ok) {
    log("✓ All expected files present");
  }

  // Check that no .ts files leaked into dist
  const checkForTs = (dir) => {
    if (!existsSync(dir)) return;
    for (const f of readdirSync(dir, { recursive: true })) {
      if (String(f).endsWith(".ts")) {
        log(`✗ TypeScript file in dist: ${f}`);
        ok = false;
      }
    }
  };
  checkForTs(join(DIST, "core"));
  checkForTs(join(DIST, "extensions"));

  if (ok) {
    log("✓ No TypeScript source in dist/");
  }

  // Check no source maps
  const checkForMaps = (dir) => {
    if (!existsSync(dir)) return;
    for (const f of readdirSync(dir, { recursive: true })) {
      if (String(f).endsWith(".map")) {
        log(`✗ Source map in dist: ${f}`);
        ok = false;
      }
    }
  };
  checkForMaps(DIST);

  if (ok) {
    log("✓ No source maps in dist/");
  }

  // Security audit — check for leaked source, private paths, somaverse extensions
  heading("Security audit");

  // No .ts source files in dist (would leak proprietary code)
  const tsInDist = walkFiles(DIST).filter(f => f.endsWith('.ts'));
  if (tsInDist.length > 0) {
    log(`✗ TypeScript source leaked: ${tsInDist.map(f => relative(DIST, f)).join(', ')}`);
    ok = false;
  } else {
    log("✓ No TypeScript source in dist/");
  }

  // No non-soma extensions in dist/extensions/ (somaverse extensions should NOT ship)
  const distExts = existsSync(join(DIST, 'extensions')) ? readdirSync(join(DIST, 'extensions')) : [];
  const nonSomaExts = distExts.filter(f => f.endsWith('.js') && !f.startsWith('soma-'));
  if (nonSomaExts.length > 0) {
    log(`✗ Non-soma extensions in dist: ${nonSomaExts.join(', ')}`);
    ok = false;
  } else {
    log("✓ No somaverse extensions leaked to dist/");
  }

  // No private paths in readable content
  const readableFiles = walkFiles(DIST).filter(f => f.endsWith('.md') || f.endsWith('.json'));
  const privatePatterns = [/Gravicity/i, /curtismercier/i, /\/Users\/user/];
  const privateHits = [];
  for (const f of readableFiles) {
    if (basename(f) === 'manifest.json') continue; // manifest is generated, skip
    const content = readFileSync(f, 'utf-8');
    for (const pat of privatePatterns) {
      if (pat.test(content)) {
        // Allow author attribution (spec-ref, author lines)
        const lines = content.split('\n').filter(l => pat.test(l));
        const nonAttribution = lines.filter(l => !l.includes('spec-ref') && !l.includes('author') && !l.includes('Attribution'));
        if (nonAttribution.length > 0) {
          privateHits.push(`${relative(DIST, f)}: ${nonAttribution[0].trim().slice(0, 60)}`);
        }
      }
    }
  }
  if (privateHits.length > 0) {
    log(`⚠ Private paths in readable files (${privateHits.length}):`);
    for (const h of privateHits.slice(0, 5)) log(`    ${h}`);
    // Warning, not failure — some attribution references are intentional
  } else {
    log("✓ No private paths in readable content");
  }

  log(`\n✓ Build manifest: ${buildId}`);

  if (ok) {
    log("✓ All verification + security checks passed");
  } else {
    log("\n✗ Verification failed");
    process.exit(1);
  }
}
