/**
 * About page — "What is Soma?" with generated pitch.
 */
import { soma as voice } from "../personality.js";
import { bold, dim, cyan, italic, magenta, green, printSigma, typeOut } from "../lib/display.js";
import { isInstalled } from "../lib/detect.js";
import { SITE_URL } from "../lib/config.js";

export async function showAbout() {
  printSigma();
  console.log(`  ${bold("What is Soma?")}`);
  console.log("");
  console.log("  Soma is an AI coding agent that grows with you.");
  console.log("  It remembers across sessions — not by storing chat logs,");
  console.log("  but by evolving its own working patterns through use.");
  console.log("");
  console.log(`  ${bold("How it works:")}`);
  console.log("");
  console.log(`  ${cyan("1.")} ${bold("Identity")} — The agent maintains a self-written identity file.`);
  console.log(`     It knows your project, your patterns, your preferences.`);
  console.log("");
  console.log(`  ${cyan("2.")} ${bold("Protocols")} — Behavioural rules that shape how the agent works.`);
  console.log(`     "Read before write." "Test before commit." They have heat —`);
  console.log(`     used ones stay hot, unused ones fade.`);
  console.log("");
  console.log(`  ${cyan("3.")} ${bold("Muscles")} — Learned patterns. "Use esbuild for bundling."`);
  console.log(`     "This API uses OAuth, not API keys." Muscles grow from`);
  console.log(`     corrections and repetition.`);
  console.log("");
  console.log(`  ${cyan("4.")} ${bold("Breath Cycle")} — Inhale (load state) → Hold (work) → Exhale`);
  console.log(`     (save state). At context limits, the agent writes a preload`);
  console.log(`     for its next self — a briefing, not a summary.`);
  console.log("");
  console.log(`  ${cyan("5.")} ${bold("Scripts")} — The agent builds tools for itself. What it does`);
  console.log(`     twice manually, it automates. Scripts survive across sessions.`);
  console.log("");
  console.log(`  ${dim("─".repeat(58))}`);
  console.log("");

  const pitch = voice.ask("what_is_soma");
  await typeOut(`  ${magenta("❝")} ${italic(pitch)}\n`);
  console.log("");

  if (!isInstalled()) {
    console.log(`  ${dim("→")} ${green("soma init")} to install  ${dim("·")}  ${cyan(SITE_URL)}`);
  } else {
    console.log(`  ${dim(SITE_URL)}`);
  }
  console.log("");
}
