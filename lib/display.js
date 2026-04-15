/**
 * Terminal display helpers — colors, typing effects, text wrapping.
 * Extracted from thin-cli.js to share across commands.
 */

export const bold = s => `\x1b[1m${s}\x1b[0m`;
export const dim = s => `\x1b[2m${s}\x1b[0m`;
export const italic = s => `\x1b[3m${s}\x1b[0m`;
export const cyan = s => `\x1b[36m${s}\x1b[0m`;
export const green = s => `\x1b[32m${s}\x1b[0m`;
export const yellow = s => `\x1b[33m${s}\x1b[0m`;
export const red = s => `\x1b[31m${s}\x1b[0m`;
export const magenta = s => `\x1b[35m${s}\x1b[0m`;
export const white = s => `\x1b[97m${s}\x1b[0m`;

export function printSigma() {
  console.log("");
  console.log(cyan("    σ"));
  console.log("");
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Type out text character by character.
 * Punctuation pauses longer. Newlines pause. ANSI codes print instantly.
 */
export async function typeOut(text, opts = {}) {
  if (!process.stdout.isTTY) { process.stdout.write(text); return; }

  let pace = 1.0;
  let i = 0;

  while (i < text.length) {
    const remaining = text.slice(i);
    const ansi = remaining.match(/^\x1b\[[0-9;]*m/);
    if (ansi) { process.stdout.write(ansi[0]); i += ansi[0].length; continue; }

    const ch = text[i];
    const next = text[i + 1] || "";
    process.stdout.write(ch);
    i++;

    pace += (Math.random() - 0.5) * 0.15;
    pace = Math.max(0.6, Math.min(1.4, pace));

    if (ch === "\n") {
      await sleep(58 * pace);
    } else if (".!?".includes(ch) && (next === " " || next === "\n" || next === "")) {
      await sleep((230 + Math.random() * 175) * pace);
    } else if (ch === "," || ch === ";" || ch === ":") {
      await sleep((70 + Math.random() * 46) * pace);
    } else if (ch === "—" || ch === "–") {
      await sleep((92 + Math.random() * 70) * pace);
    } else if (ch === " ") {
      await sleep((9 + Math.random() * 23) * pace);
    } else {
      await sleep((6 + Math.random() * 14) * pace);
    }
  }
}

/**
 * Type a word-wrapped paragraph with typing effect.
 */
export async function typeParagraph(text, indent = "  ", width = 58) {
  const words = text.split(" ");
  let line = indent;
  const lines = [];
  for (const word of words) {
    if (line.length + word.length > width + indent.length && line.trim()) {
      lines.push(line);
      line = indent + word;
    } else {
      line += (line.trim() ? " " : "") + word;
    }
  }
  if (line.trim()) lines.push(line);
  await typeOut(lines.join("\n") + "\n");
}

export function wrapText(text, indent = "  ", width = 58) {
  const words = text.split(" ");
  const lines = [];
  let line = indent;
  for (const word of words) {
    if (line.length + word.length > width + indent.length && line.trim()) {
      lines.push(line);
      line = indent + word;
    } else {
      line += (line.trim() ? " " : "") + word;
    }
  }
  if (line.trim()) lines.push(line);
  return lines.join("\n");
}

// ── Interactive prompt helpers ─────────────────────────────────────────

export function waitForKey(prompt) {
  return new Promise(resolve => {
    process.stdout.write(prompt);
    if (!process.stdin.isTTY) { resolve(""); return; }
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf-8");
    process.stdin.once("data", key => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
      if (key === "\u0003") process.exit(0);
      resolve(key);
    });
  });
}

export async function confirm(prompt) {
  const key = await waitForKey(`${prompt} ${dim("[Enter]")} `);
  return true;
}

export async function confirmYN(prompt) {
  const key = await waitForKey(`${prompt} ${dim("[y/n]")} `);
  return key.toLowerCase() === "y";
}

export function readLine(prompt) {
  return new Promise(resolve => {
    process.stdout.write(prompt);
    if (!process.stdin.isTTY) { resolve(""); return; }
    process.stdin.setRawMode(false);
    process.stdin.resume();
    process.stdin.setEncoding("utf-8");
    let buf = "";
    const onData = chunk => {
      buf += chunk;
      if (buf.includes("\n")) {
        process.stdin.pause();
        process.stdin.removeListener("data", onData);
        resolve(buf.trim());
      }
    };
    process.stdin.on("data", onData);
  });
}

export function readSecret(prompt) {
  return new Promise(resolve => {
    process.stdout.write(prompt);
    if (!process.stdin.isTTY) { resolve(""); return; }
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf-8");
    let buf = "";
    const onData = chunk => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n") {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.removeListener("data", onData);
          process.stdout.write("\n");
          resolve(buf);
          return;
        } else if (ch === "\u007F" || ch === "\b") {
          if (buf.length > 0) {
            buf = buf.slice(0, -1);
            process.stdout.write("\b \b");
          }
        } else if (ch === "\u0003") {
          process.stdout.write("\n");
          process.exit(0);
        } else if (ch >= " ") {
          buf += ch;
          process.stdout.write("•");
        }
      }
    };
    process.stdin.on("data", onData);
  });
}
