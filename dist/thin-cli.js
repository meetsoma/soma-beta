#!/usr/bin/env node
/**
 * Soma — Thin CLI
 *
 * The public face of Soma on npm. For new users, this IS the first
 * impression. It should feel alive, interesting, and worth signing up for.
 *
 * For returning users: detects installed runtime → delegates to it.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from "fs";
import { join, dirname } from "path";
import { homedir, platform } from "os";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import { soma as voice } from "./personality.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const VERSION = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf-8")).version;
const SOMA_HOME = join(homedir(), ".soma");
const CONFIG_PATH = join(SOMA_HOME, "config.json");
const CORE_DIR = join(SOMA_HOME, "agent");
const SITE_URL = "https://soma.gravicity.ai";

// ── Colours ──────────────────────────────────────────────────────────

const bold = s => `\x1b[1m${s}\x1b[0m`;
const dim = s => `\x1b[2m${s}\x1b[0m`;
const italic = s => `\x1b[3m${s}\x1b[0m`;
const cyan = s => `\x1b[36m${s}\x1b[0m`;
const green = s => `\x1b[32m${s}\x1b[0m`;
const yellow = s => `\x1b[33m${s}\x1b[0m`;
const red = s => `\x1b[31m${s}\x1b[0m`;
const magenta = s => `\x1b[35m${s}\x1b[0m`;
const white = s => `\x1b[97m${s}\x1b[0m`;

// ── Config ───────────────────────────────────────────────────────────

function readConfig() {
  try { return JSON.parse(readFileSync(CONFIG_PATH, "utf-8")); }
  catch { return {}; }
}

function writeConfig(config) {
  mkdirSync(dirname(CONFIG_PATH), { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), { mode: 0o600 });
}

function isInstalled() {
  // Check both layouts: soma-beta (dist/extensions) and dev setup (extensions/)
  const hasDist = existsSync(join(CORE_DIR, "dist", "extensions")) && existsSync(join(CORE_DIR, "dist", "core"));
  const hasDev = existsSync(join(CORE_DIR, "extensions")) && existsSync(join(CORE_DIR, "core"));
  return hasDist || hasDev;
}

// ── Browser ──────────────────────────────────────────────────────────

function openBrowser(url) {
  try {
    const cmd = platform() === "darwin" ? "open"
      : platform() === "win32" ? "start"
      : "xdg-open";
    execSync(`${cmd} "${url}"`, { stdio: "ignore" });
    return true;
  } catch { return false; }
}

// ── Interactive prompt (no deps) ─────────────────────────────────────

function waitForKey(prompt) {
  return new Promise(resolve => {
    process.stdout.write(prompt);
    if (!process.stdin.isTTY) { resolve(""); return; }
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf-8");
    process.stdin.once("data", key => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
      if (key === "\u0003") process.exit(0); // Ctrl+C
      resolve(key);
    });
  });
}

async function confirm(prompt) {
  const key = await waitForKey(`${prompt} ${dim("[Enter]")} `);
  return true;
}

async function confirmYN(prompt) {
  const key = await waitForKey(`${prompt} ${dim("[y/n]")} `);
  return key.toLowerCase() === "y";
}

// ── Typing effect ────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Type out text character by character.
 * Punctuation pauses longer. Newlines pause. ANSI codes print instantly.
 * @param {string} text - text to type (may contain ANSI escapes)
 * @param {object} opts
 * @param {number} opts.charDelay  - ms between characters (default 18)
 * @param {number} opts.punctDelay - ms pause after . , ; : — (default 80)
 * @param {number} opts.lineDelay  - ms pause on newline (default 40)
 * @param {boolean} opts.instant   - skip animation (non-TTY)
 */
