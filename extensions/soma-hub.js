// (c) Gravicity · BSL 1.1 · soma.gravicity.ai
// Built by Curtis Mercier
var O=Object.defineProperty;var v=(p,m)=>O(p,"name",{value:m,configurable:!0});import{existsSync as D,readFileSync as H,writeFileSync as j,mkdirSync as P,chmodSync as N}from"fs";import{join as h,basename as L}from"path";import{execSync as w}from"child_process";import{installItem as W,listLocal as B}from"../core/index.js";var q="meetsoma/community",M="main",Y=`https://raw.githubusercontent.com/${q}/${M}`,U=`${Y}/hub-index.json`,R=["protocol","muscle","skill","template","script","automation"];function A(p){return{protocol:"protocols",muscle:"muscles",skill:"skills",template:"templates",script:"scripts",automation:"automations"}[p]||p+"s"}v(A,"communityDir");function G(){return globalThis.e??null}v(G,"getRoute");function V(){return G()?.get("soma:dir")?.()??null}v(V,"getSoma");function z(p,m){let e=h(process.env.HOME||"",".soma");return m?p.path===e?{error:"No project .soma/ found. -p requires a project-level .soma/ \u2014 run /soma init first, or use -g for global."}:{target:p,location:"project"}:D(e)?{target:{path:e,projectDir:process.env.HOME||""},location:"global"}:{target:p,location:"project"}}v(z,"resolveTarget");function Q(){try{return w("gh auth status",{encoding:"utf-8",stdio:"pipe"}),{ok:!0,username:w("gh api user --jq '.login'",{encoding:"utf-8",stdio:"pipe"}).trim()}}catch{try{return w("which gh",{encoding:"utf-8",stdio:"pipe"}),{ok:!1,error:"gh CLI found but not authenticated. Run: gh auth login"}}catch{return{ok:!1,error:"gh CLI not installed. Install: brew install gh"}}}}v(Q,"checkGhAuth");function Z(p){let m=p.match(/^# ---\n([\s\S]*?)\n# ---/m);if(!m)return{};let e={};for(let r of m[1].split(`
`)){let d=r.match(/^# (\w[\w-]*)\s*:\s*(.+)$/);d&&(e[d[1]]=d[2].trim())}return e}v(Z,"parseScriptHeader");function X(p){let m=p.match(/^---\n([\s\S]*?)\n---/);if(!m)return{};let e={};for(let r of m[1].split(`
`)){let d=r.match(/^(\w[\w-]*)\s*:\s*(.+)$/);d&&(e[d[1]]=d[2].trim())}return e}v(X,"parseFrontmatter");function J(p){p.registerCommand("hub",{description:"Community hub \u2014 install, fork, share, and browse AMPS content",getArgumentCompletions:v(m=>["install","fork","share","list","status",...R].filter(e=>e.startsWith(m)).map(e=>({value:e,label:e})),"getArgumentCompletions"),handler:v(async(m,e)=>{let r=V();if(!r){e.ui.notify("No .soma/ found. Run /soma init first.","error");return}let d=m.trim().split(/\s+/),k=d[0]||"status",l=d.slice(1);switch(k){case"install":case"i":{let g=l.includes("--force"),t=l.includes("-g"),n=l.includes("-p"),a=l.filter(i=>!i.startsWith("-"));if(a.length<2){e.ui.notify(`Usage: /hub install <type> <name> [-g|-p] [--force]
Types: ${R.join(", ")}
  -g  Install globally (~/.soma/) \u2014 default
  -p  Install to project .soma/`,"info");return}let o=a[0],c=a[1];if(!R.includes(o)){e.ui.notify(`\u274C Unknown type "${o}"

Valid types: ${R.join(", ")}
Example: /hub install protocol my-protocol`,"error");return}let u=z(r,n);if("error"in u){e.ui.notify(`\u274C ${u.error}`,"error");return}e.ui.notify(`\u{1F4E6} Installing ${o}: ${c} (${u.location})...`,"info");try{let i=await W(u.target,o,c,{force:g});if(i.success){let y=[`\u2705 Installed ${o}: ${c} (${u.location})`];if(i.path&&y.push(`   \u2192 ${i.path}`),i.dependencies?.length){y.push("   Dependencies:");for(let $ of i.dependencies){let I=$.success?"\u2713":$.error?.includes("Already exists")?"\xB7":"\u2717";y.push(`     ${I} ${$.type}: ${$.name}${$.error?` (${$.error})`:""}`)}}e.ui.notify(y.join(`
`),"info"),o==="protocol"||o==="muscle"?e.ui.notify("\u{1F4A1} New content loads on next boot (or /breathe to rotate)","info"):o==="script"&&e.ui.notify(`\u{1F4A1} Script ready: bash ${i.path}`,"info")}else e.ui.notify(`\u274C ${i.error||"Install failed"}`,"error")}catch(i){e.ui.notify(`\u274C Install error: ${i.message}`,"error")}break}case"fork":case"f":{let g=l.filter(a=>!a.startsWith("-"));if(g.length<2){e.ui.notify(`Usage: /hub fork <type> <name>
Types: ${R.join(", ")}

Downloads content and adds forked-from lineage.
Example: /hub fork script soma-code`,"info");return}let t=g[0],n=g[1];if(!R.includes(t)){e.ui.notify(`\u274C Unknown type "${t}"

Valid types: ${R.join(", ")}
Example: /hub install protocol my-protocol`,"error");return}e.ui.notify(`\u2442 Forking ${t}: ${n}...`,"info");try{let a=await W(r,t,n,{force:!0});if(!a.success){e.ui.notify(`\u274C ${a.error||"Fork failed \u2014 content not found"}`,"error");return}if(a.path&&D(a.path)){let o=H(a.path,"utf-8"),c="1.0.0";try{let u=await fetch(U,{headers:{"User-Agent":"soma-cli"}});if(u.ok){let y=(await u.json()).items?.find($=>$.slug===n&&$.type===t);y?.version&&(c=y.version)}}catch{}if(t==="script"){let u=`# forked-from: meetsoma/${n}@${c}`;if(o.includes("# ---")){let i=o.replace(/^(# ---\n[\s\S]*?)(# ---)/m,`$1${u}
$2`);j(a.path,i,"utf-8")}}else if(o.startsWith("---")){let u=o.replace(/^(---\n[\s\S]*?)(---)/m,`$1forked-from: meetsoma/${n}@${c}
$2`);j(a.path,u,"utf-8")}}e.ui.notify(`\u2705 Forked ${t}: ${n}
   \u2192 ${a.path}
   \u2442 forked-from: meetsoma/${n}
   Edit it, make it yours. When ready: /hub share ${t} ${n}`,"info")}catch(a){e.ui.notify(`\u274C Fork error: ${a.message}`,"error")}break}case"share":case"s":{let g=l.filter(s=>!s.startsWith("-"));if(g.length<2){e.ui.notify(`Usage: /hub share <type> <name>
Types: ${R.join(", ")}

Packages local content and opens a PR to the community hub.
Requires: gh CLI (brew install gh) + gh auth login`,"info");return}let t=g[0],n=g[1];if(!R.includes(t)){e.ui.notify(`\u274C Unknown type "${t}"

Valid types: ${R.join(", ")}
Example: /hub install protocol my-protocol`,"error");return}let a=Q(),o="";if(t==="script"){let s=[h(r.path,"amps","scripts",`${n}.sh`),h(r.path,"amps","scripts","_public",`${n}.sh`),h(r.path,"amps","scripts","internal",`${n}.sh`)];o=s.find(f=>D(f))||s[0]}else if(t==="automation"){let s=[h(r.path,"amps","automations",`${n}.md`),h(r.path,"amps","automations","_public",`${n}.md`),h(r.path,"amps","automations","maps","workflows",`${n}.md`),h(r.path,"amps","automations","maps","soma-dev",`${n}.md`)];o=s.find(f=>D(f))||s[0]}else{let s=A(t),f=[h(r.path,"amps",s,`${n}.md`),h(r.path,"amps",s,"_public",`${n}.md`)];o=f.find(b=>D(b))||f[0]}if(!D(o)){e.ui.notify(`\u274C Not found locally. Searched:
`+(t==="script"?`   amps/scripts/${n}.sh
   amps/scripts/_public/${n}.sh`:t==="automation"?`   amps/automations/${n}.md
   amps/automations/_public/${n}.md
   amps/automations/maps/workflows/${n}.md`:`   amps/${A(t)}/${n}.md
   amps/${A(t)}/_public/${n}.md`),"error");return}let c=H(o,"utf-8"),u;if(t==="script"?u=Z(c):u=X(c),!u.name&&!u.description){e.ui.notify(`\u26A0\uFE0F Can't share ${L(o)} \u2014 missing metadata

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
  ---`),"error");return}let i=[],y=[{re:/\/Users\/\S+/g,label:"User home path",canStrip:!0},{re:/\/home\/\S+/g,label:"Home directory path",canStrip:!0},{re:/Gravicity\//g,label:"Project-specific path",canStrip:!0},{re:/sk-[a-zA-Z0-9]{20,}/g,label:"API key",canStrip:!1},{re:/ghp_[a-zA-Z0-9]{30,}/g,label:"GitHub token",canStrip:!1}];for(let s of y)s.re.test(c)&&(i.push(s.label+(s.canStrip?" (auto-fixable)":" (manual fix required)")),s.re.lastIndex=0);if(y.some(s=>!s.canStrip&&s.re.test(c))){e.ui.notify(`\u{1F512} Sharing blocked \u2014 ${L(o)} contains secrets:

`+i.filter(s=>s.includes("manual fix")).map(s=>`   \u2022 ${s}`).join(`
`)+`

Remove API keys and tokens manually, then try again.`,"error");return}let I=c.replace(/^heat:\s*\d+\s*$/gm,"").replace(/^loads:\s*\d+\s*$/gm,"");if(i.length>0){for(let S of y)S.canStrip&&(I=I.replace(S.re,S.label==="User home path"?"~/":"<path>/"));let s=t==="script"?h(r.path,"amps","scripts","_public"):t==="automation"?h(r.path,"amps","automations","_public"):h(r.path,"amps",A(t),"_public");P(s,{recursive:!0});let b=h(s,`${n}${t==="script"?".sh":".md"}`);if(j(b,I,"utf-8"),t==="script")try{N(b,493)}catch{}e.ui.notify(`\u{1F527} Privacy issues auto-fixed:
`+i.map(S=>`   \u2022 ${S}`).join(`
`)+`

Cleaned version saved to:
   ${b}
Your original at ${L(o)} is untouched.
Submitting the cleaned version...`,"info")}if(!a.ok){let s=`/tmp/soma-share-${n}-${Date.now()}`;P(s,{recursive:!0});let f=F(t,n,u,I);if(t==="script"){let S=h(s,"scripts",n);P(S,{recursive:!0}),j(h(S,`${n}.sh`),I,"utf-8"),j(h(S,"README.md"),f.draft,"utf-8")}else{let S=A(t),E=h(s,S);P(E,{recursive:!0}),j(h(E,`${n}.md`),I,"utf-8")}let b=_(f);e.ui.notify(`\u{1F4CB} Share package ready at:
   ${s}
   Quality: ${f.quality}%
`+b+`
${a.error||"Install gh CLI for automatic PR submission."}

To submit manually:
  1. Fork github.com/meetsoma/community
  2. Copy the files from the folder above into your fork
  3. Open a PR against main

Or install gh for one-command sharing:
  brew install gh && gh auth login
  /hub share `+t+" "+n,"info");return}let T=a.username;e.ui.notify(`\u{1F4E4} Sharing as ${T}...`,"info");try{let s=`/tmp/soma-share-${n}-${Date.now()}`;w(`gh repo clone ${q} "${s}" -- --depth 1`,{encoding:"utf-8",stdio:"pipe"});let f=`${T}/${t}-${n}`;w(`git checkout -b "${f}"`,{cwd:s,encoding:"utf-8",stdio:"pipe"});let b=F(t,n,u,I);if(t==="script"){let C=h(s,"scripts",n);P(C,{recursive:!0}),j(h(C,`${n}.sh`),I,"utf-8");try{N(h(C,`${n}.sh`),493)}catch{}j(h(C,"README.md"),b.draft,"utf-8")}else{let C=A(t);j(h(s,C,`${n}.md`),I,"utf-8")}if(b.issues.length>0){let C=_(b);e.ui.notify(`\u{1F4CB} Pre-submit quality check (${b.quality}%):
${C}`,"info")}if(b.quality<40&&e.ui.notify(`\u26A0\uFE0F Quality score is ${b.quality}% \u2014 CI may reject this.
Fix the issues above and try again, or continue at your own risk.`,"info"),w("git add -A",{cwd:s,stdio:"pipe"}),!w("git diff --cached --name-only",{cwd:s,encoding:"utf-8",stdio:"pipe"}).trim()){e.ui.notify(`\u2713 ${t} "${n}" is already up-to-date on the hub.

Your local version matches what's published \u2014 nothing to submit.
To share an update, edit the file first, then run /hub share again.`,"info"),w(`rm -rf "${s}"`,{stdio:"pipe"});return}w(`git commit -m "feat: add ${t} ${n} by ${T}"`,{cwd:s,stdio:"pipe"}),w(`git push origin "${f}"`,{cwd:s,stdio:"pipe"});let E=w(`gh pr create --repo ${q} --title "feat: add ${t} ${n}" --body "Submitted by ${T} via \\\`/hub share\\\`.

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
`)[0]}${b}`,"error")}break}case"list":case"ls":{let g=l.includes("--remote")||l.includes("-r"),t=l.find(n=>!n.startsWith("-"));if(g)try{let n=await fetch(U,{headers:{"User-Agent":"soma-cli"}});if(!n.ok)throw new Error(`${n.status}`);let o=(await n.json()).items?.filter(i=>!t||i.type===t)||[];if(o.length===0){e.ui.notify("No items found on hub"+(t?` for type: ${t}`:""),"info");return}let c={};for(let i of o)c[i.type]||(c[i.type]=[]),c[i.type].push(i);let u=[`\u{1F4E6} Hub: ${o.length} items`];for(let[i,y]of Object.entries(c)){u.push(`
${i}s (${y.length}):`);for(let $ of y)u.push(`  ${$.name} v${$.version} \u2014 ${$.description||$.breadcrumb||""}`)}e.ui.notify(u.join(`
`),"info")}catch(n){e.ui.notify(`\u274C Failed to fetch hub index: ${n.message}`,"error")}else{let n=B(r,t&&R.includes(t)?t:void 0);if(n.length===0){e.ui.notify("No local AMPS content found"+(t?` for type: ${t}`:""),"info");return}let a=[`\u{1F4CB} Local: ${n.length} items`];for(let o of n)a.push(`  ${o.type}: ${o.name}`);a.push(`
Use /hub list --remote to browse the hub.`),e.ui.notify(a.join(`
`),"info")}break}case"status":{e.ui.notify(`\u{1F4CA} Hub Status
   Local .soma/: ${r.path}
   Hub: ${q} (${M})
   Index: ${U}

For detailed drift report, run:
   bash .soma/amps/scripts/internal/soma-hub-status.sh`,"info");break}case"find":case"search":{let g=l.join(" ").toLowerCase();if(!g){e.ui.notify(`Usage: /hub find <keywords>

Searches hub content by name, description, tags.
Example: /hub find css theme
Example: /hub find spelling canadian`,"info");return}e.ui.notify(`\u{1F50D} Searching hub for: ${g}...`,"info");try{let t=await fetch(U,{headers:{"User-Agent":"soma-cli"}});if(!t.ok)throw new Error(`${t.status}`);let a=(await t.json()).items||[],o=g.split(/\s+/),c=a.filter(i=>{let y=[i.name||"",i.description||"",i.breadcrumb||"",...i.tags||[],...i.topic||[],...i.keywords||[]].join(" ").toLowerCase();return o.some($=>y.includes($))});if(c.length===0){e.ui.notify(`No hub content matches: ${g}`,"info");return}let u=[`\u{1F50D} ${c.length} matches for "${g}":
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

Types: ${R.join(", ")}

Shortcuts: i=install, f=fork, s=share, ls=list`,"info");break}},"handler")})}v(J,"somaHubExtension");function _(p){if(p.issues.length===0)return"";let m={error:"\u274C",warn:"\u26A0\uFE0F",info:"\u2139\uFE0F"};return`
`+p.issues.map(r=>`   ${m[r.level]||"\u2022"} ${r.field}: ${r.message}`).join(`
`)+`
`}v(_,"formatIssues");function F(p,m,e,r){let d=[],k=100,l=["---",`type: ${p}`,`name: ${e.name||m}`,`version: ${e.version||"1.0.0"}`,"status: active",`author: ${e.author||"Community"}`,`license: ${e.license||"MIT"}`];if(e.language&&l.push(`language: ${e.language}`),e.description&&l.push(`description: "${e.description.replace(/"/g,'\\"')}"`),e.tags&&l.push(`tags: ${e.tags}`),e.requires&&l.push(`requires: ${e.requires}`),e["forked-from"]){l.push("forked-from:");let n=e["forked-from"].match(/^(.+?)\/(.+?)@(.+)$/);n&&(l.push(`  author: ${n[1]}`),l.push(`  slug: ${n[2]}`),l.push(`  version: ${n[3]}`))}l.push("published:"),l.push("  commit: null"),l.push("  pr: null"),l.push("  date: null");let g=new Date().toISOString().split("T")[0];l.push(`created: ${e.created||g}`),l.push(`updated: ${g}`),l.push("---"),e.description?e.description.length<20&&(d.push({level:"info",field:"description",message:`Description is short (${e.description.length} chars). A longer description helps users find this via search.`}),k-=5):(d.push({level:"warn",field:"description",message:"No description \u2014 hub cards will be blank. Add a one-line summary."}),k-=20),e.tags||(d.push({level:"warn",field:"tags",message:"No tags \u2014 hub search won't find this. Add relevant keywords."}),k-=15),(!e.author||e.author==="Community")&&(d.push({level:"info",field:"author",message:"Author is generic. Set your name or handle for attribution."}),k-=5),!e.version||e.version;let t=["",`# ${e.name||m}`,""];if(e.description&&(t.push(e.description),t.push("")),p==="script"){let n="";try{let o=`/tmp/soma-readme-help-${m}.sh`;j(o,r,{mode:493}),n=w(`bash "${o}" --help 2>&1`,{encoding:"utf-8",timeout:5e3,env:{...process.env,TERM:"dumb"}}).trim(),w(`rm -f "${o}"`,{stdio:"pipe"})}catch{}if(n&&n.length>10){let o=n.replace(/\x1b\[[0-9;]*m/g,"");t.push("## Usage"),t.push(""),t.push("```"),t.push(o),t.push("```"),t.push("")}else d.push({level:"warn",field:"--help",message:"No --help output. Scripts should support --help for discoverability."}),k-=10,t.push("## Usage"),t.push(""),t.push("```bash"),t.push(`bash ${m}.sh --help`),t.push("```"),t.push("");let a=r.match(/^(?:cmd_|function\s+)\w+/gm);if(a&&a.length>0){let o=a.map(c=>c.replace(/^cmd_/,"").replace(/^function\s+/,"").trim());t.push("## Commands"),t.push("");for(let c of o)t.push(`- \`${c}\``);t.push("")}r.startsWith("#!/")||(d.push({level:"error",field:"shebang",message:"Missing shebang (#!/usr/bin/env bash). Script won't be executable."}),k-=15)}if(p==="automation"){let n=r.match(/^## (?:Phase|Step|When)\b.*/gm);if(n&&n.length>0){t.push("## Workflow"),t.push("");for(let a of n)t.push(`- ${a.replace(/^## /,"")}`);t.push("")}e["estimated-turns"]||(d.push({level:"info",field:"estimated-turns",message:"No estimated-turns in frontmatter. Helps users know the time commitment."}),k-=5)}return p==="protocol"&&(r.includes("## TL;DR")||(d.push({level:"error",field:"TL;DR",message:"Protocols require a ## TL;DR section. CI will reject without it."}),k-=20),r.includes("## When to Apply")||(d.push({level:"warn",field:"When to Apply",message:"Missing ## When to Apply \u2014 helps users know when this protocol fires."}),k-=10)),p==="muscle"&&(r.includes("<!-- digest:start -->")||(d.push({level:"error",field:"digest",message:"Muscles require a <!-- digest:start/end --> block. This is what loads into the system prompt."}),k-=20)),t.push("## Install"),t.push(""),t.push("```bash"),t.push(`/hub install ${p} ${m}`),t.push("```"),t.push(""),k=Math.max(0,Math.min(100,k)),{draft:[...l,...t].join(`
`),issues:d,quality:k}}v(F,"generateReadme");export{J as default};
