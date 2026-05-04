/**
 * One-time migrations that run on startup.
 *
 * (Soma s01-86b0fd) This file also hosts the preflight-update prompt that
 * gates `soma` startup when an update is cached as available. The Pi-cruft
 * deprecation warnings (hooks/, tools/, commands/) were removed; the
 * interactive `Press any key to continue` slot was repurposed for legitimate
 * Soma signals (update notices). See:
 *   releases/v0.24.x/plans/2026-05-04-preflight-prompt-and-pi-cruft-cleanup.md
 */
import chalk from "chalk";
import { execSync } from "child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { homedir } from "os";
import { CONFIG_DIR_NAME, getAgentDir, getBinDir } from "./config.js";
const MIGRATION_GUIDE_URL = "https://soma.gravicity.ai/docs/updating";
const EXTENSIONS_DOC_URL = "https://soma.gravicity.ai/docs/extending";
const SOMA_CONFIG_PATH = join(homedir(), ".soma", "config.json");

/**
 * Read the cached config at ~/.soma/config.json (if exists).
 * Soma-statusline.ts periodically populates `updateAvailable` + `latestSummary`
 * + `updateCheckTs`. We read those at boot — zero network cost.
 */
function readSomaConfig() {
    try {
        return JSON.parse(readFileSync(SOMA_CONFIG_PATH, "utf-8"));
    } catch {
        return {};
    }
}

function writeSomaConfig(config) {
    try {
        mkdirSync(dirname(SOMA_CONFIG_PATH), { recursive: true });
        writeFileSync(SOMA_CONFIG_PATH, JSON.stringify(config, null, 2), { mode: 0o600 });
    } catch {
        // Best-effort — if we can't write, skip-persistence won't stick.
    }
}

/**
 * Returns structured update notices if a newer agent version is cached as
 * available AND the user hasn't skipped this exact update batch.
 *
 * Skip semantics: `skipUpdateUntilTs` records the cache-update timestamp
 * the user dismissed. If soma-statusline subsequently writes a newer
 * `updateCheckTs` (i.e. fresh commits arrived), the prompt re-fires.
 * Same-batch skips don't re-prompt.
 */
function checkPendingUpdates() {
    try {
        const cfg = readSomaConfig();
        if (!cfg.updateAvailable) return [];
        if (cfg.skipUpdateUntilTs && cfg.updateCheckTs && cfg.updateCheckTs <= cfg.skipUpdateUntilTs) {
            return [];
        }
        return [{
            type: "update",
            latestSummary: cfg.latestSummary || "newer version available",
            updateCheckTs: cfg.updateCheckTs || Date.now(),
        }];
    } catch {
        return [];
    }
}

/**
 * Read a single keypress in raw mode. Returns the lowercase first char,
 * or empty string if stdin isn't a TTY.
 */
async function readKey() {
    if (!process.stdin.isTTY) return "";
    return new Promise((resolve) => {
        try {
            process.stdin.setRawMode?.(true);
            process.stdin.resume();
            process.stdin.once("data", (data) => {
                try {
                    process.stdin.setRawMode?.(false);
                    process.stdin.pause();
                } catch {}
                const key = data.toString("utf8").toLowerCase().charAt(0);
                resolve(key);
            });
        } catch {
            resolve("");
        }
    });
}
/**
 * Migrate legacy oauth.json and settings.json apiKeys to auth.json.
 *
 * @returns Array of provider names that were migrated
 */
export function migrateAuthToAuthJson() {
    const agentDir = getAgentDir();
    const authPath = join(agentDir, "auth.json");
    const oauthPath = join(agentDir, "oauth.json");
    const settingsPath = join(agentDir, "settings.json");
    // Skip if auth.json already exists
    if (existsSync(authPath))
        return [];
    const migrated = {};
    const providers = [];
    // Migrate oauth.json
    if (existsSync(oauthPath)) {
        try {
            const oauth = JSON.parse(readFileSync(oauthPath, "utf-8"));
            for (const [provider, cred] of Object.entries(oauth)) {
                migrated[provider] = { type: "oauth", ...cred };
                providers.push(provider);
            }
            renameSync(oauthPath, `${oauthPath}.migrated`);
        }
        catch {
            // Skip on error
        }
    }
    // Migrate settings.json apiKeys
    if (existsSync(settingsPath)) {
        try {
            const content = readFileSync(settingsPath, "utf-8");
            const settings = JSON.parse(content);
            if (settings.apiKeys && typeof settings.apiKeys === "object") {
                for (const [provider, key] of Object.entries(settings.apiKeys)) {
                    if (!migrated[provider] && typeof key === "string") {
                        migrated[provider] = { type: "api_key", key };
                        providers.push(provider);
                    }
                }
                delete settings.apiKeys;
                writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
            }
        }
        catch {
            // Skip on error
        }
    }
    if (Object.keys(migrated).length > 0) {
        mkdirSync(dirname(authPath), { recursive: true });
        writeFileSync(authPath, JSON.stringify(migrated, null, 2), { mode: 0o600 });
    }
    return providers;
}
/**
 * Migrate sessions from ~/.pi/agent/*.jsonl to proper session directories.
 *
 * Bug in v0.30.0: Sessions were saved to ~/.pi/agent/ instead of
 * ~/.pi/agent/sessions/<encoded-cwd>/. This migration moves them
 * to the correct location based on the cwd in their session header.
 *
 * See: https://github.com/badlogic/pi-mono/issues/320
 */
