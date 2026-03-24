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

// ── MAP / Preload targeting ────────────────────────────────────────────
// soma --map <name>     → boot with MAP's prompt-config + targeted preload
// soma --preload <name> → alias for --map
// Writes .soma/.boot-target signal file, consumed by soma-boot.ts
function writeBootTarget(name) {
	const targetPath = join(process.cwd(), ".soma", ".boot-target");
	mkdirSync(join(process.cwd(), ".soma"), { recursive: true });
	writeFileSync(targetPath, JSON.stringify({ type: "map", name, timestamp: Date.now() }));
}

// Check for --map or --preload flags before dispatch
let mapTarget = null;
for (let i = 0; i < args.length; i++) {
	if ((args[i] === "--map" || args[i] === "--preload") && i + 1 < args.length) {
		mapTarget = args[i + 1];
		args.splice(i, 2); // Remove flag + value from args
		break;
	}
}

if (mapTarget) {
	// MAP targeting implies inhale (loads preload + prompt config)
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

if (args[0] === "init" || args[0] === "content" || args[0] === "install" || args[0] === "list") {
	// soma init / soma content init / soma install / soma list
	// Route to content-cli for project scaffolding and hub operations
	const contentArgs = args[0] === "content" ? args.slice(1) : args;
	try {
		const core = await import("./core/index.js");
		if (core.handleContentCommand) {
			const handled = await core.handleContentCommand(contentArgs);
			if (handled) process.exit(0);
		}
	} catch {
		// content-cli not available
	}
	// Fall through to main if not handled
	main(args);
} else if (args[0] === "inhale") {
	// soma inhale — fresh session WITH preload from last session
	process.env.SOMA_INHALE = "1";
	main(args.slice(1));
} else {
	// soma (no subcommand) — fresh session, NO preload
	main(args);
}
//# sourceMappingURL=cli.js.map
