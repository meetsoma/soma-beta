#!/usr/bin/env node
/**
 * verify-dist.mjs — Verify compiled extensions can be imported
 *
 * Tests that:
 * 1. All dist/ files exist and are non-empty
 * 2. Each compiled extension exports a default function (factory)
 * 3. Core bundle exports expected functions
 * 4. No source maps or .ts files in dist/
 */

import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createJiti } from "@mariozechner/jiti";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DIST = join(ROOT, "dist");

let passed = 0;
let failed = 0;

function ok(msg) {
  passed++;
  console.log(`  ✓ ${msg}`);
}
function fail(msg) {
  failed++;
  console.log(`  ✗ ${msg}`);
}

// ── File existence checks ────────────────────────────────────────────

console.log("\n═══ File Checks ═══");

const coreFile = join(DIST, "core", "index.js");
if (existsSync(coreFile) && statSync(coreFile).size > 0) {
  ok(`core/index.js exists (${(statSync(coreFile).size / 1024).toFixed(1)} KB)`);
} else {
  fail("core/index.js missing or empty");
}

const expectedExtensions = [
  "soma-boot", "soma-breathe", "soma-guard", "soma-header",
  "soma-route", "soma-scratch", "soma-statusline"
];

for (const name of expectedExtensions) {
  const f = join(DIST, "extensions", `${name}.js`);
  if (existsSync(f) && statSync(f).size > 0) {
    ok(`extensions/${name}.js exists (${(statSync(f).size / 1024).toFixed(1)} KB)`);
  } else {
    fail(`extensions/${name}.js missing or empty`);
  }
}

// ── Import checks ────────────────────────────────────────────────────

console.log("\n═══ Import Checks ═══");

// Core bundle
try {
  const core = await import(join(DIST, "core", "index.js"));
  const expectedExports = ["findSomaDir", "loadSettings", "getSomaChain", "compileFrontalCortex"];
  for (const exp of expectedExports) {
    if (typeof core[exp] === "function") {
      ok(`core exports ${exp}()`);
    } else {
      fail(`core missing export: ${exp}`);
    }
  }
} catch (err) {
  fail(`core import failed: ${err.message}`);
}

// Extensions (each should export a default function)
// We can't fully test because they need Pi's ExtensionAPI, but we can check the export
for (const name of expectedExtensions) {
  const extPath = join(DIST, "extensions", `${name}.js`);
  try {
    // Read and check it has a default export pattern
    const content = readFileSync(extPath, "utf-8");
    // esbuild ESM format uses `export default` or `export{...as default}`
    if (content.includes("export default") || content.includes("as default")) {
      ok(`${name}.js has default export`);
    } else {
      // Some minified forms use different patterns — check for export at end
      fail(`${name}.js — can't find default export pattern`);
    }
  } catch (err) {
    fail(`${name}.js read failed: ${err.message}`);
  }
}

// ── Contamination checks ─────────────────────────────────────────────

console.log("\n═══ Contamination Checks ═══");

const checkDir = (dir, label) => {
  if (!existsSync(dir)) return;
  const files = readdirSync(dir);
  const tsFiles = files.filter(f => f.endsWith(".ts"));
  const mapFiles = files.filter(f => f.endsWith(".map"));
  
  if (tsFiles.length === 0) {
    ok(`No .ts files in ${label}`);
  } else {
    fail(`${tsFiles.length} .ts files in ${label}: ${tsFiles.join(", ")}`);
  }
  
  if (mapFiles.length === 0) {
    ok(`No .map files in ${label}`);
  } else {
    fail(`${mapFiles.length} .map files in ${label}: ${mapFiles.join(", ")}`);
  }
};

checkDir(join(DIST, "core"), "dist/core/");
checkDir(join(DIST, "extensions"), "dist/extensions/");

// ── Size comparison ──────────────────────────────────────────────────

console.log("\n═══ Size Comparison ═══");

let totalSource = 0;
let totalCompiled = 0;

for (const name of expectedExtensions) {
  const srcFile = join(ROOT, "extensions", `${name}.ts`);
  const distFile = join(DIST, "extensions", `${name}.js`);
  if (existsSync(srcFile) && existsSync(distFile)) {
    const srcSize = statSync(srcFile).size;
    const distSize = statSync(distFile).size;
    totalSource += srcSize;
    totalCompiled += distSize;
  }
}

// Core
const coreSrcFiles = readdirSync(join(ROOT, "core")).filter(f => f.endsWith(".ts"));
for (const f of coreSrcFiles) {
  totalSource += statSync(join(ROOT, "core", f)).size;
}
totalCompiled += statSync(coreFile).size;

const ratio = ((totalCompiled / totalSource) * 100).toFixed(1);
console.log(`  Source: ${(totalSource / 1024).toFixed(1)} KB`);
console.log(`  Compiled: ${(totalCompiled / 1024).toFixed(1)} KB`);
console.log(`  Ratio: ${ratio}% of source size`);

// ── Results ──────────────────────────────────────────────────────────

console.log(`\n═══ Results: ${passed}/${passed + failed} passed, ${failed} failed ═══`);
if (failed > 0) process.exit(1);
