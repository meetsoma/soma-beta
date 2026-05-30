/**
 * soma model - interactive model switching
 *
 * Usage:
 *   soma model                  → show current defaults (global + project)
 *   soma model <pattern>        → fuzzy match, confirm, ask scope
 *   soma model <pattern> set    → set as global default
 *   soma model <pattern> project → set as project-local default
 *   soma model <pattern> start  → set as global default + start session
 *   soma model --list [search]  → list available models
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { createInterface } from "readline";

const bold = s => `\x1b[1m${s}\x1b[0m`;
const dim = s => `\x1b[2m${s}\x1b[0m`;
const green = s => `\x1b[32m${s}\x1b[0m`;
const yellow = s => `\x1b[33m${s}\x1b[0m`;
const red = s => `\x1b[31m${s}\x1b[0m`;
const cyan = s => `\x1b[36m${s}\x1b[0m`;

function getGlobalSettingsPath() {
  const home = process.env.HOME || process.env.USERPROFILE || "";
  const somaAgent = join(home, ".soma", "agent", "settings.json");
  const piAgent = join(home, ".pi", "agent", "settings.json");
  if (existsSync(somaAgent)) return somaAgent;
  if (existsSync(piAgent)) return piAgent;
  return somaAgent;
}

function getProjectSettingsPath() {
  return join(process.cwd(), ".soma", "settings.json");
}

function readSettings(path) {
  if (!existsSync(path)) return {};
  try { return JSON.parse(readFileSync(path, "utf-8")); }
  catch { return {}; }
}

function writeSettings(path, settings) {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, JSON.stringify(settings, null, "\t") + "\n");
}

async function loadModels() {
  // Dynamic import - models are ESM
  const agentDir = process.env.SOMA_CODING_AGENT_DIR || join(process.env.HOME || "", ".soma", "agent");
  const modelsPath = join(agentDir, "dist", "node_modules", "@earendil-works", "pi-ai", "dist", "models.generated.js");
  // Fallback: try from the package we're bundled with
  const localPath = new URL("../../node_modules/@earendil-works/pi-ai/dist/models.generated.js", import.meta.url).pathname;

  let MODELS;
  for (const p of [localPath, modelsPath]) {
    try {
      const mod = await import(p);
      MODELS = mod.MODELS;
      if (MODELS) break;
    } catch { /* try next */ }
  }

  if (!MODELS) return [];

  const all = [];
  for (const [provider, providerData] of Object.entries(MODELS)) {
    for (const [id, model] of Object.entries(providerData)) {
      if (typeof model === "object" && model && model.id) {
        all.push({ ...model, provider });
      }
    }
  }
  return all;
}

function fuzzyMatch(pattern, models) {
  const lower = pattern.toLowerCase();

  // Exact match first
  const exact = models.find(m => m.id.toLowerCase() === lower);
  if (exact) return [exact];

  // Partial match on id and name
  const matches = models.filter(m =>
    m.id.toLowerCase().includes(lower) ||
    (m.name && m.name.toLowerCase().includes(lower))
  );

  return matches;
}

function isAlias(id) {
  // Aliases don't have date suffixes like -20250514
  return !/-\d{8}$/.test(id);
}

function dedupeByAlias(matches) {
  // Group by base name, prefer aliases over dated versions
  const groups = new Map();
  for (const m of matches) {
    // Group key: provider + base model name (strip date suffix)
    const base = m.id.replace(/-\d{8}$/, "");
    const key = `${m.provider}/${base}`;
    const existing = groups.get(key);
    if (!existing || (isAlias(m.id) && !isAlias(existing.id))) {
      groups.set(key, m);
    }
  }
  return [...groups.values()];
}

function formatModel(m, current) {
  const isCurrent = current && m.provider === current.provider && m.id === current.modelId;
  const marker = isCurrent ? green(" ← current") : "";
  const cost = m.cost ? dim(` ($${m.cost.input}/${m.cost.output})`) : "";
  const reasoning = m.reasoning ? dim(" [reasoning]") : "";
  return `${bold(m.id)}  ${dim(m.provider)}${cost}${reasoning}${marker}`;
}

