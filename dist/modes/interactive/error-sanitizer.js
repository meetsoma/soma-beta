/**
 * Sanitize raw API error messages into human-readable text.
 * 
 * API providers (Claude, etc.) return JSON error bodies that get passed through
 * as-is by the streaming layer. This module extracts the meaningful message
 * and provides actionable guidance instead of dumping raw JSON at the user.
 * 
 * PATCH NOTE: This file is a Soma addition to the Pi runtime dist/.
 * If Pi is updated, this file must be preserved and the imports in
 * assistant-message.js + interactive-mode.js must be re-added.
 * See: repos/agent/scripts/_dev/patches/error-sanitizer.md
 */

/**
 * Extract human-readable message from an API error string.
 * Handles both raw JSON bodies and pre-parsed error messages.
 */
export function sanitizeApiError(raw) {
    if (!raw || typeof raw !== "string") return raw || "Unknown error";

    // Try to extract message from JSON error body
    // Pattern: {"type":"error","error":{"type":"...","message":"ACTUAL MESSAGE"},...}
    // Also matches: Error: 400\n{...json...}
    let message = raw;
    
    // Strip leading "Error: NNN\n" prefix if present
    const statusMatch = raw.match(/^Error:\s*(\d{3})\s*\n?(.*)/s);
    const statusCode = statusMatch ? parseInt(statusMatch[1]) : null;
    const body = statusMatch ? statusMatch[2] : raw;

    // Try to parse JSON and extract the inner message
    try {
        const parsed = JSON.parse(body.trim());
        if (parsed?.error?.message) {
            message = parsed.error.message;
        } else if (parsed?.message) {
            message = parsed.message;
        }
    } catch {
        // Not JSON — check if the raw string contains embedded JSON
        const jsonMatch = body.match(/\{.*"message"\s*:\s*"([^"]+)"/s);
        if (jsonMatch) {
            message = jsonMatch[1];
        }
    }

    // Apply friendly rewrites for known error patterns
    const friendly = getFriendlyMessage(message, statusCode);
    return friendly || message;
}

/**
 * Map known API error patterns to actionable user-facing messages.
 */
function getFriendlyMessage(message, statusCode) {
    if (!message) return null;
    const lower = message.toLowerCase();

    // Third-party billing change (Claude API)
    if (lower.includes("third-party apps") && lower.includes("extra usage")) {
        return "Anthropic now bills third-party runtimes (including Soma/Pi) from extra usage, " +
               "not your plan limits. For predictable billing, use an API key instead of OAuth. " +
               "Manage credits at claude.ai/settings/usage";
    }

    // Out of extra usage — Anthropic reclassifies non-Claude-Code runtimes
    // as "third-party" apps that bill from "extra usage" instead of plan limits.
    // Users on Max/Pro plans hit this even with unused plan capacity.
    if (lower.includes("out of extra usage") || lower.includes("out of usage")) {
        return "Extra usage credits exhausted. Anthropic bills Soma separately from your plan limits. " +
               "Add credits at claude.ai/settings/usage or use an API key for direct billing.";
    }

    // Credit / billing exhausted
    if (lower.includes("credit") && (lower.includes("exhausted") || lower.includes("exceeded") || lower.includes("insufficient"))) {
        return "API credits exhausted. Check your billing at claude.ai/settings/usage.";
    }

    // Invalid API key
    if (lower.includes("invalid") && (lower.includes("api key") || lower.includes("api_key") || lower.includes("x-api-key"))) {
        return "Invalid API key. Check your key with: soma settings";
    }

    // Authentication required
    if (lower.includes("authentication") || lower.includes("unauthorized")) {
        return "Authentication required. Run: soma login";
    }

    // Model not found / not available
    if (lower.includes("model") && (lower.includes("not found") || lower.includes("not available") || lower.includes("does not exist"))) {
        const modelMatch = message.match(/model[:\s]+["']?([^"'\s,}]+)/i);
        const model = modelMatch ? modelMatch[1] : "selected model";
        return `Model "${model}" is not available. Try a different model with Ctrl+K.`;
    }

    // Content too large
    if (lower.includes("too large") || lower.includes("maximum.*tokens") || lower.includes("context.*length")) {
        return "Request too large for the model's context window. Try /compact or start a new session.";
    }

    // Rate limited (already handled by retry, but just in case)
    if (statusCode === 429 || lower.includes("rate limit") || lower.includes("too many requests")) {
        return "Rate limited — too many requests. Waiting before retry...";
    }

    // Overloaded
    if (lower.includes("overloaded")) {
        return "API is overloaded. Will retry automatically.";
    }

    return null;
}
