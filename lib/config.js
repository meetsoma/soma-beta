/**
 * Config read/write for ~/.soma/config.json
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";

export const SOMA_HOME = join(homedir(), ".soma");
export const CONFIG_PATH = join(SOMA_HOME, "config.json");
// Respect SOMA_CODING_AGENT_DIR for dev/sandbox override, fall back to ~/.soma/agent
export const CORE_DIR = process.env.SOMA_CODING_AGENT_DIR || join(SOMA_HOME, "agent");
export const SITE_URL = "https://soma.gravicity.ai";

export function readConfig() {
  try { return JSON.parse(readFileSync(CONFIG_PATH, "utf-8")); }
  catch { return {}; }
}

export function writeConfig(config) {
  mkdirSync(dirname(CONFIG_PATH), { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), { mode: 0o600 });
}
