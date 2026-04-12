#!/usr/bin/env node
/**
 * Soma — Thin CLI
 *
 * The public face of Soma on npm. Routes to modular commands.
 * For new users, this IS the first impression.
 * For returning users: detects installed runtime → delegates to it.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, readlinkSync } from "fs";
import { join, dirname } from "path";
import { homedir, platform } from "os";
import { fileURLToPath } from "url";
import { execSync, execFileSync } from "child_process";
import { soma as voice } from "./personality.js";

// ── Shared modules ─────────────────────────────────────────────────────
import { bold, dim, italic, cyan, green, yellow, red, magenta, white,
         printSigma, typeOut, typeParagraph, wrapText,
         waitForKey, confirm, confirmYN, readLine, readSecret } from "./lib/display.js";
import { SOMA_HOME, CONFIG_PATH, CORE_DIR, SITE_URL, readConfig, writeConfig } from "./lib/config.js";
import { isInstalled, getAgentVersion, getProjectVersion, getCliVersion,
         hasAnyAuth, getShellConfigPath, getShellConfigAbsPath, detectKeyInShellConfig,
         openBrowser, hasGitHubCLI, getGitHubUsername } from "./lib/detect.js";
import { handleQuestion, interactiveQ, CONCEPTS, getConceptIndex, getConceptBody } from "./welcome/qa.js";
import { apiKeySetup, apiKeyExplain, apiKeyGetOne, apiKeyEntry, oauthGuide } from "./welcome/auth.js";
import { showAbout } from "./welcome/about.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const VERSION = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf-8")).version;

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
  console.log(`    ${green("soma doctor")}            Verify installation health`);
  console.log(`    ${green("soma update")}            Check for updates`);
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
  printSigma();
  console.log(`  ${bold("Soma")} — Status`);
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

  let behind = 0;
  try {
    console.log(`  ${yellow("⏳")} Checking for updates...`);
    execSync("git fetch origin --quiet", { cwd: installPath, stdio: "ignore", timeout: 15000 });
    const branch = execSync("git rev-parse --abbrev-ref HEAD", {
      cwd: installPath, encoding: "utf-8"
    }).trim();
    const behindStr = execSync(
      `git rev-list HEAD..origin/${branch} --count`,
      { cwd: installPath, encoding: "utf-8" }
    ).trim();
    behind = parseInt(behindStr) || 0;
  } catch {
    console.log(`  ${dim("Could not check for updates.")}`);
    console.log("");
    return;
  }

  if (behind === 0) {
    console.log(`  ${green("✓")} Already up to date.`);

    const agentV = getAgentVersion();
    const projectV = getProjectVersion();
    if (agentV && projectV && projectV < agentV) {
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
      `git log HEAD..origin/main --oneline --no-decorate -5`,
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

  const shouldUpdate = await confirmYN(`  ${dim("→")} Update now?`);
  if (!shouldUpdate) {
    console.log("");
    console.log(`  ${dim("Skipped. Run")} ${green("soma init")} ${dim("anytime to update.")}`);
    console.log("");
    return;
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
  console.log("");
  console.log(`  ${green("✓")} ${bold("Soma is up to date")} ${dim(`(${currentHash} → ${newHash})`)}`);
  console.log("");
}

function checkForUpdates() {
  printSigma();
  console.log(`  ${bold("Soma")} — Update Check`);
  console.log("");
  const agentV = getAgentVersion();
  if (agentV) {
    console.log(`  Soma:    ${cyan(`v${agentV}`)}`);
  }
  console.log(`  CLI:     ${cyan(`v${VERSION}`)}`);

  const config = readConfig();

  try {
    const latest = execSync("npm view meetsoma version 2>/dev/null", { encoding: "utf-8" }).trim();
    if (latest && latest !== VERSION && latest > VERSION) {
      console.log("");
      console.log(`  ${yellow("⬆")} CLI update available: ${green(`v${latest}`)}`);
      console.log(`    Run: ${green("npm install -g meetsoma")}`);
    } else {
      console.log(`  ${green("✓")} CLI is up to date`);
    }
  } catch {
    console.log(`  ${dim("Could not check npm registry")}`);
  }

  if (isInstalled() && config.installPath) {
    try {
      execSync("git fetch origin --quiet", { cwd: config.installPath, stdio: "ignore", timeout: 10000 });
      const branch = execSync("git rev-parse --abbrev-ref HEAD", {
        cwd: config.installPath, encoding: "utf-8"
      }).trim();
      const behind = execSync(
        `git rev-list HEAD..origin/${branch} --count`,
        { cwd: config.installPath, encoding: "utf-8" }
      ).trim();
      if (behind && parseInt(behind) > 0) {
        console.log(`  ${yellow("⬆")} Core: ${behind} commit${behind !== "1" ? "s" : ""} behind. Run ${green("soma init")} to update.`);
      } else {
        console.log(`  ${green("✓")} Core is up to date`);
      }
    } catch {
      console.log(`  ${dim("Could not check core updates")}`);
    }
  }

  console.log("");
}

// ── Health Check ─────────────────────────────────────────────────────

async function healthCheck() {
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
  const projectV = getProjectVersion();
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
    console.log(`  ${yellow("⚠")} Project .soma/ has no version (pre-versioning).`);
    console.log(`  This project was likely created before v0.6.3.`);
    console.log(`  Run ${green("soma init")} to bring it up to date.`);
    console.log("");
    return;
  }

  if (agentV && projectV === agentV) {
    console.log(`  ${green("✓")} Project is up to date.`);
    console.log("");
    await healthCheck();
    return;
  }
  
  if (agentV && projectV < agentV) {
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
        add("doctor", { autoUpdate: true, declinedVersion: null });
        add("breathe", { auto: false, triggerAt: 50, rotateAt: 70, graceSeconds: 30 });
        add("context", { notifyAt: 50, warnAt: 70, urgentAt: 80, autoExhaleAt: 85 });
        add("preload", { staleAfterHours: 48, lastSessionLogs: 0 });
        add("scratch", { autoInject: false });
        add("guard", { coreFiles: "warn", bashCommands: "warn", gitIdentity: null });
        add("checkpoints", { enabled: true, intervalMinutes: 5, squashOnPush: true });
        add("persona", { name: null, emoji: "σ" });
        add("inherit", { identity: true, protocols: true, muscles: true, tools: true });
        if (changed) writeFileSync(settingsPath, JSON.stringify(current, null, "\t") + "\n");
      } catch {}
    }
  
    const bodyDir = join(somaDir, "body");
    let agentRoot = CORE_DIR;
    try {
      const realCore = readlinkSync(join(CORE_DIR, "core"));
      if (realCore) {
        const devRoot = dirname(realCore);
        if (existsSync(join(devRoot, "body", "_public"))) agentRoot = devRoot;
      }
    } catch {}
    if (!existsSync(join(agentRoot, "body", "_public"))) {
      const parent = dirname(agentRoot);
      if (existsSync(join(parent, "body", "_public"))) agentRoot = parent;
    }
    const bundledBody = join(agentRoot, "body", "_public");
    if (existsSync(bundledBody)) {
      try {
        if (!existsSync(bodyDir)) mkdirSync(bodyDir, { recursive: true });
        for (const f of readdirSync(bundledBody).filter(f => f.endsWith(".md"))) {
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

    if (fixes > 0) {
      try {
        const s = JSON.parse(readFileSync(settingsPath, "utf-8"));
        s.version = agentV;
        writeFileSync(settingsPath, JSON.stringify(s, null, "\t") + "\n");
      } catch {}
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
          if (heatLine) updated = updated.replace(/^heat:.*$/m, heatLine[0]);
          if (loadsLine) updated = updated.replace(/^loads:.*$/m, loadsLine[0]);
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

if (cmd === "--version" || cmd === "-v" || cmd === "-V") {
  showVersion();
} else if (cmd === "--help" || cmd === "-h") {
  if (isInstalled()) {
    await delegateToCore();
  } else {
    showHelp();
  }
} else if (cmd === "about") {
  await showAbout();
} else if (cmd === "init") {
  const hasProjectArgs = args.includes("--template") || args.includes("--orphan") || args.includes("-o");
  const runtimeInstalled = isInstalled();
  const hasSomaDir = existsSync(join(process.cwd(), ".soma"));
  
  if (!runtimeInstalled) {
    await initSoma();
  } else if (hasProjectArgs || !hasSomaDir) {
    await delegateToCore();
  } else {
    await checkAndUpdate();
  }
} else if (cmd === "update") {
  checkForUpdates();
} else if (cmd === "doctor") {
  await projectDoctor();
} else if (cmd === "status" || cmd === "health") {
  await healthCheck();
} else if (isInstalled()) {
  await delegateToCore();
} else {
  const postInstallCmds = ["focus", "inhale", "content", "install", "list", "map", "--map", "--preload"];
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
