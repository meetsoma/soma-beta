#!/usr/bin/env node
/**
 * CLI entry point for Soma (meetsoma).
 *
 * Uses Pi's main.ts with AgentSession and new mode modules.
 * Supports auto-rotation: when an extension writes .soma/.rotate-signal
 * and triggers shutdown, we re-exec the process for a fresh session.
 *
 * Test with: npx tsx src/cli-new.ts [args...]
 */
process.title = "soma";
// Soma has its own versioning — skip Pi's upstream version check
// which compares Soma 0.1.0 against pi-coding-agent 0.57.1 on npm
process.env.PI_SKIP_VERSION_CHECK = "1";
import { setBedrockProviderModule } from "@earendil-works/pi-ai";
import { bedrockProviderModule } from "@earendil-works/pi-ai/bedrock-provider";
import { EnvHttpProxyAgent, setGlobalDispatcher } from "undici";
import { main } from "./main.js";
import { existsSync, unlinkSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from "fs";
import { join, resolve } from "path";
import { execFileSync } from "child_process";
setGlobalDispatcher(new EnvHttpProxyAgent());
setBedrockProviderModule(bedrockProviderModule);

// ── Auto-rotation support ──────────────────────────────────────────────
// When auto-breathe triggers rotation but no command context is available
// (Pi only exposes newSession() in command handlers), the extension writes
// .soma/.rotate-signal and calls ctx.shutdown(). Pi's shutdown calls
// process.exit(0). We intercept that exit to check for the rotation signal
// and re-exec if found — giving the user a seamless fresh session.
//
// The re-exec spawns a NEW process via execFileSync (stdio: inherit),
// which blocks the parent until the child exits. This means each rotation
// adds one level of process nesting. SOMA_ROTATION_DEPTH limits this to
// prevent runaway loops (default: 5).
// ────────────────────────────────────────────────────────────────────────
const MAX_ROTATIONS = parseInt(process.env.SOMA_MAX_ROTATIONS || "5", 10);
const currentDepth = parseInt(process.env.SOMA_ROTATION_DEPTH || "0", 10);

const _realExit = process.exit;
process.exit = function somaRotationExit(code) {
	if (code === 0 && currentDepth < MAX_ROTATIONS) {
		try {
			const signal = join(process.cwd(), ".soma", ".rotate-signal");
			if (existsSync(signal)) {
				// Read signal metadata (optional — for logging)
				let meta = {};
				try { meta = JSON.parse(readFileSync(signal, "utf-8")); } catch {}
				unlinkSync(signal);

				// Log rotation
				const reason = meta.reason || "auto-breathe";
				process.stderr.write(`\n🫧 Rotating session (${reason})...\n\n`);

				// Re-exec with incremented depth counter
				try {
					execFileSync(process.execPath, process.argv.slice(1), {
						stdio: "inherit",
						env: {
							...process.env,
							SOMA_ROTATION_DEPTH: String(currentDepth + 1),
						},
					});
				} catch {
					// Child exited non-zero — that's fine, we still exit cleanly
				}

				_realExit.call(process, 0);
				return;
			}
		} catch {
			// Signal check failed — fall through to normal exit
		}
	}
	_realExit.call(process, code);
};

// ── [SX-759 + SX-763] Resource path discovery ─────────────────────────
// Inject resource paths into Pi's --extension / --skill / --prompt-template /
// --theme flags BEFORE argv slicing. Three tiers, injected in order:
//
//   Tier 1 (user-global):   ~/.soma/<resource>/  — user-owned, outside worktree
//   Tier 2 (ancestor walk):  ../.soma/<resource>/ — parent project workspaces
//
// Tier 0 (runtime): ~/.soma/agent/<resource>/ is auto-discovered by Pi's
// addAutoDiscoveredResources (package-manager.js:1770). Not our concern.
//
// Tier 3 (CWD project): <cwd>/.soma/<resource>/ is also auto-discovered by Pi.
// Not injected — Pi handles it.
//
// Why this exists: ~/.soma/agent/ is the runtime install (a git worktree).
// Editing it = drift between sibling soma sessions. ~/.soma/<resource>/ is
// a clean user-global location, NOT under any git worktree.
//
// Pi's loader reads `parsed.extensions` / `parsed.skills` / etc. from CLI
// args parsed out of process.argv. We push the flags in here so every
// sub-command (including those that pass `[]` to main) and the rotation
// re-exec inherit them.
//
// Skip injection if the directory doesn't exist OR the user passed a
// matching opt-out flag. Always honor user opt-out.
//
// Meta-cycle 04 Phase 2 (s01-8657fc). Ancestor walk-up added s01-68563d
// (SX-763). See body/ecosystem.md for the canonical layout rule.
(function injectUserGlobalPaths() {
	try {
		const home = process.env.HOME || "";
		if (!home) return;
		const argv = process.argv;
		const injections = [
			{ subdir: "extensions", flag: "--extension", optOut: ["--no-extensions", "-ne"] },
			{ subdir: "skills", flag: "--skill", optOut: ["--no-skills", "-ns"] },
			{ subdir: "prompts", flag: "--prompt-template", optOut: ["--no-prompt-templates", "-np"] },
			{ subdir: "themes", flag: "--theme", optOut: ["--no-themes"] },
		];

		const discoverExtensionFiles = (dir) => {
			if (!existsSync(dir)) return [];
			try {
				return readdirSync(dir, { withFileTypes: true })
					.filter(e => (e.isFile() || e.isSymbolicLink()) && (e.name.endsWith(".ts") || e.name.endsWith(".js")))
					.map(e => join(dir, e.name));
			} catch {
				return [];
			}
		};

		// ── Tier 1: User-global (~/.soma/<resource>/) ────────────────────
		// Seed example extensions on first run so the dir isn't empty.
		const userExtDir = join(home, ".soma", "extensions");
		if (!existsSync(userExtDir)) {
			try {
				mkdirSync(userExtDir, { recursive: true });
				writeFileSync(join(userExtDir, "README.md"),
					"# Your Extensions\n\n" +
					"Extensions you put here are loaded automatically by Soma.\n" +
					"They live outside the runtime install — edit freely.\n\n" +
					"## Getting Started\n\n" +
					"- `hello-world.ts` — registers a simple tool\n" +
					"- `_template.ts` — copy-paste starter with common patterns\n\n" +
					"Docs: https://soma.gravicity.ai/docs/extending\n"
				);
				writeFileSync(join(userExtDir, "hello-world.ts"),
					'// hello-world.ts — Your first Soma extension\n' +
					'// This registers a simple tool. Rename, modify, make it yours.\n\n' +
					'import type { Pi } from "@earendil-works/pi-coding-agent";\n\n' +
					'export default function activate(pi: Pi) {\n' +
					'  pi.registerTool({\n' +
					'    name: "helloWorld",\n' +
					'    description: "Say hello — your first custom tool.",\n' +
					'    parameters: {\n' +
					'      type: "object",\n' +
					'      properties: {\n' +
					'        name: { type: "string", description: "Who to greet" },\n' +
					'      },\n' +
					'      required: ["name"],\n' +
					'    },\n' +
					'    handler: async ({ name }) => {\n' +
					'      return `Hello, ${name}! 👋`;\n' +
					'    },\n' +
					'  });\n' +
					'}\n'
				);
				writeFileSync(join(userExtDir, "_template.ts"),
					'// _template.ts — Soma extension starter\n' +
					'// Copy this file and rename it to start a new extension.\n\n' +
					'import type { Pi } from "@earendil-works/pi-coding-agent";\n\n' +
					'export default function activate(pi: Pi) {\n' +
					'  // ── Register a tool ──\n' +
					'  pi.registerTool({\n' +
					'    name: "myTool",\n' +
					'    description: "What this tool does — shown to the agent.",\n' +
					'    parameters: {\n' +
					'      type: "object",\n' +
					'      properties: {\n' +
					'        input: { type: "string", description: "What to process" },\n' +
					'      },\n' +
					'      required: ["input"],\n' +
					'    },\n' +
					'    handler: async ({ input }) => {\n' +
					'      // Your logic here. Return a string or an object.\n' +
					'      return `Processed: ${input}`;\n' +
					'    },\n' +
					'  });\n\n' +
					'  // ── Register a slash command ──\n' +
					'  pi.registerCommand("mycommand", {\n' +
					'    description: "What /mycommand does.",\n' +
					'    handler: async (_args, ctx) => {\n' +
					'      ctx.ui.notify("Command ran!", "info");\n' +
					'    },\n' +
					'  });\n\n' +
					'  // ── Hook into session events ──\n' +
					'  pi.on("session_start", (event) => {\n' +
					'    // Runs once per session. event.reason = "startup" | "new" | "resume"\n' +
					'  });\n' +
					'}\n'
				);
			} catch { /* non-fatal; examples are a nicety */ }
		}

		for (const { subdir, flag, optOut } of injections) {
			if (optOut.some(o => argv.includes(o))) continue;
			const dirPath = join(home, ".soma", subdir);
			if (!existsSync(dirPath)) continue;
			if (subdir === "extensions") {
				const files = discoverExtensionFiles(dirPath);
				for (const f of files) {
					argv.push(flag, f);
				}
			} else {
				argv.push(flag, dirPath);
			}
		}

		// ── Tier 2: Ancestor .soma/ walk-up ─────────────────────────
		// Read inherit settings to gate walk-up per resource type.
		// Default: true for all (matches existing inherit block defaults).
		let inheritCfg = { extensions: true, skills: true, prompts: true, themes: true };
		try {
			const readSettings = (p) => {
				if (!existsSync(p)) return null;
				try { return JSON.parse(readFileSync(p, "utf-8")); } catch { return null; }
			};
			const cwd = process.cwd();
			const globalS = readSettings(join(home, ".soma", "settings.json"));
			const projectS = readSettings(join(cwd, ".soma", "settings.json"));
			if (globalS?.inherit) Object.assign(inheritCfg, globalS.inherit);
			if (projectS?.inherit) Object.assign(inheritCfg, projectS.inherit);
		} catch { /* use defaults */ }

		// Collect ancestors, then inject in REVERSE order (farthest first,
		// closest last). Pi's runner registers extensions in argv order;
		// last-registration wins for same-name tools. This gives child .soma/
		// higher priority than parent — same model as protocols/muscles/tools
		// in the inherit block and the existing addAutoDiscoveredResources
		// order (project before user-global).
		const cwd = process.cwd();
		let dir = resolve(cwd, "..");
		let distance = 0;
		const ancestorPaths = [];
		while (dir !== resolve(dir, "..") && distance < 10) {
			if (dir === home) break; // HOME handled by Tier 1
			const ancestorSoma = join(dir, ".soma");
			if (existsSync(ancestorSoma)) ancestorPaths.push(ancestorSoma);
			dir = resolve(dir, "..");
			distance++;
		}
		// Inject farthest ancestor first (registered earlier = lower priority),
		// closest ancestor last (registered later = higher priority).
		for (let i = ancestorPaths.length - 1; i >= 0; i--) {
			const ancestorSoma = ancestorPaths[i];
			for (const { subdir, flag, optOut } of injections) {
				if (inheritCfg[subdir] === false) continue;
				if (optOut.some(o => argv.includes(o))) continue;
				const resourcePath = join(ancestorSoma, subdir);
				if (!existsSync(resourcePath)) continue;
				if (subdir === "extensions") {
					const files = discoverExtensionFiles(resourcePath);
					for (const f of files) {
						argv.push(flag, f);
					}
				} else {
					argv.push(flag, resourcePath);
				}
			}
		}
	} catch {
		/* non-fatal; resource paths are an enhancement, not required */
	}
})();

// ── Command dispatch ───────────────────────────────────────────────────
const args = process.argv.slice(2);

// Version flag
if (args[0] === "--version" || args[0] === "-V" || args[0] === "-v" || args[0] === "version") {
	// Delegate to thin-cli which shows both agent + CLI versions
	const { dirname: dn } = await import("path");
	const { fileURLToPath: fu } = await import("url");
	const thisDir = dn(fu(import.meta.url));
	const thinCli = join(thisDir, "thin-cli.js");
	if (existsSync(thinCli)) {
		try { execFileSync(process.execPath, [thinCli, "--version"], { stdio: "inherit" }); }
		catch {}
	} else {
		const { readFileSync: rf } = await import("fs");
		const pkg = JSON.parse(rf(join(thisDir, "..", "package.json"), "utf-8"));
		console.log(`soma v${pkg.version}`);
	}
	process.exit(0);
}

// Help flag — Soma-branded help with our commands + Pi options
if (args[0] === "--help" || args[0] === "-h" || args[0] === "help") {
	const { readFileSync: rf, existsSync: ex, readdirSync: rd } = await import("fs");
	const { fileURLToPath } = await import("url");
	const { dirname, join: j } = await import("path");
	const __dirname = dirname(fileURLToPath(import.meta.url));
	const pkg = JSON.parse(rf(j(__dirname, "..", "package.json"), "utf-8"));

	const b = s => `\x1b[1m${s}\x1b[0m`;
	const d = s => `\x1b[2m${s}\x1b[0m`;
	const g = s => `\x1b[32m${s}\x1b[0m`;
	const c = s => `\x1b[36m${s}\x1b[0m`;

	const subHelp = args[1];

	// ── soma --help scripts ──
	if (subHelp === "scripts") {
		const scriptDirs = [
			j(process.cwd(), ".soma", "amps", "scripts"),
			j(process.cwd(), ".soma", "scripts"),
			j(process.env.HOME || "", ".soma", "amps", "scripts"),
		];
		const seen = new Set();
		const scripts = [];
		for (const dir of scriptDirs) {
			if (!ex(dir)) continue;
			for (const f of rd(dir)) {
				if (!f.endsWith(".sh") || seen.has(f)) continue;
				seen.add(f);
				try {
					const content = rf(j(dir, f), "utf-8");
					// Extract description from script header comment
					const descMatch = content.match(/^#\s*([a-z].*?\.)/im)
						|| content.match(/^#\s+soma-\S+\s+[—–-]+\s*(.+)/m)
						|| content.match(/^# USE WHEN:\s*(.+)/m);
					const desc = descMatch ? descMatch[1].trim() : "";
					scripts.push({ name: f, desc, dir });
				} catch { scripts.push({ name: f, desc: "", dir }); }
			}
		}
		// Also check commands/
		const cmdDirs = [
			j(process.cwd(), ".soma", "amps", "scripts", "commands"),
			j(process.cwd(), ".soma", "scripts", "commands"),
		];
		const commands = [];
		for (const dir of cmdDirs) {
			if (!ex(dir)) continue;
			for (const f of rd(dir)) {
				if (!f.endsWith(".sh") || seen.has(f)) continue;
				seen.add(f);
				try {
					const content = rf(j(dir, f), "utf-8");
					const descMatch = content.match(/^#\s*([a-z].*?\.)/im)
						|| content.match(/^description:\s*["']?(.+?)["']?$/m);
					const desc = descMatch ? descMatch[1].trim() : "";
					commands.push({ name: f.replace(/\.sh$/, ""), desc });
				} catch { commands.push({ name: f.replace(/\.sh$/, ""), desc: "" }); }
			}
		}

		console.log(``);
		console.log(`  ${b("σ  Installed Scripts")}`);
		console.log(``);
		if (scripts.length === 0) {
			console.log(`  ${d("No scripts found.")} Run ${g("soma init")} to seed bundled scripts.`);
		} else {
			for (const s of scripts) {
				const desc = s.desc ? d(` — ${s.desc}`) : "";
				console.log(`    ${g(s.name)}${desc}`);
			}
		}
		if (commands.length > 0) {
			console.log(``);
			console.log(`  ${b("Drop-in Commands")} ${d("(/soma <name> inside TUI)")}`);
			console.log(``);
			for (const cmd of commands) {
				const desc = cmd.desc ? d(` — ${cmd.desc}`) : "";
				console.log(`    ${c("/soma " + cmd.name)}${desc}`);
			}
		}
		console.log(``);
		console.log(`  ${d("Install more:")} ${g("soma hub install script <name>")}`);
		console.log(`  ${d("Browse available:")} ${g("/hub find script")} ${d("(inside TUI)")}`);
		console.log(``);
		process.exit(0);
	}

	// ── soma --help commands ──
	if (subHelp === "commands") {
		console.log(``);
		console.log(`  ${b("σ  All Commands")}`);
		console.log(``);
		console.log(`  ${b("CLI")} ${d("(from your shell):")}`);
		console.log(`    ${g("soma")}                     ${d("Fresh session")}`);
		console.log(`    ${g("soma inhale")}             ${d("Fresh session + last preload")}`);
		console.log(`    ${g("soma -c")}                 ${d("Continue last session")}`);
		console.log(`    ${g("soma -r")}                 ${d("Pick a session to resume")}`);
		console.log(`    ${g("soma focus <keyword>")}    ${d("Prime for a topic")}`);
		console.log(`    ${g("soma map <name>")}         ${d("Boot with a MAP")}`);
		console.log(`    ${g("soma model <pattern>")}    ${d("Switch default model (persistent)")}`);
		console.log(`    ${g("soma model --list")}       ${d("Show available models")}`);
		console.log(`    ${g("soma doctor")}              ${d("Project health + migration")}`);
		console.log(`    ${g("soma status")}              ${d("Infrastructure health check")}`);
		console.log(`    ${g("soma --help scripts")}     ${d("Show installed scripts")}`);
		console.log(``);
		console.log(`  ${b("Session")} ${d("(inside the TUI):")}`);
		console.log(`    ${c("/exhale")}     ${d("Save state + write preload")}`);
		console.log(`    ${c("/breathe")}    ${d("Save + rotate to fresh session")}`);
		console.log(`    ${c("/inhale")}     ${d("Check preload status")}`);
		console.log(`    ${c("/rest")}       ${d("Disable keepalive + exhale")}`);
		console.log(`    ${c("/exit")}       ${d("Save + quit")}`);
		console.log(``);
		console.log(`  ${b("Heat")} ${d("(inside the TUI):")}`);
		console.log(`    ${c("/pin <name>")}  ${d("Keep a muscle/protocol hot")}`);
		console.log(`    ${c("/kill <name>")} ${d("Drop to cold")}`);
		console.log(``);
		console.log(`  ${b("Hub")} ${d("(inside the TUI):")}`);
		console.log(`    ${c("/hub install <type> <name>")}  ${d("Install from hub")}`);
		console.log(`    ${c("/hub find <keywords>")}        ${d("Search hub content")}`);
		console.log(`    ${c("/hub list [type]")}             ${d("Show installed AMPS")}`);
		console.log(`    ${c("/hub fork <type> <name>")}      ${d("Fork + install")}`);
		console.log(`    ${c("/hub share <type> <name>")}     ${d("Share to hub")}`);
		console.log(``);
		console.log(`  ${b("Info")} ${d("(inside the TUI):")}`);
		console.log(`    ${c("/soma")}       ${d("Status — identity, protocols, commands")}`);
		console.log(`    ${c("/soma prompt")} ${d("Preview compiled system prompt")}`);
		console.log(`    ${c("/body")}       ${d("Template inspector")}`);
		console.log(`    ${c("/status")}     ${d("Context %, cache, turns, uptime")}`);
		console.log(`    ${c("/scratch")}    ${d("Quick notes")}`);
		console.log(`    ${c("/code")}       ${d("Codebase navigator (wraps soma-code.sh)")}`);
		console.log(``);
		process.exit(0);
	}

	console.log(``);
	console.log(`  ${b("σ  Soma")} ${d(`CLI v${pkg.version}`)} ${d("— AI coding agent with self-growing memory")}`);
	console.log(``);
	console.log(`  ${b("Usage:")}  soma ${d("[command] [options] [@files...] [messages...]")}`);
	console.log(``);
	console.log(`  ${b("Session Commands:")}`);
	console.log(`    ${g("soma")}                     ${d("Fresh session — clean slate, no preload")}`);
	console.log(`    ${g("soma inhale")}             ${d("Fresh session + auto-load last preload")}`);
	console.log(`    ${g("soma inhale --list")}      ${d("Show available preloads with age")}`);
	console.log(`    ${g("soma inhale <name>")}     ${d("Load a specific preload by name")}`);
	console.log(`    ${g("soma -c")}                 ${d("Continue last session (full history)")}`);
	console.log(`    ${g("soma -r")}                 ${d("Resume — pick from previous sessions")}`);
	console.log(``);
	console.log(`  ${b("Project Commands:")}`);
	console.log(`    ${g("soma focus <keyword>")}    ${d("Prime next session for a topic")}`);
	console.log(`    ${g("soma focus show|clear")}   ${d("Check or remove focus state")}`);
	console.log(`    ${g("soma map <name>")}         ${d("Boot with a MAP workflow loaded")}`);
	console.log(`    ${g("soma map --list")}         ${d("Show available MAPs")}`);
	console.log(`    ${g("soma model <pattern>")}    ${d("Switch default model (persistent)")}`);
	console.log(`    ${g("soma model --list")}       ${d("Show available models")}`);
	console.log(`    ${g("soma doctor")}              ${d("Project health + migration")}`);
	console.log(`    ${g("soma status")}              ${d("Infrastructure health check")}`);
	console.log(``);
	console.log(`  ${b("Script Commands")} ${d("(discovered from scripts/):")}`);  
	console.log(`    ${g("soma code <cmd>")}          ${d("Codebase navigator — find, map, refs, blast")}`);  
	console.log(`    ${g("soma verify")}              ${d("Project health checks")}`);  
	console.log(`    ${g("soma refactor <cmd>")}      ${d("Dependency graph, blast radius")}`);  
	console.log(`    ${g("soma <name> [args]")}       ${d("Any soma-<name>.sh in scripts/ or .soma/")}`);  
	console.log(`    ${g("soma --help scripts")}      ${d("Show all installed scripts")}`);  
	console.log(``);
	console.log(`  ${b("Session Options")} ${d("(apply to this session only):")}`);  
	console.log(`    ${g("--model <pattern>")}        ${d("Use a specific model for this session")}`);
	console.log(`    ${g("--provider <name>")}        ${d("Use a specific provider for this session")}`);
	console.log(`    ${g("--thinking <level>")}       ${d("Thinking: off, minimal, low, medium, high, xhigh")}`);
	console.log(`    ${g("--models <list>")}          ${d("Limit Ctrl+P cycling to these models")}`);
	console.log(`    ${g("--print, -p")}              ${d("Non-interactive: process prompt and exit")}`);
	console.log(`    ${g("--no-session")}             ${d("Ephemeral session (not saved)")}`);
	console.log(`    ${g("--no-context-files, -nc")}  ${d("Skip AGENTS.md / CLAUDE.md loading")}`);
	console.log(`    ${g("--tools <list>")}           ${d("Tools to enable (default: read,bash,edit,write)")}`);
	console.log(`    ${g("--extension, -e <path>")}   ${d("Load an extension file")}`);
	console.log(`    ${g("--skill <path>")}           ${d("Load a skill file or directory")}`);
	console.log(`    ${g("--export [session.jsonl]")} ${d("Export session as HTML")}`);
	console.log(`    ${g("--list-models [search]")}   ${d("List all available models")}`);
	console.log(``);
	console.log(`  ${b("Session Slash Commands")} ${d("(inside the TUI):")}`);
	console.log(`    ${c("/exhale")}    ${d("Save state + write preload — ends session")}`);
	console.log(`    ${c("/breathe")}   ${d("Save state + rotate into fresh session")}`);
	console.log(`    ${c("/inhale")}    ${d("Check preload status (not the same as")} ${g("soma inhale")}${d("!)")}`);
	console.log(`    ${c("/rest")}      ${d("Disable keepalive + exhale — for end of day")}`);
	console.log(`    ${c("/pin")}       ${d("Keep a muscle/protocol hot across sessions")}`);
	console.log(`    ${c("/kill")}      ${d("Drop a muscle/protocol to cold")}`);
	console.log(`    ${c("/hub")}       ${d("Install, find, share community content")}`);
	console.log(`    ${c("/soma")}      ${d("Status, init, prompt, debug, drop-in commands")}`);
	console.log(``);
	console.log(`  ${d("Docs: https://soma.gravicity.ai/docs")}`);
	console.log(``);
	process.exit(0);
}

// ── Helpers ─────────────────────────────────────────────────────────────

const bold = s => `\x1b[1m${s}\x1b[0m`;
const dim = s => `\x1b[2m${s}\x1b[0m`;
const cyan = s => `\x1b[36m${s}\x1b[0m`;
const green = s => `\x1b[32m${s}\x1b[0m`;
const yellow = s => `\x1b[33m${s}\x1b[0m`;
const red = s => `\x1b[31m${s}\x1b[0m`;

function writeBootTarget(name) {
	const targetPath = join(process.cwd(), ".soma", ".boot-target");
	mkdirSync(join(process.cwd(), ".soma"), { recursive: true });
	writeFileSync(targetPath, JSON.stringify({ type: "map", name, timestamp: Date.now() }));
}

// ── MAP / Preload targeting (flags — backward compat) ──────────────────
// soma --map <name>     → boot with MAP's prompt-config + targeted preload
// soma --preload <name> → deprecated alias for --map (use `soma map <name>`)
let mapTarget = null;
for (let i = 0; i < args.length; i++) {
	if (args[i] === "--map" && i + 1 < args.length) {
		mapTarget = args[i + 1];
		args.splice(i, 2);
		break;
	}
	if (args[i] === "--preload" && i + 1 < args.length) {
		mapTarget = args[i + 1];
		args.splice(i, 2);
		console.log(`  ${yellow("⚠")} ${dim("--preload is deprecated. Use:")} ${green("soma map " + mapTarget)} ${dim("(for MAPs) or")} ${green("soma inhale " + mapTarget)} ${dim("(for preloads)")}`);
		console.log("");
		break;
	}
}

if (mapTarget) {
	process.env.SOMA_INHALE = "1";
	process.env.SOMA_MAP_TARGET = mapTarget;
	writeBootTarget(mapTarget);
}

// ── Focus targeting ────────────────────────────────────────────────────
// soma focus <keyword>  → run soma-focus.sh, then start session
// soma focus show       → show current focus state
// soma focus clear      → remove focus
if (args[0] === "focus") {
	const focusArgs = args.slice(1);
	// Find soma-focus.sh — bundled first (matches general script-discovery
	// order at line ~610). Previous order put .soma/amps/scripts/ first, which
	// silently picked up stale project copies when the bundled one was newer
	// (caught s01-d7bdf0 — stale `Install it alongside` error surfaced from
	// a pre-v0.20 project-local copy).
	const focusLocations = [
		new URL("../scripts/soma-focus.sh", import.meta.url).pathname,   // bundled
		join(process.cwd(), ".soma", "amps", "scripts", "soma-focus.sh"), // project
		join(process.cwd(), ".soma", "scripts", "soma-focus.sh"),         // legacy project
	];
	let focusScript = null;
	for (const loc of focusLocations) {
		if (existsSync(loc)) { focusScript = loc; break; }
	}
	if (!focusScript) {
		console.error("soma-focus.sh not found. Run 'soma init' to seed scripts.");
		process.exit(1);
	}
	try {
		execFileSync("bash", [focusScript, ...focusArgs], { stdio: "inherit" });
		// If focus was set (not show/clear), start a session
		if (focusArgs.length > 0 && focusArgs[0] !== "show" && focusArgs[0] !== "clear" && focusArgs[0] !== "--help") {
			console.log("\nStarting focused session...\n");
			await main([]);
		}
	} catch (err) {
		process.exit(1);
	}
	process.exit(0);
}

// ── soma map <name> — top-level MAP command ────────────────────────────
// soma map <name>       → run a MAP (same as old --map)
// soma map --list       → show available MAPs
// soma map              → show available MAPs (same as --list)
if (args[0] === "map") {
	const mapArgs = args.slice(1);
	const listFlag = mapArgs.includes("--list") || mapArgs.length === 0;

	if (listFlag) {
		// List available MAPs
		try {
			const somaDir = join(process.cwd(), ".soma");
			const mapDirs = [
				join(somaDir, "amps", "automations", "maps"),
				join(somaDir, "amps", "automations"),
				join(somaDir, "automations", "maps"),
				join(somaDir, "automations"),
				join(process.env.HOME || "", ".soma", "amps", "automations", "maps"),
				join(process.env.HOME || "", ".soma", "amps", "automations"),
			];
			const seen = new Set();
			const maps = [];
			for (const dir of mapDirs) {
				if (!existsSync(dir)) continue;
				const { readdirSync: rd, readFileSync: rf } = await import("fs");
				for (const f of rd(dir)) {
					if (!f.endsWith(".md") || seen.has(f)) continue;
					seen.add(f);
					const name = f.replace(/\.md$/, "");
					// Extract status from frontmatter
					const content = rf(join(dir, f), "utf-8");
					const statusMatch = content.match(/^status:\s*(.+)/m);
					const descMatch = content.match(/^description:\s*(.+)/m);
					maps.push({
						name,
						status: statusMatch?.[1]?.trim() || "—",
						desc: descMatch?.[1]?.trim() || "",
					});
				}
			}
			if (maps.length === 0) {
				console.log(`\n  ${dim("No MAPs found.")} Install from hub: ${green("soma install <map-name>")}\n`);
			} else {
				console.log(`\n  ${bold("Available MAPs")}\n`);
				for (const m of maps) {
					const status = m.status === "active" ? green("●") : dim("○");
					const desc = m.desc ? dim(` — ${m.desc}`) : "";
					console.log(`  ${status} ${bold(m.name)}${desc}`);
				}
				console.log(`\n  Run: ${green("soma map <name>")} to start a session with a MAP\n`);
			}
		} catch {
			console.log(`\n  ${red("✗")} Could not list MAPs\n`);
		}
		process.exit(0);
	}

	// soma map <name> — run the MAP
	const name = mapArgs.filter(a => !a.startsWith("-"))[0];
	if (name) {
		process.env.SOMA_INHALE = "1";
		process.env.SOMA_MAP_TARGET = name;
		writeBootTarget(name);
		main([]);
		// Don't exit here — main() handles the session
	} else {
		console.log(`  Usage: ${green("soma map <name>")} or ${green("soma map --list")}`);
		process.exit(1);
	}
} else if (args[0] === "model") {
	// soma model — interactive model switching
	const { handleModelCommand } = await import("./lib/model-cmd.js");
	const result = await handleModelCommand(args.slice(1));
	if (result === "start") {
		main([]);
	} else {
		process.exit(0);
	}
} else if (args[0] === "init" || args[0] === "content" || args[0] === "install" || args[0] === "list") {
	// soma init / soma content init / soma install / soma list
	// Route to content-cli for project scaffolding and hub operations
	const contentArgs = args[0] === "content" ? args.slice(1) : args;
	let handled = false;
	// Try compiled core (co-located with node_modules for package resolution)
	const agentDir = process.env.SOMA_CODING_AGENT_DIR || join(process.env.HOME || "", ".soma", "agent");
	// Compiled core lives at dist/core/index.js (bundled by scripts/build-dist.mjs).
	// Prior path "core-compiled.js" was stale and never resolved — silently skipped
	// the content-cli handler and dead-ended at the doctor re-route below.
	const compiledCore = join(agentDir, "dist", "core", "index.js");
	try {
		if (existsSync(compiledCore)) {
			const core = await import(compiledCore);
			if (core.handleContentCommand) {
				handled = await core.handleContentCommand(contentArgs);
			}
		}
	} catch (e) {
		// compiled core not available or failed
	}
	if (handled) process.exit(0);
	// If "soma init" and .soma/ already exists, route to doctor instead of TUI
	if (args[0] === "init" && existsSync(join(process.cwd(), ".soma"))) {
		const { dirname: dn2 } = await import("path");
		const { fileURLToPath: fu2 } = await import("url");
		const thinCli = join(dn2(fu2(import.meta.url)), "thin-cli.js");
		if (existsSync(thinCli)) {
			try { execFileSync(process.execPath, [thinCli, "doctor"], { stdio: "inherit" }); }
			catch {}
			process.exit(0);
		}
	}
	// Fall through to main if not handled
	main(args);
} else if (args[0] === "inhale") {
	// ── soma inhale — enhanced preload loading ──────────────────────────
	// soma inhale                    → load most recent preload (existing)
	// soma inhale --list             → show available preloads
	// soma inhale <name>             → partial match by name
	// soma inhale --load <path>      → load specific file as preload
	const inhaleArgs = args.slice(1);
	const listFlag = inhaleArgs.includes("--list");
	const loadIdx = inhaleArgs.indexOf("--load");
	const loadPath = loadIdx !== -1 ? inhaleArgs[loadIdx + 1] : null;
	// Strip user-global resource flags+values injected by injectUserGlobalPaths()
	// (--extension, --skill, --prompt-template, --theme) to prevent them from
	// being misidentified as positional nameArg. Without this, a bare
	// `soma inhale` picks up e.g. /Users/user/.soma/skills as nameArg and
	// fails with "No preload matching" error. SX-763, s01-68563d.
	const injFlags = ["--extension", "--skill", "--prompt-template", "--theme"];
	const cleanedInhaleArgs = inhaleArgs.filter((a, i) => {
		if (injFlags.includes(a)) return false;
		if (i > 0 && injFlags.includes(inhaleArgs[i-1])) return false;
		return true;
	});
	// Forward Pi-level flags (--model, --provider, --thinking-level, --models)
	// that were passed on `soma inhale` so Pi sees them at boot.
	// Without this, `soma inhale --model openrouter/deepseek-v4-flash` silently
	// drops the model flag because inhale calls main([]) with an empty args array.
	// Run this FIRST so we know which args are consumed as flag values and can
	// exclude them from nameArg extraction below.
	const piFlags = ["--model", "--provider", "--thinking-level", "--models"];
	const passThrough = [];
	for (let i = 0; i < inhaleArgs.length; i++) {
		if (piFlags.includes(inhaleArgs[i])) {
			passThrough.push(inhaleArgs[i]);
			if (i + 1 < inhaleArgs.length && !inhaleArgs[i + 1].startsWith("-")) {
				passThrough.push(inhaleArgs[++i]);
			}
		}
	}
	// Build set of values consumed by Pi flags so nameArg doesn't steal them.
	// Without this, `soma inhale --model opencode/big-pickle` treats the model
	// name as a preload target name (doesn't start with "-"), sets
	// SOMA_INHALE_TARGET="opencode/big-pickle", and findPreloadByName fails.
	const piConsumed = new Set(passThrough);
	const nameArg = cleanedInhaleArgs.filter(a => !a.startsWith("-") && a !== loadPath && !piConsumed.has(a))[0];

	if (listFlag) {
		// List available preloads
		try {
			const somaDir = join(process.cwd(), ".soma");
			if (!existsSync(somaDir)) {
				console.log(`\n  ${dim("No .soma/ found.")} Run ${green("soma init")} first.\n`);
				process.exit(0);
			}
			const preloadDirs = [
				join(somaDir, "memory", "preloads"),
				somaDir,
				join(somaDir, "memory"),
			];
			const seen = new Set();
			const preloads = [];
			const { readdirSync: rd, statSync: st } = await import("fs");
			for (const dir of preloadDirs) {
				if (!existsSync(dir)) continue;
				for (const f of rd(dir)) {
					if (!f.startsWith("preload-") || !f.endsWith(".md") || seen.has(f)) continue;
					seen.add(f);
					try {
						const stat = st(join(dir, f));
						const ageHours = (Date.now() - stat.mtimeMs) / 3600000;
						preloads.push({ name: f, path: join(dir, f), ageHours });
					} catch { /* skip */ }
				}
			}
			preloads.sort((a, b) => a.ageHours - b.ageHours);
			if (preloads.length === 0) {
				console.log(`\n  ${dim("No preloads found.")} Run ${green("/exhale")} in a session to create one.\n`);
			} else {
				console.log(`\n  ${bold("Available Preloads")}  ${dim(`(stale after 48h)`)}\n`);
				for (const p of preloads) {
					const age = p.ageHours;
					const stale = age > 48;
					const ageStr = age < 1 ? `${Math.floor(age * 60)}m ago`
						: age < 24 ? `${Math.floor(age)}h ago`
						: `${Math.floor(age / 24)}d ago`;
					const marker = stale ? yellow("⚠") : green("●");
					const staleTag = stale ? dim(" (stale)") : "";
					console.log(`  ${marker} ${bold(p.name)}  ${dim(ageStr)}${staleTag}`);
				}
				console.log(`\n  Run: ${green("soma inhale <name>")} to load a specific preload`);
				console.log(`       ${green("soma inhale")} to load the most recent\n`);
			}
		} catch (err) {
			console.log(`\n  ${red("✗")} Could not list preloads: ${err.message}\n`);
		}
		process.exit(0);
	}

	if (loadPath) {
		// Load a specific file by path
		const { resolve: resolvePath } = await import("path");
		const fullPath = resolvePath(loadPath);
		if (!existsSync(fullPath)) {
			console.log(`\n  ${red("✗")} File not found: ${fullPath}\n`);
			process.exit(1);
		}
		process.env.SOMA_INHALE = "1";
		process.env.SOMA_INHALE_PATH = fullPath;
		main(passThrough);
	} else if (nameArg) {
		// Partial name match
		process.env.SOMA_INHALE = "1";
		process.env.SOMA_INHALE_TARGET = nameArg;
		main(passThrough);
	} else {
		// Default: load most recent
		process.env.SOMA_INHALE = "1";
		main(passThrough);
	}
} else if (args[0] === "doctor" || args[0] === "status" || args[0] === "health" || args[0] === "update") {
	// Route to thin-cli which handles these commands
	// thin-cli has the doctor logic, version checking, health check
	const { dirname: dn } = await import("path");
	const { fileURLToPath: fu } = await import("url");
	const thisDir = dn(fu(import.meta.url));
	const thinCli = join(thisDir, "thin-cli.js");
	if (existsSync(thinCli)) {
		try {
			execFileSync(process.execPath, [thinCli, ...args], { stdio: "inherit" });
		} catch (err) {
			if (err.status) process.exit(err.status);
		}
	} else {
		console.log(`\n  ${dim("Command not available — try")} ${green("soma init")}\n`);
	}
	process.exit(0);
} else {
	// ── Script discovery: soma <name> → soma-<name>.sh ──────────────
	// Before starting a session, check if the first arg matches a script.
	// Chain: bundled (agent/scripts/) → project (.soma/) → global (~/.soma/)
	// CWD-safe: only uses universal paths, no dev-specific assumptions.
	const subcmd = args[0];
	if (subcmd && !subcmd.startsWith("-") && !subcmd.startsWith("@")) {
		const { homedir } = await import("os");
		const scriptName = `soma-${subcmd}.sh`;
		const home = homedir();

		// For 'dev': route to _dev/soma-dev/ directory (has its own router)
		const agentDir = process.env.SOMA_CODING_AGENT_DIR || join(home, ".soma", "agent");
		// Resolve CORE_DIR: follow symlink if dev mode (core/ → repos/agent/core/)
		const coreDir = existsSync(join(agentDir, "core"))
			? (await import("fs")).realpathSync(join(agentDir, "core"))
			: null;
		const scriptsDir = coreDir ? join(coreDir, "..", "scripts") : null;

		if (subcmd === "dev" && scriptsDir) {
			const devIndex = join(scriptsDir, "_dev", "soma-dev", "index.sh");
			if (existsSync(devIndex)) {
				try {
					execFileSync("bash", [devIndex, ...args.slice(1)], { stdio: "inherit" });
				} catch (err) { if (err.status) process.exit(err.status); }
				process.exit(0);
			}
		}

		// General script discovery: bundled → project → global
		// Checks both .sh (free, bash) and .js (pro, node) variants
		const jsName = `soma-${subcmd}.js`;
		const candidates = [
			scriptsDir ? join(scriptsDir, scriptName) : null,              // bundled .sh
			scriptsDir ? join(scriptsDir, jsName) : null,                  // bundled .js (pro)
			join(process.cwd(), ".soma", "amps", "scripts", scriptName),  // project .sh
			join(process.cwd(), ".soma", "amps", "scripts", jsName),      // project .js
			join(home, ".soma", "amps", "scripts", scriptName),           // global .sh
			join(home, ".soma", "amps", "scripts", jsName),               // global .js
		].filter(Boolean);

		const script = candidates.find(p => existsSync(p));
		if (script) {
			// Resolve the project's .soma/ by walking up from cwd so scripts can
			// trust SOMA_PROJECT_DIR instead of recomputing from $0 (which breaks
			// for bundled scripts living far from the user's project).
			let somaProjectDir = "";
			try {
				let dir = process.cwd();
				while (dir !== "/") {
					if (existsSync(join(dir, ".soma"))) { somaProjectDir = join(dir, ".soma"); break; }
					const parent = join(dir, "..");
					if (parent === dir) break;
					dir = parent;
				}
			} catch {}
			const scriptEnv = somaProjectDir
				? { ...process.env, SOMA_PROJECT_DIR: somaProjectDir }
				: process.env;
			try {
				if (script.endsWith(".js")) {
					// Pro script: run with node (compiled .js module)
					execFileSync(process.execPath, ["--input-type=module", "-e",
						`import{run}from"${script}";const o=run(${JSON.stringify(args.slice(1))});if(o)process.stdout.write(o);`
					], { stdio: "inherit", env: scriptEnv });
				} else {
					// Free script: run with bash
					execFileSync("bash", [script, ...args.slice(1)], { stdio: "inherit", env: scriptEnv });
				}
			} catch (err) { if (err.status) process.exit(err.status); }
			process.exit(0);
		}
	}

	// soma (no subcommand match) — start session
	main(args);
}
//# sourceMappingURL=cli.js.map
