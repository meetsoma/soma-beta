/**
 * Runtime detection — is Soma installed? What version?
 */
import { existsSync, readFileSync, readlinkSync, appendFileSync } from "fs";
import { join, dirname } from "path";
import { homedir, platform } from "os";
import { execSync } from "child_process";
import { CORE_DIR } from "./config.js";

export function isInstalled() {
  const hasDist = existsSync(join(CORE_DIR, "dist", "extensions")) && existsSync(join(CORE_DIR, "dist", "core"));
  const hasDev = existsSync(join(CORE_DIR, "extensions")) && existsSync(join(CORE_DIR, "core"));
  const hasDeps = existsSync(join(CORE_DIR, "node_modules", "@mariozechner"));
  return (hasDist || hasDev) && hasDeps;
}

export function getAgentVersion() {
  try {
    let pkgPath = join(CORE_DIR, "package.json");
    try {
      const realCore = readlinkSync(join(CORE_DIR, "core"));
      if (realCore) {
        const devPkg = join(dirname(realCore), "package.json");
        if (existsSync(devPkg)) pkgPath = devPkg;
      }
    } catch {}
    return JSON.parse(readFileSync(pkgPath, "utf-8")).version;
  } catch { return null; }
}

export function getProjectVersion() {
  try {
    const settingsPath = join(process.cwd(), ".soma", "settings.json");
    return JSON.parse(readFileSync(settingsPath, "utf-8")).version || null;
  } catch { return null; }
}

export function getCliVersion() {
  try {
    const __dirname = new URL(".", import.meta.url).pathname;
    return JSON.parse(readFileSync(join(__dirname, "..", "..", "package.json"), "utf-8")).version;
  } catch { return "unknown"; }
}

// Semver comparison: returns -1 (a<b), 0 (equal), 1 (a>b). Handles
// N-segment versions (e.g. "0.20.1.1") by padding with zeros.
export function semverCmp(a, b) {
  if (!a || !b) return 0;
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const va = pa[i] || 0, vb = pb[i] || 0;
    if (va < vb) return -1;
    if (va > vb) return 1;
  }
  return 0;
}

// Detect whether `soma` on PATH is a dev symlink (points outside node_modules).
// Returns the symlink target when dev-installed, else null.
export function detectDevInstall() {
  try {
    const nodeBin = process.argv[1];
    if (!nodeBin) return null;
    const target = readlinkSync(nodeBin);
    // npm-managed bins point into node_modules/<pkg>/...
    if (target.includes("/node_modules/") && target.includes("meetsoma")) return null;
    return target;
  } catch { return null; }
}

// Fetch latest version from npm. Network-blocking; caller handles caching.
// Returns null if npm unreachable.
function npmLatest(pkg) {
  try {
    return execSync(`npm view ${pkg} version 2>/dev/null`, {
      encoding: "utf-8",
      timeout: 5000,
    }).trim() || null;
  } catch { return null; }
}

/**
 * Full version snapshot across all three layers. Single source of truth
 * consumed by `soma update`, `soma doctor`, `soma status`.
 *
 * Layers:
 *   - cli       — meetsoma (this thin CLI, npm package)
 *   - agent     — soma-agent (runtime at ~/.soma/agent/)
 *   - workspace — per-project .soma/settings.json:version marker
 *
 * Each layer returns { local, remote?, status } where status is one of:
 *   "aligned", "dev-ahead", "stale", "unknown", "not-installed"
 *
 * @param {object} opts
 * @param {boolean} [opts.checkRemote=true] — hit npm registry for CLI + agent latest
 * @returns {object} snapshot
 */
