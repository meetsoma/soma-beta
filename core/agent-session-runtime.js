/**
 * Soma Agent — © 2026 Curtis Mercier
 * Licensed under BSL 1.1 (Business Source License)
 *
 * You may view, use personally, and contribute to this software.
 * You may NOT use it for competing commercial products or services.
 * Converts to MIT license on 2027-09-18.
 *
 * Full license: https://github.com/meetsoma/soma-beta/blob/main/LICENSE
 * Source available to contributors: https://soma.gravicity.ai/beta
 * Contact for commercial licensing: meetsoma@gravicity.ai
 */

import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { getAgentDir } from "../config.js";
import { AuthStorage } from "./auth-storage.js";
import { emitSessionShutdownEvent } from "./extensions/runner.js";
import { ModelRegistry } from "./model-registry.js";
import { DefaultResourceLoader } from "./resource-loader.js";
import { createAgentSession } from "./sdk.js";
import { SessionManager } from "./session-manager.js";
import { SettingsManager } from "./settings-manager.js";
/**
 * Create one runtime instance containing an AgentSession plus the cwd-bound
 * services it depends on.
 *
 * Most SDK callers should keep the returned value wrapped in an
 * AgentSessionRuntimeHost instead of holding it directly. The host owns
 * replacing the runtime when switching sessions across files or working
 * directories.
 */
export async function createAgentSessionRuntime(bootstrap, options) {
    const cwd = options.cwd;
    const agentDir = bootstrap.agentDir ?? getAgentDir();
    const authStorage = bootstrap.authStorage ?? AuthStorage.create(join(agentDir, "auth.json"));
    const settingsManager = SettingsManager.create(cwd, agentDir);
    const modelRegistry = ModelRegistry.create(authStorage, join(agentDir, "models.json"));
    const resourceLoader = typeof bootstrap.resourceLoader === "function"
        ? await bootstrap.resourceLoader(cwd, agentDir)
        : new DefaultResourceLoader({
            ...(bootstrap.resourceLoader ?? {}),
            cwd,
            agentDir,
            settingsManager,
        });
    await resourceLoader.reload();
    const extensionsResult = resourceLoader.getExtensions();
    for (const { name, config } of extensionsResult.runtime.pendingProviderRegistrations) {
        modelRegistry.registerProvider(name, config);
    }
    extensionsResult.runtime.pendingProviderRegistrations = [];
    const created = await createAgentSession({
        cwd,
        agentDir,
        authStorage,
        modelRegistry,
        settingsManager,
        resourceLoader,
        sessionManager: options.sessionManager,
        model: bootstrap.model,
        thinkingLevel: bootstrap.thinkingLevel,
        scopedModels: bootstrap.scopedModels,
        tools: bootstrap.tools,
        customTools: bootstrap.customTools,
        sessionStartEvent: options.sessionStartEvent,
    });
    return {
        ...created,
        cwd,
        agentDir,
        authStorage,
        modelRegistry,
        settingsManager,
        resourceLoader,
        sessionManager: created.session.sessionManager,
    };
}
function extractUserMessageText(content) {
    if (typeof content === "string") {
        return content;
    }
    return content
        .filter((part) => part.type === "text" && typeof part.text === "string")
        .map((part) => part.text)
        .join("");
}
/**
 * Stable wrapper around a replaceable AgentSession runtime.
 *
 * Use this when your application needs `/new`, `/resume`, `/fork`, or import
 * behavior. After replacement, read `session` again and rebind any
 * session-local subscriptions or extension bindings.
 */
