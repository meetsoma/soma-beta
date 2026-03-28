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
import { setBedrockProviderModule } from "@mariozechner/pi-ai";
import { bedrockProviderModule } from "@mariozechner/pi-ai/bedrock-provider";
import { EnvHttpProxyAgent, setGlobalDispatcher } from "undici";
import { main } from "./main.js";
import { existsSync, unlinkSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
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

// ── Command dispatch ───────────────────────────────────────────────────
const args = process.argv.slice(2);

// Version flag
if (args[0] === "--version" || args[0] === "-V" || args[0] === "-v") {
	const { readFileSync: rf } = await import("fs");
	const { fileURLToPath } = await import("url");
	const { dirname, join: j } = await import("path");
	const __dirname = dirname(fileURLToPath(import.meta.url));
	const pkg = JSON.parse(rf(j(__dirname, "..", "package.json"), "utf-8"));
	console.log(`soma v${pkg.version}`);
	process.exit(0);
}

// Help flag — delegate to Pi's printHelp (gum removed in 0.61.0)
if (args[0] === "--help" || args[0] === "-h") {
	const { printHelp } = await import("./cli/args.js");
	printHelp();
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
	// Find soma-focus.sh — check .soma/amps/scripts/ first, then bundled scripts/
	const focusLocations = [
		join(process.cwd(), ".soma", "amps", "scripts", "soma-focus.sh"),
		join(process.cwd(), ".soma", "scripts", "soma-focus.sh"),
		new URL("../scripts/soma-focus.sh", import.meta.url).pathname,
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
			main([]);
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
} else if (args[0] === "init" || args[0] === "content" || args[0] === "install" || args[0] === "list") {
	// soma init / soma content init / soma install / soma list
	// Route to content-cli for project scaffolding and hub operations
	const contentArgs = args[0] === "content" ? args.slice(1) : args;
	let handled = false;
	// Try compiled core (co-located with node_modules for package resolution)
	const agentDir = join(process.env.HOME || "", ".soma", "agent");
	const compiledCore = join(agentDir, "core-compiled.js");
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
	const nameArg = inhaleArgs.filter(a => !a.startsWith("-") && a !== loadPath)[0];

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
		main([]);
	} else if (nameArg) {
		// Partial name match
		process.env.SOMA_INHALE = "1";
		process.env.SOMA_INHALE_TARGET = nameArg;
		main([]);
	} else {
		// Default: load most recent
		process.env.SOMA_INHALE = "1";
		main([]);
	}
} else {
	// soma (no subcommand) — fresh session, NO preload
	main(args);
}
//# sourceMappingURL=cli.js.map
