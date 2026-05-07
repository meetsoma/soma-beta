#!/usr/bin/env node
/**
 * Soma — Thin CLI
 *
 * The public face of Soma on npm. Routes to modular commands.
 * For new users, this IS the first impression.
 * For returning users: detects installed runtime → delegates to it.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, readlinkSync } from "fs";
import { join, dirname } from "path";
import { homedir, platform } from "os";
import { fileURLToPath } from "url";
import { execSync, execFileSync } from "child_process";
import { randomBytes, createHash } from "crypto";
import { soma as voice } from "./personality.js";

// ── Shared modules ─────────────────────────────────────────────────────
import { bold, dim, italic, cyan, green, yellow, red, magenta, white,
         printSigma, typeOut, typeParagraph, wrapText,
         waitForKey, confirm, confirmYN, readLine, readSecret } from "./lib/display.js";
import { SOMA_HOME, CONFIG_PATH, CORE_DIR, SITE_URL, readConfig, writeConfig } from "./lib/config.js";
import { isInstalled, getAgentVersion, getProjectVersion, getCliVersion,
         hasAnyAuth, getShellConfigPath, getShellConfigAbsPath, detectKeyInShellConfig,
         openBrowser, hasGitHubCLI, getGitHubUsername,
         getVersionSnapshot, semverCmp as semverCmpDetect, detectDevInstall as detectDevInstallDetect } from "./lib/detect.js";
import { handleQuestion, interactiveQ, CONCEPTS, getConceptIndex, getConceptBody } from "./welcome/qa.js";
import { apiKeySetup, apiKeyExplain, apiKeyGetOne, apiKeyEntry, oauthGuide } from "./welcome/auth.js";
import { showAbout } from "./welcome/about.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
// __CLI_VERSION__ is replaced at bundle/copy time:
//   - soma-npm-publish.sh esbuild --define injects the literal for the npm tarball
//   - scripts/build-dist.mjs string-substitutes when copying to dist/ for dev
// Fallback: read npm/package.json (works when thin-cli.js runs in-place in repos/agent/npm/).
const __CLI_VERSION__ = "__CLI_VERSION__";
function resolveCliVersion() {
  if (!__CLI_VERSION__.startsWith("__")) return __CLI_VERSION__;
  // Dev fallback — try npm/package.json next to this file, then one up.
  const candidates = [
    join(__dirname, "package.json"),
    join(__dirname, "..", "package.json"),
    join(__dirname, "..", "npm", "package.json"),
  ];
  for (const p of candidates) {
    try {
      const pkg = JSON.parse(readFileSync(p, "utf-8"));
      if (pkg.name === "meetsoma") return pkg.version;
    } catch {}
  }
  return "unknown";
}
const VERSION = resolveCliVersion();

// semverCmp + detectDevInstall now live in lib/detect.js — re-export locally
// for any callers outside this module that import from thin-cli.
const semverCmp = semverCmpDetect;
const detectDevInstall = detectDevInstallDetect;

// ── Welcome / First Run ─────────────────────────────────────────────

async function showWelcome() {
  printSigma();
  console.log(`  ${bold("Soma")} ${dim("—")} ${white("the AI agent that remembers")}`);
  console.log("");

  if (isInstalled()) {
    const ghUser = hasGitHubCLI() ? getGitHubUsername() : null;
    if (ghUser) {
      console.log(`  ${green("✓")} ${voice.greetBack(ghUser)}`);
    }

    if (!hasAnyAuth()) {
      console.log(`  ${green("✓")} Core installed`);
      console.log("");

      const unloadedKey = detectKeyInShellConfig();
      if (unloadedKey) {
        console.log(`  ${yellow("!")} Found ${bold(unloadedKey)} in ${dim(getShellConfigPath())} but it's not loaded.`);
        console.log(`  ${dim("Restart your terminal and run")} ${green("soma")} ${dim("again.")}`);
        console.log("");
        return;
      }

      await apiKeySetup();

      if (!hasAnyAuth() && !process.env.ANTHROPIC_API_KEY && !process.env._SOMA_OAUTH_PENDING) {
        console.log(`  ${dim("No worries.")} ${voice.spin("{Come back when you're ready.|Set up a key and run soma again.|We'll be here.}")}`);
        console.log("");
        console.log(`  ${dim(`v${VERSION} · BSL 1.1 · soma.gravicity.ai`)}`);
        console.log("");
        return;
      }
    } else {
      console.log(`  ${green("✓")} Core installed. Starting Soma...`);
    }
    console.log("");
    await delegateToCore();
    return;
  }

  // ── Not installed — first time ever ────────────────────────────────
  await typeOut(`  ${voice.greet()}\n`);
  console.log("");
  await typeParagraph("Soma is an AI coding agent that remembers across sessions. It learns your patterns, builds its own tools, and picks up where it left off.");
  console.log("");
  console.log(`  ${dim("─".repeat(58))}`);
  console.log("");
  console.log(`  ${dim("→")} Press ${green("Enter")} to set up, or type a question.`);
  console.log("");

  const input = await readLine(`  ${dim("→")} `);

  if (input && input !== "") {
    await handleQuestion(input);
    await interactiveQ();
  }

  await initSoma();

  if (isInstalled() && !hasAnyAuth()) {
    await apiKeySetup();
  }

  if (isInstalled() && (hasAnyAuth() || process.env.ANTHROPIC_API_KEY || process.env._SOMA_OAUTH_PENDING)) {
    console.log(`  ${dim("─".repeat(58))}`);
    console.log("");
    const launch = await confirmYN(`  ${voice.spin("{Ready to go?|Want to start your first session?|Launch Soma?}")}`);
    if (launch) {
      console.log("");
      await delegateToCore();
      return;
    }
  }

  console.log("");
  console.log(`  ${dim(`v${VERSION} · BSL 1.1 · soma.gravicity.ai`)}`);
  console.log("");
}

// ── Help ─────────────────────────────────────────────────────────────

function showHelp() {
  printSigma();
  console.log(`  ${bold("Soma")} v${VERSION}`);
  console.log("");
  console.log("  Usage: soma [command] [options]");
  console.log("");
  console.log(`  ${bold("Getting Started")}`);
  console.log(`    ${green("soma")}                   See what Soma is about`);
  console.log(`    ${green("soma init")}              Install the Soma runtime `);
  console.log(`    ${green("soma about")}             Learn more about how Soma works`);
  console.log("");
  console.log(`  ${bold("After Install")}`);
  console.log(`    ${green("soma")}                   Start a session`);
  console.log(`    ${green("soma focus <keyword>")}   Start a focused session`);
  console.log(`    ${green("soma inhale")}            Resume from last session's preload`);
  console.log(`    ${green("soma inhale <name>")}     Load a specific preload by name`);
  console.log(`    ${green("soma inhale --list")}     Show available preloads`);
  console.log(`    ${green("soma map <name>")}        Load a specific workflow (MAP)`);
  console.log(`    ${green("soma map --list")}        Show available MAPs`);
  console.log("");
  console.log(`  ${bold("Maintenance")}`);
  console.log(`    ${green("soma doctor")}            Verify installation + project health`);
  console.log(`    ${green("soma update")}            Update the Soma runtime ${dim("(--yes / -y to skip prompt)")}`);
  console.log(`    ${green("soma check-updates")}     Check for updates without installing`);
  console.log(`    ${green("soma status")}            Show installation status`);
  console.log("");
  console.log(`  ${bold("Options")}`);
  console.log(`    ${dim("--version, -v")}          Show version`);
  console.log(`    ${dim("--help, -h")}             Show this help`);
  console.log("");
  console.log(`  ${dim(SITE_URL)}`);
  console.log("");
}

function showVersion() {
  const agentV = getAgentVersion();
  if (agentV) {
    console.log(`σ  Soma v${agentV}`);
    console.log(`   CLI v${VERSION}`);
  } else {
    console.log(`soma v${VERSION}`);
  }
}

// ── Init Soma ────────────────────────────────────────────────────────

async function initSoma() {
  printSigma();
  console.log(`  ${bold("Soma")} — Install`);
  console.log("");

  try {
    execSync("git --version", { stdio: "ignore" });
  } catch {
    console.log(`  ${red("✗")} git not found.`);
    console.log("");
    console.log(`  Soma needs git to download the runtime.`);
    console.log(`  Install git: ${cyan("https://git-scm.com/downloads")}`);
    console.log("");
    return;
  }

  const installDir = join(SOMA_HOME, "agent");
  mkdirSync(SOMA_HOME, { recursive: true });

  const isValidInstall = existsSync(installDir) 
    && existsSync(join(installDir, ".git"))
    && (existsSync(join(installDir, "dist", "extensions")) || existsSync(join(installDir, "extensions")));

  let preservedFiles = {};

  if (existsSync(installDir) && !isValidInstall) {
    console.log(`  ${yellow("⚠")} Incomplete installation detected.`);
    console.log(`    ${dim("Missing:")} ${!existsSync(join(installDir, ".git")) ? "git repo" : "core files"}`);
    console.log("");

    const userFileNames = ["auth.json", "models.json"];
    for (const f of userFileNames) {
      const fp = join(installDir, f);
      if (existsSync(fp)) {
        try {
          preservedFiles[f] = readFileSync(fp, "utf-8");
          console.log(`  ${dim("→")} Preserving ${f}`);
        } catch {}
      }
    }

    // Preserve user-installed extensions (non-soma-* files)
    const extDir = join(installDir, "extensions");
    if (existsSync(extDir)) {
      try {
        for (const f of readdirSync(extDir).filter(f => !f.startsWith("soma-") && (f.endsWith(".ts") || f.endsWith(".js")))) {
          const fp = join(extDir, f);
          try {
            preservedFiles[`extensions/${f}`] = readFileSync(fp, "utf-8");
            console.log(`  ${dim("→")} Preserving extension: ${f}`);
          } catch {}
        }
      } catch {}
    }

    const hasGit = existsSync(join(installDir, ".git"));
    let repaired = false;

    if (hasGit) {
      console.log(`  ${yellow("⏳")} Repairing...`);
      try {
        execSync("git fetch origin", { cwd: installDir, stdio: "ignore", timeout: 30000 });
        execSync("git reset --hard origin/main", { cwd: installDir, stdio: "ignore" });
        console.log(`  ${green("✓")} Repaired from remote`);
        repaired = true;
      } catch {
        console.log(`  ${yellow("!")} Repair failed — will re-download.`);
      }
    }

    if (!repaired) {
      const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const backup = join(SOMA_HOME, `agent-backup-${ts}`);
      try {
        execSync(`mv "${installDir}" "${backup}"`, { stdio: "ignore" });
        console.log(`  ${dim("Old files saved to")} ${dim(backup.replace(homedir(), "~"))}`);
      } catch {
        console.log(`  ${red("✗")} Could not move old installation aside.`);
        console.log(`  ${dim("Try:")} mv ~/.soma/agent ~/.soma/agent-old && soma init`);
        console.log("");
        return;
      }
    }
  }

  if (isValidInstall) {
    console.log(`  ${dim("→")} Runtime already installed.`);
    try {
      console.log(`  ${yellow("⏳")} Checking for updates...`);
      execSync("git pull --ff-only", { cwd: installDir, stdio: "ignore" });
      console.log(`  ${green("✓")} Up to date`);
    } catch {
      console.log(`  ${green("✓")} Already current`);
    }
  } else {
    console.log(`  ${yellow("⏳")} Downloading Soma runtime...`);
    try {
      execSync(
        `git clone --depth 1 https://github.com/meetsoma/soma-beta.git "${installDir}"`,
        { stdio: ["ignore", "ignore", "pipe"] }
      );
      console.log(`  ${green("✓")} Runtime downloaded`);
    } catch (err) {
      console.log(`  ${red("✗")} Download failed.`);
      console.log(`  ${dim(String(err.stderr || err.message))}`);
      console.log("");
      console.log(`  ${dim("Try manually:")} git clone https://github.com/meetsoma/soma-beta.git ~/.soma/agent`);
      console.log("");
      return;
    }
  }

  const pkgJson = join(installDir, "package.json");
  if (existsSync(pkgJson)) {
    console.log(`  ${yellow("⏳")} Installing dependencies... ${dim("(this may take a moment)")}`);
    try {
      execSync("npm install --omit=dev", { cwd: installDir, stdio: ["ignore", "ignore", "inherit"] });
      console.log(`  ${green("✓")} Dependencies installed`);
    } catch {
      console.log(`  ${yellow("⚠")} npm install had issues — run ${green(`cd ${installDir} && npm install`)} manually.`);
    }
  }

  if (Object.keys(preservedFiles).length > 0) {
    for (const [f, content] of Object.entries(preservedFiles)) {
      try {
        writeFileSync(join(installDir, f), content, { mode: 0o600 });
        console.log(`  ${green("✓")} Restored ${f}`);
      } catch {}
    }
  }

  const hasExts = existsSync(join(installDir, "dist", "extensions"));
  const hasCore = existsSync(join(installDir, "dist", "core"));

  if (!hasExts || !hasCore) {
    console.log("");
    console.log(`  ${red("✗")} Installation incomplete — core files missing.`);
    console.log(`  ${dim("Try:")} rm -rf ~/.soma/agent && soma init`);
    console.log("");
    return;
  }

  console.log(`  ${green("✓")} Extensions and core ready`);

  const config = readConfig();
  config.installedAt = config.installedAt || new Date().toISOString();
  config.coreVersion = getAgentVersion() || VERSION;
  config.installPath = installDir;
  writeConfig(config);

  console.log("");
  console.log(`  ${green("✓")} ${bold("Soma is installed!")}`);
  console.log("");
}

// ── Update / Status ──────────────────────────────────────────────────

async function checkAndUpdate() {
  if (!isInstalled()) {
    printSigma();
    console.log(`  ${bold("Soma")} — Update`);
    console.log("");
    console.log(`  ${yellow("⚠")} Soma is not installed yet.`);
    console.log(`  Run ${green("soma init")} to install, then ${green("soma update")} to update.`);
    console.log("");
    return;
  }

  printSigma();
  console.log(`  ${bold("Soma")} — Update`);
  console.log("");

  const config = readConfig();
  const installPath = config.installPath || join(SOMA_HOME, "agent");

  let currentHash = "";
  try {
    currentHash = execSync("git rev-parse --short HEAD", {
      cwd: installPath, encoding: "utf-8"
    }).trim();
    console.log(`  ${green("✓")} Core installed ${dim(`(${currentHash})`)}`);
  } catch {
    console.log(`  ${green("✓")} Core installed`);
  }

  // SX-715 (s01-4d36c6): auto-detect github.com remote name. Users have
  // 'origin' (soma-beta clone); dogfood worktrees may have 'meetsoma'
  // (soma-agent). Hardcoding 'origin' silently failed for dogfood installs.
  let remoteName = "origin";
  try {
    const remotes = execSync("git remote -v", { cwd: installPath, encoding: "utf-8" });
    const m = remotes.match(/^(\w+)\s+https:\/\/github\.com\/.*\(fetch\)/m);
    if (m) remoteName = m[1];
  } catch {}

  let behind = 0;
  let branch = "main";
  try {
    console.log(`  ${yellow("⏳")} Checking for updates...`);
    execSync(`git fetch ${remoteName} --quiet`, { cwd: installPath, stdio: "ignore", timeout: 15000 });
    branch = execSync("git rev-parse --abbrev-ref HEAD", {
      cwd: installPath, encoding: "utf-8"
    }).trim();
    const behindStr = execSync(
      `git rev-list HEAD..${remoteName}/${branch} --count`,
      { cwd: installPath, encoding: "utf-8" }
    ).trim();
    behind = parseInt(behindStr) || 0;
  } catch (err) {
    const errMsg = (err.stderr ? err.stderr.toString() : err.message || "").split("\n")[0];
    console.log(`  ${dim("Could not check for updates:")} ${dim(errMsg || "unknown error")}`);
    console.log("");
    return;
  }

  if (behind === 0) {
    console.log(`  ${green("✓")} Already up to date.`);

    const agentV = getAgentVersion();
    const projectV = getProjectVersion();
    if (agentV && projectV && semverCmp(projectV, agentV) < 0) {
      console.log(`  ${yellow("⚠")} Project .soma/ is at ${cyan(`v${projectV}`)}, agent is at ${cyan(`v${agentV}`)}.`);
      console.log(`  Run ${green("soma doctor")} to check for updates.`);
    }

    console.log("");
    console.log(`  ${dim("Soma is set up and ready.")} Run ${green("soma")} ${dim("in a project to start a session.")}`);
    console.log("");
    return;
  }

  console.log(`  ${cyan("⬆")} ${bold(`${behind} update${behind !== 1 ? "s" : ""} available.`)}`);
  console.log("");

  try {
    const log = execSync(
      `git log HEAD..${remoteName}/${branch} --oneline --no-decorate -5`,
      { cwd: installPath, encoding: "utf-8" }
    ).trim();
    if (log) {
      for (const line of log.split("\n")) {
        console.log(`    ${dim("•")} ${line.slice(8)}`);
      }
      if (behind > 5) {
        console.log(`    ${dim(`...and ${behind - 5} more`)}`);
      }
      console.log("");
    }
  } catch {}

  // Scripted upgrade: --yes / -y skips the Y/N prompt. Useful in CI and
  // for the 'npm install -g meetsoma@latest && soma update --yes' one-liner.
  const autoYes = process.argv.includes("--yes") || process.argv.includes("-y");
  const shouldUpdate = autoYes ? true : await confirmYN(`  ${dim("→")} Update now?`);
  if (!shouldUpdate) {
    console.log("");
    console.log(`  ${dim("Skipped. Run")} ${green("soma update")} ${dim("anytime to update.")}`);
    console.log("");
    return;
  }
  if (autoYes) {
    console.log(`  ${dim("→")} Auto-confirmed via --yes`);
  }

  console.log("");
  try {
    execSync("git pull --ff-only", { cwd: installPath, stdio: "ignore" });
    console.log(`  ${green("✓")} Updated`);
  } catch {
    console.log(`  ${yellow("!")} Pull failed — trying reset...`);
    try {
      execSync("git reset --hard origin/main", { cwd: installPath, stdio: "ignore" });
      console.log(`  ${green("✓")} Updated (reset)`);
    } catch {
      console.log(`  ${red("✗")} Update failed.`);
      console.log(`  ${dim("Try:")} cd ~/.soma/agent && git pull`);
      console.log("");
      return;
    }
  }

  try {
    const pkgChanged = execSync(
      `git diff HEAD~${behind} HEAD --name-only -- package.json package-lock.json`,
      { cwd: installPath, encoding: "utf-8" }
    ).trim();
    if (pkgChanged) {
      console.log(`  ${yellow("⏳")} Updating dependencies...`);
      execSync("npm install --omit=dev", { cwd: installPath, stdio: ["ignore", "ignore", "inherit"] });
      console.log(`  ${green("✓")} Dependencies updated`);
    }
  } catch {}

  const newHash = execSync("git rev-parse --short HEAD", {
    cwd: installPath, encoding: "utf-8"
  }).trim();

  // Clear the "update available" flag set by soma-statusline.ts periodic check.
  // Next `soma` boot won't print the notice until the next release.
  try {
    const cfg = readConfig();
    if (cfg.updateAvailable) {
      delete cfg.updateAvailable;
      delete cfg.latestSummary;
      writeConfig(cfg);
    }
  } catch {}

  console.log("");
  console.log(`  ${green("✓")} ${bold("Soma is up to date")} ${dim(`(${currentHash} → ${newHash})`)}`);
  console.log("");
}

// Detect whether the currently-running `soma` is a dev symlink (to a
// repos/agent path) rather than an npm-managed bin. Returns the symlink
// target when dev, else null. Used to guide updates correctly — npm
// install -g meetsoma fails with EEXIST on a manual symlink.
// Three-layer update check: CLI + agent runtime + workspace marker.
// Backed by getVersionSnapshot() in lib/detect.js — single source of truth
// for update, doctor, and status flows.
function checkForUpdates() {
  if (!isInstalled()) {
    printSigma();
    console.log(`  ${bold("Soma")} — Update Check`);
    console.log("");
    console.log(`  ${yellow("⚠")} Soma is not installed yet.`);
    console.log(`  Run ${green("soma init")} to install it first.`);
    console.log("");
    return;
  }

  printSigma();
  console.log(`  ${bold("Soma")} — Update Check`);
  console.log("");
  // Voiced intro — context-aware (aligned vs drift), time-shaded
  const snap = getVersionSnapshot();
  const intro = snap.allAligned
    ? voice.say("version_aligned")
    : voice.say("version_check");
  console.log(`  ${dim(intro)}`);
  console.log("");
  const row = (label, local, remote, status) => {
    const v = local ? `v${local}` : dim("—");
    let tail = "";
    if (status === "aligned")   tail = `  ${green("✓")} latest on npm`;
    else if (status === "dev-ahead") tail = `  ${green("✓")} dev-ahead ${dim(`(npm: v${remote})`)}`;
    else if (status === "stale")     tail = `  ${yellow("⬆")} stale ${dim(`(npm: v${remote})`)}`;
    else if (status === "marker-lag") tail = `  ${yellow("⬆")} marker lag ${dim("— run `soma doctor` to advance")}`;
    else if (status === "no-workspace") tail = `  ${dim("— no .soma/ in cwd")}`;
    else if (status === "not-installed") tail = `  ${red("✗")} not installed`;
    else tail = `  ${dim("— unknown")}`;
    console.log(`  ${label.padEnd(26)}${cyan(v.padEnd(12))}${tail}`);
  };

  row("CLI (meetsoma)",       snap.cli.local,       snap.cli.remote,   snap.cli.status);
  row("Agent (soma-agent)",   snap.agent.local,     snap.agent.remote, snap.agent.status);
  row("Workspace (.soma)",    snap.workspace.local, null,              snap.workspace.status);

  // Core repo lag (dev installs only — stable installs have no git repo at CORE_DIR)
  if (snap.coreRepo && snap.coreRepo.behind > 0) {
    console.log(`  ${yellow("⬆")} Core repo: ${snap.coreRepo.behind} commit${snap.coreRepo.behind !== 1 ? "s" : ""} behind origin`);
  } else if (snap.coreRepo) {
    console.log(`  ${green("✓")} Core repo in sync with origin`);
  }

  // Recovery guidance per drifted layer
  console.log("");
  if (snap.allAligned) {
    console.log(`  ${green("✓")} ${voice.say("version_aligned")}`);
  } else {
    console.log(`  ${dim(voice.say("version_drift"))}`);
    console.log("");
    const hints = [];
    if (snap.cli.status === "stale") {
      if (snap.devInstall) {
        hints.push(`${yellow("→")} CLI stale: ${dim("switch to stable first:")} ${green("soma-install.sh stable")} ${dim("→ then")} ${green("npm i -g meetsoma")}`);
      } else {
        hints.push(`${yellow("→")} CLI stale: run ${green("npm i -g meetsoma")}`);
      }
    }
    if (snap.agent.status === "stale") {
      hints.push(`${yellow("→")} Agent stale: run ${green("soma update")} ${dim("(or")} ${green("soma-install.sh stable")}${dim(")")}`);
    }
    if (snap.workspace.status === "marker-lag") {
      hints.push(`${yellow("→")} Workspace marker behind agent: run ${green("soma doctor")}`);
    }
    if (snap.coreRepo && snap.coreRepo.behind > 0) {
      hints.push(`${yellow("→")} Core repo behind: run ${green("soma update")} (or git pull in ${dim("~/.soma/agent/")})`);
    }
    if (hints.length === 0) {
      hints.push(`${green("✓")} Nothing to do.`);
    }
    hints.forEach(h => console.log(`  ${h}`));
  }
  console.log("");
}

// ── Health Check ─────────────────────────────────────────────────────

async function healthCheck() {
  if (!isInstalled()) {
    printSigma();
    console.log(`  ${bold("Soma")} — Health Check`);
    console.log("");
    console.log(`  ${yellow("⚠")} Soma is not installed yet.`);
    console.log(`  Run ${green("soma init")} to install, then ${green("soma status")} to check health.`);
    console.log("");
    return;
  }

  printSigma();
  console.log(`  ${bold("Soma")} — Health Check`);
  console.log("");

  let issues = 0;
  let warnings = 0;
  const check = (ok, pass, fail_msg) => {
    if (ok) { console.log(`  ${green("✓")} ${pass}`); }
    else { console.log(`  ${red("✗")} ${fail_msg}`); issues++; }
  };
  const warn = (ok, pass, fail_msg) => {
    if (ok) { console.log(`  ${green("✓")} ${pass}`); }
    else { console.log(`  ${yellow("⚠")} ${fail_msg}`); warnings++; }
  };

  const nodeVersion = process.versions.node;
  const [major, minor] = nodeVersion.split(".").map(Number);
  check(major > 20 || (major === 20 && minor >= 6),
    `Node.js ${nodeVersion}`,
    `Node.js ${nodeVersion} — requires ≥20.6.0`
  );

  check(existsSync(SOMA_HOME), "~/.soma/ exists", "~/.soma/ not found — run: soma init");

  const installed = isInstalled();
  check(installed, "Core installed", "Core not installed — run: soma init");

  if (installed) {
    const extDir = existsSync(join(CORE_DIR, "dist", "extensions"))
      ? join(CORE_DIR, "dist", "extensions")
      : join(CORE_DIR, "extensions");
    if (existsSync(extDir)) {
      const exts = readdirSync(extDir).filter(f => f.endsWith(".js") || f.endsWith(".ts"));
      check(exts.length >= 6, `${exts.length} extensions`, `Only ${exts.length} extensions (expected ≥6)`);
    }

    const coreDir = existsSync(join(CORE_DIR, "dist", "core"))
      ? join(CORE_DIR, "dist", "core")
      : join(CORE_DIR, "core");
    check(existsSync(coreDir), "Core modules present", "Core modules missing");

    if (existsSync(join(CORE_DIR, ".git"))) {
      try {
        execSync("git status --porcelain", { cwd: CORE_DIR, stdio: "ignore" });
        check(true, "Git repo healthy", "");
      } catch {
        warn(false, "", "Core git repo has issues");
      }
    } else {
      try {
        const realCore = readlinkSync(join(CORE_DIR, "core"));
        if (realCore) {
          check(true, "Dev mode (symlinked)", "");
        } else {
          warn(false, "", "Core git repo missing — run soma init");
        }
      } catch {
        warn(false, "", "Core git repo missing — run soma init");
      }
    }
  }

  // Pi runtime drift — compare declared (package.json) vs BUNDLED (dist/manifest.json).
  // The bundled copy in dist/ is what actually executes. node_modules in
  // CORE_DIR can go stale (never re-installed) while dist/ stays current via
  // build-dist.mjs. Pre-SX-604 this read from node_modules and mis-reported
  // Pi versions for every dev install. See ../../.soma/releases/v0.22.x/v0.22.0/.
  if (installed) {
    try {
      const pkgPath = join(CORE_DIR, "package.json");
      if (existsSync(pkgPath)) {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
        const declaredPi = (pkg.dependencies || {})["@mariozechner/pi-coding-agent"];
        const declaredClean = (declaredPi || "").replace(/^[\^~]/, "");

        // Authoritative: what Pi version is in dist/ (the one that actually runs)?
        let bundledPi = null;
        let bundledSource = null;
        const manifestPath = join(CORE_DIR, "dist", "manifest.json");
        if (existsSync(manifestPath)) {
          try {
            const m = JSON.parse(readFileSync(manifestPath, "utf-8"));
            if (m.piVersion) { bundledPi = m.piVersion; bundledSource = "dist/manifest.json"; }
          } catch {}
        }
        // Fallback: node_modules (stale-prone, warn if we had to use it).
        let fallbackUsed = false;
        if (!bundledPi) {
          const piPkgPath = join(CORE_DIR, "node_modules", "@mariozechner", "pi-coding-agent", "package.json");
          if (existsSync(piPkgPath)) {
            try {
              bundledPi = JSON.parse(readFileSync(piPkgPath, "utf-8")).version;
              bundledSource = "node_modules (fallback — dist/manifest.json missing)";
              fallbackUsed = true;
            } catch {}
          }
        }

        if (!bundledPi) {
          console.log(`  ${yellow("⚠")} Pi not found — run ${green("soma update")}`);
          warnings++;
        } else if (declaredClean && declaredClean !== bundledPi) {
          console.log(`  ${yellow("⚠")} Pi runtime drift: declared ${cyan(declaredClean)}, bundled ${cyan(bundledPi)}`);
          console.log(`    ${dim("Fix:")} ${green("soma update")}${fallbackUsed ? dim(" (also rebuild dist: node scripts/build-dist.mjs --clean)") : ""}`);
          warnings++;
        } else {
          const suffix = fallbackUsed ? dim(" (via node_modules fallback)") : "";
          console.log(`  ${green("✓")} Pi runtime ${bundledPi}${suffix}`);
        }
      }
    } catch {
      // Diagnostic only — don't fail health check on parse errors
    }
  }

  const hasAuth = hasAnyAuth();
  if (hasAuth) {
    console.log(`  ${green("✓")} API key configured`);
  } else {
    const unloadedKey = detectKeyInShellConfig();
    if (unloadedKey) {
      console.log(`  ${yellow("⚠")} ${unloadedKey} found in ${dim(getShellConfigPath())} but not loaded — restart your terminal`);
    } else {
      console.log(`  ${yellow("⚠")} No API key — run ${green("soma")} to set one up`);
    }
  }

  try {
    const gitV = execSync("git --version", { encoding: "utf-8" }).trim();
    check(true, gitV, "");
  } catch {
    check(false, "", "git not found");
  }

  console.log("");
  if (issues === 0 && warnings === 0) {
    console.log(`  ${green("✓ All checks passed")}`);
  } else if (issues === 0) {
    console.log(`  ${green("✓ All checks passed")} ${dim(`(${warnings} warning${warnings > 1 ? "s" : ""})`)}`);  
  } else {
    console.log(`  ${yellow(`${issues} issue${issues > 1 ? "s" : ""} found`)}${warnings > 0 ? dim(` + ${warnings} warning${warnings > 1 ? "s" : ""}`) : ""}`);
    console.log(`  ${voice.say("suggest", { suggestion: issues > 2 ? "start with soma init" : "check the items above" })}`);
  }
  console.log("");
}

// ── Project Doctor ───────────────────────────────────────────────────
// (large function — kept inline to avoid breaking the complex doctor logic)

async function projectDoctor() {
  const doctorArgs = args.slice(1);
  const wantsScan = doctorArgs.includes("--scan");
  const wantsAll = doctorArgs.includes("--all");

  if ((wantsScan || wantsAll) && isInstalled()) {
    await delegateToCore();
    return;
  }

  printSigma();
  const agentV = getAgentVersion();
  let projectV = getProjectVersion();
  const installed = isInstalled();

  console.log(`  ${bold("Soma")} — Doctor`);
  console.log("");

  if (!installed) {
    console.log(`  ${red("✗")} Soma not installed. Run ${green("soma init")} first.`);
    console.log("");
    return;
  }

  console.log(`  Agent:   ${cyan(`v${agentV || "unknown"}`)}`);
  if (projectV) {
    console.log(`  Project: ${cyan(`v${projectV}`)}`);
  }
  console.log(`  CLI:     ${dim(`v${VERSION}`)}`);
  console.log("");

  const hasSomaDir = existsSync(join(process.cwd(), ".soma"));

  if (!hasSomaDir) {
    console.log(`  ${yellow("⚠")} No .soma/ in current directory.`);
    console.log(`  Run ${green("soma init")} to set up this project, or ${green("soma doctor --scan")} to find projects.`);
    console.log("");
    return;
  }

  if (!projectV) {
    // Pre-versioning branch — stamp current agent version into settings.json
    // (create if missing, merge if present) and fall through to migration
    // replay. Prior behavior dead-ended with circular guidance.
    console.log(`  ${yellow("⚠")} Project .soma/ has no version (pre-versioning). Stamping...`);
    try {
      const settingsPath = join(process.cwd(), ".soma", "settings.json");
      let cfg = {};
      if (existsSync(settingsPath)) {
        try { cfg = JSON.parse(readFileSync(settingsPath, "utf8")); } catch { /* malformed — start fresh */ }
      } else {
        mkdirSync(dirname(settingsPath), { recursive: true });
      }
      cfg.version = agentV;
      writeFileSync(settingsPath, JSON.stringify(cfg, null, 2) + "\n");
      console.log(`  ${green("✓")} Stamped .soma/settings.json → v${agentV}`);
      console.log("");
      projectV = agentV;  // continue into migration replay
    } catch (e) {
      console.log(`  ${red("✗")} Failed to stamp settings.json: ${e.message}`);
      console.log(`  Run ${green("soma init")} to scaffold a fresh .soma/settings.json.`);
      console.log("");
      return;
    }
  }

  // Declarative migration replay (SX-562).
  //
  // Doctor reads migration maps whose frontmatter carries
  //   replay-until: <version>
  // While the agent's version is BELOW that threshold, every doctor run
  // evaluates the map's `## Doctor Actions` JSON block and applies each
  // action idempotently. Once the agent reaches `replay-until`, the map
  // is considered universally applied; doctor skips it.
  //
  // Action schema (see migrations/phases/v0.20.3-to-v0.21.0.md for example):
  //   settings-defaults: { key: value }       — addIfMissing at top-level
  //   settings-subkeys:  { parent: { k: v } } — addIfMissing into nested object
  //   scaffold-files:    [{ target, template }] — writeIfMissing from template
  //
  // This block is the ONLY place doctor does tier-1 backfill work. The
  // migration map itself is the source of truth — adding a new setting or
  // file seed to a future release just means adding it to that release's
  // map, not touching this code.
  try {
    const softSomaDir = join(process.cwd(), ".soma");
    const softSettings = join(softSomaDir, "settings.json");
    if (existsSync(softSettings)) {
      // Resolve template roots (stable install + dist + dev-repo variants).
      const templateRoots = [CORE_DIR, join(CORE_DIR, "dist")];
      try {
        const devCore = readlinkSync(join(CORE_DIR, "core"));
        if (devCore) {
          const devRoot = dirname(devCore);
          templateRoots.push(devRoot, join(devRoot, "dist"));
        }
      } catch { /* not dev mode */ }

      // Discover migration phase maps across the candidate roots.
      const phaseDirsSeen = new Set();
      const phaseDirs = [];
      for (const root of templateRoots) {
        const d = join(root, "migrations", "phases");
        if (existsSync(d) && !phaseDirsSeen.has(d)) { phaseDirs.push(d); phaseDirsSeen.add(d); }
      }
      const seenMaps = new Set();
      const maps = [];
      for (const dir of phaseDirs) {
        for (const f of readdirSync(dir).filter(f => f.endsWith(".md"))) {
          if (seenMaps.has(f)) continue;
          seenMaps.add(f);
          maps.push(join(dir, f));
        }
      }

      let obj = JSON.parse(readFileSync(softSettings, "utf-8"));
      let objChanged = false;
      let replayFixes = 0;

      for (const mapPath of maps) {
        let raw;
        try { raw = readFileSync(mapPath, "utf-8"); } catch { continue; }

        // Frontmatter probe — only maps with `replay-until` get replayed.
        const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
        if (!fmMatch) continue;
        const replayLine = fmMatch[1].match(/^replay-until:\s*["']?([^"'\n]+?)["']?\s*$/m);
        if (!replayLine) continue;
        const replayUntil = replayLine[1].trim();
        // If agent has caught up, assume every upgrade path has run through it.
        if (agentV && semverCmp(agentV, replayUntil) >= 0) continue;

        // Extract `## Doctor Actions` JSON block.
        const actionsBlock = raw.match(/^## Doctor Actions[\s\S]*?```json\s*\n([\s\S]*?)```/m);
        if (!actionsBlock) continue;
        let actions;
        try { actions = JSON.parse(actionsBlock[1]); } catch { continue; }

        // Apply top-level settings defaults (addIfMissing at root).
        if (actions["settings-defaults"] && typeof actions["settings-defaults"] === "object") {
          for (const [k, v] of Object.entries(actions["settings-defaults"])) {
            if (!(k in obj)) { obj[k] = v; objChanged = true; replayFixes++; }
          }
        }

        // Apply nested settings subkeys (addIfMissing into existing objects only).
        if (actions["settings-subkeys"] && typeof actions["settings-subkeys"] === "object") {
          for (const [parent, sub] of Object.entries(actions["settings-subkeys"])) {
            if (!obj[parent] || typeof obj[parent] !== "object") continue;
            for (const [k, v] of Object.entries(sub)) {
              if (obj[parent][k] === undefined) { obj[parent][k] = v; objChanged = true; replayFixes++; }
            }
          }
        }

        // Apply file scaffolds (writeIfMissing from a bundled template).
        if (Array.isArray(actions["scaffold-files"])) {
          for (const entry of actions["scaffold-files"]) {
            if (!entry || !entry.target || !entry.template) continue;
            const target = join(softSomaDir, entry.target);
            if (existsSync(target)) continue;
            for (const root of templateRoots) {
              const src = join(root, entry.template);
              if (!existsSync(src)) continue;
              const today = new Date().toISOString().slice(0, 10);
              mkdirSync(dirname(target), { recursive: true });
              writeFileSync(target, readFileSync(src, "utf-8").replace(/\{\{today\}\}/g, today));
              replayFixes++;
              break;
            }
          }
        }
      }

      if (objChanged) writeFileSync(softSettings, JSON.stringify(obj, null, "\t") + "\n");
      if (replayFixes > 0) {
        console.log(`  ${green("✓")} Migration replay applied ${replayFixes} backfill(s)`);
        console.log("");
      }
    }
  } catch { /* best-effort; doctor continues */ }

  // Bundled body template drift check (SX-603).
  //
  // For each tracked template file (_mind.md, _memory.md, DNA.md):
  //   local-hash == current-bundled-hash   → up to date, skip
  //   local-hash ∈ historical-bundled-hashes → pristine-outdated, AUTO-REFRESH
  //   else                                 → user-edited, WARN + suggest merge
  //
  // Data: migrations/template-hashes.json (bundled with agent). Historical
  // list grows each release that changes a bundled template. Pristine case
  // is safe because user made no edits; customized case preserves user
  // intent but surfaces that improvements exist.
  //
  // Stepping stone to SX-599 (global body layer) which applies same hash
  // mechanic at the ~/.soma/body/ chain layer. This release's mechanism
  // operates per-project; SX-599's version operates globally.
  try {
    const softSomaDir = join(process.cwd(), ".soma");
    if (existsSync(softSomaDir)) {
      const templateRoots = [CORE_DIR, join(CORE_DIR, "dist")];
      try {
        const devCore = readlinkSync(join(CORE_DIR, "core"));
        if (devCore) {
          const devRoot = dirname(devCore);
          templateRoots.push(devRoot, join(devRoot, "dist"));
        }
      } catch { /* not dev mode */ }

      // Locate hash registry + bundled template dir.
      let registry = null;
      let bundledTemplatesDir = null;
      for (const root of templateRoots) {
        const regPath = join(root, "migrations", "template-hashes.json");
        if (existsSync(regPath) && !registry) {
          try { registry = JSON.parse(readFileSync(regPath, "utf-8")); } catch {}
        }
        const td = join(root, "templates", "default");
        if (existsSync(td) && !bundledTemplatesDir) bundledTemplatesDir = td;
      }

      if (registry?.templates && bundledTemplatesDir) {
        const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

        let refreshed = 0;
        let customized = 0;
        const customizedFiles = [];

        for (const [filename, meta] of Object.entries(registry.templates)) {
          const localPath = join(softSomaDir, "body", filename);
          const bundledPath = join(bundledTemplatesDir, filename);
          if (!existsSync(localPath) || !existsSync(bundledPath)) continue;

          const localContent = readFileSync(localPath);
          const bundledContent = readFileSync(bundledPath);
          const localHash = sha256(localContent);
          const bundledHash = sha256(bundledContent);

          if (localHash === bundledHash) continue; // up to date

          const historical = (meta.historical || []).map(h => h.sha256);
          if (historical.includes(localHash)) {
            // Pristine but outdated — safe auto-refresh.
            writeFileSync(localPath, bundledContent);
            console.log(`  ${green("✓")} Refreshed body/${filename} (pristine older bundled → current)`);
            refreshed++;
          } else {
            customized++;
            customizedFiles.push(filename);
          }
        }

        if (refreshed > 0) console.log("");
        if (customized > 0) {
          console.log(`  ${yellow("⚠")} Customized body files with bundled updates available: ${customizedFiles.join(", ")}`);
          console.log(`    ${dim("Review updates: diff body/<file> vs " + bundledTemplatesDir + "/<file>")}`);
          console.log(`    ${dim("To adopt bundled: rm body/<file> && soma init --force (safe — writeIfMissing preserves others)")}`);
          console.log("");
        }
      }
    }
  } catch { /* best-effort; doctor continues */ }

  // ── ALWAYS-RUN: One-time semantic migrations (sentinel-gated) ─────────
  // Run regardless of version state. Sentinels in settings.migrations[] make
  // each migration idempotent. s01-86b0fd: previously gated inside the
  // version-mismatch block, missed users on current version with no sentinel
  // (e.g. fresh init at current version, or manual settings.json edit).
  // Keep in sync with extensions/soma-boot.ts always-run block.
  {
    const somaDir = join(process.cwd(), ".soma");
    const settingsPath = join(somaDir, "settings.json");
    if (existsSync(settingsPath)) {
      try {
        const current = JSON.parse(readFileSync(settingsPath, "utf-8"));
        let migrationsChanged = false;
        if (!Array.isArray(current.migrations)) { current.migrations = []; migrationsChanged = true; }
        const applyOnceAlways = (id, fn) => {
          if (current.migrations.includes(id)) return;
          fn();
          current.migrations.push(id);
          migrationsChanged = true;
        };

        // v0.23.1 — disable proactive auto-breathe by default.
        applyOnceAlways("breathe-auto-off-v0.23.1", () => {
          if (current.breathe && typeof current.breathe === "object" && current.breathe.auto === true) {
            current.breathe.auto = false;
            console.log(`  ${green("✓")} migration breathe-auto-off-v0.23.1: flipped breathe.auto → false`);
            return true;
          }
          return false;
        });

        // v0.25.0 — strip redundant prepend-vars from body/_mind.md.
        applyOnceAlways("mind-prepend-cleanup-v0.25.0", () => {
          try {
            const mindPath = join(somaDir, "body", "_mind.md");
            if (!existsSync(mindPath)) return false;
            const original = readFileSync(mindPath, "utf-8");
            const bareLineRx = /^[ \t]*\{\{(protocol_summaries|muscle_digests|scripts_table)\}\}[ \t]*$/gm;
            if (!bareLineRx.test(original)) return false;
            bareLineRx.lastIndex = 0;
            const backupPath = mindPath + ".bak-v0.25.0";
            if (!existsSync(backupPath)) writeFileSync(backupPath, original);
            let cleaned = original.replace(bareLineRx, "");
            cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
            const breadcrumb = "<!-- v0.25.0 migration (2026-05-04): removed redundant {{protocol_summaries}} / {{muscle_digests}} / {{scripts_table}} interpolations.\n     compileFrontalCortex prepends them. Backup: _mind.md.bak-v0.25.0. See: docs/body.md, migrations/phases/v0.24.1-to-v0.25.0.md. -->\n\n";
            const fmMatch = cleaned.match(/^---\n[\s\S]*?\n---\n+/);
            cleaned = fmMatch
              ? cleaned.slice(0, fmMatch[0].length) + breadcrumb + cleaned.slice(fmMatch[0].length)
              : breadcrumb + cleaned;
            writeFileSync(mindPath, cleaned);
            console.log(`  ${green("✓")} migration mind-prepend-cleanup-v0.25.0: cleaned _mind.md (backup at _mind.md.bak-v0.25.0)`);
            return true;
          } catch {
            return false;
          }
        });

        // v0.26.0 — rename `## Next Session` → `## Start Here` in active preloads (SX-733).
        applyOnceAlways("memory-section-rename-v0.26.0", () => {
          try {
            const preloadDir = join(somaDir, "memory", "preloads");
            if (!existsSync(preloadDir)) return false;
            const files = readdirSync(preloadDir).filter((f) => f.startsWith("preload-next-") && f.endsWith(".md"));
            let touched = 0;
            for (const f of files) {
              const path = join(preloadDir, f);
              const content = readFileSync(path, "utf-8");
              if (!/^## Next Session\s*$/m.test(content)) continue;
              writeFileSync(path, content.replace(/^## Next Session\s*$/m, "## Start Here"));
              touched++;
            }
            if (touched > 0) {
              console.log(`  ${green("✓")} migration memory-section-rename-v0.26.0: renamed in ${touched} preload(s)`);
            }
            return touched > 0;
          } catch {
            return false;
          }
        });

        if (migrationsChanged) writeFileSync(settingsPath, JSON.stringify(current, null, "\t") + "\n");
      } catch { /* settings parse failed */ }
    }
  }

  if (agentV && semverCmp(projectV, agentV) === 0) {
    console.log(`  ${green("✓")} Project is up to date.`);
    console.log("");
    await healthCheck();
    return;
  }
  
  if (agentV && semverCmp(projectV, agentV) < 0) {
    console.log(`  ${yellow("⚠")} Project .soma/ is at ${cyan(`v${projectV}`)} , agent is at ${cyan(`v${agentV}`)} .`);
    console.log("");
  
    let fixes = 0;
    const somaDir = join(process.cwd(), ".soma");
  
    const settingsPath = join(somaDir, "settings.json");
    if (existsSync(settingsPath)) {
      try {
        const current = JSON.parse(readFileSync(settingsPath, "utf-8"));
        let changed = false;
        const add = (k, v) => { if (!(k in current)) { current[k] = v; changed = true; fixes++; } };
        // Keep in sync with extensions/soma-boot.ts:1167-1180 — same keys/values.
        // Both paths run addIfMissing; first to fire wins, second is a no-op.
        add("doctor", { autoUpdate: true, declinedVersion: null });
        add("keepalive", { maxPings: 5, autoExhale: true, autoExhaleMinTokens: 75000 });
        add("breathe", { auto: false, triggerAt: 50, rotateAt: 70, graceSeconds: 30 });
        add("context", { notifyAt: 50, warnAt: 70, urgentAt: 80, autoExhaleAt: 85 });
        add("preload", { staleAfterHours: 48, lastSessionLogs: 0, recentNotesCount: 3 });
        add("scratch", { autoInject: false });
        add("guard", { coreFiles: "warn", bashCommands: "warn", gitIdentity: null });
        add("checkpoints", { enabled: true, intervalMinutes: 5, squashOnPush: true });
        add("cache", { retention: null });
        add("persona", { name: null, emoji: "σ" });
        add("inherit", { identity: true, protocols: true, muscles: true, tools: true });
        // Sub-migrate existing preload blocks that predate recentNotesCount (v0.21.0).
        if (current.preload && typeof current.preload === "object" && current.preload.recentNotesCount === undefined) {
          current.preload.recentNotesCount = 3;
          changed = true;
          fixes++;
        }

        // One-time semantic migrations now run UNCONDITIONALLY in the
        // always-run block above (s01-86b0fd). This block keeps `add` only.
        if (changed) writeFileSync(settingsPath, JSON.stringify(current, null, "\t") + "\n");
      } catch {}
    }
  
    const bodyDir = join(somaDir, "body");
    let agentRoot = CORE_DIR;
    try {
      const realCore = readlinkSync(join(CORE_DIR, "core"));
      if (realCore) {
        const devRoot = dirname(realCore);
        if (existsSync(join(devRoot, "templates", "default")) || existsSync(join(devRoot, "body", "_public"))) agentRoot = devRoot;
      }
    } catch {}
    // Resolve bundled body templates: templates/default/ (v0.11+) or body/_public/ (legacy)
    const bundledBody = existsSync(join(agentRoot, "templates", "default"))
      ? join(agentRoot, "templates", "default")
      : existsSync(join(agentRoot, "body", "_public"))
        ? join(agentRoot, "body", "_public")
        : null;
    if (bundledBody && existsSync(bundledBody)) {
      try {
        if (!existsSync(bodyDir)) mkdirSync(bodyDir, { recursive: true });
        for (const f of readdirSync(bundledBody).filter(f => f.endsWith(".md") && !f.startsWith("_"))) {
          const dest = join(bodyDir, f);
          if (!existsSync(dest)) { writeFileSync(dest, readFileSync(join(bundledBody, f), "utf-8")); fixes++; }
        }
      } catch {}
    }
  
    const protoDir = join(somaDir, "amps", "protocols");
    const bundledProtos = existsSync(join(CORE_DIR, "dist", "content", "protocols"))
      ? join(CORE_DIR, "dist", "content", "protocols")
      : existsSync(join(CORE_DIR, "content", "protocols"))
        ? join(CORE_DIR, "content", "protocols") : null;
    if (bundledProtos) {
      if (!existsSync(protoDir)) mkdirSync(protoDir, { recursive: true });
      for (const f of readdirSync(bundledProtos).filter(f => f.endsWith(".md") && f !== "_template.md" && f !== "README.md")) {
        const dest = join(protoDir, f);
        if (!existsSync(dest)) { writeFileSync(dest, readFileSync(join(bundledProtos, f), "utf-8")); fixes++; }
      }
    }
  
    const scriptsDir = join(somaDir, "amps", "scripts");
    const bundledScripts = existsSync(join(agentRoot, "dist", "content", "scripts"))
      ? join(agentRoot, "dist", "content", "scripts")
      : existsSync(join(agentRoot, "content", "scripts"))
        ? join(agentRoot, "content", "scripts")
        : existsSync(join(agentRoot, "scripts"))
          ? join(agentRoot, "scripts") : null;
    if (bundledScripts) {
      if (!existsSync(scriptsDir)) mkdirSync(scriptsDir, { recursive: true });
      for (const f of readdirSync(bundledScripts).filter(f => f.endsWith(".sh"))) {
        const dest = join(scriptsDir, f);
        if (!existsSync(dest)) {
          writeFileSync(dest, readFileSync(join(bundledScripts, f), "utf-8"), { mode: 0o755 });
          fixes++;
        }
      }
    }

    // SX-547 (v0.21.0): seed memory/notes/soma-log.md if missing. Mirrors
    // scaffoldMemoryNotes in core/init.ts. Never clobbers (writeIfMissing).
    try {
      const notesTarget = join(somaDir, "memory", "notes", "soma-log.md");
      if (!existsSync(notesTarget)) {
        const candidates = [
          join(agentRoot, "templates", "default", "memory", "notes", "soma-log.md"),
          join(agentRoot, "dist", "templates", "default", "memory", "notes", "soma-log.md"),
        ];
        for (const src of candidates) {
          if (!existsSync(src)) continue;
          const today = new Date().toISOString().slice(0, 10);
          const content = readFileSync(src, "utf-8").replace(/\{\{today\}\}/g, today);
          mkdirSync(dirname(notesTarget), { recursive: true });
          writeFileSync(notesTarget, content);
          fixes++;
          break;
        }
      }
    } catch { /* best-effort */ }

    // SX-714 fix: always persist the version marker on drift detection,
    // not only in the `fixes > 0` branch. Prior to this, when projectV < agentV
    // and no file migrations were needed, doctor printed "Version bumped"
    // but never wrote to settings.json — next run still showed drift.
    // Caught dogfood s01-4d36c6.
    try {
      const s = JSON.parse(readFileSync(settingsPath, "utf-8"));
      if (s.version !== agentV) {
        s.version = agentV;
        writeFileSync(settingsPath, JSON.stringify(s, null, "\t") + "\n");
      }
    } catch {}

    if (fixes > 0) {
      console.log(`  ${green("✓")} Applied ${fixes} automatic fixes`);
      const bc = existsSync(join(somaDir, "body")) ? readdirSync(join(somaDir, "body")).filter(f => f.endsWith(".md")).length : 0;
      const pc = existsSync(protoDir) ? readdirSync(protoDir).filter(f => f.endsWith(".md")).length : 0;
      console.log(`    ${bc} body files, ${pc} protocols, settings updated`);
      console.log(`    Version bumped to ${cyan(`v${agentV}`)}`);

      let staleUpdated = 0;
      let staleSkipped = [];
      if (bundledProtos && existsSync(protoDir)) {
        for (const f of readdirSync(protoDir).filter(f => f.endsWith(".md") && f !== "_template.md" && f !== "README.md")) {
          const bundledFile = join(bundledProtos, f);
          if (!existsSync(bundledFile)) continue;
          const projRaw = readFileSync(join(protoDir, f), "utf-8");
          const bundledRaw = readFileSync(bundledFile, "utf-8");
          const strip = s => s.replace(/^(heat|loads|runs|last-run|heat-default):.*\n?/gm, "").trim();
          if (strip(projRaw) === strip(bundledRaw)) continue;
          const heatLine = projRaw.match(/^heat:.*$/m);
          const loadsLine = projRaw.match(/^loads:.*$/m);
          let updated = bundledRaw;
          // Build lines to inject into frontmatter if bundled lacks them
          const inject = [];
          if (heatLine) {
            if (/^heat:.*$/m.test(updated)) {
              updated = updated.replace(/^heat:.*$/m, heatLine[0]);
            } else {
              inject.push(heatLine[0]);
            }
          }
          if (loadsLine) {
            if (/^loads:.*$/m.test(updated)) {
              updated = updated.replace(/^loads:.*$/m, loadsLine[0]);
            } else {
              inject.push(loadsLine[0]);
            }
          }
          if (inject.length > 0) {
            // Insert before the closing --- of frontmatter
            updated = updated.replace(/^---\n([\s\S]*?)\n---/, `---\n$1\n${inject.join('\n')}\n---`);
          }
          writeFileSync(join(protoDir, f), updated);
          staleUpdated++;
        }
      }

      console.log("");
      if (staleUpdated > 0) {
        console.log(`  ${green("✓")} ${staleUpdated} protocols updated to latest version`);
        console.log(`  ${dim("Heat and load counts preserved. Content updated.")}`);
      }
      if (staleSkipped.length > 0) {
        console.log(`  ${yellow("⚠")} ${staleSkipped.length} protocols skipped (may be customized)`);
      }
      console.log("");
      const totalRemaining = staleSkipped.length;
      if (totalRemaining > 0) {
        console.log(`  ${dim("CLI handled: files, scripts, settings, protocols, version bump.")}`);
        console.log(`  ${dim("Remaining: " + totalRemaining + " items need review.")}`);
        console.log(`  ${dim("For full migration:")} ${green("soma")} ${dim("then")} ${green("/soma doctor")}`);
      } else {
        console.log(`  ${green("✓")} Full migration complete from CLI.`);
        console.log(`  ${dim("No TUI session needed — all updates applied.")}`);
      }

      // Write _doctor-pending.md
      try {
        const pendingPath = join(somaDir, "body", "_doctor-pending.md");
        if (staleSkipped.length === 0) {
          const done = [
            "---", "type: template", "name: doctor-pending", "status: complete",
            `created: ${new Date().toISOString().split("T")[0]}`,
            "description: CLI doctor completed full migration", "---", "",
            "# Doctor Update — Complete", "",
            `Migrated from v${projectV} to v${agentV} on ${new Date().toISOString().split("T")[0]}.`,
            `Applied: ${fixes} file fixes + ${staleUpdated} protocol updates.`, "",
            "Run `/soma doctor` to verify, then delete this file.",
          ];
          writeFileSync(pendingPath, done.join("\n"));
        }
      } catch {}
    } else {
      console.log(`  ${green("✓")} Version bumped to ${cyan(`v${agentV}`)}`);
      console.log(`  ${dim("No file changes needed — project structure is current.")}`);
    }
  } else {
    console.log(`  ${green("✓")} Project version: ${cyan(`v${projectV}`)}`);
  }
  
  console.log("");
  await healthCheck();
}

// ── Delegation ───────────────────────────────────────────────────────

async function delegateToCore() {
  const piPkg = join(CORE_DIR, "node_modules", "@mariozechner", "pi-coding-agent");
  if (!existsSync(piPkg)) {
    console.log(`  ${red("✗")} Runtime dependencies missing.`);
    console.log(`  ${dim("Run")} ${green("soma init")} ${dim("to repair the installation.")}`);
    console.log("");
    return;
  }
  const cliEntry = existsSync(join(CORE_DIR, "dist", "cli.js")) 
    ? join(CORE_DIR, "dist", "cli.js") 
    : null;
  const mainEntry = existsSync(join(CORE_DIR, "dist", "main.js"))
    ? join(CORE_DIR, "dist", "main.js")
    : null;
  if (!cliEntry && !mainEntry) {
    console.log(`  ${red("✗")} Runtime entry point missing.`);
    console.log(`  ${dim("Run")} ${green("soma init")} ${dim("to repair the installation.")}`);
    console.log("");
    return;
  }

  const passArgs = process.argv.slice(2);

  const cliLocations = [
    { path: join(CORE_DIR, "dist", "cli.js"),              type: "node" },
    { path: join(CORE_DIR, "node_modules", ".bin", "pi"),  type: "bin" },
  ];

  const userExtArgs = [];
  const projectExtDir = join(process.cwd(), ".soma", "extensions");
  if (existsSync(projectExtDir)) {
    try {
      const userExts = readdirSync(projectExtDir).filter(f => f.endsWith(".ts") || f.endsWith(".js"));
      for (const ext of userExts) {
        userExtArgs.push("-e", join(projectExtDir, ext));
      }
    } catch {}
  }

  const env = {
    ...process.env,
    PI_CODING_AGENT_DIR: CORE_DIR,
    SOMA_CODING_AGENT_DIR: CORE_DIR,
    PI_PACKAGE_DIR: CORE_DIR,
  };

  for (const cli of cliLocations) {
    if (existsSync(cli.path)) {
      try {
        const allArgs = [...userExtArgs, ...passArgs];
        if (cli.type === "node") {
          execFileSync("node", [cli.path, ...allArgs], { stdio: "inherit", cwd: process.cwd(), env });
        } else {
          execFileSync(cli.path, allArgs, { stdio: "inherit", cwd: process.cwd(), env });
        }
        return;
      } catch (err) {
        if (err.status) process.exit(err.status);
        if (err.message && err.message.includes("MODULE_NOT_FOUND")) {
          console.log("");
          console.log(`  ${red("✗")} Soma failed to start — missing dependencies.`);
          console.log(`  ${dim("Run")} ${green("soma init")} ${dim("to repair the installation.")}`);
          console.log("");
        }
        return;
      }
    }
  }

  console.log(`  ${yellow("⚠")} Core is installed but the CLI entry point is missing.`);
  console.log(`  ${dim("Expected:")} ${dim(cliLocations.map(c => c.path).join(" or "))}`);
  console.log(`  Run ${green("soma init")} to repair the installation.`);
  console.log("");
}

// ── Dispatch ─────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const cmd = args[0];

// Keep config.json coreVersion fresh — cheap check, prevents staleness
try {
  const config = readConfig();
  const currentV = getAgentVersion();
  if (currentV && config.coreVersion !== currentV) {
    config.coreVersion = currentV;
    writeConfig(config);
  }
} catch {}

// Provision the per-install session token on first run. Written to
// ~/.soma/somadian-token (chmod 600). Used by extensions + compiled
// scripts as a presence signal. For v0.21.x beta the token is a local
// random hex generated at install time; later releases will replace the
// provisioning source without changing the consumer-side shape.
try {
  const tokenPath = join(SOMA_HOME, "somadian-token");
  if (!existsSync(tokenPath)) {
    mkdirSync(SOMA_HOME, { recursive: true, mode: 0o700 });
    writeFileSync(tokenPath, randomBytes(24).toString("hex"), { mode: 0o600 });
  }
} catch { /* best-effort; absence downgrades Pro scripts but won't break CLI */ }

if (cmd === "--version" || cmd === "-v" || cmd === "-V" || cmd === "version") {
  showVersion();
} else if (cmd === "--help" || cmd === "-h" || cmd === "help") {
  if (isInstalled()) {
    await delegateToCore();
  } else {
    showHelp();
  }
} else if (cmd === "about") {
  await showAbout();
} else if (cmd === "init") {
  // soma init is for PROJECT init only. Runtime updates live on `soma update`.
  // Prior behavior (fall-through to checkAndUpdate when .soma/ existed) was
  // the confusing overload that hid the update flow — removed in shipping-
  // integrity Layer 4 (s01-054a4c).
  if (!isInstalled()) {
    await initSoma();  // first-time runtime install
  } else {
    await delegateToCore();  // project init — core handles all cases gracefully
  }
} else if (cmd === "update") {
  // Actually perform the update (was checkAndUpdate — prior `soma update` only
  // reported status and told user to run `soma init`).
  await checkAndUpdate();
} else if (cmd === "check-updates" || cmd === "updates") {
  // Keep the old status-only behavior accessible but un-prime
  checkForUpdates();
} else if (cmd === "doctor") {
  await projectDoctor();
} else if (cmd === "status" || cmd === "health") {
  await healthCheck();
} else if (cmd && cmd.startsWith("--") && !isInstalled()) {
  // Unknown flag before install — show help
  console.log(`  ${yellow("⚠")} Unknown option: ${cmd}`);
  console.log(`  Run ${green("soma --help")} for usage.`);
  console.log("");
} else if (isInstalled()) {
  // Check cached update flag (set by soma-statusline.ts's periodic check).
  // Zero network at boot — just reads ~/.soma/config.json.
  // shipping-integrity Layer 4 Amendment 2 (s01-054a4c).
  try {
    const cfg = readConfig();
    if (cfg.updateAvailable) {
      const latest = cfg.latestSummary ? ` — ${dim(cfg.latestSummary)}` : "";
      console.log(`  ${yellow("⬆")} Update available${latest}`);
      console.log(`    ${dim("Run:")} ${green("soma update")}`);
      console.log("");
    }
  } catch {}
  await delegateToCore();
} else {
  const postInstallCmds = ["focus", "inhale", "content", "install", "list", "map", "--map", "--preload", "model", "session", "code", "verify", "refactor", "seam", "hub", "body", "run"];
  if (cmd && postInstallCmds.includes(cmd)) {
    printSigma();
    console.log(`  ${bold("soma " + cmd)} requires the Soma runtime.`);
    console.log("");
    console.log(`  Run ${green("soma init")} to install it.`);
    console.log("");
  } else {
    await showWelcome();
  }
}