async function typeOut(text, opts = {}) {
  if (!process.stdout.isTTY) { process.stdout.write(text); return; }

  // People type in bursts: fast through a word, pause at spaces,
  // longer pause after sentences. Speed drifts — sometimes fast,
  // sometimes slow, like attention wandering and refocusing.
  let pace = 1.0; // drift multiplier — wanders between 0.6 and 1.4
  let i = 0;

  while (i < text.length) {
    // ANSI escapes — print instantly
    const remaining = text.slice(i);
    const ansi = remaining.match(/^\x1b\[[0-9;]*m/);
    if (ansi) { process.stdout.write(ansi[0]); i += ansi[0].length; continue; }

    const ch = text[i];
    const next = text[i + 1] || "";
    process.stdout.write(ch);
    i++;

    // Drift pace gently (random walk, clamped)
    pace += (Math.random() - 0.5) * 0.15;
    pace = Math.max(0.6, Math.min(1.4, pace));

    if (ch === "\n") {
      await sleep(58 * pace);
    } else if (".!?".includes(ch) && (next === " " || next === "\n" || next === "")) {
      await sleep((230 + Math.random() * 175) * pace);
    } else if (ch === "," || ch === ";" || ch === ":") {
      await sleep((70 + Math.random() * 46) * pace);
    } else if (ch === "—" || ch === "–") {
      await sleep((92 + Math.random() * 70) * pace);
    } else if (ch === " ") {
      await sleep((9 + Math.random() * 23) * pace);
    } else {
      await sleep((6 + Math.random() * 14) * pace);
    }
  }
}

/**
 * Type a word-wrapped paragraph with typing effect.
 */
async function typeParagraph(text, indent = "  ", width = 58) {
  const words = text.split(" ");
  let line = indent;
  const lines = [];
  for (const word of words) {
    if (line.length + word.length > width + indent.length && line.trim()) {
      lines.push(line);
      line = indent + word;
    } else {
      line += (line.trim() ? " " : "") + word;
    }
  }
  if (line.trim()) lines.push(line);
  await typeOut(lines.join("\n") + "\n");
}

// ── The sigma ────────────────────────────────────────────────────────

function printSigma() {
  console.log("");
  console.log(cyan("    σ"));
  console.log("");
}

// ── Concepts (rotate on each run) ────────────────────────────────────
// Each concept has a title and maps to a topic in the personality engine.
// The body is generated fresh each time — spintax means variety.

const CONCEPTS = [
  { title: "Memory isn't retrieval. Memory is change.",  topic: "how_memory_works" },
  { title: "Your agent should know who it is.",          topic: "what_is_soma" },
  { title: "Protocols evolve. Muscles grow.",            topic: "what_are_protocols" },
  { title: "The breath cycle.",                          topic: "what_is_breath" },
  { title: "Tools that survive across sessions.",        topic: "what_are_scripts" },
  { title: "Heat tracks what matters.",                  topic: "what_is_heat" },
  { title: "What are muscles?",                          topic: "what_are_muscles" },
  { title: "No compaction. Ever.",                        topic: "no_compaction" },
];

function getConceptIndex() {
  const day = Math.floor(Date.now() / 86400000);
  return day % CONCEPTS.length;
}

function getConceptBody(topic) {
  return voice.ask(topic) || "";
}

// ── Interactive Q&A ──────────────────────────────────────────────────

const QUESTION_MAP = [
  // Order matters — more specific topics first, catch-all last
  { triggers: ["compact", "compaction", "summarise", "summarize", "summarization", "compress", "waiting", "context limit", "token limit", "context fills", "context window", "run out", "limit"], topic: "no_compaction", label: "Why no compaction?" },
  { triggers: ["heat", "hot", "cold", "fade", "decay", "temperature"],   topic: "what_is_heat",           label: "What is the heat system?" },
  { triggers: ["breath", "inhale", "exhale", "cycle", "session lifecycle"], topic: "what_is_breath",       label: "What is the breath cycle?" },
  { triggers: ["protocol", "rule", "behaviour", "behavior", "protocols"], topic: "what_are_protocols",    label: "What are protocols?" },
  { triggers: ["muscle", "muscles", "learn", "pattern", "grow", "correction"], topic: "what_are_muscles", label: "What are muscles?" },
  { triggers: ["script", "scripts", "tool", "tools", "automate", "automation"], topic: "what_are_scripts", label: "What are scripts?" },
  { triggers: ["memory", "remember", "forget", "remembers", "change"],   topic: "how_memory_works",      label: "How does memory work?" },
  { triggers: ["license", "source", "open", "bsl", "mit", "available"], topic: "why_source_available",   label: "Why source-available?" },
  // Practical / instructional
  { triggers: ["install", "set up", "setup", "get started", "start", "begin", "getting started", "requirements", "require", "need to", "prerequisites"],      topic: "how_to_install",  label: "How do I install?" },
  { triggers: ["sign up", "signup", "register", "join", "invite", "invitation", "apply"], topic: "how_to_source",    label: "How do I get source access?" },
  { triggers: ["cost", "price", "pricing", "free", "pay", "money", "subscription", "plan"],            topic: "how_to_cost",     label: "What does it cost?" },
  { triggers: ["language", "languages", "python", "rust", "java", "typescript", "ruby", "go", "cpp", "swift"], topic: "how_to_languages", label: "What languages does it support?" },
  { triggers: ["api key", "api_key", "anthropic", "openai", "gemini", "key", "token", "provider"],     topic: "how_to_api_key",  label: "Do I need an API key?" },
  { triggers: ["model", "llm", "claude", "gpt", "which model", "what model"],                          topic: "how_to_model",    label: "What model does it use?" },
  { triggers: ["try", "demo", "preview", "test", "sample", "example"],                                 topic: "how_to_try",      label: "Can I try it?" },
  // Meta / self-aware
  { triggers: ["are you ai", "are you real", "are you alive", "sentient", "conscious", "artificial"],  topic: "meta_self",       label: "Are you AI?" },
  { triggers: ["feel", "feelings", "emotion", "aware", "think", "alive"],                              topic: "meta_feelings",   label: "Do you have feelings?" },
  { triggers: ["who made", "who built", "who created", "creator", "developer", "behind"],              topic: "meta_who_made",   label: "Who made Soma?" },
  { triggers: ["cursor", "copilot", "windsurf", "claude code", "cline", "better", "competitor", "vs", "compared"], topic: "meta_competitor", label: "How does Soma compare?" },
  { triggers: ["how do you work", "how does this work", "what are you", "how are you built"],          topic: "meta_how_work",   label: "How does this CLI work?" },
  { triggers: ["cool", "amazing", "impressive", "wow", "nice", "love", "awesome", "brilliant"],        topic: "meta_impressed",  label: "I'm impressed" },
  // Catch-all — "what is soma", generic questions (no "you" — too greedy)
  { triggers: ["soma", "agent", "what is"],                              topic: "what_is_soma",          label: "What is Soma?" },
];

function matchQuestion(input) {
  const lower = input.toLowerCase();
  let best = null;
  let bestScore = 0;
  for (const q of QUESTION_MAP) {
    const score = q.triggers.filter(t => lower.includes(t)).length;
    // Weight: specific topics (listed first) get a slight bonus
    // to break ties with the generic catch-all
    if (score > bestScore) {
      bestScore = score;
      best = q;
    }
  }
  // If only generic triggers matched ("what", "about"), prefer
  // the catch-all over a false-positive on a specific topic
  return best;
}

function wrapText(text, indent = "  ", width = 58) {
  const words = text.split(" ");
  const lines = [];
  let line = indent;
  for (const word of words) {
    if (line.length + word.length > width + indent.length && line.trim()) {
      lines.push(line);
      line = indent + word;
    } else {
      line += (line.trim() ? " " : "") + word;
    }
  }
  if (line.trim()) lines.push(line);
  return lines.join("\n");
}

function readLine(prompt) {
  return new Promise(resolve => {
    process.stdout.write(prompt);
    if (!process.stdin.isTTY) { resolve(""); return; }
    process.stdin.setRawMode(false);
    process.stdin.resume();
    process.stdin.setEncoding("utf-8");
    let buf = "";
    const onData = chunk => {
      buf += chunk;
      if (buf.includes("\n")) {
        process.stdin.pause();
        process.stdin.removeListener("data", onData);
        resolve(buf.trim());
      }
    };
    process.stdin.on("data", onData);
  });
}

async function handleQuestion(input) {
  const match = matchQuestion(input);
  if (match) {
    const answer = voice.ask(match.topic);
    console.log("");
    await typeParagraph(answer);
    return true;
  }

  // Edge case routing — detect intent even without a topic match
  const lower = input.toLowerCase();
  const rude = /suck|stupid|dumb|trash|garbage|hate|worst|bad|ugly|boring|lame|waste/.test(lower);
  const impressed = /cool|amazing|wow|nice|love|awesome|brilliant|impressive|neat|sick|fire|goat/.test(lower);
  const meta = /are you|what are you|how do you|who are you|real|alive|ai\b|bot\b/.test(lower);
  const greeting = /^(hi|hey|hello|sup|yo|howdy|hola|greetings|good morning|good evening)\b/.test(lower);

  console.log("");
  if (greeting) {
    await typeOut(`  ${voice.greet()} ${voice.spin("{Ask me anything.|What do you want to know?|I know about 9 topics — pick one.}")}\n`);
  } else if (rude) {
    await typeParagraph(voice.ask("meta_rude"));
  } else if (impressed) {
    await typeParagraph(voice.ask("meta_impressed"));
  } else if (meta) {
    await typeParagraph(voice.ask("meta_self"));
  } else {
    // Anything with a question mark → try harder, then admit we don't know
    if (input.includes("?")) {
      await typeParagraph(voice.ask("meta_nonsense"));
    } else {
      await typeParagraph(voice.ask("meta_nonsense"));
    }
  }
  return false;
}

async function interactiveQ() {
  console.log("");
  console.log(`  ${bold("Ask me anything.")}`);
  console.log("");
  console.log(`    ${dim("•")} How do I install?    ${dim("•")} What is heat?`);
  console.log(`    ${dim("•")} What does it cost?   ${dim("•")} What are muscles?`);
  console.log(`    ${dim("•")} Why no compaction?   ${dim("•")} Are you AI?`);
  console.log(`    ${dim("•")} How does it compare? ${dim("•")} Who made this?`);
  console.log("");
  console.log(`  ${dim("...or ask anything. Press")} ${green("Enter")} ${dim("when you're ready to install.")}`);

  let rounds = 0;
  const maxRounds = 8;

  while (rounds < maxRounds) {
    console.log("");
    const input = await readLine(`  ${cyan("?")} `);

    // Empty input or quit → exit Q&A, proceed to install
    if (!input || input === "q" || input === "quit" || input === "exit") {
      break;
    }

    await handleQuestion(input);
    rounds++;

    if (rounds < maxRounds) {
      console.log("");
      console.log(`  ${dim("Ask another, or")} ${green("Enter")} ${dim("to install Soma.")}`);
    }
  }

  if (rounds >= maxRounds) {
    console.log("");
    await typeOut(`  ${voice.spin("{Curious enough?|Intrigued?|Want to see it in action?}")} ${dim("Let's set you up.")}\n`);
  }
}

// ── GitHub check ─────────────────────────────────────────────────────

function hasGitHubCLI() {
  try {
    execSync("gh --version", { stdio: "ignore" });
    return true;
  } catch { return false; }
}

function getGitHubUsername() {
  try {
    return execSync("gh api user -q .login", { encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] }).trim();
  } catch { return null; }
}

