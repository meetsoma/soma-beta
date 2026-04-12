/**
 * Welcome experience — first run and returning user flow.
 */
import { soma as voice } from "../personality.js";
import { bold, dim, green, white, printSigma, typeOut, typeParagraph, readLine, confirmYN } from "../lib/display.js";
import { isInstalled, hasAnyAuth, hasGitHubCLI, getGitHubUsername, detectKeyInShellConfig, getShellConfigPath } from "../lib/detect.js";
import { getCliVersion } from "../lib/detect.js";
import { SITE_URL } from "../lib/config.js";
import { apiKeySetup } from "./auth.js";
import { handleQuestion, interactiveQ } from "./qa.js";

export async function showWelcome(delegateToCore, initSoma) {
  const VERSION = getCliVersion();
  printSigma();
  console.log(`  ${bold("Soma")} ${dim("—")} ${white("the AI agent that remembers")}`);
  console.log("");

  if (isInstalled()) {
    const ghUser = hasGitHubCLI() ? getGitHubUsername() : null;
    if (ghUser) {
      console.log(`  ${green("✓")} ${voice.greetBack(ghUser)}`);
    }

    if (!hasAnyAuth()) {
      console.log(`  ${green("✓")} Core installed`);
      console.log("");

      const unloadedKey = detectKeyInShellConfig();
      if (unloadedKey) {
        console.log(`  ${dim("yellow")} Found ${bold(unloadedKey)} in ${dim(getShellConfigPath())} but it's not loaded.`);
        console.log(`  ${dim("Restart your terminal and run")} ${green("soma")} ${dim("again.")}`);
        console.log("");
        return;
      }

      await apiKeySetup();

      if (!hasAnyAuth() && !process.env.ANTHROPIC_API_KEY && !process.env._SOMA_OAUTH_PENDING) {
        console.log(`  ${dim("No worries.")} ${voice.spin("{Come back when you're ready.|Set up a key and run soma again.|We'll be here.}")}`);
        console.log("");
        console.log(`  ${dim(`v${VERSION} · BSL 1.1 · soma.gravicity.ai`)}`);
        console.log("");
        return;
      }
    } else {
      console.log(`  ${green("✓")} Core installed. Starting Soma...`);
    }
    console.log("");
    await delegateToCore();
    return;
  }

  // ── Not installed — first time ever ──
  await typeOut(`  ${voice.greet()}\n`);
  console.log("");
  await typeParagraph("Soma is an AI coding agent that remembers across sessions. It learns your patterns, builds its own tools, and picks up where it left off.");
  console.log("");
  console.log(`  ${dim("─".repeat(58))}`);
  console.log("");
  console.log(`  ${dim("→")} Press ${green("Enter")} to set up, or type a question.`);
  console.log("");

  const input = await readLine(`  ${dim("→")} `);

  if (input && input !== "") {
    await handleQuestion(input);
    await interactiveQ();
  }

  await initSoma();

  if (isInstalled() && !hasAnyAuth()) {
    await apiKeySetup();
  }

  if (isInstalled() && (hasAnyAuth() || process.env.ANTHROPIC_API_KEY || process.env._SOMA_OAUTH_PENDING)) {
    console.log(`  ${dim("─".repeat(58))}`);
    console.log("");
    const launch = await confirmYN(`  ${voice.spin("{Ready to go?|Want to start your first session?|Launch Soma?}")}`);
    if (launch) {
      console.log("");
      await delegateToCore();
      return;
    }
  }

  console.log("");
  console.log(`  ${dim(`v${VERSION} · BSL 1.1 · soma.gravicity.ai`)}`);
  console.log("");
}