export class AgentSessionRuntimeHost {
    bootstrap;
    runtime;
    constructor(bootstrap, runtime) {
        this.bootstrap = bootstrap;
        this.runtime = runtime;
    }
    /** The currently active session instance. Re-read this after runtime replacement. */
    get session() {
        return this.runtime.session;
    }
    async emitBeforeSwitch(reason, targetSessionFile) {
        const runner = this.runtime.session.extensionRunner;
        if (!runner?.hasHandlers("session_before_switch")) {
            return { cancelled: false };
        }
        const result = await runner.emit({
            type: "session_before_switch",
            reason,
            targetSessionFile,
        });
        return { cancelled: result?.cancel === true };
    }
    async emitBeforeFork(entryId) {
        const runner = this.runtime.session.extensionRunner;
        if (!runner?.hasHandlers("session_before_fork")) {
            return { cancelled: false };
        }
        const result = await runner.emit({
            type: "session_before_fork",
            entryId,
        });
        return { cancelled: result?.cancel === true };
    }
    async replace(options) {
        const nextRuntime = await createAgentSessionRuntime(this.bootstrap, options);
        await emitSessionShutdownEvent(this.runtime.session.extensionRunner);
        this.runtime.session.dispose();
        if (process.cwd() !== nextRuntime.cwd) {
            process.chdir(nextRuntime.cwd);
        }
        this.runtime = nextRuntime;
    }
    /**
     * Replace the active runtime with one opened from an existing session file.
     *
     * Emits `session_before_switch` before replacement and returns
     * `{ cancelled: true }` if an extension vetoes the switch.
     */
    async switchSession(sessionPath) {
        const beforeResult = await this.emitBeforeSwitch("resume", sessionPath);
        if (beforeResult.cancelled) {
            return beforeResult;
        }
        const previousSessionFile = this.runtime.session.sessionFile;
        const sessionManager = SessionManager.open(sessionPath);
        await this.replace({
            cwd: sessionManager.getCwd(),
            sessionManager,
            sessionStartEvent: { type: "session_start", reason: "resume", previousSessionFile },
        });
        return { cancelled: false };
    }
    /**
     * Replace the active runtime with a fresh session in the current cwd.
     *
     * `setup` runs after replacement against the new session manager, which lets
     * callers seed entries before normal use begins.
     */
    async newSession(options) {
        const beforeResult = await this.emitBeforeSwitch("new");
        if (beforeResult.cancelled) {
            return beforeResult;
        }
        const previousSessionFile = this.runtime.session.sessionFile;
        const sessionDir = this.runtime.sessionManager.getSessionDir();
        const sessionManager = SessionManager.create(this.runtime.cwd, sessionDir);
        if (options?.parentSession) {
            sessionManager.newSession({ parentSession: options.parentSession });
        }
        await this.replace({
            cwd: this.runtime.cwd,
            sessionManager,
            sessionStartEvent: { type: "session_start", reason: "new", previousSessionFile },
        });
        if (options?.setup) {
            await options.setup(this.runtime.sessionManager);
            this.runtime.session.agent.state.messages = this.runtime.sessionManager.buildSessionContext().messages;
        }
        return { cancelled: false };
    }
    /**
     * Replace the active runtime with a fork rooted at the given user-message
     * entry.
     *
     * Returns the selected user text so UIs can restore it into the editor after
     * the fork completes.
     */
    async fork(entryId) {
        const beforeResult = await this.emitBeforeFork(entryId);
        if (beforeResult.cancelled) {
            return { cancelled: true };
        }
        const selectedEntry = this.runtime.sessionManager.getEntry(entryId);
        if (!selectedEntry || selectedEntry.type !== "message" || selectedEntry.message.role !== "user") {
            throw new Error("Invalid entry ID for forking");
        }
        const previousSessionFile = this.runtime.session.sessionFile;
        const selectedText = extractUserMessageText(selectedEntry.message.content);
        if (this.runtime.sessionManager.isPersisted()) {
            const currentSessionFile = this.runtime.session.sessionFile;
            const sessionDir = this.runtime.sessionManager.getSessionDir();
            if (!selectedEntry.parentId) {
                const sessionManager = SessionManager.create(this.runtime.cwd, sessionDir);
                sessionManager.newSession({ parentSession: currentSessionFile });
                await this.replace({
                    cwd: this.runtime.cwd,
                    sessionManager,
                    sessionStartEvent: { type: "session_start", reason: "fork", previousSessionFile },
                });
                return { cancelled: false, selectedText };
            }
            const sourceManager = SessionManager.open(currentSessionFile, sessionDir);
            const forkedSessionPath = sourceManager.createBranchedSession(selectedEntry.parentId);
            const sessionManager = SessionManager.open(forkedSessionPath, sessionDir);
            await this.replace({
                cwd: sessionManager.getCwd(),
                sessionManager,
                sessionStartEvent: { type: "session_start", reason: "fork", previousSessionFile },
            });
            return { cancelled: false, selectedText };
        }
        const sessionManager = this.runtime.sessionManager;
        if (!selectedEntry.parentId) {
            sessionManager.newSession({ parentSession: this.runtime.session.sessionFile });
        }
        else {
            sessionManager.createBranchedSession(selectedEntry.parentId);
        }
        await this.replace({
            cwd: this.runtime.cwd,
            sessionManager,
            sessionStartEvent: { type: "session_start", reason: "fork", previousSessionFile },
        });
        return { cancelled: false, selectedText };
    }
    /**
     * Import a JSONL session file into the current session directory and replace
     * the active runtime with the imported session.
     */
    async importFromJsonl(inputPath) {
        const resolvedPath = resolve(inputPath);
        if (!existsSync(resolvedPath)) {
            throw new Error(`File not found: ${resolvedPath}`);
        }
        const sessionDir = this.runtime.sessionManager.getSessionDir();
        if (!existsSync(sessionDir)) {
            mkdirSync(sessionDir, { recursive: true });
        }
        const destinationPath = join(sessionDir, basename(resolvedPath));
        const beforeResult = await this.emitBeforeSwitch("resume", destinationPath);
        if (beforeResult.cancelled) {
            return beforeResult;
        }
        const previousSessionFile = this.runtime.session.sessionFile;
        if (resolve(destinationPath) !== resolvedPath) {
            copyFileSync(resolvedPath, destinationPath);
        }
        const sessionManager = SessionManager.open(destinationPath, sessionDir);
        await this.replace({
            cwd: sessionManager.getCwd(),
            sessionManager,
            sessionStartEvent: { type: "session_start", reason: "resume", previousSessionFile },
        });
        return { cancelled: false };
    }
    /** Emit session shutdown for the active runtime and dispose it permanently. */
    async dispose() {
        await emitSessionShutdownEvent(this.runtime.session.extensionRunner);
        this.runtime.session.dispose();
    }
}
//# sourceMappingURL=agent-session-runtime.js.map