// ── Commands ─────────────────────────────────────────────────────────

async function showWelcome() {
  printSigma();
  console.log(`  ${bold("Soma")} ${dim("—")} ${white("the AI agent that remembers")}`);
  console.log("");

  // Runtime installed → delegate to it
  if (isInstalled()) {
    const config = readConfig();
    const ghUser = hasGitHubCLI() ? getGitHubUsername() : null;
    if (ghUser) {
      console.log(`  ${green("✓")} ${voice.greetBack(ghUser)}`);
    }
    console.log(`  ${green("✓")} Core installed. Starting Soma...`);
    console.log("");
    await delegateToCore();
    return;
  }

  // Not installed — guided setup flow
  const concept = CONCEPTS[getConceptIndex()];
  const body = getConceptBody(concept.topic);

  console.log(`  ${magenta("❝")} ${bold(concept.title)}`);
  console.log("");
  await typeParagraph(body);
  console.log("");
  console.log(`  ${dim("─".repeat(58))}`);
  console.log("");
  console.log(`  ${dim("→")} Press ${green("Enter")} to set up Soma, or type a question.`);
  console.log("");

  const input = await readLine(`  ${dim("Your move:")} `);

  if (input && input !== "") {
    // User typed something — treat as a question, then offer setup
    await handleQuestion(input);
    await interactiveQ();
  }

  // Proceed to install (whether they asked questions first or just pressed Enter)
  await initSoma();

  console.log("");
  console.log(`  ${dim(`v${VERSION} · BSL 1.1 · soma.gravicity.ai`)}`);
  console.log("");
}

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
  console.log(`soma v${VERSION}`);
}