function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export async function handleModelCommand(args) {
  const globalPath = getGlobalSettingsPath();
  const projectPath = getProjectSettingsPath();
  const globalSettings = readSettings(globalPath);
  const projectSettings = readSettings(projectPath);

  // Resolve effective default: project overrides global (matching SettingsManager merge)
  const effectiveProvider = projectSettings.defaultProvider || globalSettings.defaultProvider || null;
  const effectiveModel = projectSettings.defaultModel || globalSettings.defaultModel || null;
  const current = { provider: effectiveProvider, modelId: effectiveModel };
  const projectCurrent = projectSettings.defaultModel
    ? { provider: projectSettings.defaultProvider || "?", modelId: projectSettings.defaultModel }
    : null;

  // soma model --list [search]
  if (args.includes("--list") || args.includes("-l")) {
    const search = args.filter(a => !a.startsWith("-"))[0];
    const models = await loadModels();
    if (models.length === 0) {
      console.log(`\n  ${red("✗")} Could not load models. Check your installation.\n`);
      return;
    }

    let filtered = search ? fuzzyMatch(search, models) : models;
    // Only show Anthropic claude models by default if no search
    if (!search) {
      filtered = filtered.filter(m => m.provider === "anthropic" && m.id.startsWith("claude-"));
    }
    filtered = dedupeByAlias(filtered);
    filtered.sort((a, b) => a.id.localeCompare(b.id));

    console.log(`\n  ${bold("Available Models")}${search ? dim(` matching "${search}"`) : dim(" (anthropic - use --list <search> for others)")}\n`);
    for (const m of filtered) {
      console.log(`  ${formatModel(m, current)}`);
    }
    console.log(`\n  ${dim(`${filtered.length} models shown. Use`)} ${green("soma model --list <search>")} ${dim("to filter.")}\n`);
    return;
  }

  // soma model (no args) → show current
  const pattern = args.filter(a => !a.startsWith("-") && a !== "set" && a !== "start" && a !== "project")[0];
  const action = args.includes("set") ? "set" : args.includes("start") ? "start" : args.includes("project") ? "project" : null;

  if (!pattern) {
    if (effectiveProvider && effectiveModel) {
      console.log(`\n  ${bold("Current default model:")}`);
      console.log(`  ${green(effectiveModel)}  ${dim(effectiveProvider)}`);
      if (projectCurrent) {
        console.log(`  ${dim("(project override - remove with: soma model --clear-project)")}`);
      } else {
        console.log(`  ${dim("(global default)")}`);
      }
      console.log(`\n  ${dim("Change:")} ${green("soma model <pattern>")}  ${dim("e.g.")} ${green("soma model opus-4-7")}`);
      console.log(`  ${dim("List:")}   ${green("soma model --list")}\n`);
    } else {
      console.log(`\n  ${dim("No default model set.")}`);
      console.log(`  ${dim("Set one:")} ${green("soma model opus set")}\n`);
    }
    return;
  }

  // Load models and fuzzy match
  const models = await loadModels();
  if (models.length === 0) {
    console.log(`\n  ${red("✗")} Could not load models.\n`);
    return;
  }

  let matches = fuzzyMatch(pattern, models);
  matches = dedupeByAlias(matches);

  if (matches.length === 0) {
    console.log(`\n  ${red("✗")} No models matching "${pattern}".`);
    console.log(`  ${dim("Try:")} ${green("soma model --list")} ${dim("to see available models.")}\n`);
    return;
  }

  let selected;

  if (matches.length === 1) {
    selected = matches[0];
  } else {
    // Multiple matches - ask which one
    // But first, filter to just anthropic if "opus" or "sonnet" is in pattern
    const anthropicOnly = matches.filter(m => m.provider === "anthropic");
    if (anthropicOnly.length > 0 && anthropicOnly.length < matches.length) {
      // Show anthropic first, then others
      const others = matches.filter(m => m.provider !== "anthropic");
      console.log(`\n  ${bold("Multiple matches for")} "${pattern}":\n`);
      console.log(`  ${dim("Anthropic:")}`);
      anthropicOnly.forEach((m, i) => console.log(`  ${green(i + 1 + ".")} ${formatModel(m, current)}`));
      if (others.length > 0 && others.length <= 5) {
        console.log(`\n  ${dim("Other providers:")}`);
        others.forEach((m, i) => console.log(`  ${green(anthropicOnly.length + i + 1 + ".")} ${formatModel(m, current)}`));
      } else if (others.length > 5) {
        console.log(`\n  ${dim(`+ ${others.length} matches from other providers (use --list to see all)`)}`);
      }
      matches = [...anthropicOnly, ...others.slice(0, 5)];
    } else {
      console.log(`\n  ${bold("Multiple matches for")} "${pattern}":\n`);
      matches.slice(0, 10).forEach((m, i) => console.log(`  ${green(i + 1 + ".")} ${formatModel(m, current)}`));
      if (matches.length > 10) {
        console.log(`  ${dim(`+ ${matches.length - 10} more (refine your search)`)}`);
        matches = matches.slice(0, 10);
      }
    }

    const choice = await ask(`\n  ${bold("Select")} [1-${matches.length}]: `);
    const idx = parseInt(choice, 10) - 1;
    if (isNaN(idx) || idx < 0 || idx >= matches.length) {
      console.log(`  ${dim("Cancelled.")}\n`);
      return;
    }
    selected = matches[idx];
  }

  // We have a selected model
  console.log(`\n  ${green("→")} ${bold(selected.id)}  ${dim(selected.provider)}`);

  // Determine action
  if (!action) {
    // Interactive — ask what to do
    const isInProject = existsSync(join(process.cwd(), ".soma"));
    console.log("");
    console.log(`  ${green("1.")} Set as global default ${dim("(persistent — used for all projects)")}`);
    if (isInProject) {
      console.log(`  ${green("2.")} Set for this project only ${dim("(overrides global, saved to .soma/settings.json)")}`);
      console.log(`  ${green("3.")} Set as global default + start new session`);
      console.log(`  ${green("4.")} Cancel`);
      const choice = await ask(`\n  ${bold("Action")} [1-4]: `);

      if (choice === "1") {
        setDefault(globalPath, globalSettings, selected);
      } else if (choice === "2") {
        setProjectDefault(projectPath, projectSettings, selected);
      } else if (choice === "3") {
        setDefault(globalPath, globalSettings, selected);
        return "start";
      } else {
        console.log(`  ${dim("Cancelled.")}\n`);
        return;
      }
    } else {
      console.log(`  ${green("2.")} Set as default + start new session`);
      console.log(`  ${green("3.")} Cancel`);
      const choice = await ask(`\n  ${bold("Action")} [1-3]: `);

      if (choice === "1") {
        setDefault(globalPath, globalSettings, selected);
      } else if (choice === "2") {
        setDefault(globalPath, globalSettings, selected);
        return "start";
      } else {
        console.log(`  ${dim("Cancelled.")}\n`);
        return;
      }
    }
  } else if (action === "set") {
    setDefault(globalPath, globalSettings, selected);
  } else if (action === "project") {
    setProjectDefault(projectPath, projectSettings, selected);
  } else if (action === "start") {
    setDefault(globalPath, globalSettings, selected);
    return "start";
  }
}

