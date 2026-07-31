---
type: template
name: boot
status: active
soma_template_version: 0.42.1
description: Boot followUp message — what the agent sees on session start. Customize this to change the fresh boot experience. System prompt (_mind.md) already carries protocols, muscles, scripts, identity — this template only needs novel per-session content.
---
{{soma_changes}}

{{git_context}}

{{inbox_summary}}

{{preload}}
{{#last_session_ref}}
Last session log on disk: `{{last_session_ref}}`.
{{/last_session_ref}}
{{#last_mlx_ref}}
Last reflection on disk: `{{last_mlx_ref}}`.
{{/last_mlx_ref}}

{{greeting}}

Session ID: `{{session_id}}`
{{session_files}}
