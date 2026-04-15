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
