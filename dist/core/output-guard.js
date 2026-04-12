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

let stdoutTakeoverState;
export function takeOverStdout() {
    if (stdoutTakeoverState) {
        return;
    }
    const rawStdoutWrite = process.stdout.write.bind(process.stdout);
    const rawStderrWrite = process.stderr.write.bind(process.stderr);
    const originalStdoutWrite = process.stdout.write;
    process.stdout.write = ((chunk, encodingOrCallback, callback) => {
        if (typeof encodingOrCallback === "function") {
            return rawStderrWrite(String(chunk), encodingOrCallback);
        }
        return rawStderrWrite(String(chunk), callback);
    });
    stdoutTakeoverState = {
        rawStdoutWrite,
        rawStderrWrite,
        originalStdoutWrite,
    };
}
export function restoreStdout() {
    if (!stdoutTakeoverState) {
        return;
    }
    process.stdout.write = stdoutTakeoverState.originalStdoutWrite;
    stdoutTakeoverState = undefined;
}
export function isStdoutTakenOver() {
    return stdoutTakeoverState !== undefined;
}
export function writeRawStdout(text) {
    if (stdoutTakeoverState) {
        stdoutTakeoverState.rawStdoutWrite(text);
        return;
    }
    process.stdout.write(text);
}
export async function flushRawStdout() {
    if (stdoutTakeoverState) {
        await new Promise((resolve, reject) => {
            stdoutTakeoverState?.rawStdoutWrite("", (err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
        return;
    }
    await new Promise((resolve, reject) => {
        process.stdout.write("", (err) => {
            if (err)
                reject(err);
            else
                resolve();
        });
    });
}
//# sourceMappingURL=output-guard.js.map