async function showAbout() {
  printSigma();
  console.log(`  ${bold("What is Soma?")}`);
  console.log("");
  console.log("  Soma is an AI coding agent that grows with you.");
  console.log("  It remembers across sessions — not by storing chat logs,");
  console.log("  but by evolving its own working patterns through use.");
  console.log("");
  console.log(`  ${bold("How it works:")}`);
  console.log("");
  console.log(`  ${cyan("1.")} ${bold("Identity")} — The agent maintains a self-written identity file.`);
  console.log(`     It knows your project, your patterns, your preferences.`);
  console.log("");
  console.log(`  ${cyan("2.")} ${bold("Protocols")} — Behavioural rules that shape how the agent works.`);
  console.log(`     "Read before write." "Test before commit." They have heat —`);
  console.log(`     used ones stay hot, unused ones fade.`);
  console.log("");
  console.log(`  ${cyan("3.")} ${bold("Muscles")} — Learned patterns. "Use esbuild for bundling."`);
  console.log(`     "This API uses OAuth, not API keys." Muscles grow from`);
  console.log(`     corrections and repetition.`);
  console.log("");
  console.log(`  ${cyan("4.")} ${bold("Breath Cycle")} — Inhale (load state) → Hold (work) → Exhale`);
  console.log(`     (save state). At context limits, the agent writes a preload`);
  console.log(`     for its next self — a briefing, not a summary.`);
  console.log("");
  console.log(`  ${cyan("5.")} ${bold("Scripts")} — The agent builds tools for itself. What it does`);
  console.log(`     twice manually, it automates. Scripts survive across sessions.`);
  console.log("");
  console.log(`  ${dim("─".repeat(58))}`);
  console.log("");

  // Show a generated "what is soma" paragraph — different every time
  const pitch = voice.ask("what_is_soma");
  await typeOut(`  ${magenta("❝")} ${italic(pitch)}\n`);
  console.log("");

  if (!isInstalled()) {
    console.log(`  ${dim("→")} ${green("soma init")} to install  ${dim("·")}  ${cyan(SITE_URL)}`);
  } else {
    console.log(`  ${dim(SITE_URL)}`);
  }
  console.log("");
}

