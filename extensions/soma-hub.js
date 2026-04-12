/**
 * Soma Agent — © 2026 Curtis Mercier
 * Licensed under BSL 1.1 (Business Source License)
 *
 * You may view, use personally, and contribute to this software.
 * You may NOT use it for competing commercial products or services.
 * Converts to MIT license on 2027-09-18.
 *
 * Full license: https://github.com/meetsoma/soma-beta/blob/main/LICENSE
 * Source available to contributors: https://soma.gravicity.ai/beta
 * Contact for commercial licensing: meetsoma@gravicity.ai
 */

import{existsSync as A,readFileSync as L,writeFileSync as I,mkdirSync as D,chmodSync as H}from"fs";import{join as p,basename as q}from"path";import{execSync as w}from"child_process";import{installItem as N,listLocal as M}from"../core/index.js";var U="meetsoma/community",F="main",O=`https://raw.githubusercontent.com/${U}/${F}`,P=`${O}/hub-index.json`,S=["protocol","muscle","skill","template","script","automation"];function C(h){return{protocol:"protocols",muscle:"muscles",skill:"skills",template:"templates",script:"scripts",automation:"automations"}[h]||h+"s"}function B(){return globalThis.e??null}function Y(){return B()?.get("soma:dir")?.()??null}function G(h,g){let e=p(process.env.HOME||"",".soma");return g?h.path===e?{error:"No project .soma/ found. -p requires a project-level .soma/ \u2014 run /soma init first, or use -g for global."}:{target:h,location:"project"}:A(e)?{target:{path:e,projectDir:process.env.HOME||""},location:"global"}:{target:h,location:"project"}}function V(){try{return w("gh auth status",{encoding:"utf-8",stdio:"pipe"}),{ok:!0,username:w("gh api user --jq '.login'",{encoding:"utf-8",stdio:"pipe"}).trim()}}catch{try{return w("which gh",{encoding:"utf-8",stdio:"pipe"}),{ok:!1,error:"gh CLI found but not authenticated. Run: gh auth login"}}catch{return{ok:!1,error:"gh CLI not installed. Install: brew install gh"}}}}function z(h){let g=h.match(/^# ---\n([\s\S]*?)\n# ---/m);if(!g)return{};let e={};for(let a of g[1].split(`
`)){let m=a.match(/^# (\w[\w-]*)\s*:\s*(.+)$/);m&&(e[m[1]]=m[2].trim())}return e}function Q(h){let g=h.match(/^---\n([\s\S]*?)\n---/);if(!g)return{};let e={};for(let a of g[1].split(`
`)){let m=a.match(/^(\w[\w-]*)\s*:\s*(.+)$/);m&&(e[m[1]]=m[2].trim())}return e}function Z(h){h.registerCommand("hub",{description:"Community hub. Usage: /hub [install|fork|share|find|list|status] <name> [-g|-p]",getArgumentCompletions:g=>["install","fork","share","list","status",...S].filter(e=>e.startsWith(g)).map(e=>({value:e,label:e})),handler:async(g,e)=>{let a=Y();if(!a){e.ui.notify("No .soma/ found. Run /soma init first.","error");return}let m=g.trim().split(/\s+/),k=m[0]||"status",l=m.slice(1);switch(k){case"install":case"i":{let d=l.includes("--force"),t=l.includes("-g"),n=l.includes("-p"),r=l.filter(i=>!i.startsWith("-"));if(r.length<2){e.ui.notify(`Usage: /hub install <type> <name> [-g|-p] [--force]
Types: ${S.join(", ")}
  -g  Install globally (~/.soma/) \u2014 default
  -p  Install to project .soma/`,"info");return}let o=r[0]==="map"?"automation":r[0],c=r[1];if(!S.includes(o)){e.ui.notify(`\u274C Unknown type "${o}"

Valid types: ${S.join(", ")}
Example: /hub install protocol my-protocol`,"error");return}let u=G(a,n);if("error"in u){e.ui.notify(`\u274C ${u.error}`,"error");return}e.ui.notify(`\u{1F4E6} Installing ${o}: ${c} (${u.location})...`,"info");try{let i=await N(u.target,o,c,{force:d});if(i.success){let y=[`\u2705 Installed ${o}: ${c} (${u.location})`];if(i.path&&y.push(`   \u2192 ${i.path}`),i.dependencies?.length){y.push("   Dependencies:");for(let $ of i.dependencies){let R=$.success?"\u2713":$.error?.includes("Already exists")?"\xB7":"\u2717";y.push(`     ${R} ${$.type}: ${$.name}${$.error?` (${$.error})`:""}`)}}e.ui.notify(y.join(`
`),"info"),o==="protocol"||o==="muscle"?e.ui.notify("\u{1F4A1} New content loads on next boot (or /breathe to rotate)","info"):o==="script"&&e.ui.notify(`\u{1F4A1} Script ready: bash ${i.path}`,"info")}else e.ui.notify(`\u274C ${i.error||"Install failed"}`,"error")}catch(i){e.ui.notify(`\u274C Install error: ${i.message}`,"error")}break}case"fork":case"f":{let d=l.filter(r=>!r.startsWith("-"));if(d.length<2){e.ui.notify(`Usage: /hub fork <type> <name>
Types: ${S.join(", ")}

Downloads content and adds forked-from lineage.
Example: /hub fork script soma-code`,"info");return}let t=d[0]==="map"?"automation":d[0],n=d[1];if(!S.includes(t)){e.ui.notify(`\u274C Unknown type "${t}"

Valid types: ${S.join(", ")}
Example: /hub install protocol my-protocol`,"error");return}e.ui.notify(`\u2442 Forking ${t}: ${n}...`,"info");try{let r=await N(a,t,n,{force:!0});if(!r.success){e.ui.notify(`\u274C ${r.error||"Fork failed \u2014 content not found"}`,"error");return}if(r.path&&A(r.path)){let o=L(r.path,"utf-8"),c="1.0.0";try{let u=await fetch(P,{headers:{"User-Agent":"soma-cli"}});if(u.ok){let y=(await u.json()).items?.find($=>$.slug===n&&$.type===t);y?.version&&(c=y.version)}}catch{}if(t==="script"){let u=`# forked-from: meetsoma/${n}@${c}`;if(o.includes("# ---")){let i=o.replace(/^(# ---\n[\s\S]*?)(# ---)/m,`$1${u}
$2`);I(r.path,i,"utf-8")}}else if(o.startsWith("---")){let u=o.replace(/^(---\n[\s\S]*?)(---)/m,`$1forked-from: meetsoma/${n}@${c}
$2`);I(r.path,u,"utf-8")}}e.ui.notify(`\u2705 Forked ${t}: ${n}
   \u2192 ${r.path}
   \u2442 forked-from: meetsoma/${n}
   Edit it, make it yours. When ready: /hub share ${t} ${n}`,"info")}catch(r){e.ui.notify(`\u274C Fork error: ${r.message}`,"error")}break}case"share":case"s":{let d=l.filter(s=>!s.startsWith("-"));if(d.length<2){e.ui.notify(`Usage: /hub share <type> <name>
Types: ${S.join(", ")}

Packages local content and opens a PR to the community hub.
Requires: gh CLI (brew install gh) + gh auth login`,"info");return}let t=d[0]==="map"?"automation":d[0],n=d[1];if(!S.includes(t)){e.ui.notify(`\u274C Unknown type "${t}"

Valid types: ${S.join(", ")}
Example: /hub install protocol my-protocol`,"error");return}let r=V(),o="";if(t==="script"){let s=[p(a.path,"amps","scripts",`${n}.sh`),p(a.path,"amps","scripts","_public",`${n}.sh`),p(a.path,"amps","scripts","internal",`${n}.sh`)];o=s.find(f=>A(f))||s[0]}else if(t==="automation"){let s=[p(a.path,"amps","automations",`${n}.md`),p(a.path,"amps","automations","_public",`${n}.md`),p(a.path,"amps","automations","maps","workflows",`${n}.md`),p(a.path,"amps","automations","maps","soma-dev",`${n}.md`)];o=s.find(f=>A(f))||s[0]}else{let s=C(t),f=[p(a.path,"amps",s,`${n}.md`),p(a.path,"amps",s,"_public",`${n}.md`)];o=f.find(b=>A(b))||f[0]}if(!A(o)){e.ui.notify(`\u274C Not found locally. Searched:
`+(t==="script"?`   amps/scripts/${n}.sh
   amps/scripts/_public/${n}.sh`:t==="automation"?`   amps/automations/${n}.md
   amps/automations/_public/${n}.md
   amps/automations/maps/workflows/${n}.md`:`   amps/${C(t)}/${n}.md
   amps/${C(t)}/_public/${n}.md`),"error");return}let c=L(o,"utf-8"),u;if(t==="script"?u=z(c):u=Q(c),!u.name&&!u.description){e.ui.notify(`\u26A0\uFE0F Can't share ${q(o)} \u2014 missing metadata

`+(t==="script"?`Scripts need a # --- comment header:

  # ---
  # name: my-script
  # description: What it does
  # author: your-name
  # version: 1.0.0
  # ---`:`Add YAML frontmatter with at least:

  ---
  name: my-content
  description: What it does
  author: your-name
  version: 1.0.0
  ---`),"error");return}let i=[],y=[{re:/\/Users\/\S+/g,label:"User home path",canStrip:!0},{re:/\/home\/\S+/g,label:"Home directory path",canStrip:!0},{re:/Gravicity\//g,label:"Project-specific path",canStrip:!0},{re:/sk-[a-zA-Z0-9]{20,}/g,label:"API key",canStrip:!1},{re:/ghp_[a-zA-Z0-9]{30,}/g,label:"GitHub token",canStrip:!1}];for(let s of y)s.re.test(c)&&(i.push(s.label+(s.canStrip?" (auto-fixable)":" (manual fix required)")),s.re.lastIndex=0);if(y.some(s=>!s.canStrip&&s.re.test(c))){e.ui.notify(`\u{1F512} Sharing blocked \u2014 ${q(o)} contains secrets:

`+i.filter(s=>s.includes("manual fix")).map(s=>`   \u2022 ${s}`).join(`
`)+`

Remove API keys and tokens manually, then try again.`,"error");return}let R=c.replace(/^heat:\s*\d+\s*$/gm,"").replace(/^loads:\s*\d+\s*$/gm,"");if(i.length>0){for(let v of y)v.canStrip&&(R=R.replace(v.re,v.label==="User home path"?"~/":"<path>/"));let s=t==="script"?p(a.path,"amps","scripts","_public"):t==="automation"?p(a.path,"amps","automations","_public"):p(a.path,"amps",C(t),"_public");D(s,{recursive:!0});let b=p(s,`${n}${t==="script"?".sh":".md"}`);if(I(b,R,"utf-8"),t==="script")try{H(b,493)}catch{}e.ui.notify(`\u{1F527} Privacy issues auto-fixed:
`+i.map(v=>`   \u2022 ${v}`).join(`
`)+`

Cleaned version saved to:
   ${b}
Your original at ${q(o)} is untouched.
Submitting the cleaned version...`,"info")}if(!r.ok){let s=`/tmp/soma-share-${n}-${Date.now()}`;D(s,{recursive:!0});let f=_(t,n,u,R);if(t==="script"){let v=p(s,"scripts",n);D(v,{recursive:!0}),I(p(v,`${n}.sh`),R,"utf-8"),I(p(v,"README.md"),f.draft,"utf-8")}else{let v=C(t),E=p(s,v);D(E,{recursive:!0}),I(p(E,`${n}.md`),R,"utf-8")}let b=W(f);e.ui.notify(`\u{1F4CB} Share package ready at:
   ${s}
   Quality: ${f.quality}%
`+b+`
${r.error||"Install gh CLI for automatic PR submission."}

To submit manually:
  1. Fork github.com/meetsoma/community
  2. Copy the files from the folder above into your fork
  3. Open a PR against main

Or install gh for one-command sharing:
  brew install gh && gh auth login
  /hub share `+t+" "+n,"info");return}let T=r.username;e.ui.notify(`\u{1F4E4} Sharing as ${T}...`,"info");try{let s=`/tmp/soma-share-${n}-${Date.now()}`;w(`gh repo clone ${U} "${s}" -- --depth 1`,{encoding:"utf-8",stdio:"pipe"});let f=`${T}/${t}-${n}`;w(`git checkout -b "${f}"`,{cwd:s,encoding:"utf-8",stdio:"pipe"});let b=_(t,n,u,R);if(t==="script"){let j=p(s,"scripts",n);D(j,{recursive:!0}),I(p(j,`${n}.sh`),R,"utf-8");try{H(p(j,`${n}.sh`),493)}catch{}I(p(j,"README.md"),b.draft,"utf-8")}else{let j=C(t);I(p(s,j,`${n}.md`),R,"utf-8")}if(b.issues.length>0){let j=W(b);e.ui.notify(`\u{1F4CB} Pre-submit quality check (${b.quality}%):
${j}`,"info")}if(b.quality<40&&e.ui.notify(`\u26A0\uFE0F Quality score is ${b.quality}% \u2014 CI may reject this.
Fix the issues above and try again, or continue at your own risk.`,"info"),w("git add -A",{cwd:s,stdio:"pipe"}),!w("git diff --cached --name-only",{cwd:s,encoding:"utf-8",stdio:"pipe"}).trim()){e.ui.notify(`\u2713 ${t} "${n}" is already up-to-date on the hub.

Your local version matches what's published \u2014 nothing to submit.
To share an update, edit the file first, then run /hub share again.`,"info"),w(`rm -rf "${s}"`,{stdio:"pipe"});return}w(`git commit -m "feat: add ${t} ${n} by ${T}"`,{cwd:s,stdio:"pipe"}),w(`git push origin "${f}"`,{cwd:s,stdio:"pipe"});let E=w(`gh pr create --repo ${U} --title "feat: add ${t} ${n}" --body "Submitted by ${T} via \\\`/hub share\\\`.

Type: ${t}
Name: ${n}
Description: ${u.description||"No description"}" --base main --head "${f}"`,{cwd:s,encoding:"utf-8",stdio:"pipe"}).trim();e.ui.notify(`\u2705 PR submitted!

   ${E}

CI will run 6 automated checks (frontmatter, privacy, injection,
format, tier, attribution). If you're a trusted contributor,
it'll auto-merge. Otherwise a maintainer will review it.`,"info"),w(`rm -rf "${s}"`,{stdio:"pipe"})}catch(s){let f=s.message||String(s),b="";f.includes("already exists")?b=`

A branch for this content already exists. If you have a pending PR,
close it first or use a different name.`:f.includes("authentication")||f.includes("403")||f.includes("permission")?b=`

Check your GitHub auth: gh auth status
You may need: gh auth refresh -s repo`:(f.includes("could not clone")||f.includes("not found"))&&(b=`

Couldn't reach the community repo. Check your network
and that github.com/meetsoma/community is accessible.`),e.ui.notify(`\u274C Share failed

${f.split(`
`)[0]}${b}`,"error")}break}case"list":case"ls":{let d=l.includes("--remote")||l.includes("-r"),t=l.find(n=>!n.startsWith("-"));if(d)try{let n=await fetch(P,{headers:{"User-Agent":"soma-cli"}});if(!n.ok)throw new Error(`${n.status}`);let o=(await n.json()).items?.filter(i=>!t||i.type===t)||[];if(o.length===0){e.ui.notify("No items found on hub"+(t?` for type: ${t}`:""),"info");return}let c={};for(let i of o)c[i.type]||(c[i.type]=[]),c[i.type].push(i);let u=[`\u{1F4E6} Hub: ${o.length} items`];for(let[i,y]of Object.entries(c)){u.push(`
${i}s (${y.length}):`);for(let $ of y)u.push(`  ${$.name} v${$.version} \u2014 ${$.description||$.breadcrumb||""}`)}e.ui.notify(u.join(`
`),"info")}catch(n){e.ui.notify(`\u274C Failed to fetch hub index: ${n.message}`,"error")}else{let n=M(a,t&&S.includes(t)?t:void 0);if(n.length===0){e.ui.notify("No local AMPS content found"+(t?` for type: ${t}`:""),"info");return}let r=[`\u{1F4CB} Local: ${n.length} items`];for(let o of n)r.push(`  ${o.type}: ${o.name}`);r.push(`
Use /hub list --remote to browse the hub.`),e.ui.notify(r.join(`
`),"info")}break}case"status":{e.ui.notify(`\u{1F4CA} Hub Status
   Local .soma/: ${a.path}
   Hub: ${U} (${F})
   Index: ${P}

For detailed drift report, run:
   bash .soma/amps/scripts/internal/soma-hub-status.sh`,"info");break}case"find":case"search":{let d=l.join(" ").toLowerCase();if(!d){e.ui.notify(`Usage: /hub find <keywords>

Searches hub content by name, description, tags.
Example: /hub find css theme
Example: /hub find spelling canadian`,"info");return}e.ui.notify(`\u{1F50D} Searching hub for: ${d}...`,"info");try{let t=await fetch(P,{headers:{"User-Agent":"soma-cli"}});if(!t.ok)throw new Error(`${t.status}`);let r=(await t.json()).items||[],o=d.split(/\s+/),c=r.filter(i=>{let y=[i.name||"",i.description||"",i.breadcrumb||"",...i.tags||[],...i.topic||[],...i.keywords||[]].join(" ").toLowerCase();return o.some($=>y.includes($))});if(c.length===0){e.ui.notify(`No hub content matches: ${d}`,"info");return}let u=[`\u{1F50D} ${c.length} matches for "${d}":
`];for(let i of c.slice(0,15)){let y=i.description||i.breadcrumb||"",$=y.length>60?y.slice(0,60)+"...":y;u.push(`  ${i.type}: ${i.name} v${i.version}`),$&&u.push(`    ${$}`)}c.length>15&&u.push(`
  ... and ${c.length-15} more`),u.push(`
Install: /hub install <type> <name>`),e.ui.notify(u.join(`
`),"info")}catch(t){e.ui.notify(`\u274C Search failed: ${t.message}`,"error")}break}default:e.ui.notify(`\u03C3 Hub Commands:

  /hub install <type> <name> [-g|-p]  Install from community
  /hub fork <type> <name>             Fork with lineage tracking
  /hub share <type> <name>            Share to community (needs gh)
  /hub find <keywords>                Search hub content
  /hub list [type] [--remote]          Browse content
  /hub status                          Hub connection info

Types: ${S.join(", ")}

Shortcuts: i=install, f=fork, s=share, ls=list`,"info");break}}})}function W(h){if(h.issues.length===0)return"";let g={error:"\u274C",warn:"\u26A0\uFE0F",info:"\u2139\uFE0F"};return`
`+h.issues.map(a=>`   ${g[a.level]||"\u2022"} ${a.field}: ${a.message}`).join(`
`)+`
`}function _(h,g,e,a){let m=[],k=100,l=["---",`type: ${h}`,`name: ${e.name||g}`,`version: ${e.version||"1.0.0"}`,"status: active",`author: ${e.author||"Community"}`,`license: ${e.license||"MIT"}`];if(e.language&&l.push(`language: ${e.language}`),e.description&&l.push(`description: "${e.description.replace(/"/g,'\\"')}"`),e.tags&&l.push(`tags: ${e.tags}`),e.requires&&l.push(`requires: ${e.requires}`),e["forked-from"]){l.push("forked-from:");let n=e["forked-from"].match(/^(.+?)\/(.+?)@(.+)$/);n&&(l.push(`  author: ${n[1]}`),l.push(`  slug: ${n[2]}`),l.push(`  version: ${n[3]}`))}l.push("published:"),l.push("  commit: null"),l.push("  pr: null"),l.push("  date: null");let d=new Date().toISOString().split("T")[0];l.push(`created: ${e.created||d}`),l.push(`updated: ${d}`),l.push("---"),e.description?e.description.length<20&&(m.push({level:"info",field:"description",message:`Description is short (${e.description.length} chars). A longer description helps users find this via search.`}),k-=5):(m.push({level:"warn",field:"description",message:"No description \u2014 hub cards will be blank. Add a one-line summary."}),k-=20),e.tags||(m.push({level:"warn",field:"tags",message:"No tags \u2014 hub search won't find this. Add relevant keywords."}),k-=15),(!e.author||e.author==="Community")&&(m.push({level:"info",field:"author",message:"Author is generic. Set your name or handle for attribution."}),k-=5),!e.version||e.version;let t=["",`# ${e.name||g}`,""];if(e.description&&(t.push(e.description),t.push("")),h==="script"){let n="";try{let o=`/tmp/soma-readme-help-${g}.sh`;I(o,a,{mode:493}),n=w(`bash "${o}" --help 2>&1`,{encoding:"utf-8",timeout:5e3,env:{...process.env,TERM:"dumb"}}).trim(),w(`rm -f "${o}"`,{stdio:"pipe"})}catch{}if(n&&n.length>10){let o=n.replace(/\x1b\[[0-9;]*m/g,"");t.push("## Usage"),t.push(""),t.push("```"),t.push(o),t.push("```"),t.push("")}else m.push({level:"warn",field:"--help",message:"No --help output. Scripts should support --help for discoverability."}),k-=10,t.push("## Usage"),t.push(""),t.push("```bash"),t.push(`bash ${g}.sh --help`),t.push("```"),t.push("");let r=a.match(/^(?:cmd_|function\s+)\w+/gm);if(r&&r.length>0){let o=r.map(c=>c.replace(/^cmd_/,"").replace(/^function\s+/,"").trim());t.push("## Commands"),t.push("");for(let c of o)t.push(`- \`${c}\``);t.push("")}a.startsWith("#!/")||(m.push({level:"error",field:"shebang",message:"Missing shebang (#!/usr/bin/env bash). Script won't be executable."}),k-=15)}if(h==="automation"){let n=a.match(/^## (?:Phase|Step|When)\b.*/gm);if(n&&n.length>0){t.push("## Workflow"),t.push("");for(let r of n)t.push(`- ${r.replace(/^## /,"")}`);t.push("")}e["estimated-turns"]||(m.push({level:"info",field:"estimated-turns",message:"No estimated-turns in frontmatter. Helps users know the time commitment."}),k-=5)}return h==="protocol"&&(a.includes("## TL;DR")||(m.push({level:"error",field:"TL;DR",message:"Protocols require a ## TL;DR section. CI will reject without it."}),k-=20),a.includes("## When to Apply")||(m.push({level:"warn",field:"When to Apply",message:"Missing ## When to Apply \u2014 helps users know when this protocol fires."}),k-=10)),h==="muscle"&&(a.includes("<!-- digest:start -->")||(m.push({level:"error",field:"digest",message:"Muscles require a <!-- digest:start/end --> block. This is what loads into the system prompt."}),k-=20)),t.push("## Install"),t.push(""),t.push("```bash"),t.push(`/hub install ${h} ${g}`),t.push("```"),t.push(""),k=Math.max(0,Math.min(100,k)),{draft:[...l,...t].join(`
`),issues:m,quality:k}}export{Z as default};