export function migrateSessionsFromAgentRoot() {
    const agentDir = getAgentDir();
    // Find all .jsonl files directly in agentDir (not in subdirectories)
    let files;
    try {
        files = readdirSync(agentDir)
            .filter((f) => f.endsWith(".jsonl"))
            .map((f) => join(agentDir, f));
    }
    catch {
        return;
    }
    if (files.length === 0)
        return;
    for (const file of files) {
        try {
            // Read first line to get session header
            const content = readFileSync(file, "utf8");
            const firstLine = content.split("\n")[0];
            if (!firstLine?.trim())
                continue;
            const header = JSON.parse(firstLine);
            if (header.type !== "session" || !header.cwd)
                continue;
            const cwd = header.cwd;
            // Compute the correct session directory (same encoding as session-manager.ts)
            const safePath = `--${cwd.replace(/^[/\\]/, "").replace(/[/\\:]/g, "-")}--`;
            const correctDir = join(agentDir, "sessions", safePath);
            // Create directory if needed
            if (!existsSync(correctDir)) {
                mkdirSync(correctDir, { recursive: true });
            }
            // Move the file
            const fileName = file.split("/").pop() || file.split("\\").pop();
            const newPath = join(correctDir, fileName);
            if (existsSync(newPath))
                continue; // Skip if target exists
            renameSync(file, newPath);
        }
        catch {
            // Skip files that can't be migrated
        }
    }
}
/**
 * Migrate commands/ to prompts/ if needed.
 * Works for both regular directories and symlinks.
 */
function migrateCommandsToPrompts(baseDir, label) {
    const commandsDir = join(baseDir, "commands");
    const promptsDir = join(baseDir, "prompts");
    if (existsSync(commandsDir) && !existsSync(promptsDir)) {
        try {
            renameSync(commandsDir, promptsDir);
            console.log(chalk.green(`Migrated ${label} commands/ → prompts/`));
            return true;
        }
        catch (err) {
            console.log(chalk.yellow(`Warning: Could not migrate ${label} commands/ to prompts/: ${err instanceof Error ? err.message : err}`));
        }
    }
    return false;
}
/**
 * Move fd/rg binaries from tools/ to bin/ if they exist.
 */
function migrateToolsToBin() {
    const agentDir = getAgentDir();
    const toolsDir = join(agentDir, "tools");
    const binDir = getBinDir();
    if (!existsSync(toolsDir))
        return;
    const binaries = ["fd", "rg", "fd.exe", "rg.exe"];
    let movedAny = false;
    for (const bin of binaries) {
        const oldPath = join(toolsDir, bin);
        const newPath = join(binDir, bin);
        if (existsSync(oldPath)) {
            if (!existsSync(binDir)) {
                mkdirSync(binDir, { recursive: true });
            }
            if (!existsSync(newPath)) {
                try {
                    renameSync(oldPath, newPath);
                    movedAny = true;
                }
                catch {
                    // Ignore errors
                }
            }
            else {
                // Target exists, just delete the old one
                try {
                    rmSync?.(oldPath, { force: true });
                }
                catch {
                    // Ignore
                }
            }
        }
    }
    if (movedAny) {
        console.log(chalk.green(`Migrated managed binaries tools/ → bin/`));
    }
}
/**
 * (Soma s01-86b0fd) Pi-cruft removed. Pi inherited a `hooks/` → `extensions/`
 * rename and a `tools/` → `extensions/` merge in its own evolution. Soma
 * never adopted `.soma/hooks/` or `.soma/tools/` as extension dirs — our
 * conventions are `.soma/extensions/` (extension TS code) and
 * `.soma/amps/scripts/` (workflow scripts). Curtis surfaced this s01-86b0fd:
 * his `.soma/tools/` had Python scripts (legitimate user content) and the
 * warning misfired on every soma startup with a Pi-flavored remediation that
 * would be type-incorrect.
 *
 * Function preserved (no API break for callers in migrateExtensionSystem)
 * but the body returns []. The Pi-rename history doesn't apply to Soma.
 *
 * If we ever need a real Soma deprecation, this is the right hook — just
 * push specific entries with Soma-correct remediation text.
 *
 * Full rationale + decision log: releases/v0.24.x/plans/
 *   2026-05-04-preflight-prompt-and-pi-cruft-cleanup.md
 */