async function initSoma() {
  printSigma();
  console.log(`  ${bold("Soma")} — Install`);
  console.log("");

  // Check git is available
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

  // Validate existing install — check it's a real git repo with dist/ content
  const isValidInstall = existsSync(installDir) 
    && existsSync(join(installDir, ".git"))
    && (existsSync(join(installDir, "dist", "extensions")) || existsSync(join(installDir, "extensions")));

  if (existsSync(installDir) && !isValidInstall) {
    // Broken/partial install — ask before replacing
    console.log(`  ${yellow("⚠")} Incomplete installation detected at ${dim("~/.soma/agent/")}`);
    console.log(`    ${dim("Missing:")} ${!existsSync(join(installDir, ".git")) ? ".git (not a git repo)" : "dist/ core files"}`);
    console.log("");

    // Check for any user-created files (beyond what git clone would produce)
    let hasCustomFiles = false;
    try {
      const entries = readdirSync(installDir);
      const expectedFiles = [".git", "dist", "extensions", "core", "node_modules", "package.json", "package-lock.json", "README.md", "LICENSE", ".gitignore", "auth.json", "models.json", "piConfig.json"];
      const custom = entries.filter(f => !expectedFiles.includes(f));
      hasCustomFiles = custom.length > 0;
      if (hasCustomFiles) {
        console.log(`    ${yellow("Custom files found:")} ${custom.slice(0, 5).join(", ")}${custom.length > 5 ? ` (+${custom.length - 5} more)` : ""}`);
      } else {
        console.log(`    ${dim("No custom files detected — safe to replace.")}`);
      }
    } catch {}

    console.log("");
    const shouldReplace = await confirmYN(`  ${dim("→")} Replace core files and re-install?`);
    if (!shouldReplace) {
      console.log("");
      console.log(`  ${dim("Skipped. To fix manually:")}`);
      console.log(`    ${green("rm -rf ~/.soma/agent && soma init")}`);
      console.log("");
      return;
    }

    try {
      execSync(`rm -rf "${installDir}"`, { stdio: "ignore" });
    } catch {
      console.log(`  ${red("✗")} Could not remove broken install at ${dim(installDir)}`);
      console.log(`  ${dim("Try manually:")} rm -rf ~/.soma/agent && soma init`);
      console.log("");
      return;
    }
  }

  if (isValidInstall) {
    console.log(`  ${dim("→")} Runtime already installed.`);

    // Pull latest
    try {
      console.log(`  ${yellow("⏳")} Checking for updates...`);
      execSync("git pull --ff-only", { cwd: installDir, stdio: "ignore" });
      console.log(`  ${green("✓")} Up to date`);
    } catch {
      console.log(`  ${green("✓")} Already current`);
    }
  } else {
    // Clone from soma-beta (public — no auth needed)
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

  // Install Pi dependencies
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

  // Verify — gate success on actual working install
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

  // Save config
  const config = readConfig();
  config.installedAt = config.installedAt || new Date().toISOString();
  config.coreVersion = VERSION;
  config.installPath = installDir;
  writeConfig(config);

  console.log("");
  console.log(`  ${green("✓")} ${bold("Soma is installed!")}`);
  console.log("");

  // API key check — guide the user if not set
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log(`  ${yellow("⚠")} ${bold("API key needed")} — Soma uses Claude via your Anthropic key.`);
    console.log("");
    console.log(`  ${cyan("1.")} Get a key at ${cyan("https://console.anthropic.com/settings/keys")}`);
    console.log(`  ${cyan("2.")} Add to your shell config:`);
    console.log("");
    console.log(`     ${green('export ANTHROPIC_API_KEY="sk-ant-..."')}`);
    console.log("");
    const shellConfig = process.env.SHELL?.includes("zsh") ? "~/.zshrc" : "~/.bashrc";
    console.log(`     ${dim(`Add that line to ${shellConfig}, then restart your terminal.`)}`);
    console.log("");
    console.log(`  ${dim("─".repeat(58))}`);
    console.log("");
  }

  console.log(`  Next steps:`);
  console.log(`    ${cyan("1.")} ${green("cd <your-project>")}`);
  console.log(`    ${cyan("2.")} ${green("soma")} to start your first session`);
  console.log("");
  console.log(`  Soma will create a ${dim(".soma/")} directory in your project`);
  console.log(`  and begin learning how you work.`);
  console.log("");
}

