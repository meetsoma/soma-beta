---
type: template
name: mind
description: >
  System prompt structure — rearrange, add text, remove sections.
  Variables resolve from body/ content files and boot discovery.
  {{soul}} from soul.md, {{voice}} from voice.md, {{body}} from body.md.
  Section vars (protocol_summaries, tools_section, etc.) filled at boot.
created: 2026-03-23
---
{{core_rules}}

# Identity
{{soul}}

{{#body}}
{{body}}
{{/body}}

{{voice}}

{{protocol_summaries}}

{{muscle_digests}}

{{tools_section}}

{{guard_section}}

{{docs_section}}

{{context_awareness}}

{{skills_block}}

{{date_time_cwd}}