function checkDeprecatedExtensionDirs(_baseDir, _label) {
    return [];
}
/**
 * Run extension system migrations (commands→prompts) and collect warnings about deprecated directories.
 */
function migrateExtensionSystem(cwd) {
    const agentDir = getAgentDir();
    const projectDir = join(cwd, CONFIG_DIR_NAME);
    // (Soma s01-86b0fd) Pi-cruft removed: migrateCommandsToPrompts ran a
    // Pi-internal `commands/` → `prompts/` rename. Soma never adopted Pi's
    // `commands/` directory convention — commands register via
    // `pi.registerCommand` from extensions, no filesystem dir. Calling this
    // would (a) fire on user content named `commands/` (not Soma's), or
    // (b) silently rename non-existent dirs (no-op but wasted work).
    //
    // Likewise checkDeprecatedExtensionDirs is now a no-op stub; left here
    // as the future hook for Soma-correct deprecations if any ever arise.
    const warnings = [
        ...checkDeprecatedExtensionDirs(agentDir, "Global"),
        ...checkDeprecatedExtensionDirs(projectDir, "Project"),
    ];
    return warnings;
}
/**
 * Preflight prompt before `soma` starts the TUI.
 *
 * Function name preserved for compatibility with Pi's `dist/main.js:519`
 * call site (which our `dist/migrations.js` overlays). Internally splits
 * notices into legacy deprecation strings (Pi-cruft, now empty by default)
 * and structured update notices (the s01-86b0fd feature).
 *
 * Update prompt UX:
 *   ⬆ Update available: <commit summary>
 *      (c)ontinue   (u)pdate now   (s)kip this version
 *
 * Hotkeys:
 *   c  Enter       — continue boot (default)
 *   u               — spawn `soma update`, then exit so user re-runs fresh
 *   s               — stamp skipUpdateUntilTs and continue (won't re-prompt
 *                     for THIS commit batch; new updates re-fire)
 */
export async function showDeprecationWarnings(notices) {
    if (!Array.isArray(notices) || notices.length === 0) return;

    const updateNotices = notices.filter((n) => n && typeof n === "object" && n.type === "update");
    const legacyStrings = notices.filter((n) => typeof n === "string");

    // ── Legacy deprecation strings (Pi-cruft path — should be empty post-s01-86b0fd) ──
    if (legacyStrings.length > 0) {
        for (const warning of legacyStrings) {
            console.log(chalk.yellow(`Warning: ${warning}`));
        }
        console.log(chalk.yellow(`\nMigration guide: ${MIGRATION_GUIDE_URL}`));
        console.log(chalk.yellow(`Documentation: ${EXTENSIONS_DOC_URL}`));
    }

    // ── Update notice prompt (the new feature) ──
    if (updateNotices.length > 0) {
        const u = updateNotices[0];
        if (legacyStrings.length > 0) console.log("");
        console.log(chalk.yellow(`⬆ Soma update available— ${chalk.dim(u.latestSummary)}`));
        console.log(chalk.dim(`   (c)ontinue   (u)pdate now   (s)kip this version`));

        const key = await readKey();

        if (key === "u") {
            console.log("");
            console.log(chalk.cyan("Running `soma update`…"));
            try {
                execSync("soma update", { stdio: "inherit" });
                console.log("");
                console.log(chalk.green("✓ Update complete. Run `soma` again to start with the new version."));
                process.exit(0);
            } catch {
                console.log(chalk.red("Update failed. Continuing with current version."));
            }
        } else if (key === "s") {
            try {
                const cfg = readSomaConfig();
                cfg.skipUpdateUntilTs = u.updateCheckTs || Date.now();
                writeSomaConfig(cfg);
                console.log(chalk.dim(`Skipped — will re-prompt when newer updates arrive.`));
            } catch {}
        }
        // c / Enter / anything else: continue
        console.log();
        return;
    }

    // ── Legacy-only path: keep old "any key to continue" UX for back-compat ──
    if (legacyStrings.length > 0) {
        console.log(chalk.dim(`\nPress any key to continue…`));
        await readKey();
        console.log();
    }
}
/**
 * Run all migrations. Called once on startup.
 *
 * @returns Object with migration results and deprecation warnings
 */
export function runMigrations(cwd = process.cwd()) {
    const migratedAuthProviders = migrateAuthToAuthJson();
    migrateSessionsFromAgentRoot();
    migrateToolsToBin();
    // The `deprecationWarnings` array is misnamed (Pi-legacy contract) — we
    // surface ALL preflight notices through it because Pi's dist/main.js
    // gates `showDeprecationWarnings` on `length > 0`. Mixing structured
    // update notices alongside legacy strings keeps the call site untouched.
    const deprecationWarnings = [
        ...migrateExtensionSystem(cwd),  // [] post-s01-86b0fd (Pi-cruft removed)
        ...checkPendingUpdates(),         // structured update notices
    ];
    return { migratedAuthProviders, deprecationWarnings };
}
//# sourceMappingURL=migrations.js.map