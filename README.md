<div align="center">

<br>

### σ Soma

*Memory isn't retrieval. Memory is change.*

<br>

```bash
npm install -g meetsoma
soma
```

<br>

[Docs](https://soma.gravicity.ai/docs) · [Blog](https://soma.gravicity.ai/blog) · [Hub](https://soma.gravicity.ai/hub) · [Source](https://soma.gravicity.ai/beta)

</div>

---

An AI coding agent that grows with you. Identity, protocols, and muscle memory — all evolving through use, not configuration.

Most agents forget everything between sessions. Soma doesn't.

## Install

```bash
npm install -g meetsoma
```

This installs the Soma CLI — a thin bootstrap layer. On first run, it downloads the full agent runtime (~50MB) from GitHub.

### What Happens

```
npm install -g meetsoma     ← installs CLI only (~50KB)
soma                        ← first run: downloads agent runtime
soma                        ← every run after: starts a session
```

**Requirements:** Node.js ≥ 20, git, an API key (Anthropic, Google, OpenAI, or [OpenRouter free tier](https://openrouter.ai)).

## First Run

```bash
cd your-project
soma
```

Soma detects your project (language, framework, package manager, monorepo signals), creates `.soma/`, and writes its own identity. By session two, it remembers.

## Commands

### CLI (from your shell)

```bash
soma                         # fresh session
soma inhale                  # resume from last session's preload
soma -c                      # continue last session (full history)
soma -r                      # pick a session to resume
soma focus <keyword>         # prime for a topic
soma map <name>              # boot with a workflow MAP

soma doctor                  # project health + migration check
soma status                  # infrastructure health check
soma --version               # show agent + CLI versions
soma --help                  # full command reference
soma --help scripts          # list installed scripts
soma --help commands         # all CLI + TUI commands
```

### Session (inside the TUI)

```
/exhale          save state + write preload for next session
/breathe         save + rotate into fresh session
/inhale          check preload status
/rest            disable keepalive + exhale
/pin <name>      keep a muscle/protocol hot
/kill <name>     drop to cold
/hub install     install from the community hub
/soma doctor     run migration analysis
```

## Two Versions

Soma has two independently-versioned layers:

```
σ  Soma v0.9.0       ← agent version (the runtime — features, protocols, templates)
   CLI v0.2.0        ← CLI version (this npm package — install flow, delegation)
```

The **agent version** is what matters for features. The **CLI version** is the bootstrap.

### Updating

```bash
soma init                    # update the agent runtime
npm install -g meetsoma      # update the CLI (rare)
soma doctor                  # check if project .soma/ needs migration
```

## The Five Ideas

**Identity** — a self-written file. It knows your project, your patterns, your stack.

**Protocols** — behavioral rules. "Read before write." Hot ones load. Cold ones fade.

**Muscles** — learned patterns. Correct it twice → permanent learning.

**Breath** — inhale, work, exhale. No compaction. Full context every session.

**Heat** — attention management. Used things stay. Unused things cool.

## How It Works

```
~/.soma/agent/              ← global runtime (git clone, updated via soma init)
your-project/.soma/         ← per-project memory (identity, protocols, sessions)
```

The CLI delegates to the runtime. The runtime loads your project's `.soma/`, resolves the identity chain (project → parent → global), and boots the agent with your accumulated context.

On boot, Soma silently adds any missing settings or protocols from newer versions (Tier 1 auto-fix). Bigger migrations are handled by `/soma doctor` inside the TUI.

---

<div align="center">

<sub>BSL 1.1 © Curtis Mercier — open source 2027</sub>

</div>
