---
type: tool-config
name: tools
status: active
created: 2026-04-19
updated: 2026-04-19
description: >
  Tool registry configuration for this Soma instance. Enable/disable bundled
  Soma tools and override their prompt guidance. Custom markdown-defined
  tools (v0.20.3+ scope) also live here.

  See `docs/tools.md` for the full spec. Body chain walk-up applies: project
  → parent → global, child wins on collision.
---

# Tools

Source of truth for which Soma tools load into the system prompt and how
their guidance reads. Three sections:

- **Disabled** — bullet list of tool names to skip entirely. Unlisted tools
  default to enabled, so new bundled tools in future versions auto-enable
  without requiring edits here. Hardwired tools (`delegate`) cannot be
  disabled — a warning is emitted and the disable is ignored.

- **Overrides** — per-tool tweaks to `description`, `promptSnippet`,
  `promptGuidelines`, `executionMode`. Remove a block to revert that tool
  to its extension-defined defaults.

- **Custom** — markdown-defined tools (shell-backed execute). Parsed in
  v0.20.2.1 but not yet registered — v0.20.3+ scope once the security
  model (param escaping, timeout enforcement, allow/deny flag) lands.

## Disabled

<!-- None disabled. Uncomment a line to opt out of a bundled tool. -->
<!-- - context_status   # I estimate context fine without the tool -->

## Overrides

<!-- No overrides. Add a `### <tool_name>` block to tweak any of the four
     fields. Examples below (commented out).

### search
**promptSnippet:** Prefer search() over bash rg — project convention.
**promptGuidelines:**
- Default scope is 'os' (ripgrep). Set scope='api' for web.
- For large result sets, narrow with max_results before raising scope.

### code_find
**promptSnippet:** code_find — local grep with file:line, respects .gitignore.
-->

## Custom

<!-- Custom tools defined in markdown. Not yet registered (v0.20.3+ scope).
     Format preview:

### weather
**description:** Get weather for a location.
**promptSnippet:** Use weather for local conditions.
**promptGuidelines:**
- Location accepts city name, airport code, or lat/lon.
**parameters:**
- `location` (string, required) — city or code
**execute:** `curl -s "wttr.in/{{location}}?format=3"`
**timeout:** 5s
**executionMode:** parallel
-->