export function getVersionSnapshot(opts = {}) {
  const checkRemote = opts.checkRemote !== false;

  // Layer 1: CLI (this package)
  let cliLocal = null;
  try {
    const cliPkg = join(new URL(".", import.meta.url).pathname, "..", "..", "package.json");
    cliLocal = JSON.parse(readFileSync(cliPkg, "utf-8")).version;
  } catch {}
  const cliRemote = checkRemote ? npmLatest("meetsoma") : null;
  const cliStatus = cliStatus_(cliLocal, cliRemote);

  // Layer 2: Agent runtime
  const agentLocal = getAgentVersion();
  const agentRemote = checkRemote ? npmLatest("soma-agent") : null;
  const agentStatus = installed_(agentLocal) ? cliStatus_(agentLocal, agentRemote) : "not-installed";

  // Layer 3: Workspace marker
  const wsLocal = getProjectVersion();
  let wsStatus;
  if (!wsLocal) wsStatus = "no-workspace";
  else if (agentLocal && semverCmp(wsLocal, agentLocal) < 0) wsStatus = "marker-lag";
  else if (agentLocal && semverCmp(wsLocal, agentLocal) === 0) wsStatus = "aligned";
  else wsStatus = "unknown";

  // Dev install + core repo
  const devInstall = detectDevInstall();
  let coreRepo = null;
  if (installed_(agentLocal)) {
    try {
      const config = readConfigSafe_();
      if (config?.installPath) {
        execSync("git fetch origin --quiet", { cwd: config.installPath, stdio: "ignore", timeout: 5000 });
        const behind = execSync("git rev-list HEAD..origin/$(git rev-parse --abbrev-ref HEAD) --count", {
          cwd: config.installPath, encoding: "utf-8", shell: "/bin/bash", timeout: 5000,
        }).trim();
        coreRepo = { behind: parseInt(behind, 10) || 0 };
      }
    } catch {}
  }

  return {
    cli:       { local: cliLocal, remote: cliRemote, status: cliStatus },
    agent:     { local: agentLocal, remote: agentRemote, status: agentStatus },
    workspace: { local: wsLocal, status: wsStatus },
    devInstall,
    coreRepo,
    allAligned: cliStatus === "aligned" && (agentStatus === "aligned" || agentStatus === "dev-ahead") && (wsStatus === "aligned" || wsStatus === "no-workspace"),
  };
}

function installed_(v) { return v && v !== "unknown"; }

function cliStatus_(local, remote) {
  if (!local) return "unknown";
  if (!remote) return "unknown";
  const cmp = semverCmp(local, remote);
  if (cmp === 0) return "aligned";
  if (cmp > 0) return "dev-ahead";
  return "stale";
}

function readConfigSafe_() {
  try {
    const p = join(CORE_DIR, "config.json");
    return JSON.parse(readFileSync(p, "utf-8"));
  } catch { return null; }
}

export function hasAnyAuth() {
  const hasEnvKey = !!(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY || process.env.XAI_API_KEY);
  if (hasEnvKey) return true;
  try {
    const authData = JSON.parse(readFileSync(join(CORE_DIR, "auth.json"), "utf-8"));
    return Object.keys(authData).length > 0;
  } catch { return false; }
}

export function getShellConfigPath() {
  return process.env.SHELL?.includes("zsh") ? "~/.zshrc" : "~/.bashrc";
}

export function getShellConfigAbsPath() {
  const home = homedir();
  return process.env.SHELL?.includes("zsh") ? join(home, ".zshrc") : join(home, ".bashrc");
}

export function detectKeyInShellConfig() {
  try {
    const configContent = readFileSync(getShellConfigAbsPath(), "utf-8");
    const keyPattern = /export\s+(ANTHROPIC_API_KEY|OPENAI_API_KEY|GEMINI_API_KEY)=/;
    const match = configContent.match(keyPattern);
    if (match) return match[1];
  } catch {}
  return null;
}

export function openBrowser(url) {
  try {
    const cmd = platform() === "darwin" ? "open"
      : platform() === "win32" ? "start"
      : "xdg-open";
    execSync(`${cmd} "${url}"`, { stdio: "ignore" });
    return true;
  } catch { return false; }
}

export function hasGitHubCLI() {
  try {
    execSync("gh --version", { stdio: "ignore" });
    return true;
  } catch { return false; }
}

export function getGitHubUsername() {
  try {
    return execSync("gh api user -q .login", { encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] }).trim();
  } catch { return null; }
}