function checkForUpdates() {
  printSigma();
  console.log(`  ${bold("Soma")} — Update Check`);
  console.log("");
  console.log(`  CLI version:  ${cyan(`v${VERSION}`)}`);

  const config = readConfig();
  if (config.coreVersion) {
    console.log(`  Core version: ${cyan(`v${config.coreVersion}`)}`);
  }

  // Check npm for CLI updates
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

  // Check core updates (pull latest if git repo)
  if (isInstalled() && config.installPath) {
    try {
      // Fetch first so rev-list has fresh data
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

async function doctor() {
  printSigma();
  console.log(`  ${bold("Soma")} — Health Check`);
  console.log("");

  let issues = 0;
  const check = (ok, pass, fail) => {
    if (ok) { console.log(`  ${green("✓")} ${pass}`); }
    else { console.log(`  ${red("✗")} ${fail}`); issues++; }
  };
  const warn = (ok, pass, fail) => {
    if (ok) { console.log(`  ${green("✓")} ${pass}`); }
    else { console.log(`  ${yellow("⚠")} ${fail}`); }
  };

  // Node.js
  const nodeVersion = process.versions.node;
  const [major, minor] = nodeVersion.split(".").map(Number);
  check(major > 20 || (major === 20 && minor >= 6),
    `Node.js ${nodeVersion}`,
    `Node.js ${nodeVersion} — requires ≥20.6.0`
  );

  // ~/.soma directory
  check(existsSync(SOMA_HOME), "~/.soma/ exists", "~/.soma/ not found — run: soma init");

  // Core installation
  const installed = isInstalled();
  check(installed, "Core installed", "Core not installed — run: soma init");

  if (installed) {
    // Extensions (check both dist/ layout and dev layout)
    const extDir = existsSync(join(CORE_DIR, "dist", "extensions"))
      ? join(CORE_DIR, "dist", "extensions")
      : join(CORE_DIR, "extensions");
    if (existsSync(extDir)) {
      const exts = readdirSync(extDir).filter(f => f.endsWith(".js") || f.endsWith(".ts"));
      check(exts.length >= 6, `${exts.length} extensions`, `Only ${exts.length} extensions (expected ≥6)`);
    }

    // Core modules
    const coreDir = existsSync(join(CORE_DIR, "dist", "core"))
      ? join(CORE_DIR, "dist", "core")
      : join(CORE_DIR, "core");
    check(existsSync(coreDir), "Core modules present", "Core modules missing");

    // Git repo health
    try {
      execSync("git status --porcelain", { cwd: CORE_DIR, stdio: "ignore" });
      check(true, "Git repo healthy", "");
    } catch {
      warn(false, "", "Core git repo has issues");
    }
  }

  // API key
  const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
  warn(hasApiKey,
    "ANTHROPIC_API_KEY set",
    "ANTHROPIC_API_KEY not set — needed for sessions"
  );
  if (!hasApiKey) {
    const shellConfig = process.env.SHELL?.includes("zsh") ? "~/.zshrc" : "~/.bashrc";
    console.log(`    ${dim("Get a key:")} ${cyan("https://console.anthropic.com/settings/keys")}`);
    console.log(`    ${dim("Then add:")} ${green('export ANTHROPIC_API_KEY="sk-ant-..."')} ${dim(`to ${shellConfig}`)}`);
  }

  // Git
  try {
    const gitV = execSync("git --version", { encoding: "utf-8" }).trim();
    check(true, gitV, "");
  } catch {
    check(false, "", "git not found");
  }

  console.log("");
  if (issues === 0) {
    console.log(`  ${green("✓ All checks passed")}`);

  } else {
    console.log(`  ${yellow(`${issues} issue${issues > 1 ? "s" : ""} found`)}`);
    console.log(`  ${voice.say("suggest", { suggestion: issues > 2 ? "start with soma init" : "check the items above" })}`);
  }
  console.log("");
}

function showStatus() {
  printSigma();
  console.log(`  ${bold("Soma")} — Status`);
  console.log("");

  const config = readConfig();
  const installed = isInstalled();

  console.log(`  Version:     ${cyan(`v${VERSION}`)}`);
  console.log(`  Home:        ${dim(SOMA_HOME)}`);
  console.log(`  Installed:   ${installed ? green("yes") : red("no")}`);
  if (config.installedAt) {
    console.log(`  Since:       ${dim(config.installedAt.split("T")[0])}`);
  }

  if (installed && config.installPath) {
    try {
      const hash = execSync("git rev-parse --short HEAD", {
        cwd: config.installPath, encoding: "utf-8"
      }).trim();
      const branch = execSync("git rev-parse --abbrev-ref HEAD", {
        cwd: config.installPath, encoding: "utf-8"
      }).trim();
      console.log(`  Core:        ${dim(`${branch}@${hash}`)}`);
    } catch {}
  }

  console.log("");
}

// ── Delegation ───────────────────────────────────────────────────────

async function delegateToCore() {
  const { execFileSync: execF } = await import("child_process");
  const passArgs = process.argv.slice(2);

  const cliLocations = [
    { path: join(CORE_DIR, "dist", "cli.js"),              type: "node" },
    { path: join(CORE_DIR, "node_modules", ".bin", "pi"),  type: "bin" },
  ];

  // Discover user extensions in project .soma/extensions/
  // Pi without piConfig only looks at .pi/extensions/, not .soma/extensions/
  // We pass them explicitly via -e flags
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
    // Pi reads ENV_AGENT_DIR dynamically based on APP_NAME from piConfig.
    // With piConfig.name="soma", Pi looks for SOMA_CODING_AGENT_DIR.
    // Without piConfig (raw pi binary), it looks for PI_CODING_AGENT_DIR.
    // Set BOTH so delegation works regardless of piConfig load order.
    PI_CODING_AGENT_DIR: CORE_DIR,
    SOMA_CODING_AGENT_DIR: CORE_DIR,
    // Override Pi's package dir so it reads piConfig from soma-beta's package.json
    // This gives us APP_NAME="soma", CONFIG_DIR_NAME=".soma" → project .soma/ paths
    PI_PACKAGE_DIR: CORE_DIR,
  };

  for (const cli of cliLocations) {
    if (existsSync(cli.path)) {
      try {
        const allArgs = [...userExtArgs, ...passArgs];
        if (cli.type === "node") {
          execF("node", [cli.path, ...allArgs], { stdio: "inherit", cwd: process.cwd(), env });
        } else {
          execF(cli.path, allArgs, { stdio: "inherit", cwd: process.cwd(), env });
        }
        return;
      } catch (err) {
        if (err.status) process.exit(err.status);
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

if (cmd === "--version" || cmd === "-v" || cmd === "-V") {
  showVersion();
} else if (cmd === "--help" || cmd === "-h") {
  showHelp();
} else if (cmd === "about") {
  await showAbout();
} else if (cmd === "init") {
  // If runtime is installed AND (has --template/--orphan args OR no .soma/ in cwd),
  // route to project init via content-cli instead of runtime install
  const hasProjectArgs = args.includes("--template") || args.includes("--orphan") || args.includes("-o");
  const runtimeInstalled = isInstalled();
  const hasSomaDir = existsSync(join(process.cwd(), ".soma"));
  
  if (runtimeInstalled && (hasProjectArgs || !hasSomaDir)) {
    // Delegate to content-cli for project init
    await delegateToCore();
  } else {
    await initSoma();
  }
} else if (cmd === "update") {
  checkForUpdates();
} else if (cmd === "doctor") {
  await doctor();
} else if (cmd === "status") {
  showStatus();
} else if (isInstalled()) {
  // Core installed — delegate to runtime
  await delegateToCore();
} else {
  // Check if user typed a known post-install command
  const postInstallCmds = ["focus", "inhale", "content", "install", "list", "map", "--map", "--preload"];
  if (cmd && postInstallCmds.includes(cmd)) {
    printSigma();
    console.log(`  ${bold("soma " + cmd)} requires the Soma runtime.`);
    console.log("");
    console.log(`  Run ${green("soma init")} to install it.`);
    console.log("");
  } else {
    // Not installed or not verified — show welcome experience
    await showWelcome();
  }
}
