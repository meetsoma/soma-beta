# Changelog

All notable changes to the Soma agent are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/). Versioning follows [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

_Nothing yet._

## [0.21.1.1] — 2026-04-22 — Same-cycle audit patches

Micro-release caught during a post-ship audit of `v0.21.0..HEAD`. Three
findings with real code impact; two dead-code + hygiene tidy-ups.

### Added

- **`soma model-sync` — audit + set `defaultModel` across all scopes.** New
  bundled script `scripts/soma-model-sync.sh`. Audits global
  (`~/.soma/settings.json`) + project (`<cwd>/.soma/settings.json`) + any
  `.soma/` dirs under `$HOME` (with `--crawl`). `--set <id>` writes
  everywhere; `--yes` skips confirmation; idempotent. Bundled default is
  `claude-opus-4-7` (the latest Opus on Claude Max plans). Creates
  `settings.json` where missing; preserves all unrelated keys in files
  that are already populated. Closes the "keep every project on the
  current model without hand-editing" gap. 23-assertion test suite at
  `tests/test-model-sync.sh`. Guide: `docs/guides/sane-defaults.md`.

### Fixed

- **TmuxDriver shell-quoting.** `tmuxExec` used `JSON.stringify` per-arg,
  which wraps in **double** quotes — bash double-quotes let `$(...)` +
  backticks + `$VAR` expand on the parent shell before tmux sees them.
  A task like `"list files in $(pwd)/logs"` would arrive at the child
  with `$(pwd)` already substituted for the parent's cwd. Switched to
  single-quote wrapping with the classic `'\''` escape for embedded
  quotes. Verified against 7 edge cases (plain, single + double quotes,
  backticks, `$()`, paths, semicolons — all round-trip literal).

  Not a security bug (self-injection only; same user), but a correctness
  bug that landed in v0.21.1 and would surface the first time a user
  wrote a task with shell metacharacters.

- **`soma-model-sync` shell-to-python interpolation.** `read/write_default_model`
  built python `-c` source via `$var` interpolation. A model id with a
  single quote character (or shell metacharacter) would break the `-c`
  block. Moved path + model to env vars (`SOMA_MS_PATH`, `SOMA_MS_MODEL`);
  python source is now static.

- **`.gitignore`: `__pycache__/` + `*.pyc`.** An accidentally-tracked
  `scripts/__pycache__/soma-children.cpython-313.pyc` landed in the
  v0.21.1 agent dev commits. Confirmed it did NOT ship to soma-beta
  (`.releaseignore` filtered it), so no user runtime impact. Cleaned up +
  prevented future recurrence.

- **Dead code removed.** `shEscape` helper in `core/terminal-drivers/tmux.ts`
  was orphaned after the signature changed during the driver refactor.

- **Import order.** `biome --write --unsafe` on `core/terminal-drivers/index.ts`
  + `extensions/soma-delegate.ts` to match the project's import conventions.

## [0.21.1] — 2026-04-22 — Children control panel + tmux baseline

Patch release. Three themes woven together: complete the background-
delegation surface (Phase B ops), ship background delegation to npm users
(tmux driver), and fix a months-old dead branch in the boot resume path
so the delta-diff and `/reload` signal can actually fire.

### Added

- **`children` tool — Phase B ops (SX-553)** — `tail` / `steer` / `kill` /
  `harvest` on top of `list`. `tail` uses the driver's capture; `steer`
  sends a chat message (blocked on non-running); `kill` closes the driver
  container + marks aborted; `harvest` returns the MLR placeholder + removes
  the entry from the registry. `findChild(id)` accepts either the child id
  or the driver handle id (e.g. `surface:8`, `soma-child-abc`).
- **TerminalDriver interface + TmuxDriver baseline (SX-580 Phase C.1–C.2)** —
  new `core/terminal-drivers/` package with a unified driver interface. Two
  implementations: `TmuxDriver` (ships to npm — detached tmux sessions,
  attach-on-demand via `tmux attach -t soma-child-<id>`, works on any Unix
  with tmux installed, no TTY issues, CI-compatible) and `CmuxDriver` (dev-
  mode only, existing logic refactored with zero behavior change). Auto-
  pick prefers `tmux > cmux`. `delegate` gains optional `terminal:'tmux'|'cmux'`
  param. `ChildEntry` schema gains `driver`, `handle_id`, `attach_hint`;
  legacy `pane`/`surface` kept for pre-refactor entries. `children list`
  table gains a driver column. **First time `delegate(background:true)`
  works for a non-cmux user in any Soma release.**
- **`soma terminals` CLI + persistent driver preference (SX-580 Phase C.3–C.4)** —
  new bundled `scripts/soma-terminals.sh` modeled on soma-blog's self-describing
  pattern. Subcommands: `list`, `detect` (list + recommendation),
  `status` (current configured driver), `prefer <driver>` (persist to
  `~/.soma/settings.json` `delegate.terminal`), `setup [<driver>]` (install
  walkthrough), `doctor [<driver>]` (diagnose why a driver isn't working).
  `pickDriver()` consults settings before auto-pick. Precedence:
  per-call `terminal:` param → settings → auto-pick. Agent can run
  `soma terminals setup` and walk a user through install when
  `delegate(background:true)` fails with no-driver-available.
- **`/reload` distinguished from resume in boot message** — `soma-boot` now
  stamps `process.pid` on every fingerprint entry. On resume, if the most
  recent entry's PID matches `process.pid`, the extension re-activated in-
  process (= user ran `/reload`) and the boot message becomes
  `[Soma Boot — /reloaded]` with the explicit signal `any 'needs /reload'
  work from the last turn is now live`. Prompt cache is already busted by
  `/reload` so emitting a message here costs nothing. Distinguishes from:
  ctrl-C restart (new PID, resumed session) and periodic checkpoints (not
  a boot at all).
- **Background-delegation guide** — new `docs/guides/background-delegation.md`
  with the sync-vs-background decision tree, tmux install hints, mental
  model, attach-on-demand pattern, full children-ops examples, kill-vs-harvest
  semantics, the MLR-writing gap stated honestly, troubleshooting entries
  for the two surfaced bugs, and a pointer for authoring new drivers.
  `docs/tools.md` + `docs/commands.md` gain cross-links and CLI table rows.
- **Upstream Pi patches shipped as dist overlays:**
  - **pi-tui inline image height cap (SX-579)** — tall clipboard screenshots
    no longer take over the terminal. Capped at a readable row count via
    `PI_TUI_MAX_IMAGE_ROWS` (default 80% of `process.stdout.rows`, min 20).
    Patch is PR-shaped (opt-in, backward-compatible) pending the upstream
    `CONTRIBUTING.md` flow.
  - **Compaction ephemeral-path filter (SX-569)** — `extractFileOpsFromMessage`
    in Pi's compaction util was collecting every `read`/`write`/`edit` path
    into `<read-files>` / `<modified-files>` XML blocks. macOS clipboard
    paste-temp files (`/var/folders/.../T/clipboard-*.jpeg`) + `/tmp/*.{png,jpg,…}`
    screenshots accumulated across compactions. Added `isEphemeralPath(p)`
    guard. Zero payload mutation.

### Fixed

- **Boot resume fingerprint reader was reading the wrong field** — filter
  code read `entry.content?.fingerprint`, but Pi's `SessionManager.appendEntry`
  stores payloads under `entry.data`. The delta-diff branch had been silently
  dead since it was written; every resume fell through to the "no fingerprint"
  fallback. Fixed — delta-diff resume now actually fires when heat or muscles
  changed.
- **`delegate(background:true)` was broken since Phase A shipped** — `CMUX_SCRIPT`
  path resolution used an unset env var + a dev-install symlink that doesn't
  cover `scripts/`. Every call hit "install cmux" even when cmux was running.
  New resolution walks `SOMA_CMUX_SCRIPT` env → `SOMA_CODING_AGENT_DIR` →
  cwd-relative → walk-up → dev-symlink → PATH. Uncovered by end-to-end
  exercise.
- **Model alias leakage to children** — `spawnBackground` passed bare aliases
  (`haiku`, `sonnet`, `opus`) straight to `soma --model`, and Pi's model
  registry picked the wrong provider (`us.anthropic.haiku-4-5` = bedrock)
  in the child's environment. Child died on missing bedrock creds.
  `MODEL_ALIASES` now exported from `core/delegate-core.ts`; aliases are
  pre-resolved to fully-qualified ids (`claude-haiku-4-5`) before building
  the boot command.
- **Registry stayed `running` after a child's container closed** — no auto
  status-transition on pane death. New `reconcileChildStatuses()` pass runs
  at the start of `children(op:'list')`: any registry entry whose driver
  container is gone auto-flips to `completed` with `ended_at`.
- **Channel guard false-positive on `SOMA_PROJECT_DIR`** — the `soma_pro`
  keyword in the guard's pattern matched `SOMA_PROJECT_DIR` env mentions in
  benign output. Narrowed the pattern.

### Verified end-to-end (s01-b1b654)

`delegate(background:true, terminal:'tmux', model:'haiku')` → `children(op:'list')`
→ `tail` → `steer` → `kill` → `harvest` against a real tmux-spawned child.
Child booted in a detached tmux session, executed the task, responded to
steer, kill cleanly closed the session (`tmux ls` confirmed: no server),
harvest returned the summary and removed the registry entry. Model resolved
to `claude-haiku-4-5` end-to-end. Same flow also verified against a
cmux-spawned child earlier in the same session — both drivers work.

Release notes: `.soma/releases/v0.20.x/v0.21.1/release-notes.md`.

## [0.21.0] — 2026-04-22 — Cache Economics + Discoverability + Self-Knowledge

### Added
- **suppress preventive OAuth-billing warning at boot (SX-566)**
- **test-audit command + hygiene rule engine (SX-564)**
- **swap Pi's π terminal-title glyph for Soma's σ**
- **Agent Notes relocation + preload ancestry + v0.21.0**
- **Terminal tab title now shows `σ - <session> - <cwd>`** — build-time patch to Pi's `interactive-mode.js` swaps the `π` brand glyph for Soma's `σ`. Display-only, zero cache/payload impact. Closes the last Pi brand leak in the TUI chrome.
- **Declarative migration replay via map frontmatter (SX-562)** — `soma doctor` is now data-driven. Migration maps can declare `replay-until: <version>` in frontmatter + a `## Doctor Actions` JSON block in the body (schema: `settings-defaults`, `settings-subkeys`, `scaffold-files`). While the running agent is below `replay-until`, doctor re-evaluates that map on every invocation and applies its actions idempotently. Once agent catches up, the map retires from the replay pass automatically. Future backfill-class migrations don't need CLI code changes — they just add the block to their map. Session-start boot path untouched; only explicit `soma doctor` runs the replay.
- **Agent Notes relocated out of `body/ecosystem.md` (SX-547, v0.21.0)** — the rolling session-observation log now lives at `memory/notes/soma-log.md` (bundled template seeds at init, doctor tier-1 soft-check backfills for upgrades via `writeIfMissing`). `body/ecosystem.md` shrank from 33KB/322 lines to 10KB/174 lines and is now `lazy: true` so its content no longer hits the cached prefix on every boot. Expected cacheWrite savings: ~5.5K tokens/boot (~25%).
- **Recent Ancestry auto-injected into preload (SX-549)** — last N entries from `memory/notes/soma-log.md` inject as `## Recent Ancestry` in the preload user-message on fresh boot. Configured via `settings.preload.recentNotesCount` (default 3; set 0 to disable). User-message injection only; does not affect the cached system prompt. Graceful no-op if `memory/notes/soma-log.md` is missing.
- **Children monitor promoted to bundled scripts (SX-557 follow-up)** — `soma children list/tail/kill/focus/watch` + new `soma children spawn <role> "<task>"` now ship via `repos/agent/scripts/` (was workspace-only). Shell-spawned children register themselves in `~/.soma/state/children.json` so the shipped `children` Pi tool and the CLI dashboard share the same registry. Hex IDs (`child-xxxxxx`) match the SX-553 shape. tmux default driver, cmux optional when available.
- **Doctor tier-1 soft-check for v0.21.0 structural pieces** — pre-0.21.0 users never received the backfilled migration chain, so `addIfMissing` + a new `scaffoldMemoryNotes` check run on every boot. Missing `memory/notes/soma-log.md` gets scaffolded from the bundled template (writeIfMissing, never clobbers). Tier-2 (agent-driven) handles `body/_memory.md` customization review via the migration map's `agent-prompt`.
- **Crystallize Phase A: `soma new muscle` / `soma new protocol` + templates (SX-559)** — lowers the friction of creating new muscles or protocols. Scaffolds the file at the right location (`.soma/amps/muscles/<name>.md` or `--global` for `~/.soma/...`) from a canonical template with frontmatter pre-filled (created date, session origin, author, description, triggers). Idempotent — re-running on an existing name opens it in `$EDITOR` instead of clobbering. Templates live at `templates/default/_muscle-template.md` + `_protocol-template.md` as single source of truth for frontmatter conventions. Addresses the "she'll see patterns but won't crystallize them because the ceremony is too high" gap. Phase B (the `crystallize` Pi tool) + Phase C (idempotent update semantics) scoped in `releases/v0.20.x/plans/crystallize/README.md`.
- **Discoverability: `soma tool` CLI + `capabilities` Pi tool (SX-558)** — two surfaces to introspect Soma's tool registry without re-reading the whole system prompt. `soma tool` (no args) lists every registered tool with a one-liner; `soma tool <name>` prints the full authored guidance (description, promptSnippet, promptGuidelines, parameters). Runs offline via static parse of `extensions/*.ts` — no session needed. For the runtime view (post-`_tools.md` overrides), a new `capabilities` Pi tool with `op:'list'` and `op:'detail'` does the same thing from inside a session. Closes the "`soma delegate --help` does nothing" gap. Bundled docs at `docs/tools.md#discovering-whats-registered` and `docs/commands.md`.
- **Lazy-loaded body files (SX-548)** — body files with `lazy: true` in frontmatter now contribute only their `description` field to the cached system prompt. Full content loaded on demand via the `read` tool. Opt-in per file; missing flag preserves existing behavior. Enables Tier 2 loading for volatile files (ecosystem.md Agent Notes, journal.md index) with a one-line config change. Expected cacheWrite savings: ~5K tokens per boot when applied to ecosystem + journal.
- **Project `core_rules.md` additions (SX-555)** — projects can now place a `body/core_rules.md` in their `.soma/` directory; content is appended after the agent-shipped `system-core.md` rather than replacing it. Shipped rules cannot be accidentally removed by a project override. Missing file = identical behavior to pre-0.20.4.
- **`delegate(background:true)` + `children` tool (SX-553 Phase A)** — `delegate` now accepts `background:true` to spawn a child soma in a new cmux pane and return a handle immediately (`{childId, pane, surface, status}`) instead of blocking. New `children` Pi tool with `op:"list"` reads `~/.soma/state/children.json` and formats a status table (id, role, model, status, cost, runtime, pane). Atomic-rename IO helpers (`appendChild`, `updateChild`, `readChildrenJson`, `writeChildrenJson`). Backward-compat: omitting `background` preserves existing synchronous behavior. Phase B (tail/steer/kill/harvest) + Phase C (ghostty/tmux drivers) pending.
- **`cache.retention` setting (SX-544 Phase A)** — new settings schema `cache: { retention: 'long' | 'short' | 'none' | null }`. When set to `"long"`, soma-boot injects `PI_CACHE_RETENTION=long` for Pi's provider layer, enabling 1-hour Anthropic prompt cache TTL (2× write cost, break-even at one re-hit within 60m). Default `null` = inherit shell env or Pi default (5m). Doctor migration adds the key to existing `settings.json`. No behavior change until user opts in. Phase B (validation) + Phase C (keepalive coupling) still pending.
- **soma-deploy.sh — thin wrapper on Dokploy API**
- **browserCdpHost + browserCdpUrl — browser can live anywhere**
- **browser profile tokenization — userDataDir + profileDirectory**
- **Endpoint resolver (SX-513, s01-6d05dd)** — single source of truth for every URL the agent touches. Tier 2 extensions (`bridge-connect`, `workspace-tools`) + dev scripts (`launch-browser`) now route through `_shared/env.ts` (Node side) + `soma-env.sh` (bash side). Mode taxonomy: `local` / `cloud` / `pro` / `enterprise` / `auto`. User default `cloud`; our dev default `auto` (probes localhost:18800, falls back to cloud). Config lives under `environment` in `settings.json` and is only read by the dev extension — prod has endpoints baked at build time.
- **`bridge-connect-dev.ts`** — dev-only sibling of the shipped `bridge-connect.ts`. Reads `environment.mode` + overrides live, exposes a new `env_status` tool for runtime diagnostics. Installed via `soma-dev symlink extensions --dev`.
- **`soma-env.sh`** — pure-bash resolver helper (no node dep, no cold start). Mirrors env.ts's defaults table. Parity guarded by `test-env-resolver-parity.sh` so the two implementations can't drift.
- **`environment` block in `SomaSettings` interface** (`core/settings.ts`) — typed config for future agent-side `soma env` CLI; dev extensions read it today, prod extensions ignore it.
- **Three new test suites** (`tests/test-env-resolver.sh`, `test-env-resolver-parity.sh`, `test-no-hardcoded-endpoints.sh`) — 25 + 24 + 4 assertions covering resolver behavior, shell/TS parity, and a golden-rule guard that catches any regression back to literal endpoints in migrated Tier 2 files.
- **`SOMA_PROJECT_DIR` env var exported to discovered scripts (SX-555)** — when `soma <cmd>` dispatches to a discovered script (bundled / project / global), it now walks up from `$PWD` to find the nearest `.soma/` directory and exports the path as `SOMA_PROJECT_DIR`. Scripts can trust the env var instead of recomputing from `$0` (which breaks for bundled scripts living far from the user's project). Paired with the `resolve_soma_dir` helpers in `soma-refactor.sh` / `soma-seam.sh`.
- **`soma update --yes` / `-y`** — skip the Y/N confirmation prompt in scripted upgrades. Closes the documented one-liner `npm install -g meetsoma@latest && soma update --yes`. Surfaced during the s01-c6944c CLI audit (post-v0.20.3 follow-up).

### Fixed
- **ship .py helpers + _lib/ alongside .sh scripts**
- **comprehensive settings backfill + Pro auth scaffold + upgrade test**
- **add digest blocks to 3 bundled muscles (SX-563)**
- **run tier-1 soft-check unconditionally**
- **resolve soma_dir correctly + bash 3.2 compat + honest stable error**
- **`soma refactor` / `soma seam` now resolve the right project directory when run outside cwd (SX-555)** — both scripts previously computed `SOMA_DIR` relative to their own install location, which broke for users whose project `.soma/` wasn't a sibling of the script. Added `resolve_soma_dir` helper that prefers `$SOMA_PROJECT_DIR`, then walks up from `$PWD`, then falls back to the legacy relative path. Also handles SIGPIPE gracefully (was killing piped output).
- **`soma plans` bash 3.2 compat restored (SX-555)** — the `overlap` command used `declare -A` (associative arrays), which macOS bash 3.2 doesn't support. Rewrote to emit topic/path tuples to a tempfile, sort, and group — portable across bash versions. `get_field` now returns `|| true` so missing frontmatter fields don't trip `pipefail`.
- **`soma-install.sh stable` gives an honest error (SX-555)** — `repos/agent-stable` was retired s01-419457 in favor of git tags. Stable mode now prints an explanation and points to the tag-based-install plan instead of failing silently.
- **extractTldr no longer truncates multi-line TL;DRs**
- **`symlink-extensions.sh` used stale post-restructure path** — was pointing at `somaverse/extensions/` (moved to `somaverse/builds/local/extensions/` in s01-efe898). Updated + added `--dev` flag that swaps the bridge-connect symlink to the dev variant.
- **`build.sh` auth-gate temp files broke relative imports** — temps were written to `/tmp/` so esbuild couldn't resolve `./_shared/env.js`. Moved temps next to sources.

---

## [0.20.3] — 2026-04-20

Patch release. Cache-stickiness: `/reload` no longer invalidates the
Anthropic prompt cache. The compiled system prompt is persisted to
`.soma/state/.session-prompt-cache.json` and restored across
reload/resume/fork. A new `/rebuild` command forces explicit recompile
when body edits should be picked up.

### Added
- **`/rebuild` command (SX-495)** — forces recompile of the system prompt and deletes the disk cache. Optional — only run it if you've edited `body/*.md` mid-session AND you want the change to apply right now. Otherwise `/reload` keeps the prompt sticky and body edits land naturally on your next session.
- **Disk-backed prompt cache (SX-495)** — `.soma/state/.session-prompt-cache.json` written on first compile, restored on subsequent reloads. Eliminates the ~$1 cache-invalidation cost per `/reload`.
- **Severity-aware change indicator on statusline line 3** — replaced the intrusive "Changes detected" toast with a subtle third-line tag. Labels: `🔄 /reload` (extensions/*.ts + core/*.ts; picked up by jiti re-import — confirmed in Pi's `extensions.md`), `📝 /rebuild?` (body/*.md — the `?` denotes optional), `⚠ relaunch` (dist/* or core/*.js — Pi's static imports are frozen at process boot, `/reload` can't help; `/exit` and run `soma` again). Signal writer + reader updated; legacy `severity: restart` still read for back-compat. Parser handles both YAML and JSON payloads (SX-497 will unify writers).
- **Commands doc — Reload & Rebuild section** (`docs/commands.md`) — explains the two commands, when to use each, and what the statusline indicators mean.

### Fixed
- **Tier 2 extension build path updated for somaverse restructure** — `build-extensions/build.sh` SOMAVERSE_EXT now points to `somaverse/builds/local/extensions/` (moved s01-efe898). Unblocked v0.20.3 dry-run.
- **`soma focus` restored.** Was silently broken since the Pro-scripts refactor moved `soma-seam.sh` into `scripts/_pro/` (and released form renamed to `.js`). `soma-focus.sh` only looked for `scripts/soma-seam.sh` and always errored. Now searches `scripts/`, `scripts/_pro/`, `$SOMA_DIR/amps/scripts/`, `~/.soma/amps/scripts/` and dispatches `node` for `.js` / `bash` for `.sh`. End-to-end verified.
- **`docs/focus.md` accuracy.** Scoring table, force-include threshold, and heat formula were all out of date. Corrected to match `core/muscles.ts:matchMusclesToFocus` — trigger/keywords/topic list match (10), name (3), digest (2); force-include at `>= 8`; heat = `score + 2`; tags don't participate.
- **`soma-dev sync-docs` walks subdirs.** `docs/guides/` was missing from the website; bash 3.2-compatible explicit loop added.

- **`/reload` no longer invalidates Anthropic prompt cache (SX-495)** — previously, re-importing `soma-boot` reset `compiledSystemPrompt` to null; next turn recompiled from disk and re-sealed a fresh cache, forcing a miss. Now `tryRestoreCompiledPrompt()` rehydrates from disk when `session_start.reason ∈ {reload, resume, fork}`. Fresh launches (`reason=startup|new`) still compile from scratch. `invalidateCompiledPrompt()` also unlinks the cache file (called by `/pin` and `/kill`).

### Plan
- `.soma/releases/v0.20.x/plans/cache-stickiness.md` — full audit + fix spec + acceptance criteria.

---

## [0.20.2.1] — 2026-04-19

Patch release. Closes the `_mind.md` template orphan, adds the Soma tool
registry with `_tools.md` configuration, documents tools + extension
plumbing, softens the restart alert. Three Soma tools added (`context_status`,
`file_outline`, `search`). Four script-UX no-flag fixes. CLI version label
corrected in dev mode.

### Added
- **Soma tool registry** (`core/tool-registry.ts`) with `somaRegisterTool()` helper — the man-in-the-middle between extension-defined tools and Pi's registry. Preserves `promptSnippet` + `promptGuidelines` in the compiled system prompt (Pi's `ToolInfo` strips them).
- **`_tools.md` configuration** (project → parent → global body chain). Sections: **Disabled** (opt-out list), **Overrides** (per-tool field tweaks), **Custom** (parsed; registration lands v0.20.3). Hardwired set (`delegate`) cannot be disabled.
- **`context_status` tool** — returns `{percent, tokens, contextWindow}` so the agent can ground its runway decisions instead of estimating.
- **`file_outline` tool** — markdown/text headings with line numbers. 10–15× cheaper than full-file reads for orientation.
- **`search` tool (MVP)** — unified search with pluggable backends. Default: ripgrep over cwd, respects `.gitignore`. `scope="api"` uses Brave Search when `BRAVE_API_KEY` or `SOMA_SEARCH_API_KEY` is set. `scope="semantic"` deferred to v0.20.3.1.
- **`docs/tools.md`** (new) — Soma tools reference: three registration routes, `_tools.md` format, sub-agent scoping, bundled set, invocation vs prompt registries.
- **`docs/extending.md`** additions: `pi.registerTool` + `pi.getActiveTools` + `pi.getAllTools` in API table; hot-reload notes; "Modifying the System Prompt" section; full **Soma Tools** section (writing a tool with `somaRegisterTool`, comparison table vs `pi.registerTool`); **External tool → Soma bridge (the inbox)** section documenting the drop-in CLI integration (token, allowlist, JSON format).
- `body/_tools.md` seeded in meetsoma + bundled `templates/default/_tools.md`.
- Refactor breadcrumbs at top of `extensions/soma-boot.ts` — clean-break candidates noted (~3700 LOC file) for a future refactor session.

### Fixed
- **Tool-registry timing fix (`37106e0`)** — `_tools.md` disable/override rules now apply at extension-load time. Pi loads extensions (calling `somaRegisterTool`) BEFORE firing `session_start`, so the previous `setToolConfigChain()` call ran too late. Fix: lazy chain self-discovery in `getToolConfig()` — walks up from `process.cwd()` if no explicit chain is set. 6 new timing tests added (62/62 total passing, was 56).

- **`_mind.md` was orphaned** since Phase 1c.1 (`s01-a1a6aa`). The Pi-native shortcut returned `event.systemPrompt` unchanged when `SYSTEM.md` + `APPEND_SYSTEM.md` existed, bypassing the template compiler. User customizations to `body/_mind.md` had no effect. The shortcut is removed. `compileFullSystemPrompt` (template-driven via `compileWithTemplate`) is now the single path. `SYSTEM.md` / `APPEND_SYSTEM.md` writes redirect to `.soma/state/` as introspection artifacts; Pi no longer auto-discovers them.
- **`soma --version`** in dev mode showed runtime v0.20.2 instead of CLI v0.3.5. `npm/thin-cli.js` read `__dirname/../package.json`, which resolved to agent's package.json in dev-symlink installs. Esbuild `--define:__CLI_VERSION__` + `build-dist.mjs` string-substitution now inject the correct literal.
- **Restart alert too aggressive.** Pi `/reload` hot-reloads extensions via `jiti.import` (mtime-keyed cache) — `extensions/*.ts` edits don't need a full process restart. `.git-hooks/post-commit` now classifies changed files: `extensions/*.ts` and `core/*.ts` → `severity=reload`; `core/*.js` and `dist/*` → `severity=restart`. `soma-statusline` reads severity and shows the matching message.
- **Script no-flag UX (SX-490):** `soma-login` no longer starts OAuth without an explicit `start` subcommand. `soma-snapshot` no longer snapshots CWD without an explicit path — bare invocation prints help + recent snapshots. `soma-theme` now prints help when executed directly (still sources cleanly). `git-identity-hook` unchanged (silent exit-0 is correct for a git hook).

### Changed
- `somaRegisterTool` replaces `pi.registerTool` across all Soma bundled tool files (`soma-delegate`, `soma-code-tools`, `soma-context`, `soma-search`). Third-party extensions using `pi.registerTool` directly still work; tools just render with description-only (no per-tool `promptSnippet`/`promptGuidelines`).
- `buildToolSection` accepts an optional `somaTools` registry. When present, rendered output includes per-tool guideline bullets prefixed `[tool_name]`.
- `.git-hooks/` now tracked in git (was gitignored under a non-existent "generator"). Install path unchanged: `git config core.hooksPath .git-hooks`.

### Docs
- New `docs/tools.md`.
- Substantial `docs/extending.md` expansion (tools, inbox, system-prompt hook, hot-reload).

### Deferred / parked for v0.20.3
- Full deletion of `compileFullSystemPrompt` + `extractSections` + `buildToolSection` legacy helpers (reversed this session — the compiler is staying; `_mind.md` drives the prompt).
- Custom markdown-defined tools (`_tools.md` **Custom** section) — shell execution + security model.
- Multi-provider search backends (tavily, exa, perplexity).
- Local-semantic search backend + `soma index` command.
- Audit-token release tool.
- Upstream ask to Mario re: exposing `promptSnippet`/`promptGuidelines` on `ToolInfo`.

---

## [0.20.2] — 2026-04-18

The v0.20.3 prompt refactor arc. Moves Soma from "replace Pi's prompt wholesale"
(compileFullSystemPrompt rebuild path) to "let Pi compile; we augment" (SYSTEM.md
+ APPEND_SYSTEM.md via Pi's native auto-discovery). Option B from the REFACTOR-PLAN.
Also: 5 script-backed Pi tools, a pretest CLI, and two version-check bug fixes.

Pi-native mode is now DEFAULT when SYSTEM.md + APPEND_SYSTEM.md exist. Escape
hatch: `SOMA_LEGACY_PROMPT=1` forces the old full-replacement path. Kept alive
until Phase 1c.2 (planned deletion of ~300 LOC rebuild path).

### Added
- **smarter randomizer + version-aware skeletons + CLI integration**
- **three-layer version snapshot + update check (SX-489)**

**Phase 1a/1b — SYSTEM.md + APPEND_SYSTEM.md auto-discovery pipeline:**
- `compileSystemMd(options)` + `writeSystemMd(options)` in `core/prompt.ts`. Compiles
  identity-only content (soul + voice + body + ecosystem + core_rules) to
  `<somaPath>/SYSTEM.md`. Pi auto-discovers via
  `resource-loader.js:660 discoverSystemPromptFile()` and uses as `customPrompt`.
- `compileAppendSystemMd(options)` + `writeAppendSystemMd(options)` in `core/prompt.ts`.
  Compiles AMPS + tools + guard + docs to `<somaPath>/APPEND_SYSTEM.md`. Pi auto-discovers
  via `resource-loader.js:671 discoverAppendSystemPromptFile()` and uses as `appendSystemPrompt`.
- Writers wired in `extensions/soma-boot.ts`: `writeSystemMd` at `session_start`,
  `writeAppendSystemMd` at `before_agent_start` (eagerly, before path split, so both
  Pi-native and legacy paths keep APPEND current).
- `SYSTEM_MD_FALLBACKS` constant: minimum-viable Soma-voice prose for empty soul/voice/body/
  core_rules. Keeps SYSTEM.md coherent in fresh-install directories.

**Phase 1c.1 — Pi-native as default:**
- `before_agent_start` now defaults to Pi-native when SYSTEM.md + APPEND_SYSTEM.md exist.
- Legacy opt-out via `SOMA_LEGACY_PROMPT=1`. First-run safety: missing files → legacy path
  runs, seeds files for session N+1.

**Phase 1d — XML tag experiment (Anthropic-style adherence aid):**
- `<rules>` tag around core_rules in SYSTEM.md output (first behavioral tag in our
  compiled prompt — previously we had only Pi's native `<available_skills>`).
- `<behavioral_rules>` + `<tool_guidance>` tags in APPEND_SYSTEM.md. Matches Anthropic's
  own prompt conventions (Sonnet 4.5 → 4.6 doubled tag count; we were at 1).

**Phase 2 — 5 script-backed Pi tools (`extensions/soma-code-tools.ts`):**
- `code_find` — grep with file:line:match output, respects .gitignore (cap 500)
- `code_map` — function/class/method index for a file
- `code_refs` — symbol references classified as DEF / USE / IMP (run before renaming)
- `code_structure` — directory tree with file sizes, max depth 3
- `code_blast` — blast radius: all files touching a symbol with severity (run before deleting)
- All `executionMode: "parallel"` (read-only, safe concurrent), ANSI colors stripped,
  output capped with helpful refinement hints when truncated.
- `promptSnippet` + `promptGuidelines` populated on all 5 so Pi surfaces them in the
  "Available tools:" / "Guidelines:" prose (first effect visible post Phase 1c.1).

**`soma preview` — pretest CLI (`scripts/soma-preview.{sh,ts}`):**
- Compiles SYSTEM.md + APPEND_SYSTEM.md from live body files without a sandbox restart.
- Flags: `--out <dir>`, `--system-only`, `--append-only`, `--quiet`, `--diff`, `--help`.
- `--diff` compares fresh compile against on-disk files with byte deltas and staleness.
- Runs outside the TUI. No API cost.
- Distinct from `scripts/prompt-preview.ts` (fixtures-based scenarios for testing).

### Fixed
- **cap items per version (highlights only, not full changelog)**
- **pi-agent keyword false-positive on public package**
- **auto-advance workspace marker when no migration is pending**

- **`soma update` false positive on dev versions.** The CLI update check used string
  comparison (`latest > VERSION`) which made `"0.3.4" > "0.20.1.1"` true (`'3' > '2'`
  lexically). Dev users on 0.20.x were told to "update" to stable 0.3.x — which is older.
  Fix: use `semverCmp()` (already defined in the module, just not called here).
  Applied to both `repos/agent/npm/thin-cli.js` and `repos/agent-2x/npm/thin-cli.js`.
- **`npm install -g meetsoma` EEXIST on dev installs.** When `soma` bin is a manual
  symlink to `repos/agent/dist/cli.js` (typical dev setup via `soma-install.sh dev`),
  npm refuses to overwrite the unowned file. Fix: `detectDevInstall()` reads the bin's
  symlink target and, when it's not an npm-managed path, guides to
  `soma-install.sh stable` first before `npm install -g meetsoma`.
- **`delegate` tool invisible in Pi's "Available tools:" prose.** Pi intentionally omits
  custom tools when `promptSnippet` is absent (per `ToolDefinition` contract at
  `types.d.ts:289`). Added `promptSnippet` + `promptGuidelines` to `soma-delegate.ts`.
  Previously unobservable because our rebuild path stripped the section entirely;
  became visible after Phase 1c.1 landed.
- **APPEND_SYSTEM.md went stale between sessions.** Was only refreshed inside the legacy
  branch — Pi-native sessions never rewrote it even when body files or heat changed.
  Moved `writeAppendSystemMd` to run BEFORE the path split so both paths keep APPEND current.

### Changed

- `before_agent_start` restructured: APPEND refresh happens eagerly, path selection
  (Pi-native vs legacy) happens after. Escape hatch env var renamed from
  `SOMA_PI_NATIVE_PROMPT` (opt-in gate, Phase 1b Commit 3) to `SOMA_LEGACY_PROMPT`
  (opt-out gate, Phase 1c.1) as the default flipped.
- `compileSystemMd` source comment stamp bumped: `Phase 1a` → `Phase 1d` (tag adoption).
- `compileAppendSystemMd` source comment stamp bumped: `Phase 1b` → `Phase 1d`.

### Notes

- **Sandbox verified end-to-end** (session `s01-5c01df`): Pi-native path active,
  APPEND content visible in system prompt including Behavioral Rules, Muscle Memory,
  Tools section with all 6 tools (read, bash, edit, write, code_find, code_map,
  code_refs, code_structure, code_blast, delegate), and Tool Guidelines. Model
  naturally preferred `code_find` over `bash('soma code find ...')` — typed-tool
  adherence signal positive.
- **Phase 1c.2 deliberately deferred.** Deleting ~300 LOC of `compileFullSystemPrompt`
  + `extractSections` + `buildToolSection` + `BUILTIN_TOOL_DESCRIPTIONS` + helpers is
  the next step after one real session of Pi-native-default observation. Bisectable
  single commit when it lands.
- **Tag experiment signal pending.** `_mind.md` tags affect the legacy path (still
  reachable via `SOMA_LEGACY_PROMPT=1`). New-path tags are in place. The real
  adherence delta measurement requires parent meetsoma session-level observation.

Refs: `.soma/releases/v0.20.x/plans/v0.20.3-prompt-refactor.md` (living plan, all phases + progress),
`.soma/releases/v0.20.x/plans/v0.20.4-tool-audit.md` (next arc, seeded).

---

## [0.20.1.1] — 2026-04-18

Role expansion + curator polish. Closes the Phase-2 delegation arc: the
curator can now run apply inline (opt-in), pending gaps flow to a
human-editable scratchpad, and roles can declare where their canonical
file lives (source-of-truth) + where artifacts go (paths block).

### Added
- **Three more roles**: `planner` (writes plan files, `[read, bash, write]`), `doc_writer` (markdown-only edits, `[read, edit, write]`), `reflector` (journal entries under `memory/journal/`, `[read, write]`). 7 roles total. Researcher deferred to v0.20.2 pending search integration.
- **`source-of-truth` frontmatter field** on roles. Project-root-relative or absolute path to the canonical role file. When set, `discoverRole` re-reads from there and `apply` writes amendments there — fixes the runtime-copy vs git-source drift v0.20.1 highlighted. Missing file → stderr warning + fallback to chain-walked copy.
- **`paths:` frontmatter block** on roles. Per-role artifact paths (`invocations`, `proposals`, `proposalsApplied`, `scratchpad`) with `{role}` templating. Absent block = hardcoded defaults (zero migration). All paths live under `memory/` so writes stay cache-safe.
- **`--auto-apply` flag** on `soma-dev children curate`. When set, auto-apply-class proposals apply inline during curate (one command for the round trip). Default OFF — proposals stay in `proposals/` for human review.
- **Scratchpad** (`memory/children/<role>/scratchpad.md`). When `--auto-apply` is off, auto-apply-class findings still write proposals AND append dated sections to the scratchpad so pending gaps are visible at a glance. Append-only; human-editable.
- **`applyProposal`** exported from `core/delegate-core.ts` as a library function. CLI stub is a thin wrapper now. `curateRole` calls it directly under `--auto-apply`. Returns structured `ApplyProposalResult` with 8 reason codes.
- **`resolveRolePaths(role, somaDir, roleDef?)`** — single source of truth for per-role artifact paths. Threaded through `logInvocation`, `scanMLRQueue`, `writeProposal`, `hasProposalBeenApplied`, and `applyProposal`.

### Fixed
- **Classifier false-positive on `what_worked` entries.** An MLR observation like `what_worked: ['Task completed within budget']` matched the config-keyword regex for `budget` and produced a bogus propose-class amendment. `inferAmendmentSection` now short-circuits on `sourceField === 'what_worked'` and routes to `accumulated_knowledge` unconditionally — success reports are observations, not config changes.

### Changed
- `curateRole` signature extends with `opts?: { autoApply?: boolean }` (back-compat default false). Returns extended `CurateResult` with `applied` array and `scratchpadAppended` count.
- `buildProposal` now accepts `roleDef` to avoid redundant `discoverRole` I/O.

### Cache-safety confirmed
`core/body.ts:628-648` iterates `readdirSync(bodyDir)` filtering `.endsWith(".md")` — directories (incl. `body/children/`) are skipped. Role edits don't invalidate parent cache. All new artifacts (scratchpad, proposals, invocations) live under `memory/` which is likewise not walked. Verified empirically: source-of-truth writes to canonical `body/children/verifier.md` completed without cache storm.

---

## [0.20.0.1] — 2026-04-18

Delegation hardening. v0.20.0 shipped the MVP; v0.20.0.1 makes it production-shaped:
model fallback chain (free-tier friendly), per-invocation health cache + cooldown,
MLR parsed into structured objects, cost/token tracking, and CLI paths (`children run`,
`children health`) for driving delegations outside the TUI.

### Added
- **Structured model chain in role frontmatter** (`model-chain:` list of entries with `id`, `class`, `cooldown-on-rate-limit`). Scalar `default-model: <id>` still works (1-entry chain back-compat).
- **Model policies** (`model-policy:` — `order` | `free-only` | `paid-only` | `prefer-free`). Runtime walks the chain per-policy, skipping unavailable or cooldown'd models.
- **Health cache + cooldown** at `.soma/state/model-health.json`. Rate-limited or dead models get marked and skipped for a TTL (default 1h). Survives across sessions.
- **MLR (Memory-Lane-Reflection) yaml parsing** on child final messages. Observations flow to `inv.mlr.{what_worked, what_struggled, missing_capability, suggested_amendments, map_issues}` in `memory/children/<role>/invocations.jsonl`. Foundation for v0.20.1's curator loop.
- **Cost + token tracking** per attempt (`inv.cost_usd`, `inv.tokens_input`, `inv.tokens_output`). Attempts array records each model tried in the chain.
- **`soma-dev children run <role> "<task>"`** — CLI stub that invokes `runDelegation` outside the TUI. Useful for dev regression + batch testing.
- **`soma-dev children health <role>`** — shows chain with per-model class, resolvable state, cooldown, filtered (per policy). Diagnostic for "why is my child using sonnet when I declared a chain?"

### Changed
- **`extensions/soma-delegate.ts` refactored to thin wrapper** (~50 lines) over `core/delegate-core.ts` (~800 lines at v0.20.0.1). Logic lives in core; extension just registers the Pi tool. Enables CLI stubs to call `runDelegation` without Pi's extension harness.
- `loadAgentClass` is now async (dual-strategy: `createRequire` for CJS, dynamic `import()` for ESM). Callers must `await`.

### Fixed
- **Free-tier rate limits (429/503) on `openrouter/*:free` models**. v0.20.0's hardcoded Haiku default was a workaround; v0.20.0.1's chain-walking is the real fix. Role can declare a free-first chain and fall through to paid-cheap on rate limit.

### Sandbox-verified (5 cases)
T1 scalar back-compat, T3 chain gemma→qwen→haiku fall-through, T4 cooldown skip, T6 MLR parsed into structured object, T7 cost $0.0044 / 2819+313 tokens.

---

## [0.20.0] — 2026-04-18

**Delegation MVP. Team Soma begins.** The `delegate` Pi tool spawns an in-process child agent via `pi-agent-core.Agent`, running a role-tuned system prompt while inheriting parent soul/voice/ecosystem. Foundation for everything in v0.20.x.

### Added
- **`delegate` tool** (registered via `extensions/soma-delegate.ts`). Called as `delegate(task, role?, model?)`. Spawns `pi-agent-core.Agent` in-process, tool budget enforced (`max-tool-calls`), returns summary + cost + MLR.
- **Role files** in `body/children/`: `_child.md` (sub-compiler template), `_child-template.md` (scaffold for new roles), `general.md` (starter role: Sonnet, full tools, budget 25/$0.25).
- **Role discovery via body chain.** `discoverRole` walks `body/children/<role>.md` across the soma chain (project → parent → global) so a workspace can ship roles its child projects inherit.
- **Prompt compilation** for children. Compact soul (1500 chars) + voice (1000) + ecosystem (2000) + role identity + role accumulated knowledge + task. Haiku by default so cost stays tight.
- **`soma-dev children` CLI** (new subcommand group). `list` / `show` / `add` / `edit` / `stats` / `tail` / `validate` for inspecting + managing roles and their invocation logs.
- **Invocation log** at `memory/children/<role>/invocations.jsonl`. Append-only JSONL per role: timestamp, model, tool calls, duration, cost, summary.
- **`pi-agent-core`** added as direct dependency (was transitive). Uses its `Agent` class as the child-spawning primitive.
- **Sandbox architecture** — persistent `~/soma-2x-sandbox/` folder (her filesystem) + dedicated `~/.soma-2x/agent/` install (runtime symlinks to `repos/agent-2x/`, auth/settings shared from main install). Keeps parent session's `~/.soma/agent/` untouched during iteration.
- **`soma-2x-cmux.sh`** launcher. Opens a cmux workspace with Sonnet parent + invocation-monitor pane. `--focus` / `--close` / `--restart` flags for iteration cycle.

### Fixed (during MVP verification, same release cycle)
- **`pi-agent-core.Agent` via `createRequire` bypass.** Pi's extension loader aliases `@mariozechner/pi-agent-core` and can resolve to wrong package under jiti. Switched to `createRequire(import.meta.url)` for that one import — native Node resolution bypasses jiti. `pi-ai` + `pi-coding-agent` stay ESM-only (static imports at module top).
- **Inline flow YAML arrays.** `inherits: []` was parsed as the string `"[]"`; parser now detects and splits `[a, b, c]` inline.
- **Inline YAML comments.** `default-model: claude-sonnet-4-5  # comment` previously included the comment in the value. `stripComment` handles this now (respects `#` inside quoted strings).
- **`getModel` returning `undefined`** (not throwing) when a model id was unknown. Now surfaces as a typed error the chain walker can react to.
- **OpenRouter Claude models** — wired provider + normalized id forms; `openrouter/google/gemma-4-31b-it:free` resolves correctly now.

### Notes
- Not tagged as a discrete release; delegation MVP was sandbox-internal on `dev-2x` and consolidated under the v0.20.1 tag when the curator loop landed. This entry backfills the history.

---

## [0.20.1] — 2026-04-18

Curator loop + specialized child roles (verifier, builder, curator). Closes the self-improvement cycle: delegation observations (MLR) → classifier → proposal files → human-apply → role.md amended.

> Shipped on `dev-2x` branch. Merged to `dev` at tag time. Follows v0.20.0 (delegation MVP) + v0.20.0.1 (delegation hardening).

### Added
- **Three role files** in `body/children/`: `verifier.md` (read-only, `read + bash`, PASS/FAIL + evidence), `builder.md` (write-capable, `read + bash + edit + write`, bounded edits with verify-after), `curator.md` (meta-role, `read + write`, proposes amendments). All bound to `claude-haiku-4-5` by default with per-role budgets.
- **MLR queue reader** `scanMLRQueue(role, somaDir, sinceTs?)` in `core/delegate-core.ts`. Scans `memory/children/<role>/invocations.jsonl`, flattens `mlr.{what_worked, what_struggled, missing_capability, suggested_amendments}` into structured amendment candidates.
- **Amendment classifier** `classifyAmendment(entry, evidence)` returns `auto-apply` | `propose` | `human-only` | `skip`. Auto-apply requires `accumulated_knowledge` section + ≥2 distinct invocations + text < 200 chars. `default-tools`/`budget`/`success_criteria` → `propose`. Identity/soul/voice/inherits → `human-only`.
- **Proposal writer** `writeProposal` emits `memory/children/<role>/proposals/<id>.md` with frontmatter (id, role, class, section, evidence) + body (amendment, reason, apply command).
- **`soma-dev children mlr [<role>]`** — scan MLR queue, table output (ts, source, section, text).
- **`soma-dev children curate [<role>]`** — classify queue → write proposals. Summary by class (auto-apply / propose / human-only).
- **`soma-dev children apply <proposal-id> [--force]`** — append amendment to role.md section, archive to `proposals/_applied/`. Auto-apply default; `--force` for propose-class (v0.20.1 still gates non-`accumulated_knowledge` sections).
- **Chain-walk in `children.sh`** (SX-482). Port of `core/discovery.ts:getSomaChain` to bash. Shell subcommands now resolve roles across the full soma chain (project → parent → global `~/.soma`), matching runtime behavior. Adds per-role `source` column in `list` (project/parent/global) and `--soma=<path>` pin flag.
- **Dedup in curator flow** (SX-481 fixup). `hasAmendmentInRole` + `hasProposalBeenApplied` helpers prevent duplicate bullets when curator runs on different days (slug-based dedup includes date, so same text on new day previously slipped through). Applied at both `buildProposal` (skip before write) and `apply-proposal` (skip + archive-only, defense in depth).
- **`resolveTools` honors `bash` in read-only roles** (s01-b420d5 fix). `createReadOnlyTools()` upstream returns `[Read, Grep, Find, Ls]` with no Bash; `resolveTools` was dropping the `bash` declaration for any role without edit/write. Now rebuilt declaratively from 7 individual constructors so `[read, bash]` resolves correctly.

### Changed
- `buildProposal` signature: optional `cwd` + `somaDirPath` params so library callers can thread the caller's chain into role discovery (instead of relying on `process.cwd()`).
- `curateRole` signature: optional `cwd` param threaded to `buildProposal`.
- `children list` output includes a `SOURCE` column (project/parent/global).

### Deferred to v0.20.1.1 / v0.20.2
- Remaining 4 roles: planner, doc_writer, researcher, reflector.
- Path-gated `edit` tool for curator (direct role.md edits without proposal round-trip).
- Direct auto-apply during curator run (today: curator writes proposals, human runs `apply`).
- `source-of-truth` frontmatter field — route amendments to git-canonical path, not chain-walk result (SX-483, v0.20.2).
- `soma-dev children audit` — diff runtime copies vs git source, merge in either direction (SX-484, v0.20.2).

---

## [0.12.4] — 2026-04-18

Follow-up to v0.12.3 shipping integrity. Pi runtime bump, thin-CLI UX cleanup, release-flow parity (dev ↔ main auto-sync), and a script pipefail fix.

### Changed
- **Pi runtime 0.67.6 → 0.67.68** — 2 upstream releases. Network connection retry (#3317), stable date format in system prompts (#2814), scoped-models Alt+Up/Down fix (#3331), `afterToolCall` error forwarding (#3051, #3084), git update notification reliability (#3027). New: Bedrock bearer-token auth, prompt template `argument-hint` frontmatter, `after_provider_response` extension hook, OSC 8 hyperlink rendering.
- **Release script auto-syncs `agent-stable`/main.** `soma-release.sh` now squash-merges `dev → agent-stable/main` after building soma-beta and tags both branches. Prevents the drift where agent-stable fell a full release behind dev (the v0.12.2 → v0.12.3 gap that this release closes).

### Fixed
- **Thin-CLI `update` / `check-updates` / `status` now guard on `isInstalled()`.** Previously these commands assumed `~/.soma/agent/` existed and crashed unhelpfully on a fresh global install before `soma init`. Now they show a clear "not installed — run `soma init`" message.
- **Thin-CLI header text** — `Status` → `Update` on the update subcommand (matches what the command actually does).
- **Thin-CLI help text** — `postInstallCmds` expanded from 8 to 16 commands, covers `update`, `check-updates`, `status`, `doctor`, `health`, `focus`, `model`, `exhale`, etc.
- **Pre-versioning project guidance** — correct instructions for projects that pre-date `soma init` (no version file, but `.soma/` exists).
- **Stale `soma init` → `soma update` references** in `thin-cli.js`, `docs/updating.md`, and `docs/troubleshooting.md`. Missed during the v0.12.3 command reshuffle.
- **`check-phases.sh` pipefail crash on clean working tree.** `grep -v` returns 1 on empty input, which under `set -o pipefail` killed the script mid-run. Same bug class as `soma-plans.sh` bash 3.2 issues. Script now runs all 10 phases to completion.

### Internal
- Dropped the B2 patch attempt (`settings-manager.js` enabledModels sync). Pi #3331 fixes the upstream symptom, and the target function is minified to `.n()` in 0.67.68 — patching by name would silently fail. See `.soma/releases/v0.12.x/model-resolution-audit.md`.
- `UPSTREAM-NOTES.md` scratchpad added to `soma-dev/` for tracking changelog-worthy upstream items between Pi bumps.

---

## [0.12.3] — 2026-04-17

Shipping integrity release. Fixes a critical bug where `npm install -g meetsoma@0.3.3` produced a broken install (missing internal imports), and makes the update flow actually work. If you've been stuck on an older Pi runtime despite cutting newer Soma versions, this is why.

### Fixed
- **`meetsoma@0.3.3` broken npm install**. The published tarball imported from `./lib/` and `./welcome/` paths that weren't included, so every fresh `npm install -g meetsoma` failed with `ERR_MODULE_NOT_FOUND` on first run. Fixed by bundling `thin-cli.js` with esbuild into a single self-contained file before publish. Has been broken since the `npm/` reorg — unnoticed because existing users had working installs from before.
- **TUI leakage from extensions**. `soma-route.ts` had `console.error` calls that leaked into the input buffer on shutdown and during security rejects. `hub-connect.ts` (somaverse) had WebSocket handshake logs that appeared mid-keystroke in the prompt. Both silenced — matches `bridge-connect.ts`'s silent pattern.
- **Silent Pi staleness in dev**. `soma-dev status` now compares `dist/` vs `node_modules/` Pi versions and flags drift (was the root cause of the "opus-4-7 missing" bug several users hit).

### Changed
- **`soma init` no longer updates the runtime.** Previously, typing `soma init` in an already-initialized project silently ran a runtime update instead of doing project work — the confusing overload is removed. `soma init` now always means "set up this project."
- **`soma update` now actually updates.** Was previously status-only (told you to run `soma init`). Now it performs the update: `git pull --ff-only` in `~/.soma/agent/` + `npm install --omit=dev` if dependencies changed.
- **Pi runtime is now locked to Soma version.** `soma-beta/package.json` pins Pi exact (was `^0.67.6`, now `0.67.6`). `soma-beta` now ships a `package-lock.json` too — users get the exact Pi dependency tree we tested against. Pi updates only when Soma cuts a new release.
- **`soma doctor` / `soma status`** now shows installed Pi runtime version and flags drift between declared and installed. Catches the class of bug where `npm install` hadn't been re-run after a Pi bump.
- **`soma check-updates`** preserves the old "report-only" behavior that `soma update` used to have, for when you just want to see what's available without updating.

### Added
- **Periodic update check inside the agent.** `soma-statusline.ts` runs a silent `git fetch` every 30 minutes while the agent is running. If behind, shows `⬆ update` in the statusline and writes to `~/.soma/config.json` so the next `soma` boot prints a one-line notice. Zero network latency at CLI launch.
- **Pre-publish smoke test.** `soma-npm-publish.sh` now packs the tarball, extracts it to a clean temp dir, and runs `node dist/thin-cli.js --version` before allowing npm publish. Aborts if the tarball has broken imports or contains forbidden content (`dist/core/`, `.ts`, `node_modules/`, etc.). Also integrated into `soma-dev pipeline` so dev cycles catch breakage early.
- **Docker e2e sandbox** (`soma-sandbox-docker.sh local`) now reliably tests our local bundle. Previous Dockerfile had a broken `COPY ... local-pkg*` glob that created a file literally named `local-pkg*`, so the sandbox was silently falling through to the registry version. Fixed — 24/24 tests pass in clean `node:22-slim` container.

### Internal
- `repos/agent/scripts/_dev/patches/` unchanged — only `error-sanitizer` remains. An attempt to add a `settings-manager-enabled-models` patch was rolled back when it turned out not to be necessary (speculation from an inbox report; the actual user bug was update-flow staleness, not Ctrl+P cycling).
- New muscles: `inbox-handling.md` (inbox letters are diagnoses, not FYIs), `tui-safe-logging.md` (no bare `console.*` in extensions).
- New soma-dev-map phase entry: Phase 0 orient now checks Pi drift (`soma-dev status`) and scans inbox as part of orientation.

---

## [0.12.2] — 2026-04-17

### Added
- **`soma model` command** — Switch your default model from the CLI. Fuzzy matching (`soma model opus`), interactive selection when multiple matches, persistent save to settings. Subcommands: `soma model <pattern> set` (save without starting), `soma model <pattern> start` (save + start session), `soma model --list [search]` (browse models).
- **Claude Opus 4.7 support** — Available via `/model` in-session or `soma model opus-4-7 set` from CLI. Includes adaptive thinking support.
- **`soma-dev check-upstream`** — Detect and audit Pi runtime updates. Checks changelog, extension surface, provider diffs, patch compatibility. Supports `--audit` (full analysis) and `--json` (machine-readable).
- **`soma-dev check-docs`** — Stale reference sweep across docs and website. Catches old version numbers, deprecated APIs, provider count mismatches.
- **`soma-dev check-phases`** — Verify dev cycle phase completion before release. Checks artifacts across all 10 phases. Supports `--patch` for reduced requirements.
- **`--no-context-files` / `-nc` flag** — Skip AGENTS.md and CLAUDE.md loading for clean sessions without project context injection.
- **`after_provider_response` extension hook** — Extensions can inspect provider HTTP status and headers after each response.

### Changed
- **CLI help reorganized** — Session flags (`--model`, `--provider`, `--thinking`) now grouped under "Session Options (apply to this session only)" to distinguish from persistent project commands (`soma model`, `soma focus`).
- **Prompt caching improved** — Tool schemas now cached independently from the system prompt. Adding/removing tools no longer invalidates your entire system prompt cache (reduces cost when workspace tools connect/disconnect).
- **Fresh boot greeting** — When a preload exists but wasn't loaded (plain `soma` vs `soma inhale`), the greeting now says so explicitly and suggests `/inhale`. Prevents the agent from reading stale preloads on clean starts.

### Fixed
- **`grep` tool performance** — No longer stalls on broad searches with `context=0`.
- **`find` tool gitignore** — Nested `.gitignore` rules no longer leak across sibling directories.
- **Type safety** — Fixed `breathe.preloadStaleThreshold` type cast for Pi 0.67.6 compatibility.
- **Preload validator** — Section header matching is now fuzzy — accepts `## Next Session`, `## Next Session: Priorities`, `## Next Session: [Task Name]`, etc.
- **Protocol warm fallback** — Protocols with `description` in frontmatter now use it for warm-tier display when `breadcrumb` is absent. Most protocols already use `description` — this fix makes them visible at warm tier.
- **Template sync** — Shipped improved `_memory.md` template to all users (Traps section, phase breadcrumbs, warning-task binding guidance).
- **4 missing providers** — Kimi Coding, Minimax, Z.ai, and Vercel AI Gateway added to docs. Provider count updated from 17 to 23.

### Upgraded
- Pi runtime 0.67.1 → 0.67.6 (5 releases, 15+ fixes)

---

## [0.12.1] — 2026-04-15

### Fixed
- **Image budget auto-compact loop** — `checkImageBudget()` runs on a 5-second timer but `ctx.compact()` is async. The image counter wasn't reset until `onComplete`, so the next timer tick re-fired the warning and compact attempt, looping 6+ times. Added `imageCompactInFlight` guard flag.

---

## [0.12.0] — 2026-04-15 — Somaverse Edition

Soma meets the Somaverse. Your agent can now connect to somaverse.ai,
control your workspace remotely, and pair with your browser — all through
a secure relay. Data stays on your machine. The shard is just the pipe.

### Added
- **`soma login`** — Pair your agent with Somaverse. Creates a pairing code, opens your browser, and saves your device key. One command to connect.
- **Hub-connect extension** — Connects your agent to the Somaverse hub as a provider. Your browser pairs with it automatically. Works alongside bridge-connect (local + cloud simultaneously).
- **Workspace proxy** — All 28 workspace + browser tools work through the hub relay. Your agent controls the workspace even from a remote machine.
- **Device-key auth** — Workspace tools auto-detect hub mode when `~/.soma/device-key` exists. Routes to hub URL with Bearer auth instead of localhost.
- **28 agent tools** — 10 workspace, 10 browser, 5 AI, 2 plugin state, 1 browser_links (new).

### Architecture
- **Reverse proxy model** — The Somaverse hub relays WebSocket messages between your browser and your agent. It never stores your data — everything flows through to your machine.
- **Per-user isolation** — Device keys are Argon2-hashed. Each user’s workspace connection is paired by user_id. No cross-user access possible.
- **Modular extensions** — bridge-connect (local), hub-connect (cloud). Both run simultaneously with dedup. Add a service, add an extension.

### Security
- Device keys: 192-bit random, Argon2 hashed in DB
- Transport: WSS via Traefik + Let’s Encrypt
- Hub proxy: Bearer device_key + JWT cookie auth on every request
- CORS: restricted to somaverse.ai, somaverse.space, dev.somaverse.ai

### Fixed
- **Breathe stale warning** — disabled by default. Was firing every turn in long sessions ("28 tool calls since preload"). Now fires at most once, configurable via `breathe.preloadStaleThreshold` in settings.

---

## [0.11.4] — 2026-04-14

### Fixed
- **Script root-finding** — `_find_root()` in 10 dev scripts now checks `repos/agent/package.json` to distinguish `meetsoma/` from `repos/agent/` (both had `.soma/` and `repos/` dirs).
- **sync-docs.sh** — prefers `agent/` (dev) over `agent-stable/` (main) for Phase 5 doc sync.

### Added
- **Image budget** — auto-compact when screenshots accumulate. Soft notify at 8 images, hard auto-compact at 10. Counts all image sources (browser_screenshot, Read tool, user-pasted). Counter resets on compact. Visible in `/status`.
- **`imageBudget` settings** — `softAt` and `hardAt` configurable via `settings.json`. Set `hardAt: 0` to disable.
- **`breathe.maxTokens` setting** — caps the effective context window for breathe threshold calculations. Fixes breathe being dormant on 1M-context models where 50% = 500K tokens.
- **Sandbox source flags** — `soma-sandbox.sh --dev` builds and tests from dev branch. `--main` tests agent-stable. `--beta` (default) tests soma-beta. API tests default to claude-haiku-4-5.
- **14 new settings tests** — covers removed fields, new fields, multi-level inheritance, array replacement.

### Changed
- **Settings cleanup** — removed 3 never-implemented settings: `memory.flowUp`, `sessions.overwriteGuard`, `checkpoints.project.workingBranch`. Default version updated 0.6.4 → 0.11.3.

## [0.11.3] — 2026-04-14

### Fixed
- **Script description parser** — `getScriptMeta()` was parsing YAML frontmatter delimiters (`---`) as the script description. Every frontmatter-using script showed "---" in the system prompt. Parser now skips frontmatter blocks, extracts `# description:` fields, skips decorative lines, and scans 30 lines instead of 15.

### Changed
- **Docs version sweep** — 6 docs updated: stale version refs (v0.9.0→v0.11.2, v0.2.0→v0.3.3), extension table 4→8, scripts.md restructured into Bundled/Advanced/Hub sections.

## [0.11.2] — 2026-04-14

### Fixed
- **soma-install.sh paths** — updated `products/soma` → `meetsoma/repos` references.
- **Duplicate session files in rotation boot** — rotation path embedded file hints in both greeting AND session_files template variable. Now greeting is narrative only, session_files handled by template (matching normal boot pattern from 4d8331f).
- **Triple error cascade on API failure** — three independent handlers fired on single error. Added errorHandled flag, else-if chain, gated fatal-session check.
- **False-positive billing detection removed** — `err.includes("extra usage")` matched Claude consumer error text, not actual billing issues. Pi shows raw API errors natively. Removed our pattern matching entirely.
- **Doctor fallback version** — hardcoded 0.10.0 → 0.11.1.
- **Build pipeline** — `build-dist.mjs` was reading Pi 0.64.0 from stale `repos/cli/dist`. Now reads from npm (Pi 0.67.1). Root cause of months of invisible dist/ drift.
- **Release script** — removed stale `CLI_DIST` reference; Soma brand themes were being overwritten by Pi defaults.
- **Dev-mode theme crash** — Pi's config.js resolves to `src/` when it exists. Added symlinks for theme, export-html, and assets paths.
- **Stale docs** — `repos/cli` ref in install-architecture.md.

### Changed
- **Pi runtime 0.64.0 → 0.67.1** — dist/ was stuck at Pi 0.64.0 despite package.json claiming ^0.66.1. Synced from npm. Gets stack overflow fix for long sessions (#2651), subscription auth warning, queued message flush fix.
- **Pi telemetry disabled** — set PI_TELEMETRY=0 in cli.js to prevent install ping added in Pi 0.67.1.
- **Rotation boot aligned with decomposition** — greeting no longer embeds session file hints. Consistent with normal boot path pattern.
- **Error handling** — auth-aware (OAuth vs API key). Account rate limits (real plan limit) handled separately from extra-usage classification errors (often transient). OAuth: progressive retry → warn → pause at 4th. API key: pause immediately.
- **Error display** — build-time error-sanitizer patch converts raw JSON API errors to human-readable messages. Billing errors show progressive messages. Retryable errors (overloaded, 500) pass through untouched.

### Added
- **`soma-dev verify upstream`** — detects dist/ vs node_modules/ drift by fingerprinting key runtime files. Prevents the 0.64→0.66 invisible drift.
- **Runtime integrity tests** — test-hygiene.sh now checks telemetry disable, boot decomposition, billing removal, error cascade flag, verify-upstream existence.
- **Release pipeline gate** — `soma-release.sh` now blocks on dist/ upstream drift detection before building.
- **Error-sanitizer** — build-time patch to Pi's display layer. Progressive billing messages, auth/model rewrites. Zero cache impact.
- **Patch manifest** — `scripts/_dev/patches/manifest.json` tracks applied dist/ patches.
- **CLI repo archived** — content merged to agent README. `meetsoma/cli` archived on GitHub.

## [0.11.1] — 2026-04-13

### Fixed
- **Cache invalidation from image stripping** — removed progressive image stripping from `before_provider_request` in soma-guard. Each new screenshot changed the strip set, invalidating the entire cache ($2-3 per invalidation, $152/day on Apr 12). Image management now handled by capture-time optimization + future auto-compact.
- **Zombie sessions** — idle shutdown timer now runs independently of keepalive. Post-exhale shutdown (15 min) + absolute timeout (30 min). Previously, disabling keepalive also disabled the shutdown check.
- **Boot resume cache waste** — silent resume when no .soma files changed. Was injecting "Nothing changed" message that cost ~$1.78 in cache rewrite with zero value.
- **Keepalive on fatal errors** — kill keepalive on first-turn API failures to prevent infinite retry loops.
- **Billing notice handling** — separate billing notices from error-pause logic so keepalive isn't killed on credit warnings.
- **Pipeline** — remove `streamingBehavior` (not in Pi types), fix `focus --help` without seam.

### Added
- **Cache health tracking** — statusline tracks cacheRead, cacheWrite, cost per session. Alerts on cache invalidations (>50K token writes). Footer shows ✓cache / Ninv indicator.
- **Idle session detection** — auto-shutdown after configurable idle period with no user input.

### Changed
- Cache health indicator moved to statusline line 2 (line 1 was crowded).

## [0.11.0] — 2026-04-12

Identity overhaul + first-run experience. soul.md replaces SOMA.md as default. Minimal boot for new projects. 11 bundled scripts. Critical doctor fix.

### Added
- **`soma session`** — session maintenance tool. `strip-images` removes base64 image data from JSONL (16MB → 2.6MB), `list` shows all sessions with sizes, `stats` analyzes image payload.
- **test-install-flows.sh** — 36-assertion E2E test suite covering fresh init, v0.6→current upgrade, edge cases (corrupt settings, missing version, empty body/).
- **Discovery marker: `body`** — `findSomaDir()` now detects projects with only `body/soul.md` (no SOMA.md).
- **User extension preservation** — reinstall preserves user-installed extensions (bridge-connect.ts, workspace-tools.ts) alongside auth.json and models.json.
- **Extension allowlist** — configure approved extensions in settings.json, `/soma doctor` reports unlisted extensions.
- **Image payload guard** — `before_provider_request` strips old images when >15 accumulate in conversation. Prevents Anthropic many-image 2000px limit.

### Changed
- **Identity: soul.md is primary** — `initSoma` creates `body/soul.md` instead of `SOMA.md`. `ensureGlobalSoma` creates `body/soul.md` at `~/.soma/`. SOMA.md and identity.md still work as fallbacks. All docs, templates, tree diagrams updated (30+ files).
- **autoInject default: false** — new projects use `soma inhale` for intentional preload loading. Existing settings preserved on upgrade.
- **First-run minimal boot** — first session skips hot protocol/muscle injection into system prompt. Agent discovers through use.
- **Pi 0.65 migration** — `session_switch`/`session_fork` → `session_start` with `event.reason`.
- **Protocol heat-defaults reclassified** — only `breath-cycle` and `working-style` start warm. All others cold.
- **11 bundled scripts** (was 6) — added soma-body, soma-refactor, soma-reflect, soma-plans, soma-session.
- **Template single source** — `body/_public/` deleted, templates read from `templates/default/`.
- **Hub template install** — fetches soul.md → SOMA.md → identity.md, writes to body/soul.md for new projects.

### Fixed
- **Critical: semver comparison in thin-cli.js** — doctor used JS string comparison (`"0.6.2" > "0.10.0"`), so upgrades NEVER ran for any project. Added `semverCmp()` for proper numeric comparison.
- **CLI UX** — `soma help`, `soma version` now work (bare words). `soma init` when .soma/ exists routes to doctor instead of broken TUI.
- **Image payload guard** — strips old images from conversation history, pauses keepalive on 400/invalid_request errors (was only 429). Prevents infinite retry deadlock.
- **Parent chain detection** — init.ts walker now checks `body/soul.md` and `settings.json`, not just `SOMA.md`/`identity.md`.
- **soma verify crash** — `${*}` with `set -u` caused unbound variable when called without args.
- **Stale refs sweep** — 30+ files across docs, core, templates, scripts, community. `identity.md` → `body/soul.md` in all user-facing strings.
- **Script path leaks** — soma-health, soma-verify, soma-seam, soma-refactor guarded behind path existence checks.
- **Sandbox** — was creating `identity.md` (deprecated), now creates `body/soul.md`.

---

## [0.10.0] — 2026-04-10

Restructure release. AMPS consolidated, CLI script routing, Pi runtime bumped, 25 commits since v0.9.0.

### Added
- **v0.8.1→v0.9.0 migration map** — settings additions (inherit, keepalive, heat.autoDetectBump), script routing syntax, AMPS consolidation notes. Chains with existing migration maps.
- **soma-health.sh** — project health dashboard script.
- **Docker sandbox** — `soma-sandbox.sh` can now use Docker for isolated E2E testing (21/21 tests pass).
- **test-hygiene.sh** — repo cleanliness checks (secrets, sessions, dev artifacts).
- **verify-amps command** — CWD path resolution, community protocol source validation.
- **3 scripts promoted to bundled** — soma-verify.sh, soma-refactor.sh, soma-browser.sh moved from dev to discoverable.

### Changed
- **Pi runtime 0.64.0 → 0.66.1** — 2 minor versions, bug fixes, no breaking changes.
- **Docs: CLI syntax** — all 8 doc files updated from `soma-code.sh` to `soma code` syntax. Website synced.
- **Scripts reorganized** — 39 dev scripts moved to `_dev/`, 3 promoted to bundled, redundant scripts archived.
- **CWD safety audit** — dev-path guards on Tier 2 scripts, soma-query demoted to `_dev/`.

### Fixed
- **soma-guard: orphaned tool_result sanitizer** — `before_provider_request` handler removes orphaned tool_result blocks before API call. Prevents 400 errors from upstream Pi bug.
- **soma-statusline: auto-pause keepalive on rate limit** — detects 429/rate_limit errors, auto-disables keepalive. Prevented 67+ wasted requests per rate-limit window.
- **soma-doctor.sh: follow core/ symlink** — was reading stale `~/.soma/agent/package.json` (v0.6.0) instead of following symlink to dev repo. Now resolves through readlink.
- **init.ts: read version from package.json** — was hardcoded to 0.6.2, now reads dynamically.
- **Sandbox: deterministic prompt template test** — replaced LLM-dependent test with file-read verification.
- **Sandbox: extension/protocol count comparison** — use `>=` instead of `==` for forward compatibility.
- **soma-boot: streamingBehavior on all sendUserMessage calls** — 10 calls patched, prevents runtime errors.
- **Keepalive infinite loop** — `keepaliveInFlight` flag prevents auto-exhale from re-triggering keepalive.
- **CI: npm ci + tsx PATH** — added to all test suites for clean CI runs.

---

## [0.9.0] — 2026-04-04

### Added
- **`{{inbox_summary}}` template variable** — scans `.soma/inbox/` at boot, injects unread message summary into system prompt. File-based async messaging between agents.
- **`{{scripts_table}}` in default `_mind.md`** — agents can now see their discovered scripts in the system prompt.
- **`preload.autoInject` setting** — auto-inject most recent preload on fresh boot (default: true). No longer requires `soma inhale` CLI command for preload loading.
- **7 new documentation pages** — `inbox.md`, `doctor.md`, `hub.md`, `troubleshooting.md`, `guides/daily-workflow.md`, `guides/customization.md`, `guides/first-protocol.md`. Total: 33 pages (~36K words).
- **`inter-agent-inbox` community protocol** — published to community hub. Formal spec for file-based inter-agent messaging.
- **Script drift detection** — `soma-verify.sh drift` now checks scripts across agent repo → working copies → global.

### Changed
- **Digest → TL;DR migration complete** — 96 files converted from `<!-- digest:start/end -->` to `## TL;DR`. Both formats still accepted, `## TL;DR` is the standard going forward.
- **Docs accuracy overhaul** — 13 existing pages updated: `autoInject` mental model, version refs, `breadcrumb` → `description`, `maxTokens` default, session log naming format, identity.md deprecated.

### Fixed
- **Keepalive limit not enforcing** — keepalive-triggered turns reset the ping counter, making keepalives infinite. Now tracks `keepaliveInFlight` flag to skip reset on self-initiated turns.
- **Changelog hook targets [0.12.2] — 2026-04-17 only** — old hook appended to first `### Added`/`### Fixed` globally, which could hit released versions.
- **Test suite** — added `tsx` to devDependencies (bare `tsx` calls failed), fixed 10 stale test paths (`body/public` → `body/_public`, `identity.md` → `SOMA.md`).
- **Stale `body/public` references** — updated to `body/_public` across comments, docs, templates, and scripts (6 files).

---

## [0.8.1] — 2026-04-02

### Added
- **Unified warm content format** — `## TL;DR` replaces `<!-- digest:start/end -->` across all AMPS. Protocols, muscles, and automations all use the same format. Code accepts both during transition.
- **`extractTldr()`** — shared utility for extracting TL;DR sections, used by protocols, muscles, and automations.
- **MAP = automation alias** — `map` accepted as type alias in `/hub install`, `/hub fork`, `/hub share`. MAPs are a type of automation.
- **Discovery unification** — `discoverMaps()` now scans `amps/automations/` root alongside `maps/` subdirectories. Installed hub automations are visible as MAPs.
- **Keepalive limits** — 5 pings per idle period (configurable 0–5), countdown in notification (`♥ Keepalive 3/5`), resets on user message.
- **Auto-exhale on idle** — when keepalive lives are exhausted and context exceeds 75k tokens, the agent automatically writes a preload. Configurable via `keepalive.autoExhale` and `keepalive.autoExhaleMinTokens`.
- **Migration phase `v0.8.0→v0.8.1`** — Tier 1 auto-converts muscle digest blocks to TL;DR format, adds keepalive settings.

### Changed
- **`soma-doctor.sh`** — reads agent version from `package.json` instead of hardcoded string.
- **Hub validator** — accepts `description`/`triggers`/`tags`, prefers `## TL;DR` over `<!-- digest -->`, warns on legacy format.

---

## [0.8.0] — 2026-04-02

### Added
- **`soma doctor`** — project health check and migration from CLI. Tier 1 auto-fixes (settings, body, protocols) run silently on every boot. TUI `/soma doctor` provides interactive Tier 2+ migration with `compareTemplates()` analysis.
- **`soma status` / `soma health`** — quick project health check (renamed from old `soma doctor`).
- **`soma --version`** — shows both agent and CLI versions.
- **`soma --help`** — delegates to core agent for full branded help output.
- **Migration phase system** — `cycle.md` + 9 phase files covering v0.6.1 → v0.8.0. Each phase is self-contained with from/to versions, actions, and what changed. Complete chain with no gaps.
- **`_doctor-update.md` + `_doctor-pending.md`** — boot templates for agent-assisted migration. Pending template injected into followUp when updates available.
- **`compareTemplates()`** — three-category file diff (content files, metadata, runtime) for doctor analysis.
- **`findChildSomaDirs()`** — walks filesystem to discover child `.soma/` directories for multi-project support.
- **`doctor.autoUpdate` + `declinedVersion`** — per-project settings controlling update notification behavior.
- **Warm AMPS** — skill loader shows full TL;DR or digest for warm content, short description for cold. All AMPS types unified.
- **Body templates** — improved starters for soul.md, voice.md, journal.md, pulse.md, body.md. DNA.md rewrite with self-awareness, owner’s manual, and deep reference links.
- **`_first-breath.md`** — context-aware first-run template with conditional blocks for monorepos, blank projects, code projects, global/inherited `.soma/`.
- **Test suites** — `test-doctor.sh` (46 tests), `test-migrations.sh` (48 tests) covering all doctor features and migration chain integrity.
- **Docs** — `updating.md` (migration guide), `install-architecture.md` (CLI → agent flow), `body.md` (full body architecture reference with variables, templates, chain, lifecycle).

### Changed
- **CLI routing overhaul** — `doctor`, `status`, `health`, `update`, `version` all route through thin-cli. `--help` delegates to core when agent is installed.
- **Starter content** — code fallbacks synced to `_public/` templates, HTML comments stripped from shipped content.
- **Bundled scripts** — `soma-theme.sh` seeds on init, breadcrumbs added to all bundled scripts for docs and community references.
- **`_first-breath.md`** — added self-exploration guidance (agent reads its own docs), breath cycle explanation, learn-the-user prompts.
- **`_memory.md`** — added Step 1.5 (update living docs), Before You Start (conditional loading), corrections emphasis.

### Fixed
- **CHANGELOG auto-append bug** — post-commit hook was appending to every section, not just [0.12.2] — 2026-04-17. Rewrote hook, cleaned 172 duplicate entries.
- **Boot version-bump race** — version was bumped before notification, causing re-check loops. Now bumps after Tier 1 fixes complete.
- **CLI help header** — shows "CLI v0.2.0" instead of bare version number.
- **Dev mode health check** — no longer reports false "git repo has issues" in development.
- **Tier 1 body scaffold** — adds missing body files to existing `body/` directory (was only creating on fresh init).

## [0.7.1] — 2026-04-01

### Added
- **rewrite DNA.md — self-awareness, owner's manual, link to docs for deep reference**
- **`soma --help` rewrite** — Soma-branded help with session commands, project commands, options, and TUI slash commands. Replaces generic Pi help output.
- **`soma --help scripts`** — show installed scripts with descriptions. Works from CLI and inside sessions.
- **`soma --help commands`** — full command reference organized by category (CLI, session, heat, hub, info).
- **`soma-theme.sh` bundled** — shared script theming now seeds on init (was a missing dependency for 3 bundled scripts).

### Fixed
- **help header shows 'CLI v...' not bare version**
- **help rewrite, script theme crash, focus session, postinstall, docs**
- **Scripts crash on fresh projects** — `source soma-theme.sh` with `set -e` caused fatal exit when theme file wasn't present. Fixed with `if [ -f ]; then source; fi` pattern across all 8 scripts.
- **`soma focus <keyword>` didn't start session** — `main()` call wasn't awaited, `process.exit(0)` ran before session could start.
- **`postinstall.js` missing from builds** — deleted during Pi 0.64.0 dist sync, restored to CLI repo. Added to `OUR_DIST_FILES` and release script.
- **Docs: `/inhale` vs `soma inhale` confusion** — commands.md and getting-started.md now clearly distinguish CLI commands (shell) from TUI slash commands, with comparison table.

---

## [0.7.0] — 2026-04-01

### Added
- **rewrite DNA.md — self-awareness, owner's manual, link to docs for deep reference**
- **/inhale guard** — warns when no preload exists (suggests `/exhale`), warns when preload is stale (>5 tool calls since write). Use `/inhale --force` to override.
- **Slash command usage hints** — 10 commands now include `Usage:` patterns in their descriptions: `/pin`, `/kill`, `/auto-commit`, `/inhale`, `/install`, `/auto-breathe`, `/hub`, `/scratch`, `/keepalive`, `/soul-space`, `/soma`.
- **Hub: 5 new scripts** — soma-seam, soma-reflect, soma-query, soma-focus, soma-plans. All with coaching-voice digests.
- **Hub: soma-code v2.0.0** — added `blast` (blast radius analysis), `tsc-errors` (TypeScript errors with context), improved `refs` (DEF/IMP/USE), improved `find` (extension filter).
- **Scripts docs** — `scripts.md` rewritten with hub links for each script.

### Changed
- **Upstream sync R4** — Pi 0.63.1 → 0.64.0. New APIs: `setHiddenThinkingLabel`, `signal`/`getSignal`, `prepareArguments`, async `getArgumentCompletions`.
- **Core scripts trimmed** — init seeds 5 core scripts (soma-code, soma-seam, soma-focus, soma-update-check, validate-content). Others available via `soma hub install script <name>`.
- **Semver discipline** — feature releases now bump minor version (0.X.0). Patch (0.x.Y) reserved for bug-fix-only releases.

### Fixed
- **help header shows 'CLI v...' not bare version**
- **help rewrite, script theme crash, focus session, postinstall, docs**
- **Changelog hook** — `soma-dev.sh` post-commit hook now targets only the first `### Added`/`### Fixed` section (was appending to all version sections).
- **Hub table rendering** — markdown tables in hub detail pages now render with proper `<table>`/`<thead>`/`<tbody>` structure.
- **Community CI clean** — 21 frontmatter fixes across protocols and muscles (missing breadcrumb, tier, license, author, version fields).
- **Script drift** — 7 scripts synced from working copies to agent repo (soma-code v1→v2, soma-reflect, soma-seam, soma-scrape, soma-spell, soma-plans, soma-query).
- **Hub scripts sanitized** — private paths (Gravicity, vault) stripped from soma-seam.sh.

---

## [0.6.7] — 2026-03-30

### Added
- **rewrite DNA.md — self-awareness, owner's manual, link to docs for deep reference**
- **`/soma doctor`** — migration command. Detects version mismatch on boot, prompts to run migration script with confirmation, shows output, reloads settings. Post-migration guidance for body file review.
- **Boot migration check** — notifies when project `.soma/` version is behind agent version.
- **Global vs parent detection** — `detectProjectContext()` distinguishes `~/.soma/` (global runtime) from real parent workspaces. Init prompt has three-way messaging: real parent choice, global fallback, or no soma.
- **Monorepo-aware first breath** — detects multi-repo projects, lists sub-projects with detected stacks. Points agent to `soma-code.sh structure` for orientation.
- **First-breath tool hints** — all first-breath messages include `soma-code.sh` and `soma-seam.sh` usage examples.
- **Body template scaffolding** — `body.md` (Project, Structure, Workflow, Current Focus sections) and `voice.md` (Delivery, Tone, Rhythm sections) ship with header scaffolding and comment breadcrumbs.
- **Richer `_memory.md`** — preload template now includes Weather, Who You Were, Orient From, Do NOT Re-Read sections.
- **Stash checkpoint style** — `checkpoints.project.style: "stash"` now wired. Uses `git stash push --include-untracked` with session ID.
- **Migration system** — `v0.6.6-to-v0.6.7.md` map + `migrate-0.6.6-to-0.6.7.sh` script. Handles settings, body templates, protocols. Backs up before replacing, skips customized files.

### Changed
- **System prompt budget** — default `systemPrompt.maxTokens` raised from 4000 to 10000. Anthropic's system prompt is ~25k; ours at ~5k was triggering false warnings.

### Fixed
- **help header shows 'CLI v...' not bare version**
- **help rewrite, script theme crash, focus session, postinstall, docs**
- **Preload resume false-positive** — `soma -c` no longer falsely detects preloads from previous rotations as "written this session." Uses mtime check (2-min threshold).
- **Body template instructions** — moved from frontmatter `description:` (invisible to agent) to HTML comment breadcrumbs in file body (visible, replaceable).
- **Migration script path resolution** — resolves bundled templates relative to script location, works in sandbox/dev/installed contexts.

---

## [0.6.6] — 2026-03-29

### Added
- **rewrite DNA.md — self-awareness, owner's manual, link to docs for deep reference**
- **/inhale guard + stale warning, slash command usage hints**
- **Init UX** — prompt before auto-scaffolding (`ctx.ui.confirm`), parent .soma/ inheritance when user declines, `scaffoldBody` templateDir priority chain. (SX-164, SX-165, SX-241)
- **Command provenance** — `/soma status` shows which extension registered each command via Pi's `sourceInfo`. (SX-233)
- **cli.js tracked source** — `src/cli.js` in agent repo is source of truth. `sync-to-cli.sh` and `soma-release.sh` use it. (SX-252)
- **Protocol coaching voice** — 14/17 protocol TL;DRs rewritten from spec/documentation voice to coaching voice. (SX-109)

### Changed
- **Upstream sync R3** — Pi 0.61.1 → 0.63.1 (71 commits, 3 releases). SourceInfo provenance, built-in tools as extensions, multi-edit, sessionDir, compaction fixes. 0 breaking changes on our imports. (SX-230)
- **Stale branches cleaned** — deleted `feat/docs-system`, `feat/runtime` (archived to patches), `protocol-quality-pass`, `feature/ship-breath-cycle`. Agent repo: dev + main + backup only.
- **scaffoldBody** priority chain: templateDir → bundled `_public/` → bundled `body/`.

### Fixed
- **help header shows 'CLI v...' not bare version**
- **help rewrite, script theme crash, focus session, postinstall, docs**
- **restore walk-up, keep .soma-only + runtime-home skip**
- **findSomaDir checks current dir only, no walk-up**
- **only .soma/ is a valid soma root, not .claude/ or .cursor/**
- **skip global runtime home in findSomaDir walk-up**
- `/soma prompt` diagnostic checked for "Learned Patterns" but actual heading is "Muscle Memory".

---

## [0.6.5] — 2026-03-28

### Added
- **rewrite DNA.md — self-awareness, owner's manual, link to docs for deep reference**
- **/inhale guard + stale warning, slash command usage hints**
- **`soma inhale --list`** — show available preloads with age and staleness markers from CLI.
- **`soma inhale <name>`** — partial name match. Load a specific preload by date, session ID, or any substring. Ambiguous matches show alternatives.
- **`soma inhale --load <path>`** — load any file as a preload by absolute or relative path.
- **`soma map <name>`** — top-level subcommand replacing `--map` flag. Runs a MAP with prompt-config and targeted preload.
- **`soma map --list`** — show available MAPs with status and description from CLI.
- **`/soma preload`** (in-session) — enhanced to list all preloads + inject by partial name match.
- **`listPreloads()`** + **`findPreloadByName()`** in `core/preload.ts` — preload discovery and partial name matching.
- **Settings-driven heat overrides** (`settings.heat.overrides`) — per-project AMPS heat control. Values act as both seed and decay floor. Plan/MAP overrides take priority. (`31e1383`)
- **`inherit.automations`** — separate from tools inheritance, allows projects to opt out of parent MAPs independently. (`3f01343`)
- **Statusline preload indicator** — shows preload status in footer. Smart `/exhale` detects edit vs write mode. (`76cd246`)
- **Auto-archive stale preloads** after exhale — `archiveStalePreloads()` moves old preloads to `_archive/`. (`7f2f086`)
- **Restart signal** — auto-create `.restart-required` on extension/core file changes, check across full soma chain. Signal moved to `~/.soma/` (global). (`14d0253`, `635d36e`, `e252a63`)

### Changed
- **`--preload` flag deprecated** — shows warning pointing to `soma inhale` or `soma map`. Still works for backward compat.
- **Boot greeting decomposed** — session ID and file paths now separate template variables. (`4d8331f`)

### Fixed
- **help header shows 'CLI v...' not bare version**
- **help rewrite, script theme crash, focus session, postinstall, docs**
- **restore walk-up, keep .soma-only + runtime-home skip**
- **findSomaDir checks current dir only, no walk-up**
- **only .soma/ is a valid soma root, not .claude/ or .cursor/**
- **skip global runtime home in findSomaDir walk-up**
- **Crash on partial settings** — `settings.heat.overrides` access without optional chaining crashed when `heat` section missing. Now defensive. (`b837a37`)
- **Breathe graceSeconds mismatch** — runtime fallback was 60s, settings default was 30s. Aligned to 30s. (`b837a37`)
- **5 auto-breathe UX gaps** — smart context warnings, resume awareness, write heuristic for preload detection. (`0f86bec`)

---

## [0.6.4] — 2026-03-23

### Added
- **rewrite DNA.md — self-awareness, owner's manual, link to docs for deep reference**
- **/inhale guard + stale warning, slash command usage hints**
- **prompt before auto-init + parent inheritance (SX-164, SX-165, SX-241)**
- **show command provenance in /soma status (SX-233)**
- **track cli.js as source in agent repo (SX-252)**
- **Body architecture** — structured identity system. `.soma/body/` with content files (`soul.md` → `{{soul}}`, `voice.md` → `{{voice}}`, `body.md` → `{{body}}`) and templates (`_mind.md`, `_memory.md`, `_boot.md`). Content files become template variables. Templates control system prompt and preload structure.
- **Template engine** (`core/body.ts`) — `{{variable}}` interpolation with 5 modifiers (`|tldr`, `|section:Name`, `|lines:N`, `|last:N`, `|ref`), conditional blocks (`{{#var}}...{{/var}}`), graceful degradation for missing vars.
- **AMPS Skill Loader** (`core/skill-loader.ts`) — unified content scanner. All AMPS classified by heat: hot (8+) = full body in prompt, warm (3-7) = `<available_skills>` XML (agent reads on demand), cold (0-2) = hidden. Claude's native skill format.
- **`/body` command** — template inspector with 4 subcommands: `check` (health report), `vars` (all variables by category), `map` (template structure), `render` (full compiled system prompt, fresh from disk).
- **Variable registry** — 50+ template variables categorized (context, identity, section, boot, session, focus, metadata, preload-tpl, deprecated) with essential flags and descriptions.
- **`SOMA.md`** replaces `identity.md` as canonical identity file. Resolution: `body/soul.md` → `SOMA.md` → `identity.md` (legacy fallback).
- **`body.md`** — project-shaped working context variable (`{{body}}`). Changes per project, placed anywhere in `_mind.md`.
- **First-breath template** — conditional blocks (`{{#has_code}}`, `{{#is_blank}}`) for first-run experience.
- **`/exit`** command — save state and quit cleanly.
- **Boot greetings** rewritten — "You woke up" not "You've booted into a session."
- **Header bar** shows soul/body status indicators.
- **`soma-verify.sh drift`** — `_public/` sync check across protocols, muscles, body files, community repo, and agent repo.
- **`systemPrompt.maxTokens`** wired as soft warning — notification when compiled prompt exceeds budget.
- **Muscle heat bumps on load** — muscles that stay relevant gain heat naturally (+1 per boot). Previously only bumped when explicitly read.
- **Body file inheritance** — content files and templates walk the soma chain (project → parent → global). Child wins on collision.
- **`user.name`**, `user.style` settings with `{{user_name}}`, `{{user_style}}` variables.

### Changed
- **System prompt** driven by `body/_mind.md` template when present. Users control structure, sections, custom text. Falls back to built-in compiler.
- **Warm AMPS** appear as `<available_skills>` XML alongside Pi native skills — Claude's trained format for lazy-loaded content.
- **`prompts/system-core.md`** — removed explicit context percentages (50/70/80/85%). Auto-breathe handles thresholds; agent shouldn't guess.
- **AMPS cleanup** — 44 → 34 active muscles (10 archived), 9 → 2 high-overlap triggers (16 cleaned), 34/34 have descriptions.
- **Docs sweep** — 9 pages updated for body architecture, SOMA.md, skill loader, template engine, removed gendered pronouns.
- **`sync-docs.sh`** manifest expanded — 10 new docs added (focus, maps, sessions, prompts, skills, settings, themes, keybindings, models, terminal-setup).
- **Protocol test** accepts `description:` alongside `breadcrumb:` (migration compat).
- **Sandbox test** updated for 8 extensions, 19 protocols, SOMA.md init.

### Fixed
- **help header shows 'CLI v...' not bare version**
- **help rewrite, script theme crash, focus session, postinstall, docs**
- **restore walk-up, keep .soma-only + runtime-home skip**
- **findSomaDir checks current dir only, no walk-up**
- **only .soma/ is a valid soma root, not .claude/ or .cursor/**
- **skip global runtime home in findSomaDir walk-up**
- **defensive settings.heat access + stale test mocks — 567/567 pass**
- **5 UX gaps — smart warnings, resume awareness, write heuristic**
- **Conversation tail injection removed** — was scanning stale Pi JSONL sessions from wrong runtime, sidetracking agent with old conversations.
- **Soul frontmatter leaking** into rendered system prompt — `loadIdentity()` now strips YAML frontmatter.
- **Duplicate `# Identity` heading** — `buildLayeredIdentity()` no longer hardcodes heading; template handles it.
- **`_public/` drift** — 22 files synced across community + agent repos. Drift detection tool built.
- **Boot message duplication** — stripped content already in system prompt from boot followUp.
- **`/body render`** compiles fresh from disk each time (was using stale boot cache).

### Internal
- **`VARIABLE_REGISTRY`** in `core/body.ts` — complete registry of all template variables with categories, essential flags, descriptions.
- **`core/skill-loader.ts`** — `LoadableContent` interface, `loadAllContent()`, `formatAsSkillsXml()`.
- **`compileWithTemplate()`** — template path in `compileFullSystemPrompt()`, shared section builders.
- **`getDefaultMindTemplate()`**, `getDefaultBootTemplate()` — built-in fallback templates.
- **`loadFirstBreath()`** — conditional first-run template with chain inheritance.
- **52 block variables** tested (77/77 body tests + 19 E2E).
- **Frontmatter-kit** — 9 scripts for bulk AMPS frontmatter operations (extract, writeback, sort, migrate, audit).
- **`preload.lastMessages`** setting removed (conversation tail scanner was the only consumer).

---

## [0.6.3] — 2026-03-22

### Added
- **rewrite DNA.md — self-awareness, owner's manual, link to docs for deep reference**
- **/inhale guard + stale warning, slash command usage hints**
- **prompt before auto-init + parent inheritance (SX-164, SX-165, SX-241)**
- **show command provenance in /soma status (SX-233)**
- **track cli.js as source in agent repo (SX-252)**
- **settings-driven heat overrides — per-project AMPS control**
- **inherit.automations — separate from tools inheritance**
- **statusline preload indicator + smart /exhale (edit vs write)**
- **auto-archive stale preloads after exhale + archiveStalePreloads()**
- **`/hub` command** — unified hub interface for community content. Install, fork, share, find, list, status. Replaces old `/install` and `/list` commands (kept as backward compat aliases).
- **Smart sharing** (`/hub share`) — quality scoring (0-100%), privacy auto-fix with `_public/` staging, README generation that captures `--help` output and extracts functions, dependency resolution.
- **Drop-in commands** — scripts in `.soma/amps/scripts/commands/` become `/soma <name>` commands. Hot-loadable, no restart needed. Tab completions included.
- **`scope: core` protocols** — documentation protocols whose behavior is coded in TypeScript. Never loaded into prompt (saves ~2000 tokens). Discoverable, readable on demand via docs section. `/pin` and `/kill` block with explanation.
- **5 core protocols** — breath-cycle, heat-tracking, session-checkpoints, git-identity, hub-sharing.
- **`automation` content type** — MAPs are now installable hub content. 3 published: debug, refactor, visual-gap-analysis.
- **Dependency resolution** — `requires:` in frontmatter auto-installs dependencies (scripts, protocols, muscles) alongside content.
- **`gitIdentity.email` array support** — multiple valid emails for multi-account users.
- **Default preload template** — Weather (emotional tone) + Warnings (traps for next session) sections.
- **Preload template** on community hub — customizable preload format.
- **Regression test suite** — test-hub.sh (25 tests) + test-commands.sh (26 tests). Side-effect testing for `-p` mode.

### Changed
- **Hub: 40 items** across 5 content types (17 protocols, 8 muscles, 3 scripts, 3 automations, 9 templates).
- **`/soma prompt`** shows core protocols with 📄 icon instead of misleading heat display.
- **Bundled protocols** updated with shipped tool references (soma-code, soma-scrape, soma-spell).
- **Community CI** — validate-frontmatter accepts `triggers` (replaces `topic`+`keywords`), `description` OR `breadcrumb`. Format-check supports `scope: core`. Attribution allows org identity for owners. Actions upgraded to v6 (Node 22).

### Fixed
- **help header shows 'CLI v...' not bare version**
- **help rewrite, script theme crash, focus session, postinstall, docs**
- **restore walk-up, keep .soma-only + runtime-home skip**
- **findSomaDir checks current dir only, no walk-up**
- **only .soma/ is a valid soma root, not .claude/ or .cursor/**
- **skip global runtime home in findSomaDir walk-up**
- **defensive settings.heat access + stale test mocks — 567/567 pass**
- **5 UX gaps — smart warnings, resume awareness, write heuristic**
- **`/hub list --remote`** — flag was parsed as type filter, returning 0 results.
- **Drop-in command output** — ANSI escape codes stripped (sendUserMessage renders markdown, not terminal).
- **Stale git-identity heat rule** removed from HEAT_RULES (protocol was archived).
- **soma-refactor.sh scan** — string references now exclude node_modules/dist/.git.

### Security
- **soma-beta** — `.map` files (128) and `.d.ts` files (64) stripped from dist. Source maps contained full `sourcesContent`.
- **soma-beta** — orphan history on every release. Old commits can't recover source code.

### Internal
- 7-phase dev cycle MAP (soma-dev/cycle.md with phase files)
- Blog content cycle MAP (blog/cycle.md with phase files)
- SVG blog diagrams muscle (Soma palette, transparent bg, rsvg-convert pipeline)
- Migration v0.6.2→v0.6.3 updated for scope:core + git-identity restore
- FRONTMATTER.md rewritten, CONTRIBUTING.md updated
- 185 unit test assertions (was 162), 51 regression tests

## [0.6.2] — 2026-03-21

### Added
- **rewrite DNA.md — self-awareness, owner's manual, link to docs for deep reference**
- **/inhale guard + stale warning, slash command usage hints**
- **prompt before auto-init + parent inheritance (SX-164, SX-165, SX-241)**
- **show command provenance in /soma status (SX-233)**
- **track cli.js as source in agent repo (SX-252)**
- **settings-driven heat overrides — per-project AMPS control**
- **inherit.automations — separate from tools inheritance**
- **statusline preload indicator + smart /exhale (edit vs write)**
- **auto-archive stale preloads after exhale + archiveStalePreloads()**
- **Natural muscle heat detection** — muscles now heat-bump from natural use, not just focus. Script execution matches against `tools:` field. File edits match path segments against `triggers`. Zero configuration needed.
- **Migration system** — `version` field in settings.json. `core/migrations.ts` discovers and chains migration maps. `soma doctor` checks workspace health. `soma doctor --fix` auto-repairs. `soma doctor --migrate` spawns agent for complex fixes.
- **Community template sync** — boot fetches latest protocols from community repo. Bundled protocols serve as offline fallback. Add content to community → add name to template → all new users get it.
- **`tools:` field** in muscle frontmatter — declares which scripts a muscle references. Parsed and used for natural heat detection.

### Changed
- **Triggers consolidation** — `triggers` + `keywords` + `topic` merged into single `triggers` list at parse time. `tags` stays for categorization only. Old format works indefinitely (backwards compat).
- **Muscle interface simplified** — one activation list instead of four redundant fields with different score weights.
- **Personality engine** — welcome flow is honest about being templates, not the agent.

### Fixed
- **help header shows 'CLI v...' not bare version**
- **help rewrite, script theme crash, focus session, postinstall, docs**
- **restore walk-up, keep .soma-only + runtime-home skip**
- **findSomaDir checks current dir only, no walk-up**
- **only .soma/ is a valid soma root, not .claude/ or .cursor/**
- **skip global runtime home in findSomaDir walk-up**
- **defensive settings.heat access + stale test mocks — 567/567 pass**
- **5 UX gaps — smart warnings, resume awareness, write heuristic**
- **Runtime delegation** — soma-beta now includes cli.js and Pi runtime files. Previously thin-cli fell through to raw Pi (no version skip, no auto-rotate, "Update Available" banner).
- **Fresh installs** now include version field in settings.json.
- **Stale test assertions** — test suite checked for removed frontmatter fields and nonexistent commands.

### Internal
- soma-theme.sh, soma-rebrand.sh, soma-switch.sh dev mode, soma-doctor.sh
- script-polish + github-theming muscles
- 7 repo READMEs refreshed, post-release MAP created
- License date corrected to 2027-09-18, contact standardised to meetsoma@gravicity.ai
- Dangerous CI disabled (release-publish.yml shipped full source on v* tags)

---

## [0.6.1] — 2026-03-20

### Changed
- Pi runtime upgraded 0.61.0 → 0.61.1 — Release Round 3 (#3cbf2bc)
  - Keybinding eviction fix (stop removing unrelated defaults)
  - agentDir respected for SDK session paths
  - Suspend/resume stability (Ctrl+Z/fg)
  - ToolCallEventResult exported

### Fixed
- **help header shows 'CLI v...' not bare version**
- **help rewrite, script theme crash, focus session, postinstall, docs**
- **restore walk-up, keep .soma-only + runtime-home skip**
- **findSomaDir checks current dir only, no walk-up**
- **only .soma/ is a valid soma root, not .claude/ or .cursor/**
- **skip global runtime home in findSomaDir walk-up**
- **defensive settings.heat access + stale test mocks — 567/567 pass**
- **5 UX gaps — smart warnings, resume awareness, write heuristic**
- CLI dist synced from pi-mono 0.61.1 — `getEditorKeybindings` → `getKeybindings` crash resolved
- Stale `content-cli.js` import removed (Pi 0.61.0 moved install/list/content to main.js)
- `--help` fixed — `printGumHelp` removed in 0.61.0, replaced with `printHelp`
- Heat system docs: `.protocol-state.json` → `state.json` across 6 files, 3 repos
- Protocols page: collapsed 60-line heat duplication to reference, renamed "Protocols & Heat" → "Protocols"
- `soma-verify.sh self-analysis`: script search recurses into subdirectories, skips archived `.soma/`
- 7 muscles: missing `topic:` / `keywords:` frontmatter restored
- `.protocol-state.json` deleted (dead since March 13)

### Docs
- 27 pages across 5 sections (was 24 across 5 disorganised sections)
- New: `amps.md` (four-layer overview), `migrating.md` (from CLAUDE.md/.cursorrules), `troubleshooting.md`
- Collapsible sidebar with section icons
- Roadmap curated for all 7 versions, "Next" section added
- `/beta` redesigned: "Private Beta" → "Source Access" with tier cards and Known Gaps

### Blog
- "Three Files" — solo, on identity and architecture
- "The Ratio" — solo, on code vs behavior growth
- "The Operating System We Didn't Plan" — solo, on AMPS as dev process
- Interlinks across all 8 published posts + doc page SEO links

### Internal
- `soma-dev` CLI: doctor, fix, sync-dist, reinstall commands
- `system-audit` + `audit-preflight` MAPs — truth-check any subsystem
- `release-tracking` protocol + `release-cycle` MAP
- Release folder structure: `v0.6.0/` (archived) + `v0.6.x/` (living)
- AMPS organised: `_public/` staging for hub, consistent across protocols/muscles/scripts
- `amps-interconnect` MAP restored from archive
- `solo-editorial` muscle for agent-authored blog posts

## [0.6.0] — 2026-03-20

### Added
- **rewrite DNA.md — self-awareness, owner's manual, link to docs for deep reference**
- **/inhale guard + stale warning, slash command usage hints**
- **prompt before auto-init + parent inheritance (SX-164, SX-165, SX-241)**
- **show command provenance in /soma status (SX-233)**
- **track cli.js as source in agent repo (SX-252)**
- **settings-driven heat overrides — per-project AMPS control**
- **inherit.automations — separate from tools inheritance**
- **statusline preload indicator + smart /exhale (edit vs write)**
- **auto-archive stale preloads after exhale + archiveStalePreloads()**

#### MAP System — Plan-Driven Agent Orchestration
- `maps.ts` — MAP discovery + prompt-config YAML parser (#1039512)
- `PlanPromptConfig` — plan-driven system prompt overrides: heat overrides, force-include/exclude, section toggles, budget overrides, supplementary identity (#28d71fe)
- `soma --map <name>` — MAP targeting via `.boot-target` signal file. Loads prompt-config, targeted preload, and MAP content as navigation context (#a12709e)
- 18 tests for MAP parser + plan override compilation (#df835cb)

#### Focus Targeting — Seam-Traced Boot
- `soma-focus.sh` — pre-model seam-traced boot priming. Traces keyword through memory, scores relevance, generates `.boot-target` with heat overrides (#116c4bb)
- Focus handler in `soma-boot.ts` — `type: "focus"` .boot-target support. Loads focus preload, related MAPs (max 3), focus summary (#2f7d302)
- Muscle trigger engine — `triggers:` frontmatter parsed and matched at boot. Muscles auto-activate when focus keyword matches their tags, keywords, topics, or explicit triggers (#1bc1c57)
- `matchMusclesToFocus()` — TypeScript-native muscle matching with scored relevance (10=trigger, 5=tag/keyword, 4=topic, 3=name, 2=digest) (#1bc1c57)
- `trackMapRun()` — programmatic MAP usage tracking. Auto-increments `runs:` and updates `last-run:` in frontmatter when MAP loads via .boot-target (#893f176)

#### Scripts — Agent Tools That Ship
- **5 Tier 1 scripts** now ship with Soma and are seeded on `soma init` (#116c4bb):
  - `soma-code.sh` — multi-language codebase navigator (map, find, refs, replace, structure, tsc-errors)
  - `soma-seam.sh` — trace concepts through memory, code, and sessions
  - `soma-focus.sh` — seam-traced boot priming
  - `soma-reflect.sh` — parse session logs for patterns and observations
  - `soma-plans.sh` — plan lifecycle management
- `scaffoldScripts()` in `init.ts` — copies bundled scripts to `.soma/amps/scripts/` on init (#116c4bb)
- `ensureGlobalSoma()` — bootstraps `~/.soma/` with AMPS layout on first boot. Seeds scripts, creates global identity template. Idempotent. (#47422e8)
- Protocol scope fix — 5 protocols changed from hub/internal to bundled for proper CLI distribution (#47422e8)
- Recursive AMPS discovery — muscles, protocols, scripts, MAPs now scan subdirectories (max 2 levels). Directories with `_` or `.` prefix are skipped. Enables organized layouts: `muscles/ui/`, `scripts/dev/`, `maps/runtime/` (#c36dcd0)
- Identity template enhanced — 5 working patterns (read-before-write, scripts-first, verify-before-claiming, corrections-as-signal, log-your-work) in both built-in and smart templates (#98035e9)
- `soma-pr.sh` moved to `_dev/` — requires GitHub App secrets users don't have (#98035e9)
- `soma-scrape.sh` — intelligent doc discovery + scraping (resolve, pull, search, discover). Requires gh, curl, jq (#18e5bde)
- `soma-query.sh` — unified search replacing soma-scan + soma-search. Commands: find, list, search, sessions, related, impact (#5604f2a)
- `/scan-logs --send` flag — injects search results into agent conversation (#1f891a5)

#### Guard & Safety
- Worktree boundary enforcement — hard-block writes outside allowed worktree path (#961f2bc)
- Soul-space command gated behind `.gate.md` file (#2b0d819)

#### Agent Infrastructure
- PR template, agent contribution standards for GitHub App bot PRs (#743b48d)
- Soul-space mode — `/soul-space on` replaces keepalive with MLR prompts (#caea905)
- TypeScript type checking (`npm run check`) + biome linting (`npm run lint`) (#20ab881)

#### Identity & Protocols
- Identity bootstrap with 4 sections: This Project, Voice, How I Work, Review & Evolve (#c5086ea)
- `response-style` protocol — set voice, length, emoji, and format preferences (#50aee8a)
- Dignity clause in `correction-capture` — acknowledge without over-apologizing (#50aee8a)
- `maps` protocol — teaches MAP system: check before tasks, build after repeated processes (#4a85b53)
- `plan-hygiene` protocol — plan lifecycle: status tracking, ≤12 active budget, verify before claiming (#4a85b53)
- `soma inhale` CLI subcommand — fresh session with preload from last session (#f61064f)
- `soma` (no args) now starts clean — no preload injection (#f61064f)
- User interrupt detection during auto-breathe — 1st interrupt resets timer, 2nd cancels (#d530af8)
- Gum-formatted `--help` output with tables and styled header (cli)

### Changed
- Pi runtime upgraded 0.60.0 → 0.61.0 — full upstream sync (Release Round 2), 76 upstream commits (#de7bd1c)
- `PI_PACKAGE_DIR` + `SOMA_CODING_AGENT_DIR` env vars — correct path delegation for .soma/ project dirs (#5c9ba4d, #f5818a6)
- `system-core.md` updated — scripts-first workflow, tool-building guidance, session logging format, preload coaching, verify-before-claiming (#116c4bb)
- `tool-discipline.md` v3.0.0 — script-first workflow, when to build scripts, script standards (#116c4bb)
- `soma-breathe.ts` extracted from `soma-boot.ts` — cleaner separation of concerns (#aa4ae19)
- Protocol quality-standards expanded — close-the-loop, tests-match-code, conventional commits (#d2dc95d)
- Preload quality added to breath-cycle TL;DR (#0632fad)
- Author attribution + CC BY 4.0 license footers on protocols (#0a2e0ac)

### Fixed
- **help header shows 'CLI v...' not bare version**
- **help rewrite, script theme crash, focus session, postinstall, docs**
- **restore walk-up, keep .soma-only + runtime-home skip**
- **findSomaDir checks current dir only, no walk-up**
- **only .soma/ is a valid soma root, not .claude/ or .cursor/**
- **skip global runtime home in findSomaDir walk-up**
- **defensive settings.heat access + stale test mocks — 567/567 pass**
- **5 UX gaps — smart warnings, resume awareness, write heuristic**
- Edit tool detection in preload + overwrite-safe breathe instructions (#9e7684f)
- Auto-breathe graceSeconds consistency + DRY path helpers (#ec857f8)
- Auto-breathe timeout + session log `-2` suffix bugs (#baaf51b)
- Session ID extraction from Pi entry format (#7b3931e)
- Reuse session ID on resume — no more orphan logs (#01bc3b7)
- Guard session_start against Pi cache re-fire (#04571ed)
- All 10 pre-existing TypeScript errors resolved — 0 type errors (#13bfaf9)
- `/auto-breathe off` now cancels in-flight rotation (#2bdcf99)
- Stray 't' in boot causing "Failed to load extension: t is not defined" (#be18665)
- `findSomaDir` returns SomaDir object — use `.path` for join() (#73eca3b)
- Settings test allows partial override files (guard-only) (#d372373)
- Maps test output format matches `Results:` pattern for soma-ship (#45017ce)
- `/scrape` route.provide moved inside handler scope (#cf0170d)
- Warm protocol TL;DRs shortened from 400-555 to ~150 chars — saves ~1500 tokens per boot (#9008d43)
- `pre-flight` heat lowered from 8 (hot) to 5 (warm) — too heavy for empty repos (#9008d43)
- `scaffoldProtocols()` now copies ALL bundled protocols on init, not just breath-cycle (#9008d43)
- Auto-breathe grace period is now time-based (30s default) instead of turn-based (#8ca5e52)
- Preload trust hierarchy — boot instructions explicitly require stating resume point (#dfb5ca9)
- Hub protocol TL;DRs tightened (git-identity, session-checkpoints, tool-discipline) (#dd8c4cf)
- Breadcrumbs synced from community — consistent cross-repo references (#9461185)
- All 14 bundled protocols synced to workspace — zero drift. 7 had diverged since v0.5.2 (#d49d9c7)
- `soma-focus.sh` unbound variable fix when no `.soma/` exists (#d49d9c7)
- `soma-focus.sh` regex updated for recursive AMPS paths (subdirectory muscles/protocols/MAPs) (#6f7549f)
- MAP discovery now scans `projects/*/phases/*/map.md` — phase MAPs co-located with project specs (#9f9cca7)
- `findMap()` falls back to full discovery when direct path lookup fails (#9f9cca7)
- MAP scope: 8 root MAPs changed from `internal` to `public` (build-muscle, build-script, debug, plan-to-maps, refactor, soma-focus, plan-validation, sdk-research)
- MAP test uses temp fixture instead of hardcoded workspace path (#bd53f45)
- Focus fast mode for common keywords — skip seam trace when 50+ matches, scan frontmatter directly (#027fc87)
- Focus heat scoring fixed — `score * 2` reaches HOT tier (was `score + 2`, max WARM). Force-include at score 5+ (was 8+) (#5d572d6)
- Focus MAP prompt-config merging — related MAPs' heat overrides and force-includes merge into focus session (#5d572d6)
- `ensureGlobalSoma()` now seeds bundled protocols — existing users get new protocols on upgrade (#fe29c0e)
- Tests updated for soma-query consolidation, maps protocol frontmatter fixed (#29687e7)
- Removed dead `getScriptDescription()` function (#6ddc8f7)
- Maps protocol TL;DR updated with `soma focus` + tracking mention (#a4e8413)
- `scaffoldScripts` now seeds all 10 shipped scripts (was 8) (#2757bdb)
- All directory trees in docs aligned with amps/ layout (#705e089)
- Stale memory/muscles paths fixed → amps/muscles (#ba5c5ca)

### Docs
- New page: `models.md` — comprehensive Models & Providers guide: 17+ providers, API key storage, custom providers (#1781d24)
- New page: `keybindings.md` — keyboard shortcuts and customisation (#56ab090)
- New page: `themes.md` — built-in and custom themes (#56ab090)
- New page: `settings.md` — engine settings reference (#56ab090)
- New page: `terminal-setup.md` — terminal recommendations and tmux (#56ab090)
- New page: `sessions.md` — session tree, fork, compaction, branch summarisation (#cdb7cd1)
- New page: `prompts.md` — prompt template format and usage (#cdb7cd1)
- New page: `skills.md` — SKILL.md format and skill authoring (#cdb7cd1)
- `getting-started.md` updated — "Set Up a Provider" section, model switching (#1781d24)
- `commands.md` updated — Model Commands section, CLI model flags (#1781d24)
- `extending.md` updated — custom model providers section (#b99902a)
- Pi doc parity: 23/23 docs covered (was 15/23)
- New page: `maps.md` — MAP system guide: creation, prompt-config, loading, tracking (#14744fb)
- New page: `focus.md` — seam-traced boot priming: usage, matching scores, triggers (#14744fb)
- `scripts.md` rewritten — 6→14 scripts documented, core/utility sections, "Building Your Own" guide (#14744fb)
- `how-it-works.md` — added MAPs + Focus sections, fixed duplicated paragraph, context scaling note (#14744fb)
- `configuration.md` — added Custom Content Paths, Script Discovery, Global Config (~/.soma/) sections (#6ddc8f7)
- `muscles.md` — added tags, triggers, tools frontmatter fields (#14744fb)
- `protocols.md` — 4→16 protocol table with all shipped protocols (#14744fb)
- Commands page: add /code, /scrape, /scan-logs, fix auto-continue→rotate, add --orphan (#5629dd3)
- Guard: add cross-references to related muscles, MAPs, scripts (#dd1a117)
- How-it-works: add router and CLI rotation to auto-breathe section (#35c939e)
- Add /route command and soma-route.ts extension docs (#668b23f)
- Scripts: add soma-scan and soma-search, fix usage paths for npm users (#e791660)
- Fix preload naming convention docs (#2b1be52)
- Reality check — remove stale scripts, fix AMPS layout, update commands (#dfce881)

### Protection & Distribution
- BSL 1.1 license deployed to all repos (agent, cli, community, core)
- All GitHub repos → private (soma-agent, cli, community, core)
- npm: 6/7 versions unpublished, v0.1.0 deprecated
- Beta signup: Vercel serverless API → GitHub Issue via soma-agent[bot]
- beta-testers GitHub team created (read access to soma-agent)
- esbuild obfuscation pipeline — `scripts/build-dist.mjs` compiles 7 extensions + core to 140KB minified+mangled JS (#ef86ff5)
- Distribution verification — `scripts/verify-dist.mjs` with 23 checks (#8962681)
- `npm run build:dist` — clean + compile + verify in one command
- Protocols ship as readable .md in `dist/content/`

### Thin CLI (repos/cli)
- Thin CLI wrapper — 37KB total, zero dependencies, pure Node built-ins
- Personality engine (`personality.js`) — 12 skeleton intents, 46 variants, 9 spintax topics, 14 paragraph templates
- Interactive Q&A — press `?` to ask about 9 topics with keyword matching (50+ triggers)
- Typing animation — `typeOut()` with punctuation pauses, random jitter, ANSI-aware
- `soma init` — GitHub CLI auth: `gh` → team membership (with repo access fallback) → clone dev → npm install
- `soma doctor` — 11 health checks with personality engine summary
- `soma update` — npm CLI + core git versions (fetch-first)
- `soma status` — version, home, install state, beta access, core branch@hash
- `soma about` — full explainer with generated pitch footer
- No-compaction topic — key differentiator messaging
- Daily rotating concepts (8 topics) on welcome screen
- Beta access cached with 1-hour TTL
- Delegation: `PI_CODING_AGENT_DIR` env var → Pi discovers Soma extensions (#8598c56)
- Smart command detection — post-install commands show "requires runtime"
- `PI_PACKAGE_DIR` delegation — thin-cli.js resolves piConfig from soma-beta package.json, all project paths → `.soma/` (#5c9ba4d)
- `SOMA_CODING_AGENT_DIR` — both PI_ and SOMA_ env vars set for delegation regardless of piConfig load order (#f5818a6)
- User extension discovery — `.soma/extensions/` passed via `-e` flags to Pi runtime
- soma-beta v0.6.0-rc.6 — self-contained: thin-cli + personality + extensions + core + themes + export-html + protocols (680KB)
- `soma-release.sh` — reads Pi dep versions dynamically from agent package.json, bundles thin-cli.js + personality.js, piConfig verification gate

### Testing
- `soma-sandbox.sh` — 30 automated E2E tests: branding (5), paths (3), infra (7), bundled CLI (5), models (3), identity (1), path resolution (3), tools (3), extensions (1), features (2)
- `soma-seam.sh audit upstream` — cross-references upstream Pi changes against our imports, flags breaking changes, maps API usage frequency
- Test suite overhaul — 7/13 suites execute real TypeScript via tsx (487+ total assertions)
- `test-settings.sh` — 21 executed tests: defaults, cascade, malformed JSON, path resolution (#c13a7d3)
- `test-identity.sh` — 13 executed tests: hasIdentity, loadIdentity, buildLayeredIdentity (#c13a7d3)
- `test-preload.sh` — 15 executed tests: findPreload, hasPreload, filenames, instructions (#c13a7d3)
- `test-protocols.sh` — +11 executed: detectProjectSignals, protocolMatchesSignals (#5dcc324)
- `test-utils.sh` — 26 executed: every exported function tested (#5dcc324)
- `test-muscles.sh` — enforces triggers, applies-to, frontmatter integrity (#db5c5a4)

### AMPS Hygiene
- 33 muscles patched — all active muscles have `triggers:` and `applies-to:`
- 2 corrupted frontmatter fixes + 31 YAML merge artifacts fixed
- e2e-flow-testing muscle — test in isolation pattern
- Visual gap analysis MAP expanded (9 steps, 7 patterns, E2E test phase)
- 5 MAPs updated with test quality info
- release-cycle MAP: +Phase 5 (changelog sync) +Phase 6 (E2E verification)

### Internal
- Pi constraints documented — discovery.ts untestable outside Pi runtime, piConfig package-scoped, no programmatic extension registration, APP_NAME defaults to "pi"
- Ignore per-worktree `.pi/` and `.soma/settings.json` in git (#d6778a2)

---

## [0.5.2] — 2026-03-15

### Added
- **rewrite DNA.md — self-awareness, owner's manual, link to docs for deep reference**
- **/inhale guard + stale warning, slash command usage hints**
- **prompt before auto-init + parent inheritance (SX-164, SX-165, SX-241)**
- **show command provenance in /soma status (SX-233)**
- **track cli.js as source in agent repo (SX-252)**
- **settings-driven heat overrides — per-project AMPS control**
- **inherit.automations — separate from tools inheritance**
- **statusline preload indicator + smart /exhale (edit vs write)**
- **auto-archive stale preloads after exhale + archiveStalePreloads()**
- `/scan-logs` command — search previous tool calls + results across sessions (#31a7e17)
- `/scrape` command + `scrape:build` router capability — intelligent doc discovery (#c950f2b)
- Boot session warnings injection — tool usage stats from previous session (#0cda314)
- Boot last conversation context — inject last N messages on fresh boot (#f1d7f3d)
- Periodic auto-commit for crash resilience (#c6caccc)
- `graceTurns` setting — configurable grace period before auto-breathe rotation (#c9ab5a8)
- Guard v2: tool→muscle gating — require reading muscles before dangerous commands (#1c6b725)
- Protocol TL;DR extraction — `protocolSummary()` prefers `## TL;DR` body section (#83ec9ee)
- Scratch lifecycle: session IDs, date sections, note management, auto-inject (#fd0bda2, #0d364f2)
- Combined session ID format (`sNN-<hex>`) — sequential for order, hex for uniqueness (#e7c4057)
- Statusline session ID display (#d474cbf)
- Polyglot script discovery — .sh, .py, .ts, .js, .mjs (#1acb8c2)
- Session log nudge with template at trigger point (#eb8acc8)
- Identity layer in pattern-evolution, tool-awareness in working-style (#5e4219d)
- Post-commit auto-changelog + pre-push docs-drift nudge hooks (#cc2ef55)

### Changed
- System prompt trimmed ~19% — remove duplication and stale content (#de9c517)
- Self-awareness protocols rewritten — 5 redundant protocols → configuration guides (#b70ca44)
- Config-first script extensions via `settings.scripts.extensions` (#dadb78e)
- Unified rotation through `/inhale`, removed `/auto-continue` (#7b7ba52)
- Migrated `globalThis.__somaKeepalive` to router (#e919481)

### Fixed
- **help header shows 'CLI v...' not bare version**
- **help rewrite, script theme crash, focus session, postinstall, docs**
- **restore walk-up, keep .soma-only + runtime-home skip**
- **findSomaDir checks current dir only, no walk-up**
- **only .soma/ is a valid soma root, not .claude/ or .cursor/**
- **skip global runtime home in findSomaDir walk-up**
- **defensive settings.heat access + stale test mocks — 567/567 pass**
- **5 UX gaps — smart warnings, resume awareness, write heuristic**
- Boot: clean up muscle/protocol/automation formatting (#38a643f)
- Boot: resume without fingerprint sends minimal boot, not full redundant injection (#7fd064b)
- Boot: grace countdown skips tool turns during auto-breathe (#53bd421)
- Boot: preload filename overwrites + rotation when preload pre-exists (#378a1b1)
- Boot: auto-init `.soma/.git` when autoCommit is true (#276f6f2)
- Boot: clear restart signal at factory load time (#0bddce2, #bb8350c)
- Muscles/automations: filter archived status + README in discovery (#5f5ccae, #e42da9b)
- Protocols: clean stale references, fix broken frontmatter (#7087d6a)
- Protocols: correct attribution — Curtis Mercier only on personal/protocols-derived (#5d8fb83)
- Heat: dynamic muscle read + script execution detection (#99a7663)
- Extensions: soma-route.ts import path — use pi-coding-agent not claude-code (#49454ea)
- Scripts: stop shipping dev-only scripts to users (#2c8db4a)
- Scripts: sync paths after _dev/ move, AGENT_DIR resolution (#46615ef, #a520c13)
- Statusline: restart detection, fs/path imports, signal path fixes (#f845894, #926fd4a, #18eba69)
- Auto-breathe: reduce triple notifications, preload-as-signal rotation (#927bd74)

---

## [0.5.1] — 2026-03-14

### Added
- **rewrite DNA.md — self-awareness, owner's manual, link to docs for deep reference**
- **/inhale guard + stale warning, slash command usage hints**
- **prompt before auto-init + parent inheritance (SX-164, SX-165, SX-241)**
- **show command provenance in /soma status (SX-233)**
- **track cli.js as source in agent repo (SX-252)**
- **settings-driven heat overrides — per-project AMPS control**
- **inherit.automations — separate from tools inheritance**
- **statusline preload indicator + smart /exhale (edit vs write)**
- **auto-archive stale preloads after exhale + archiveStalePreloads()**

- Capability router for inter-extension communication (`soma-route.ts`) — provides/gets capabilities, emits/listens signals. Replaces `globalThis` hacks (#94576f3, #e919481)
- CLI-based session rotation via `.rotate-signal` file — auto-breathe can now rotate without command context (#2da3155)
- Per-session log files with auto-incrementing names (`YYYY-MM-DD-sNN.md`) — prevents overwrites across rotations (#d776dd6)
- Session log and preload paths surfaced in boot message (#d934799)
- Resume boot diffing — `soma -c` skips redundant preload injection (#de39fd1)
- Restart-required detection — signal file, cmux notification, and statusline indicator when core/extension files change (#9f2a103, #f845894, #926fd4a, #18eba69)
- `soma-changelog.sh` — generate categorized changelog entries from conventional commits with `[cl:tag]` consolidation
- `soma-changelog-json.sh` — parse CHANGELOG.md into JSON for website consumption
- ChangelogIsland.tsx + RoadmapTimeline.tsx — Preact islands for `/changelog/` and `/roadmap/` pages
- `soma-threads.sh` — chain-of-thought tracing tool for blog seeds across session logs
- `soma-verify.sh self-analysis` — muscle health, cross-location divergence, orphan detection
- Protocol TL;DR extraction — `protocolSummary()` prefers `## TL;DR` body section over breadcrumb (#83ec9ee)
- Combined session ID format (`sNN-<hex>`) — sequential for human scanning, hex for collision safety (#e7c4057, #618cd9f)
- `commit-msg` git hook — validates conventional commit format + `[cl:tag]` syntax
- `guard.toolGates` setting — require reading muscles before dangerous bash commands (#1c6b725)
- `breathe.graceTurns` setting — configurable auto-breathe grace period, replaces hardcoded 6-turn limit (#c9ab5a8)
- Session log nudge with template at breathe trigger point (#eb8acc8)
- Periodic auto-commit every 5th turn for crash resilience (#c6caccc)
- Scratch note lifecycle — session IDs, date sections, active/done/parked status, router capabilities, auto-inject (#0d364f2)
- Statusline shows session ID on line 2 (#d474cbf)
- Polyglot script discovery — `.sh`, `.py`, `.ts`, `.js`, `.mjs` (#1acb8c2)

### Changed

- Auto-breathe rotation now writes `.rotate-signal` and calls `ctx.shutdown()` immediately when preload already exists — no more waiting for `turn_end` that may not fire (#378a1b1)
- Preload filenames use `sNN` iterating pattern (was static session ID suffix) to prevent overwrites within a session (#378a1b1)
- Self-awareness protocols consolidated — 5 redundant protocols became configuration guides (#b70ca44)
- `/scratch` extracted to standalone `soma-scratch.ts` extension (#932f446)
- Shared helpers extracted to `utils.ts` — deduplication across core modules (#2dbea9a, #3d8467e)
- Unified rotation through `/inhale`, removed `/auto-continue` (#7b7ba52)
- Changelog pipeline switched to Ghostty-style commit-driven entries (#ec27a11)
- `pattern-evolution` protocol updated with identity maturation layer; `working-style` with tool-awareness (#5e4219d)
- Dev hooks generated locally by `soma-dev.sh`, not committed to repo (#efc6ed4)

### Fixed
- **help header shows 'CLI v...' not bare version**
- **help rewrite, script theme crash, focus session, postinstall, docs**
- **restore walk-up, keep .soma-only + runtime-home skip**
- **findSomaDir checks current dir only, no walk-up**
- **only .soma/ is a valid soma root, not .claude/ or .cursor/**
- **skip global runtime home in findSomaDir walk-up**
- **defensive settings.heat access + stale test mocks — 567/567 pass**
- **5 UX gaps — smart warnings, resume awareness, write heuristic**

- Muscle and automation discovery — filter archived status and README files (#e42da9b, #5f5ccae)
- Scratch completions — remove PRO commands from free completions list (#fd0bda2)
- Auto-breathe race condition — `sendUserMessage` from `before_agent_start` raced with Pi's prompt processing, now deferred to `agent_end` via pending message queue (#2823ee9, #927bd74)
- Auto-breathe phase 1 ignored by agent — wrap-up trigger now sends a followUp user message, not just system prompt + UI toast (#9d09dd5)
- Auto-breathe triple notification spam reduced (#927bd74)
- Session management — `/inhale` reset, heat dedup on rotation (#044fb2c)
- Dev-only scripts no longer shipped to users (#2c8db4a)
- Restart signal cleared at factory load time, not `session_start` (#0bddce2)
- Dynamic muscle read and script execution detection for heat tracking (#99a7663)
- `soma-route.ts` import path — uses `@mariozechner/pi-coding-agent`, not `@anthropic-ai/claude-code` (#49454ea)
- Internal protocols (`content-triage`, `community-safe`) removed from bundled set (#3ad0884)
- Auto-init `.soma/.git` when `autoCommit` is true (#276f6f2)
- Missing TL;DRs on 4 self-awareness protocols (#c457752)
- `sync-to-cli` path after `_dev/` directory move (#46615ef)
- Grace countdown skips tool turns during auto-breathe — tool-call turns no longer count toward 6-turn limit (#53bd421)
- Resume without fingerprint sends minimal boot instead of full redundant injection — saves ~4-6k tokens (#7fd064b)
- Preload overwrite guard + auto-breathe rotation fix when preload pre-exists (#378a1b1)
- All doc paths updated to `amps/` layout — `.soma/amps/protocols/`, `.soma/amps/muscles/`, etc. (#420f19b)
- Memory layout docs rewritten — core structure is amps/, memory/, projects/, skills/ (#b35c2be)

---

## [0.5.0] — 2026-03-12

### Added
- **rewrite DNA.md — self-awareness, owner's manual, link to docs for deep reference**
- **/inhale guard + stale warning, slash command usage hints**
- **prompt before auto-init + parent inheritance (SX-164, SX-165, SX-241)**
- **show command provenance in /soma status (SX-233)**
- **track cli.js as source in agent repo (SX-252)**
- **settings-driven heat overrides — per-project AMPS control**
- **inherit.automations — separate from tools inheritance**
- **statusline preload indicator + smart /exhale (edit vs write)**
- **auto-archive stale preloads after exhale + archiveStalePreloads()**

- Auto-breathe mode — proactive context management that triggers wrap-up at configurable %, auto-rotates at higher %. Safety net at 85% always on. Opt-in via `breathe.auto` in settings (#1d533bf)
- `/auto-breathe` command — runtime toggle (`on|off|status`), persists to settings.json
- Smarter `/breathe` — context-aware instructions (light/full/urgent), handles preload-already-written and timeout edge cases
- Cold-start muscle boost — muscles created <48h get +3 effective heat for at least 2 sessions
- Orient-from preloads — preload template includes `## Orient From` pointing to files next session should read first
- `soma:recall` event signal — extensions can listen for context pressure events (steno integration)
- `/auto-commit` command — toggle `.soma/` auto-commit on exhale/breathe (`on|off|status`)
- Auto-commit `.soma/` state — changes committed to local git on every exhale/breathe via `checkpoints.soma.autoCommit`
- `/pin` and `/kill` invalidate prompt cache — heat changes take effect next turn, not next session
- `/soma prompt` diagnostic — shows compiled sections, identity status, heat levels, context %, runtime state
- `sync-to-cli.sh` and `sync-to-website.sh` — one-command repo sync scripts
- `soma-compat.sh` — detect protocol/muscle overlap, redundancy, directive conflicts
- `soma-update-check.sh` — compare local protocol/muscle versions against hub
- `/scratch` command — quick notes to `.soma/scratchpad.md`, append-only, agent doesn't see unless `/scratch read`
- `guard.bashCommands` setting — `allow`/`warn`/`block` for dangerous bash command prompts
- Automations system — `.soma/automations/` for step-by-step procedural flows
- Polyglot script discovery — boot discovers `.sh`, `.py`, `.ts`, `.js`, `.mjs` scripts with auto-extracted descriptions
- `soma init --orphan` — `--orphan`/`-o` flag for clean child projects with zero parent inheritance
- Git hooks: `post-commit` auto-changelog + `pre-push` docs-drift nudge
- Bundled protocols: `correction-capture` + `detection-triggers` — learning-agent protocols

### Changed

- Config-first script extensions — `settings.scripts.extensions` controls which file types are discovered
- Command cleanup — removed `/flush`, folded `/preload` into `/soma preload` and `/debug` into `/soma debug`
- CI improvements — PR check and release workflows now run all test suites

### Fixed
- **help header shows 'CLI v...' not bare version**
- **help rewrite, script theme crash, focus session, postinstall, docs**
- **restore walk-up, keep .soma-only + runtime-home skip**
- **findSomaDir checks current dir only, no walk-up**
- **only .soma/ is a valid soma root, not .claude/ or .cursor/**
- **skip global runtime home in findSomaDir walk-up**
- **defensive settings.heat access + stale test mocks — 567/567 pass**
- **5 UX gaps — smart warnings, resume awareness, write heuristic**

- System prompt dropped after turn 1 — Pi resets each `before_agent_start`, now caches compiled prompt
- Identity never in compiled prompt — `isPiDefaultPrompt()` checked wrong string
- Context warnings never fired — `getContextUsage()` returns undefined on turn 1, handled gracefully
- Identity lost after `/auto-continue` or `/breathe` — `session_switch` now rebuilds from chain
- Guard false positive on `2>/dev/null` — stderr redirects no longer trigger write warnings
- Bash guard false positive on `>>` — append redirects no longer trigger dangerous redirect guard
- Preload auto-injected on continue/resume — `soma -c` and `soma -r` no longer inject stale preloads
- `/soma prompt` crash — `getProtocolHeat` import missing
- Audit false positives — all 11 audit scripts improved across the board

---

## [0.4.0] — 2026-03-11

### Added
- **rewrite DNA.md — self-awareness, owner's manual, link to docs for deep reference**
- **/inhale guard + stale warning, slash command usage hints**
- **prompt before auto-init + parent inheritance (SX-164, SX-165, SX-241)**
- **show command provenance in /soma status (SX-233)**
- **track cli.js as source in agent repo (SX-252)**
- **settings-driven heat overrides — per-project AMPS control**
- **inherit.automations — separate from tools inheritance**
- **statusline preload indicator + smart /exhale (edit vs write)**
- **auto-archive stale preloads after exhale + archiveStalePreloads()**

- Compiled system prompt ("Frontal Cortex") — `core/prompt.ts` assembles complete system prompt from identity chain, protocol summaries, muscle digests, dynamic tool section
- Session-scoped preloads — `preload-<sessionId>.md` prevents multi-terminal conflicts
- Identity in system prompt — moved from boot user message for better token caching
- Parent-child inheritance — `inherit: { identity, protocols, muscles, tools }` in settings
- Persona support — `persona: { name, emoji, icon }` for named agent instances
- Smart init — `detectProjectContext()` scans for parent `.soma/`, `CLAUDE.md`, project signals
- `systemPrompt` settings — toggle docs, guard, CLAUDE.md awareness in system prompt assembly
- `prompts/system-core.md` — static behavioral DNA skeleton
- Debug mode — `.soma/debug/` logging, `/soma debug on|off`
- Protocol graduation — heat decay floor, frontmatter enforcement, preload quality validation
- Configurable boot sequence — `settings.boot.steps` array
- Git context on boot — `git-context` step injects recent commits and changed files
- Configurable context warnings — `settings.context` thresholds

### Changed

- Extension ownership refactor — `soma-boot.ts` owns lifecycle + commands, `soma-statusline.ts` owns rendering + keepalive
- Boot user message trimmed — identity, protocol breadcrumbs, and muscle digests moved to system prompt
- CLAUDE.md awareness, not adoption — system prompt notes existence but doesn't inject content

### Fixed
- **help header shows 'CLI v...' not bare version**
- **help rewrite, script theme crash, focus session, postinstall, docs**
- **restore walk-up, keep .soma-only + runtime-home skip**
- **findSomaDir checks current dir only, no walk-up**
- **only .soma/ is a valid soma root, not .claude/ or .cursor/**
- **skip global runtime home in findSomaDir walk-up**
- **defensive settings.heat access + stale test mocks — 567/567 pass**
- **5 UX gaps — smart warnings, resume awareness, write heuristic**

- Print-mode race condition — `ctx.hasUI` guard on `sendUserMessage` in `session_start`
- Skip scaffolding core extensions into project `.soma/extensions/`
- Template placeholder substitution on install

---

## [0.3.0] — 2026-03-10

### Added
- **rewrite DNA.md — self-awareness, owner's manual, link to docs for deep reference**
- **/inhale guard + stale warning, slash command usage hints**
- **prompt before auto-init + parent inheritance (SX-164, SX-165, SX-241)**
- **show command provenance in /soma status (SX-233)**
- **track cli.js as source in agent repo (SX-252)**
- **settings-driven heat overrides — per-project AMPS control**
- **inherit.automations — separate from tools inheritance**
- **statusline preload indicator + smart /exhale (edit vs write)**
- **auto-archive stale preloads after exhale + archiveStalePreloads()**

- AMPS content type system — 4 shareable types: Automations, Muscles, Protocols, Skills. `scope` field controls distribution
- Hub commands — `/install <type> <name>`, `/list local|remote` with dependency resolution
- `core/content-cli.ts` — non-interactive content commands for CLI wiring
- `core/install.ts` — hub content installation with dependency resolution
- `core/prompt.ts` — compiled system prompt assembly (12th core module)
- `soma-guard.ts` extension — safe file operation enforcement with `/guard-status` command
- `soma-audit.sh` — ecosystem health check orchestrating 11 focused audits
- `/rest` command — disable cache keepalive + exhale
- `/keepalive` command — toggle cache keepalive on/off/status
- Cache keepalive system — 300s TTL, 45s threshold, 30s cooldown
- Session checkpoints — `.soma/` committed every exhale (local git)
- 10 test suites with 255 passing tests
- Workspace scripts — `soma-scan.sh`, `soma-search.sh`, `soma-snapshot.sh`, `soma-tldr.sh`

### Changed

- Bundled protocols slimmed from all to 4 core (breath-cycle, heat-tracking, session-checkpoints, pattern-evolution)

### Fixed
- **help header shows 'CLI v...' not bare version**
- **help rewrite, script theme crash, focus session, postinstall, docs**
- **restore walk-up, keep .soma-only + runtime-home skip**
- **findSomaDir checks current dir only, no walk-up**
- **only .soma/ is a valid soma root, not .claude/ or .cursor/**
- **skip global runtime home in findSomaDir walk-up**
- **defensive settings.heat access + stale test mocks — 567/567 pass**
- **5 UX gaps — smart warnings, resume awareness, write heuristic**

- PII scrubbed from git history across all repos
- CLI stripped to distribution only — agent is source of truth

---

## [0.2.0] — 2026-03-09

### Added
- **rewrite DNA.md — self-awareness, owner's manual, link to docs for deep reference**
- **/inhale guard + stale warning, slash command usage hints**
- **prompt before auto-init + parent inheritance (SX-164, SX-165, SX-241)**
- **show command provenance in /soma status (SX-233)**
- **track cli.js as source in agent repo (SX-252)**
- **settings-driven heat overrides — per-project AMPS control**
- **inherit.automations — separate from tools inheritance**
- **statusline preload indicator + smart /exhale (edit vs write)**
- **auto-archive stale preloads after exhale + archiveStalePreloads()**

- Protocols and Heat System — behavioral rules loaded by temperature, heat rises through use, decays through neglect
- Muscle loading at boot — sorted by heat, loaded within configurable token budget
- Settings chain — `settings.json` with resolution: project → parent → global
- Mid-session heat tracking — auto-detects protocol usage from tool results
- Domain scoping — `applies-to` frontmatter + `detectProjectSignals()`
- Breath cycle commands — `/exhale`, `/inhale`, `/pin`, `/kill`
- Script awareness — boot surfaces `.soma/scripts/` inventory
- 9 core modules — discovery, identity, protocols, muscles, settings, init, preload, utils, index

### Fixed
- **help header shows 'CLI v...' not bare version**
- **help rewrite, script theme crash, focus session, postinstall, docs**
- **restore walk-up, keep .soma-only + runtime-home skip**
- **findSomaDir checks current dir only, no walk-up**
- **only .soma/ is a valid soma root, not .claude/ or .cursor/**
- **skip global runtime home in findSomaDir walk-up**
- **defensive settings.heat access + stale test mocks — 567/567 pass**
- **5 UX gaps — smart warnings, resume awareness, write heuristic**

- Extensions load correctly
- Skills install to correct path

---

## [0.1.0] — 2026-03-08

### Born

- σῶμα (sōma) — *Greek for "body."* The vessel that grows around you.
- Built on Pi with `piConfig.configDir: ".soma"`
- Identity system: `.soma/identity.md` — discovered, not configured
- Memory structure: `.soma/memory/` — muscles, sessions, preloads
- Breath cycle concept: sessions exhale what was learned, next session inhales it
- 9 core modules, 4 extensions, logo through 36 SVG iterations
