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

import { EventEmitter } from "node:events";
export function createEventBus() {
    const emitter = new EventEmitter();
    return {
        emit: (channel, data) => {
            emitter.emit(channel, data);
        },
        on: (channel, handler) => {
            const safeHandler = async (data) => {
                try {
                    await handler(data);
                }
                catch (err) {
                    console.error(`Event handler error (${channel}):`, err);
                }
            };
            emitter.on(channel, safeHandler);
            return () => emitter.off(channel, safeHandler);
        },
        clear: () => {
            emitter.removeAllListeners();
        },
    };
}
//# sourceMappingURL=event-bus.js.map