# body/

Default body files that ship with Soma. Copied to `.soma/body/` on `soma init`
or used as built-in fallbacks.

## Convention

- **`_` prefix = template** — defines structure with `{{variables}}`
- **No prefix = content** — loaded as-is into a `{{filename}}` variable
- **All variables work in all templates** — no scoping

## Files

| File | Type | What it does |
|------|------|-------------|
| `soul.md` | Content → `{{soul}}` | Default identity — who the agent is |
| `journal.md` | Content → `{{journal}}` | Agent's observations and reflections |
| `pulse.md` | Content → `{{pulse}}` | Heartbeat tasks |
| `_mind.md` | Template | System prompt structure |
| `_memory.md` | Template | Preload format (exhale output) |
| `_body.md` | Template | Guidance for writing/updating `soul.md` |

## Variables

Any `{{variable}}` works in any template. Modifiers slice content:
`{{journal|tldr}}`, `{{preload|section:Resume Point}}`, `{{soul|lines:10}}`.

Add your own: `my-rules.md` → `{{my_rules}}`. Use it in `_mind.md`:
```markdown
{{core_rules}}
{{soul}}
{{my_rules}}
{{protocol_summaries}}
```

Full variable reference: see `.soma/body/DNA.md` after init.
