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

import * as undici from "undici";
export const DEFAULT_HTTP_IDLE_TIMEOUT_MS = 300_000;
export const HTTP_IDLE_TIMEOUT_CHOICES = [
    { label: "30 sec", timeoutMs: 30_000 },
    { label: "1 min", timeoutMs: 60_000 },
    { label: "2 min", timeoutMs: 120_000 },
    { label: "5 min", timeoutMs: 300_000 },
    { label: "disabled", timeoutMs: 0 },
];
export function parseHttpIdleTimeoutMs(value) {
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed.toLowerCase() === "disabled") {
            return 0;
        }
        if (trimmed.length === 0) {
            return undefined;
        }
        return parseHttpIdleTimeoutMs(Number(trimmed));
    }
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
        return undefined;
    }
    return Math.floor(value);
}
export function formatHttpIdleTimeoutMs(timeoutMs) {
    const choice = HTTP_IDLE_TIMEOUT_CHOICES.find((item) => item.timeoutMs === timeoutMs);
    if (choice) {
        return choice.label;
    }
    return `${timeoutMs / 1000} sec`;
}
export function configureHttpDispatcher(timeoutMs = DEFAULT_HTTP_IDLE_TIMEOUT_MS) {
    const normalizedTimeoutMs = parseHttpIdleTimeoutMs(timeoutMs);
    if (normalizedTimeoutMs === undefined) {
        throw new Error(`Invalid HTTP idle timeout: ${String(timeoutMs)}`);
    }
    undici.setGlobalDispatcher(new undici.EnvHttpProxyAgent({
        allowH2: false,
        bodyTimeout: normalizedTimeoutMs,
        headersTimeout: normalizedTimeoutMs,
    }));
    // Keep fetch and the dispatcher on the same undici implementation. Node 26.0's
    // bundled fetch can otherwise consume compressed responses through npm undici's
    // dispatcher without decompressing them, causing response.json() failures.
    undici.install?.();
}
//# sourceMappingURL=http-dispatcher.js.map