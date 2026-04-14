/**
 * Sanitize raw API error messages into human-readable text.
 * 
 * Build-time patch applied to Pi's dist/. Converts raw JSON error bodies
 * into actionable messages. Zero cache impact — display-layer only.
 * 
 * PATCH NOTE: This file is a Soma addition to the Pi runtime dist/.
 * Preserved across Pi updates by apply-patches.sh.
 * See: repos/agent/scripts/_dev/patches/error-sanitizer.md
 */

let billingErrorCount = 0;

/**
 * Extract human-readable message from an API error string.
 * Handles both raw JSON bodies and pre-parsed error messages.
 */
export function sanitizeApiError(raw) {
    if (!raw || typeof raw !== "string") return raw || "Unknown error";

    // Try to extract message from JSON error body
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
        const jsonMatch = body.match(/\{.*"message"\s*:\s*"([^"]+)"/s);
        if (jsonMatch) {
            message = jsonMatch[1];
        }
    }

    // Apply rewrites only for specific categories
    const friendly = getFriendlyMessage(message, statusCode);
    return friendly || message;
}

/**
 * Map known API error patterns to actionable user-facing messages.
 * 
 * Philosophy: only rewrite errors where the raw message is confusing
 * or unhelpful. Retryable errors (overloaded, 500, timeout) pass through
 * untouched — Pi handles retry and the raw message is clear enough.
 */
function getFriendlyMessage(message, statusCode) {
    if (!message) return null;
    const lower = message.toLowerCase();

    // ── Billing / Usage ──────────────────────────────────────
    // These get progressive treatment based on count.
    // Statusline handles the OAuth-specific warnings separately.

    // Account rate limit = real plan limit. Show raw (clear enough).
    if (lower.includes("exceed") && lower.includes("account") && lower.includes("rate limit")) {
        return null; // pass through untouched
    }

    // "Extra usage" errors = Anthropic's third-party classification
    const isBilling = lower.includes("extra usage") || lower.includes("out of usage") ||
        (lower.includes("third-party") && lower.includes("usage")) ||
        (lower.includes("credit") && (lower.includes("exhausted") || lower.includes("exceeded") || lower.includes("insufficient")));

    if (isBilling) {
        billingErrorCount++;
        if (billingErrorCount === 1) {
            return "Billing check — retrying...";
        } else if (billingErrorCount <= 3) {
            return "Anthropic billing check failed. " +
                   "Try sending another message, or use an API key to avoid this.";
        } else {
            return "Anthropic billing check not clearing. " +
                   "Check claude.ai/settings/usage or use an API key.";
        }
    }

    // Reset billing counter on any non-billing error (transient cleared)
    billingErrorCount = 0;

    // ── Auth errors (rewrite — raw is confusing) ─────────────

    if (lower.includes("invalid") && (lower.includes("api key") || lower.includes("api_key") || lower.includes("x-api-key"))) {
        return "Invalid API key. Check your key with: soma settings";
    }

    if (lower.includes("authentication") || lower.includes("unauthorized")) {
        return "Authentication required. Run: soma login";
    }

    // ── Model errors (rewrite — helpful) ─────────────────────

    if (lower.includes("model") && (lower.includes("not found") || lower.includes("not available") || lower.includes("does not exist"))) {
        const modelMatch = message.match(/model[:\s]+["']?([^"'\s,}]+)/i);
        const model = modelMatch ? modelMatch[1] : "selected model";
        return `Model "${model}" is not available. Try a different model with Ctrl+K.`;
    }

    // ── Context errors (rewrite — actionable) ────────────────

    if (lower.includes("too large") || lower.includes("maximum.*tokens") || lower.includes("context.*length")) {
        return "Request too large for the model's context window. Try /compact or start a new session.";
    }

    // ── Everything else passes through untouched ─────────────
    // Overloaded, 500, timeout, rate limit, content filter,
    // image errors, unknown errors — show the raw message.
    // Pi retries retryable ones. User needs to see structural ones.

    return null;
}
