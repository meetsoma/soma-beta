/**
 * API key setup wizard — guides new users through auth.
 */
import { soma as voice } from "../personality.js";
import { bold, dim, cyan, green, yellow, typeOut, typeParagraph, waitForKey, readSecret } from "../lib/display.js";
import { hasAnyAuth, getShellConfigPath, getShellConfigAbsPath, openBrowser } from "../lib/detect.js";
import { appendFileSync } from "fs";

export async function apiKeySetup() {
  console.log(`  ${yellow("!")} One more thing — Soma needs an AI provider to work.`);
  console.log("");
  await typeOut(`  ${voice.spin("{Do you have an Anthropic API key?|Got a Claude API key?|Have an API key for Claude?}")}\n`);
  console.log("");
  console.log(`    ${green("y")}  ${dim("Yes, I have a key")}`);
  console.log(`    ${green("n")}  ${dim("No, I need one")}`);
  console.log(`    ${green("s")}  ${dim("I have a Claude Pro/Max subscription")}`);
  console.log(`    ${green("?")}  ${dim("What's an API key?")}`);
  console.log("");

  const key = await waitForKey(`  ${dim("→")} `);
  const choice = key.toLowerCase();

  if (choice === "y") {
    await apiKeyEntry();
  } else if (choice === "s") {
    await oauthGuide();
  } else if (choice === "?") {
    await apiKeyExplain();
  } else {
    await apiKeyGetOne();
  }
}

export async function apiKeyExplain() {
  console.log("");
  await typeParagraph("An API key is like a password that lets Soma talk to an AI model. You get one from Anthropic (the company that makes Claude), paste it into your terminal config, and Soma handles the rest. Your key stays on your machine — Soma never sends it anywhere.");
  console.log("");
  await typeParagraph("If you have a Claude Pro or Max subscription, you don't need a separate key — you can log in with your account instead.");
  console.log("");

  console.log(`    ${green("g")}  ${dim("Get a key (I'll show you how)")}`);
  console.log(`    ${green("s")}  ${dim("I have Claude Pro/Max — log in instead")}`);
  console.log("");

  const key = await waitForKey(`  ${dim("→")} `);
  if (key.toLowerCase() === "s") {
    await oauthGuide();
  } else {
    await apiKeyGetOne();
  }
}

export async function apiKeyGetOne() {
  console.log("");
  await typeOut(`  ${voice.spin("{Here's how.|Let me walk you through it.|Quick steps.}")}\n`);
  console.log("");
  console.log(`  ${cyan("Step 1:")} Open this link to create a key:`);
  console.log("");
  console.log(`    ${cyan("https://console.anthropic.com/settings/keys")}`);
  console.log("");
  openBrowser("https://console.anthropic.com/settings/keys");
  console.log(`    ${dim("(opened in your browser)")}`);
  console.log("");
  const { confirm } = await import("../lib/display.js");
  await confirm(`  ${dim("→")} Press ${bold("Enter")} when you have your key`);
  await apiKeyEntry();
}

export async function apiKeyEntry() {
  console.log("");
  console.log(`  ${cyan("Step 2:")} Paste your key below.`);
  console.log(`  ${dim("It starts with")} sk-ant-...`);
  console.log("");

  const apiKey = await readSecret(`  ${dim("Key:")} `);

  if (!apiKey || !apiKey.startsWith("sk-")) {
    console.log("");
    if (!apiKey) {
      console.log(`  ${dim("No key entered. You can set it up later.")}`);
    } else {
      console.log(`  ${yellow("!")} That doesn't look like an Anthropic key.`);
      console.log(`  ${dim("Keys start with")} sk-ant-...`);
    }
    console.log("");
    const sc = getShellConfigPath();
    console.log(`  ${dim("When you have your key, add it to")} ${dim(sc)}${dim(":")}`);
    console.log(`    ${green('export ANTHROPIC_API_KEY="your-key-here"')}`);
    console.log(`  ${dim("Then restart your terminal and run")} ${green("soma")}`);
    console.log("");
    return;
  }

  const shellConfigPath = getShellConfigAbsPath();
  const shellConfigName = getShellConfigPath();
  const exportLine = `\nexport ANTHROPIC_API_KEY="${apiKey}"\n`;

  try {
    appendFileSync(shellConfigPath, exportLine);
    console.log("");
    console.log(`  ${green("✓")} Key saved to ${dim(shellConfigName)}`);
    console.log("");
    process.env.ANTHROPIC_API_KEY = apiKey;
    await typeOut(`  ${voice.spin("{You're all set.|Good to go.|Ready.}")} ${dim("Soma can start now.")}\n`);
    console.log("");
  } catch {
    console.log("");
    console.log(`  ${yellow("!")} Couldn't write to ${dim(shellConfigName)}.`);
    console.log(`  ${dim("Add this line manually:")}`);
    console.log(`    ${green(`export ANTHROPIC_API_KEY="${apiKey}"`)}`);
    console.log(`  ${dim("Then restart your terminal and run")} ${green("soma")}`);
    console.log("");
  }
}

export async function oauthGuide() {
  console.log("");
  await typeParagraph("Nice — with a Pro or Max subscription, you can log in with your Anthropic account. No API key needed.");
  console.log("");
  console.log(`  ${dim("When Soma starts, type")} ${green("/login")} ${dim("and follow the prompts.")}`);
  console.log(`  ${dim("It'll open your browser to authenticate.")}`);
  console.log("");
  await typeOut(`  ${voice.spin("{Let's launch.|Starting up.|Here we go.}")}\n`);
  console.log("");
  process.env._SOMA_OAUTH_PENDING = "1";
}