function setDefault(path, settings, model) {
  settings.defaultProvider = model.provider;
  settings.defaultModel = model.id;

  // Sync enabledModels - move selected model to front (index 0).
  // Pi's findInitialModel (model-resolver.js) picks scopedModels[0] (Step 2)
  // BEFORE defaultProvider+defaultModel (Step 3), so a non-front entry never
  // becomes the startup model. Always unshift.
  if (Array.isArray(settings.enabledModels)) {
    if (settings.enabledModels.length === 0) {
      settings.enabledModels = [];
    }
    const providerPrefix = model.provider + "/";
    // Remove any existing entry for this model (any position)
    settings.enabledModels = settings.enabledModels.filter(e => {
      const entry = e.split(":")[0]; // strip thinking level
      return !(entry.startsWith(providerPrefix) ||
               entry === model.id ||
               entry.split(":")[0] === model.id);
    });
    // Unshift to front (preserves any thinking level from old entry,
    // but since we filtered above, just use plain provider/id)
    settings.enabledModels.unshift(providerPrefix + model.id);
  }

  writeSettings(path, settings);
  console.log(`\n  ${green("✓")} Default model set to ${bold(model.id)} (${model.provider})`);
  console.log(`  ${dim("Saved to:")} ${path}`);
  console.log(`\n  ${dim("Applies to new sessions.")} ${dim("For this session:")} ${green(`soma --model ${model.id}`)}\n`);
}

function setProjectDefault(path, settings, model) {
  settings.defaultProvider = model.provider;
  settings.defaultModel = model.id;

  if (Array.isArray(settings.enabledModels)) {
    const providerPrefix = model.provider + "/";
    settings.enabledModels = settings.enabledModels.filter(e => {
      const entry = e.split(":")[0];
      return !(entry.startsWith(providerPrefix) ||
               entry === model.id ||
               entry.split(":")[0] === model.id);
    });
    settings.enabledModels.unshift(providerPrefix + model.id);
  }

  writeSettings(path, settings);
  console.log(`\n  ${green("✓")} Project default set to ${bold(model.id)} (${model.provider})`);
  console.log(`  ${dim("Saved to:")} ${path}`);
  console.log(`\n  ${dim("Overrides global default for this project.")}\n`);
}
