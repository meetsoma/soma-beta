---
type: template
name: mind
description: >
  System prompt structure. Rearrange sections, add your own text,
  remove what you don't need. Missing variable = section disappears.
created: 2026-03-23
updated: 2026-04-12
---
{{core_rules}}

# Identity
{{soul}}

{{#body}}
## Where I Am
{{body}}
{{/body}}

{{#voice}}
## Voice
{{voice}}
{{/voice}}

{{inbox_summary}}

## How to Behave
{{protocol_summaries}}

## What I've Learned
{{muscle_digests}}

{{scripts_table}}

## My Tools
{{tools_section}}

{{guard_section}}

{{docs_section}}

{{context_awareness}}

{{skills_block}}

{{date_time_cwd}}
