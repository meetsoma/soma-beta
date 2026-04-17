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

/**
 * Central timing instrumentation for startup profiling.
 * Enable with PI_TIMING=1 environment variable.
 */
const ENABLED = process.env.PI_TIMING === "1";
const timings = [];
let lastTime = Date.now();
export function resetTimings() {
    if (!ENABLED)
        return;
    timings.length = 0;
    lastTime = Date.now();
}
export function time(label) {
    if (!ENABLED)
        return;
    const now = Date.now();
    timings.push({ label, ms: now - lastTime });
    lastTime = now;
}
export function printTimings() {
    if (!ENABLED || timings.length === 0)
        return;
    console.error("\n--- Startup Timings ---");
    for (const t of timings) {
        console.error(`  ${t.label}: ${t.ms}ms`);
    }
    console.error(`  TOTAL: ${timings.reduce((a, b) => a + b.ms, 0)}ms`);
    console.error("------------------------\n");
}
//# sourceMappingURL=timings.js.map