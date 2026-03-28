#!/usr/bin/env node
/**
 * postinstall.js — runs after `npm install -g meetsoma`
 *
 * If we're in an interactive terminal, launch the welcome/setup flow.
 * If not (CI, piped, scripts), just print a short message.
 */

import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { execFileSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));

if (process.stdin.isTTY && process.stdout.isTTY) {
  // Interactive — run the full welcome + setup
  try {
    execFileSync("node", [join(__dirname, "thin-cli.js")], {
      stdio: "inherit",
      cwd: process.env.HOME || process.env.USERPROFILE || process.cwd(),
    });
  } catch {
    // Non-zero exit is fine (user ctrl+c, etc.)
  }
} else {
  // Non-interactive — just tell them what to do
  console.log("");
  console.log("  ✓ Soma installed. Run \x1b[32msoma\x1b[0m to get started.");
  console.log("");
}
