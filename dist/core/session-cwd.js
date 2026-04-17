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

import { existsSync } from "node:fs";
export function getMissingSessionCwdIssue(sessionManager, fallbackCwd) {
    const sessionFile = sessionManager.getSessionFile();
    if (!sessionFile) {
        return undefined;
    }
    const sessionCwd = sessionManager.getCwd();
    if (!sessionCwd || existsSync(sessionCwd)) {
        return undefined;
    }
    return {
        sessionFile,
        sessionCwd,
        fallbackCwd,
    };
}
export function formatMissingSessionCwdError(issue) {
    const sessionFile = issue.sessionFile ? `\nSession file: ${issue.sessionFile}` : "";
    return `Stored session working directory does not exist: ${issue.sessionCwd}${sessionFile}\nCurrent working directory: ${issue.fallbackCwd}`;
}
export function formatMissingSessionCwdPrompt(issue) {
    return `cwd from session file does not exist\n${issue.sessionCwd}\n\ncontinue in current cwd\n${issue.fallbackCwd}`;
}
export class MissingSessionCwdError extends Error {
    issue;
    constructor(issue) {
        super(formatMissingSessionCwdError(issue));
        this.name = "MissingSessionCwdError";
        this.issue = issue;
    }
}
export function assertSessionCwdExists(sessionManager, fallbackCwd) {
    const issue = getMissingSessionCwdIssue(sessionManager, fallbackCwd);
    if (issue) {
        throw new MissingSessionCwdError(issue);
    }
}
//# sourceMappingURL=session-cwd.js.map