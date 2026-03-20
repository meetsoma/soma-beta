var Ge=Object.defineProperty;var S=(h,o)=>Ge(h,"name",{value:o,configurable:!0}),Ye=(h=>typeof require<"u"?require:typeof Proxy<"u"?new Proxy(h,{get:(o,i)=>(typeof require<"u"?require:o)[i]}):h)(function(h){if(typeof require<"u")return require.apply(this,arguments);throw Error('Dynamic require of "'+h+'" is not supported')});import{join as M,dirname as be,resolve as Je}from"path";import{existsSync as O,readdirSync as ie,readFileSync as X,writeFileSync as Me,statSync as Se,unlinkSync as Ie}from"fs";import{execSync as W}from"child_process";import{fileURLToPath as ze}from"url";import{findSomaDir as pe,getSomaChain as ye,buildLayeredIdentity as qe,findPreload as te,discoverProtocolChain as Ae,detectProjectSignals as Ke,loadProtocolState as Ve,saveProtocolState as se,bootstrapProtocolState as Xe,syncProtocolState as Ze,buildProtocolInjection as Qe,applyDecay as xe,discoverMuscleChain as et,buildMuscleInjection as tt,trackMuscleLoads as ot,decayMuscleHeat as st,bumpMuscleHeat as ue,recordHeatEvent as $e,getProtocolHeat as nt,loadSettings as je,initSoma as Te,ensureGlobalSoma as it,installItem as rt,listRemote as at,listLocal as lt,compileFrontalCortex as ct,compileFullSystemPrompt as De,detectProjectContext as dt,resolveSomaPath as B,createDebugLogger as me,preloadFilename as pt,sessionLogFilename as ut,buildPreloadInstructions as mt,discoverAutomationChain as ft,buildAutomationInjection as ht,bumpAutomationHeat as Ue,decayAutomationHeat as gt,matchMusclesToFocus as yt,findMap as Ne,findTargetedPreload as $t,trackMapRun as Oe,stripFrontmatter as ne}from"../core/index.js";function z(){return globalThis.e??null}S(z,"getRoute");var Re={"soma-audit.sh":"Ecosystem health check \u2014 11 audits: PII, drift, stale content/terms, docs sync, commands, roadmap, overlap, settings, tests, frontmatter. `--list`, `--quiet`, or name specific audits"},bt=[".sh",".py",".ts",".js",".mjs"];function St(h,o){let i={description:"\u2014",useWhen:"",relatedMuscles:[],lastModified:""};try{let y=Se(h);i.lastModified=y.mtime.toISOString().slice(0,10)}catch{}Re[o]&&(i.description=Re[o]);try{let C=X(h,"utf-8").split(`
`).slice(0,15);for(let w of C)if(!w.startsWith("#!")){if(i.description==="\u2014"&&w.startsWith("# ")){let I=w.replace(/^#\s*/,"");I=I.replace(/^\S+\.\w+\s*[—–-]\s*/,""),I.length>0&&(i.description=I);continue}if(/^#\s*USE WHEN:/i.test(w)){i.useWhen=w.replace(/^#\s*USE WHEN:\s*/i,"").trim();continue}if(/^#\s*Related muscles?:/i.test(w)){let _=w.replace(/^#\s*Related muscles?:\s*/i,"").split(",").map(R=>R.trim().replace(/\s*\(.*\)/,"").replace(/\s*$/,"")).filter(R=>R.length>0);i.relatedMuscles.push(..._);continue}if(i.description==="\u2014"&&w.startsWith("// ")&&!w.startsWith("// @")){let I=w.replace(/^\/\/\s*/,"");I=I.replace(/^\S+\.\w+\s*[—–-]\s*/,""),I.length>0&&(i.description=I)}}}catch{}return i}S(St,"getScriptMeta");function Be(){let h=process.env.HOME||process.env.USERPROFILE||"";return M(h,".pi","agent","sessions")}S(Be,"getAgentSessionDir");function Ee(h){let o=`--${h.replace(/^[/\\]/,"").replace(/[/\\:]/g,"-")}--`;return M(Be(),o)}S(Ee,"encodeCwdToSessionDir");function Fe(h=10,o,i){if(h<=0)return[];let y=i||process.cwd(),C=[];C.push(Ee(y));let w=be(y);for(;w!==y&&w!=="/"&&w!==".";){C.push(Ee(w));let P=be(w);if(P===w)break;w=P}let I=Be();if(O(I))try{let P=ie(I);for(let E of P){let Y=M(I,E);!E.startsWith("--")&&Se(Y).isDirectory()&&C.push(Y)}}catch{}let _=[],R=new Set;for(let P of C)if(!(!O(P)||R.has(P))){R.add(P);try{let E=ie(P).filter(Y=>Y.endsWith(".jsonl"));for(let Y of E){let J=M(P,Y);if(!(o&&J===o))try{let Z=Se(J);_.push({path:J,mtime:Z.mtimeMs})}catch{}}}catch{}}_.sort((P,E)=>E.mtime-P.mtime);let q=[];for(let P of _){if(q.length>=h)break;try{let Y=X(P.path,"utf-8").trim().split(`
`),J=[];if(Y.length>0)try{let K=JSON.parse(Y[0]);if(K.type==="session"&&K.cwd){let F=K.cwd,T=(i||process.cwd()).replace(/\/$/,"");if(!T.startsWith(F)&&!F.startsWith(T))continue}}catch{}for(let K of Y)try{let F=JSON.parse(K);if(F.type!=="message")continue;let T=F.message;if(!T||!T.role||!["user","assistant"].includes(T.role))continue;let D="";if(Array.isArray(T.content)){for(let x of T.content)if(x.type==="text"&&x.text){D=x.text;break}}else typeof T.content=="string"&&(D=T.content);if(!D||D.startsWith("[cache keepalive")||D.startsWith("[Soma Boot")||D.startsWith("[Soma ")||D.includes("FLUSH COMPLETE")||D.includes("BREATHE COMPLETE"))continue;J.push({role:T.role,text:D,timestamp:F.timestamp})}catch{}let Z=h-q.length,Q=J.slice(-Z);q.unshift(...Q)}catch{}break}return q.slice(-h)}S(Fe,"scanSessionLogs");function Le(h){if(h.length===0)return"";let o=[];for(let i of h){let y=i.role==="user"?"**User:**":"**Assistant:**",C=i.role==="assistant"?500:300,w=i.text;w.length>C&&(w=w.slice(0,C)+"\u2026"),o.push(`${y} ${w}`)}return`---
## Last Conversation (${h.length} messages)

${o.join(`

`)}
`}S(Le,"formatConversationTail");function vt(h){let o=M(h,"amps","scripts","soma-stats.sh");if(!O(o))return[];try{let i=W(`bash "${o}" --warnings --cwd "${process.cwd()}"`,{encoding:"utf-8",timeout:5e3,stdio:["pipe","pipe","pipe"]}).trim();return!i||i.startsWith("\u2705")?[]:i.split(`
`).filter(y=>y.trim().length>0)}catch{return[]}}S(vt,"getSessionWarnings");var wt=be(ze(import.meta.url)),He=Je(wt,"..");function kt(h){try{let n=pe();if(n)for(let e of[".restart-required",".rotate-signal"]){let t=M(n.path,e);O(t)&&W(`rm -f "${t}"`,{stdio:"ignore"})}}catch{}let o=null,i=null,y=me(null),C=null,w=null,I=new Set,_=new Set,R=[],q=[],P=[],E=[],Y=[],J=[],Z=new Set,Q=!1,K=!1,F=!1,T=null,D=null,x=!1,fe="",L="";function he(){let n=new Date().toISOString().split("T")[0],e=o?B(o.path,"sessions",i):null,t=1;if(e&&O(e)){let s=ie(e).filter(d=>d.startsWith(n)&&d.endsWith(".md"));for(let d of s){let l=d.match(/-s(\d+)/);l&&(t=Math.max(t,parseInt(l[1],10)+1))}}let m=`s${String(t).padStart(2,"0")}`,c;try{let{randomBytes:s}=Ye("crypto");c=s(3).toString("hex")}catch{c=Date.now().toString(16).slice(-6)}return`${m}-${c}`}S(he,"generateSessionId");function re(){let n=L||he(),e=o?B(o.path,"preloads",i):null;return pt(n,e)}S(re,"getPreloadFilename");function ae(){let n=L||he(),e=o?B(o.path,"sessions",i):null;return ut(n,e)}S(ae,"getSessionLogFilename");function le(){if(!o||x)return;let n=i?.protocols.decayRate??1;C&&(xe(C,I,n,R),se(o,C)),st(o,_,n,i),gt(o,Z,n,i),x=!0}S(le,"saveAllHeatState");function ve(n,e){if(!o||!i)return[];let t=[],m=i.boot.steps;for(let c of m)switch(y.boot(`step: ${c}`),c){case"identity":{w=qe(n,i),y.boot(`identity built (${w?.length??0} chars)`);break}case"preload":break;case"protocols":{let s=Ke(o.projectDir),d=Ae(n,s,i);if(R=d,q=d.map(l=>l.name),d.length>0){C=Ve(o);let l=i.protocols;C?Ze(C,d,l)&&se(o,C):(C=Xe(d,l),se(o,C));let r=Qe(d,C,l);if(r.hot.length>0){let u=r.hot.map(a=>{let b=ne(a.content);return b=b.replace(/^# [^\n]+\n+/,""),`### Protocol: ${a.name}
${b}`}).join(`

`);t.push(`
---
## Hot Protocols (full reference)

${u}`)}}break}case"muscles":{let s=et(n,i);if(P=s,E=s.map(d=>d.name),s.length>0){let d=tt(s,i.muscles);if(d.hot.length>0){let r=d.hot.map(u=>{let a=ne(u.content);return a=a.replace(/<!-- digest:start -->\n?/g,""),a=a.replace(/\n?<!-- digest:end -->/g,""),a=a.replace(/^# [^\n]+\n+/,""),`### Muscle: ${u.name}
${a}`}).join(`

`);t.push(`
---
## Hot Muscles (full reference)

${r}`)}let l=[...d.hot,...d.warm];l.length>0&&ot(l)}break}case"automations":{let s=ft(n,i);if(Y=s,J=s.map(d=>d.name),s.length>0){let d=ht(s,i.automations);if(d.hot.length>0){let l=d.hot.map(r=>{let u=ne(r.content);return u=u.replace(/^# [^\n]+\n+/,""),`### Automation: ${r.name}
${u}`}).join(`

`);t.push(`
---
## Hot Automations (full reference)

${l}`)}if(d.warm.length>0){let l=d.warm.map(r=>{let u=r.description?` \u2014 ${r.description}`:"";return r.digest?`- **${r.name}**${u}
  ${r.digest}`:`- **${r.name}**${u}`}).join(`
`);t.push(`
**Available automations (digest):** ${l}`)}if(d.cold.length>0){let l=d.cold.map(r=>{let u=r.description?` (${r.description})`:"";return`${r.name}${u}`}).join("; ");t.push(`
**Available automations (not loaded):** ${l}`)}}break}case"scripts":{let s=[B(o.path,"scripts",i)];if(i.inherit.tools&&n.length>1)for(let r=1;r<n.length;r++)s.push(B(n[r].path,"scripts",i));let d=new Set,l=[];for(let r of s)if(O(r))try{let u=i?.scripts?.extensions??bt,a=S((b,g)=>{if(!(g>2))try{let p=ie(b,{withFileTypes:!0});for(let f of p)if(!(f.name.startsWith("_")||f.name.startsWith("."))){if(f.isDirectory())a(M(b,f.name),g+1);else if(f.isFile()&&u.some(k=>f.name.endsWith(k))&&!d.has(f.name)){d.add(f.name);let k=M(b,f.name),A=St(k,f.name);l.push({name:f.name,dir:b,meta:A})}}}catch{}},"scanScriptDir");a(r,0)}catch{}if(l.length>0){let r=M(o.path,"state.json"),u={};try{u=JSON.parse(X(r,"utf-8")).scripts??{}}catch{}l.sort((g,p)=>{let f=u[g.name]?.count??0,k=u[p.name]?.count??0;return k!==f?k-f:g.name.localeCompare(p.name)});let a=[`## Available Scripts
`,`**Before coding, check if a script already handles the task. Read the associated muscle first.**
`,"| Script | What it does | Uses |","|--------|-------------|------|",...l.map(({name:g,dir:p,meta:f})=>{let k=u[g]?.count??0,A=k>0?`${k}`:"";return`| \`${g}\` | ${f.description} | ${A} |`}),"","Run with `bash <path>`. Use `--help` for options.",""],b=new Set;for(let{meta:g}of l)for(let p of g.relatedMuscles)b.add(p);if(b.size>0&&P.length>0){let g=[];for(let p of b){let f=P.find(k=>k.name===p);if(f){let k=l.filter(v=>v.meta.relatedMuscles.includes(p)).map(v=>v.name.replace(/\.sh$/,"")),A=f.digest?f.digest.replace(/^>\s*\*\*[^*]+\*\*\s*—\s*/,"").split(/\.\s/)[0].trim():"",$=A.length>80?A.slice(0,77)+"...":A;g.push(`| \`${p}\` | ${k.join(", ")} | ${$} |`)}}g.length>0&&a.push(`
### Script \u2194 Muscle Reference
`,`Read the full muscle before using its script.
`,"| Muscle | Used by | Summary |","|--------|---------|---------|",...g,"")}t.push(`
---
${a.join(`
`)}`)}break}case"git-context":{if(e?.skipGitContext)break;let s=i.boot.gitContext;if(!s.enabled)break;if(i.checkpoints?.diffOnBoot)try{let d=M(o.path,".git");if(O(d)){let l=i.checkpoints.maxDiffLines??80,r=W(`git diff HEAD~1 --stat --no-color 2>/dev/null | head -${l}`,{cwd:o.path,encoding:"utf-8",stdio:["pipe","pipe","pipe"]}).trim();r&&t.push(`
---
## .soma Changes (since last checkpoint)

\`\`\`
${r}
\`\`\`
`)}}catch{}try{let d=o.projectDir;W("git rev-parse --is-inside-work-tree",{cwd:d,stdio:"pipe"});let l=[`## Recent Changes (git)
`];if(s.maxCommits>0){let r="";if(s.since==="last-session"){let a=te(o,i.preload.staleAfterHours,i);a?r=`--since="${new Date(Date.now()-a.ageHours*36e5).toISOString()}"`:r='--since="24 hours ago"'}else/^\d+h$/.test(s.since)?r=`--since="${parseInt(s.since)} hours ago"`:/^\d+d$/.test(s.since)?r=`--since="${parseInt(s.since)} days ago"`:r=`--since="${s.since}"`;let u=W(`git log --oneline ${r} -${s.maxCommits} 2>/dev/null`,{cwd:d,encoding:"utf-8",stdio:["pipe","pipe","pipe"]}).trim();u&&(l.push(`### Commits
`),l.push("```"),l.push(u),l.push("```\n"))}if(s.diffMode!=="none"&&s.maxDiffLines>0){let r=s.diffMode==="full"?`git diff HEAD~5 --no-color 2>/dev/null | head -${s.maxDiffLines}`:`git diff HEAD~5 --stat --no-color 2>/dev/null | head -${s.maxDiffLines}`,u=W(r,{cwd:d,encoding:"utf-8",stdio:["pipe","pipe","pipe"]}).trim();u&&(l.push(`### Changed Files
`),l.push("```"),l.push(u),l.push("```\n"))}l.length>1&&t.push(`
---
${l.join(`
`)}`)}catch{}break}default:break}return t}S(ve,"runBootDiscovery"),h.on("session_start",async(n,e)=>{if(K){y.boot("session_start re-fired \u2014 skipping (already booted this session)"),we(e);return}K=!0,we(e);try{let a=e.sessionManager.getSessionFile?.()||"";fe=a&&a.split("/").pop()?.replace(/\.[^.]+$/,"")||""}catch{fe=""}L=he();let t=z();t&&t.provide("session:id",()=>L,{provider:"soma-boot",description:"Get current Soma session ID (e.g. s01-abc123)"});try{let a=it();a&&y.boot(`global ~/.soma/ bootstrapped: ${a}`)}catch(a){y.boot(`global ~/.soma/ bootstrap skipped: ${a}`)}if(o=pe(),!o){let a=dt(process.cwd()),b=Te(process.cwd());o=pe(),e.ui.notify(`\u{1F331} Soma planted at ${b}`,"info");let g=[];a.parent&&g.push(`Parent workspace detected at \`${a.parent.path}\` (${a.parent.distance} level${a.parent.distance>1?"s":""} up).`),a.claudeMd&&g.push(`CLAUDE.md found at \`${a.claudeMd.path}\` (${a.claudeMd.ageDays}d old). Review it as one input for understanding this project.`),a.agentsMd&&g.push(`AGENTS.md found at \`${a.agentsMd.path}\` (${a.agentsMd.ageDays}d old).`),a.signals.length>0&&g.push(`Detected stack: ${a.signals.join(", ")}.`),a.packageManager&&g.push(`Package manager: ${a.packageManager}.`);let p=g.length>0?`
**Context detected:**
${g.map(f=>`- ${f}`).join(`
`)}
`:"";e.hasUI&&h.sendUserMessage(`[Soma Boot \u2014 First Run]

Created memory at \`${b}\`.
`+p+`
A starter identity file is at \`${b}/identity.md\` (pre-filled with detected context).
Review it, examine the project structure, and rewrite it to reflect who you are in this context. Keep it specific and under 30 lines.`,{deliverAs:"followUp"})}let m=ye();i=je(m),y=me(o?.path??null,i.debug),y.enabled&&(y.boot(`session start \u2014 soma: ${o?.path}, cwd: ${process.cwd()}`),y.boot(`settings loaded from chain: [${m.map(a=>a.path).join(", ")}]`),y.boot(`session id: ${fe}`)),t&&(t.provide("soma:dir",()=>o,{provider:"soma-boot",description:"Get current SomaDir object"}),t.provide("soma:settings",()=>i,{provider:"soma-boot",description:"Get current SomaSettings object"}),t.provide("soma:sessionId",()=>L,{provider:"soma-boot",description:"Get current session ID string"}),t.provide("heat:save",()=>le(),{provider:"soma-boot",description:"Save all heat state (protocols, muscles, automations) to disk"}),t.provide("state:commit",a=>de(a),{provider:"soma-boot",description:"Auto-commit .soma/ state with label"}));let c=e.sessionManager.getEntries().some(a=>a.type==="message"),s=ve(m),d=i.protocols?.hotThreshold??3,l=i.muscles?.fullThreshold??3,r={hotProtocols:R.filter(a=>(C?.protocols?.[a.name]?.heat??0)>=d).map(a=>a.name).sort(),hotMuscles:P.filter(a=>a.heat>=l).map(a=>a.name).sort(),scriptNames:s.some(a=>a.includes("Available Scripts"))?[...new Set(E)].sort():[]};if(c){let a=e.sessionManager.getEntries().find($=>$.customType==="soma-boot"&&$.content?.fingerprint);if(a){let $=a.content.fingerprint,v=[],N=r.hotProtocols.filter(H=>!$.hotProtocols?.includes(H)),U=($.hotProtocols||[]).filter(H=>!r.hotProtocols.includes(H));N.length>0&&v.push(`**Newly hot protocols:** ${N.join(", ")}`),U.length>0&&v.push(`**Cooled protocols:** ${U.join(", ")}`);let j=r.hotMuscles.filter(H=>!$.hotMuscles?.includes(H)),G=($.hotMuscles||[]).filter(H=>!r.hotMuscles.includes(H));j.length>0&&v.push(`**Newly hot muscles:** ${j.join(", ")}`),G.length>0&&v.push(`**Cooled muscles:** ${G.join(", ")}`);let V=s.filter(H=>H.includes(".soma Changes")||H.includes("Recent Changes"));if(V.length>0&&v.push(...V),h.appendEntry("soma-boot",{timestamp:Date.now(),resumed:!0,fingerprint:r,diffed:!0}),v.length===0){Q=!0;let H=L?`
Session ID: \`${L}\``:"";y.boot("resume: no changes since last boot \u2014 minimal injection"),e.hasUI&&h.sendUserMessage(`[Soma Boot \u2014 resumed, no changes]

Identity, protocols, and muscles unchanged since last boot. System prompt is current. Continue where you left off.${H}`,{deliverAs:"followUp"})}else{Q=!0;let H=L?`
Session ID: \`${L}\``:"";y.boot(`resume: ${v.length} changes since last boot`),e.hasUI&&h.sendUserMessage(`[Soma Boot \u2014 resumed, delta only]

**Changes since last boot:**
${v.join(`
`)}

Everything else unchanged. System prompt is current.${H}`,{deliverAs:"followUp"})}return}y.boot("resume: no fingerprint \u2014 minimal boot (system prompt is current)"),Q=!0;let b=L?`
Session ID: \`${L}\``:"",g=o?M(B(o.path,"sessions",i),ae()):null,p=o?M(B(o.path,"preloads",i),re()):null,f=g||p?`

Session files:
${g?`- Session log: \`${g}\`
`:""}${p?`- Preload: \`${p}\`
`:""}`:"",k=s.filter($=>$.includes(".soma Changes")||$.includes("Recent Changes")),A=k.length>0?`

${k.join(`
`)}`:"";h.appendEntry("soma-boot",{timestamp:Date.now(),resumed:!0,fingerprint:r}),e.hasUI&&h.sendUserMessage(`[Soma Boot \u2014 resumed]

Identity, protocols, and muscles are in your system prompt. Continue where you left off.${A}${b}${f}`,{deliverAs:"followUp"});return}if(!c&&o){let a=M(o.path,".boot-target");if(O(a))try{let b=X(a,"utf-8"),g=JSON.parse(b);if(Ie(a),g.type==="map"&&g.name){let p=Ne(g.name,o,i);if(p){y.boot(`MAP loaded: ${p.name} (status: ${p.status})`),Oe(p),p.promptConfig&&(D=p.promptConfig,y.boot(`plan overrides active: ${Object.keys(p.promptConfig).join(", ")}`));let f=$t(g.name,o,i);f&&(s.unshift(`
---
## Targeted Preload (for MAP: ${p.name})

${f}
`),y.boot(`targeted preload injected for MAP: ${p.name}`));let k=ne(p.content);s.push(`
---
## Active MAP: ${p.name}

${k}
`)}else y.boot(`MAP not found: ${g.name}`),s.push(`
\u26A0\uFE0F MAP "${g.name}" not found in automations/maps/
`)}if(g.type==="focus"&&g.keyword){y.boot(`focus mode: "${g.keyword}"`);let p=g.promptConfig??{};if(P&&P.length>0){let $=yt(P,g.keyword);if($.length>0){let v=p.heatOverrides?.muscles??{},N=p.forceInclude?.muscles??[];for(let{muscle:U,score:j}of $){let G=v[U.name]??0;j>=8&&!N.includes(U.name)&&N.push(U.name),j+2>G&&(v[U.name]=j+2)}p.heatOverrides={...p.heatOverrides,muscles:v},p.forceInclude={...p.forceInclude,muscles:N},y.boot(`focus: ${$.length} muscles matched via triggers/tags/keywords`)}}if(D=p,p&&y.boot(`focus overrides: ${Object.keys(p).join(", ")}`),g.preloadPath){let $=null;try{let v=M(o.path,g.preloadPath);O(v)&&($=X(v,"utf-8"))}catch{}$&&(s.unshift(`
---
## Focus Context: ${g.keyword}

${$}
`),y.boot(`focus preload injected: ${g.preloadPath}`))}let f=g.relatedMaps??[],k=f.slice(0,3);for(let $ of k){let v=Ne($,o,i);if(v){let N=ne(v.content);if(s.push(`
---
## Related MAP: ${v.name}

${N}
`),y.boot(`focus MAP loaded: ${v.name}`),v.promptConfig){let U=v.promptConfig;if(U.heatOverrides?.muscles){let j=p.heatOverrides?.muscles??{};for(let[G,V]of Object.entries(U.heatOverrides.muscles))V>(j[G]??0)&&(j[G]=V);p.heatOverrides={...p.heatOverrides,muscles:j}}if(U.heatOverrides?.protocols){let j=p.heatOverrides?.protocols??{};for(let[G,V]of Object.entries(U.heatOverrides.protocols))V>(j[G]??0)&&(j[G]=V);p.heatOverrides={...p.heatOverrides,protocols:j}}if(U.forceInclude?.muscles){let j=p.forceInclude?.muscles??[];for(let G of U.forceInclude.muscles)j.includes(G)||j.push(G);p.forceInclude={...p.forceInclude,muscles:j}}U.supplementaryIdentity&&!p.supplementaryIdentity?.includes(U.supplementaryIdentity)&&(p.supplementaryIdentity=(p.supplementaryIdentity??"")+`
`+U.supplementaryIdentity),y.boot(`focus: merged MAP ${v.name} prompt-config`),D=p}Oe(v)}}f.length>3&&s.push(`
*${f.length-3} more related MAPs available: ${f.slice(3).join(", ")}*
`);let A=(g.relatedSessions??[]).length;s.push(`
---
**\u{1F50D} Focused on: "${g.keyword}"** \u2014 ${k.length} MAPs loaded, ${A} related sessions found.
`)}}catch(b){y.boot(`boot-target read failed: ${b}`);try{Ie(a)}catch{}}}let u=process.env.SOMA_INHALE==="1";if(!c&&o&&u){let a=te(o,i.preload.staleAfterHours,i);if(a&&!a.stale){let p=a.stale?" \u26A0\uFE0Fstale":"";s.unshift(`
---
## Preload (from last session${p})

${a.content}
`),y.boot(`preload auto-injected: ${a.name} (${Math.floor(a.ageHours)}h old)`)}let b=Math.min(i.preload.lastSessionLogs??0,5);if(b>0&&o)try{let p=B(o.path,"sessions",i);if(O(p)){let f=ie(p).filter(k=>k.endsWith(".md")&&!k.startsWith(".")&&!k.startsWith("_")).sort().reverse().slice(0,b);if(f.length>0){let k=f.map(A=>{let $=X(M(p,A),"utf-8").trim(),v=3e3,N=$.length>v?$.slice(0,v)+`

[... truncated \u2014 full log: memory/sessions/${A}]`:$;return`### ${A}

${N}`});s.unshift(`---
## Recent Session Logs (${f.length})

${k.join(`

---

`)}
`),y.boot(`session logs injected: ${f.length} files`)}}}catch(p){y.boot(`session log injection failed: ${p}`)}let g=i.preload.lastMessages??10;if(g>0)try{let p=e.sessionManager.getSessionFile?.()||void 0,f=Fe(g,p);if(f.length>0){let k=Le(f);s.unshift(k),y.boot(`conversation tail injected: ${f.length} messages`)}}catch(p){y.boot(`conversation tail scan failed: ${p}`)}try{let p=vt(o.path);if(p.length>0){let f=`---
## Session Warnings (from previous session)

${p.join(`
`)}

**Tool preference:** script > ls > grep > find (find hangs on large trees)
`;s.unshift(f),y.boot(`session warnings injected: ${p.length}`)}}catch(p){y.boot(`session warnings failed: ${p}`)}}if(s.length>0){Q=!0,h.appendEntry("soma-boot",{timestamp:Date.now(),resumed:c,fingerprint:r});let a=L?`
Session ID: \`${L}\``:"",b=o?M(B(o.path,"sessions",i),ae()):null,g=o?M(B(o.path,"preloads",i),re()):null,p=b||g?`

Session files:
${b?`- Session log: \`${b}\`
`:""}${g?`- Preload: \`${g}\`
`:""}`:"",f=s.some(A=>A.includes("## Preload (from last session")),k=c?`You've resumed a Soma session. Your preload and hot protocols are above. Identity and behavioral rules are in your system prompt. If the preload has an "Orient From" section, read those files before doing anything else. Then greet the user briefly and await instructions.${a}${p}`:f?`You've booted into a fresh Soma session with a preload from your past self. **The preload's Resume Point is your ground truth** \u2014 trust it over conversation history. When conversation tail and preload conflict, the preload wins (it's curated; conversation tail is raw). Your first message MUST state: (1) what you're resuming from the preload, (2) what's next. If the preload has "Orient From" targets, read those before starting any work. Do not re-discover what the preload already tells you.${a}${p}`:`You've booted into a fresh Soma session. Identity and behavioral rules are in your system prompt. Hot protocols are above if any. Greet the user briefly and await instructions.${a}${p}`;e.hasUI&&h.sendUserMessage(`[Soma Boot${c?" \u2014 resumed":""}]

${s.join(`
`)}

${k}`,{deliverAs:"followUp"})}}),h.on("before_agent_start",async(n,e)=>{if(!o||!Q)return;let t=T??n.systemPrompt;if(!F&&i){let m=h.getActiveTools?.()??[],c=h.getAllTools?.()??[];if(m.length>0)t=De({protocols:R,protocolState:C,muscles:P,settings:i,piSystemPrompt:n.systemPrompt,activeTools:m,allTools:c,agentDir:He,identity:w,planOverrides:D??void 0}).block,T=t,F=!0,y.systemPrompt(t),y.boot(`system prompt compiled (${t.length} chars, ${R.length} protocols, ${P.length} muscles${D?", with plan overrides":""})`);else{let s=ct({protocols:R,protocolState:C,muscles:P,settings:i,planOverrides:D??void 0});s.block&&(t=s.block+`

---

`+n.systemPrompt,T=t,F=!0)}}return{systemPrompt:t}});let ge=0,We=5;h.on("turn_end",async()=>{ge++,ge>=We&&(ge=0,de("periodic"))}),h.on("session_switch",async(n,e)=>{if(n.reason==="new"&&(x=!1,K=!1,I=new Set,_=new Set,Z=new Set,F=!1,T=null,z()?.emit("session:reset",{reason:"new"}),o)){let m=ye();i=je(m);let c=ve(m,{skipGitContext:!0}),s=te(o,i.preload?.staleAfterHours,i);if(s&&!s.stale&&c.unshift(`
---
## Preload (from last session)

${s.content}
`),c.length>0&&e.hasUI){let d=M(B(o.path,"sessions",i),ae()),l=M(B(o.path,"preloads",i),re()),r=`

Session files:
- Session log: \`${d}\`
- Preload: \`${l}\`
`,u=`[Soma Boot \u2014 rotated session]

${c.join(`
`)}

You've rotated into a fresh session. Identity and behavioral rules are in your system prompt. Hot protocols and muscles are above. `+(s?`Your preload from the previous session is included above. **The preload's Resume Point is your ground truth.** Your first message MUST state what you're resuming and what's next. If it has "Orient From" targets, read those before starting work. Do not re-discover what the preload already tells you.`:"Greet the user briefly and await instructions.")+r;z()?.provide("boot:rotationMessage",()=>u,{provider:"soma-boot",description:"Queued boot message for post-rotation delivery"})}}}),h.on("session_shutdown",async()=>{o&&le()});let _e=[{match:S((n,e)=>n==="write"&&typeof e?.content=="string"&&e.content.startsWith(`---
`),"match"),target:"frontmatter-standard",type:"protocol"},{match:S((n,e)=>n==="bash"&&typeof e?.command=="string"&&/git (config|commit|push|remote)/.test(e.command),"match"),target:"git-identity",type:"protocol"},{match:S((n,e)=>n==="write"&&typeof e?.path=="string"&&/preload|continuation/.test(e.path),"match"),target:"breath-cycle",type:"protocol"},{match:S((n,e)=>n==="bash"&&typeof e?.command=="string"&&/checkpoint:|\.soma.*git (add|commit)/.test(e.command),"match"),target:"session-checkpoints",type:"protocol"},{match:S((n,e)=>n==="write"&&typeof e?.path=="string"&&e.path.endsWith(".svg"),"match"),target:"svg-logo-design",type:"muscle"}];h.on("tool_result",async n=>{if(!o||!C||!i?.heat.autoDetect)return;let e=n.toolName,t=n.input,m=n.content?.map(s=>s.text||"").join("")||"",c=i.heat.autoDetectBump;if(e==="read"&&typeof t?.path=="string"){let s=t.path;if(/muscles\/[^/]+\.md$/.test(s)){let d=s.replace(/^.*muscles\//,"").replace(/\.md$/,"");E.includes(d)&&!_.has(d)&&(_.add(d),ue(o,d,c,i),y.heat(`muscle read: ${d} +${c} (dynamic: file read)`))}}if(e==="bash"&&typeof t?.command=="string"){let d=t.command.match(/(?:bash|sh)\s+(?:.*\/)?scripts\/([\w.-]+\.sh)/);if(d){let l=d[1];y.heat(`script executed: ${l} (dynamic: bash command)`);try{let r=M(o.path,"state.json"),u=O(r)?JSON.parse(X(r,"utf-8")):{};u.scripts||(u.scripts={}),u.scripts[l]||(u.scripts[l]={count:0,lastUsed:""}),u.scripts[l].count+=1,u.scripts[l].lastUsed=new Date().toISOString().slice(0,10),Me(r,JSON.stringify(u,null,"	")+`
`)}catch(r){y.heat(`failed to persist script usage: ${r}`)}}}for(let s of _e)s.match(e,t,m)&&(s.type==="protocol"&&q.includes(s.target)?I.has(s.target)||(I.add(s.target),$e(C,s.target,"applied"),y.heat(`protocol detected: ${s.target} (auto-detect from tool_result)`)):s.type==="muscle"&&E.includes(s.target)&&(_.has(s.target)||(_.add(s.target),ue(o,s.target,c,i),y.heat(`muscle detected: ${s.target} +${c} (auto-detect from tool_result)`))))});function ee(){F=!1,T=null}S(ee,"invalidateCompiledPrompt");function ce(n){let e=z();e&&(n.newSession&&e.provide("session:new",n.newSession.bind(n),{provider:"soma-boot",description:"Start fresh session (clears messages, fires session_switch)"}),n.compact&&e.provide("session:compact",n.compact.bind(n),{provider:"soma-boot",description:"Trigger context compaction"}),n.reload&&e.provide("session:reload",n.reload.bind(n),{provider:"soma-boot",description:"Reload all extensions without restarting process"}),n.waitForIdle&&e.provide("session:waitForIdle",n.waitForIdle.bind(n),{provider:"soma-boot",description:"Wait for agent to stop streaming before acting"}),n.fork&&e.provide("session:fork",n.fork.bind(n),{provider:"soma-boot",description:"Fork session from a specific entry"}),n.navigateTree&&e.provide("session:navigate",n.navigateTree.bind(n),{provider:"soma-boot",description:"Navigate to different point in session tree"}),n.switchSession&&e.provide("session:switch",n.switchSession.bind(n),{provider:"soma-boot",description:"Switch to a different session file"}))}S(ce,"provideCommandCapabilities");function we(n){let e=z();e&&(n.getContextUsage&&e.provide("context:usage",n.getContextUsage.bind(n),{provider:"soma-boot",description:"Get context token usage ({ percent, tokensUsed, tokenLimit })"}),n.getSystemPrompt&&e.provide("context:systemPrompt",n.getSystemPrompt.bind(n),{provider:"soma-boot",description:"Get current compiled system prompt"}),n.ui?.notify&&e.provide("ui:notify",n.ui.notify.bind(n.ui),{provider:"soma-boot",description:"Show UI notification (message, level)"}),e.provide("message:send",(t,m)=>{h.sendUserMessage(t,m)},{provider:"soma-boot",description:"Send user message to agent (does NOT trigger /commands)"}))}S(we,"provideEventCapabilities"),h.registerCommand("pin",{description:"Pin a protocol or muscle to hot \u2014 keeps it loaded across sessions",handler:S(async(n,e)=>{ce(e);let t=n.trim();if(!t){e.ui.notify("Usage: /pin <protocol-or-muscle-name>","info");return}if(!o||!C){e.ui.notify("No soma booted","error");return}q.includes(t)?($e(C,t,"pinned"),se(o,C),I.add(t),ee(),e.ui.notify(`\u{1F4CC} ${t} pinned (heat locked hot) \u2014 prompt will recompile`,"info")):E.includes(t)?(ue(o,t,i?.heat.pinBump??5,i),_.add(t),ee(),e.ui.notify(`\u{1F4CC} ${t} pinned (heat bumped to hot) \u2014 prompt will recompile`,"info")):J.includes(t)?(Ue(o,t,i?.heat.pinBump??5,i),Z.add(t),ee(),e.ui.notify(`\u{1F4CC} ${t} automation pinned (heat bumped to hot) \u2014 prompt will recompile`,"info")):e.ui.notify(`Unknown protocol, muscle, or automation: ${t}`,"error")},"handler")}),h.registerCommand("kill",{description:"Kill a protocol, muscle, or automation \u2014 drops heat to zero",handler:S(async(n,e)=>{let t=n.trim();if(!t){e.ui.notify("Usage: /kill <name>","info");return}if(!o||!C){e.ui.notify("No soma booted","error");return}q.includes(t)?($e(C,t,"killed"),se(o,C),ee(),e.ui.notify(`\u{1F480} ${t} killed (heat \u2192 0) \u2014 prompt will recompile`,"info")):E.includes(t)?(ue(o,t,-15,i),ee(),e.ui.notify(`\u{1F480} ${t} killed (heat \u2192 0) \u2014 prompt will recompile`,"info")):J.includes(t)?(Ue(o,t,-15,i),ee(),e.ui.notify(`\u{1F480} ${t} automation killed (heat \u2192 0) \u2014 prompt will recompile`,"info")):e.ui.notify(`Unknown protocol, muscle, or automation: ${t}`,"error")},"handler")}),h.registerCommand("auto-commit",{description:"Toggle auto-commit of .soma/ state on exhale/breathe",getArgumentCompletions:S(n=>["on","off","status"].filter(e=>e.startsWith(n)).map(e=>({value:e,label:e})),"getArgumentCompletions"),handler:S(async(n,e)=>{if(!o||!i){e.ui.notify("No soma booted","error");return}let t=n.trim().toLowerCase();if(t==="status"||!t){let m=i.checkpoints?.soma?.autoCommit??!0,c=i.checkpoints?.project?.autoCheckpoint??!1;e.ui.notify(`Auto-commit status:
  .soma/ state: ${m?"\u2705 on":"\u274C off"}
  project code: ${c?"\u2705 on":"\u274C off"}

Toggle: /auto-commit on | /auto-commit off
Persists in settings.json via checkpoints.soma.autoCommit`,"info");return}if(t==="on"||t==="off"){let m=t==="on";i.checkpoints||(i.checkpoints={}),i.checkpoints.soma||(i.checkpoints.soma={}),i.checkpoints.soma.autoCommit=m;try{let c=M(o.path,"settings.json"),s=O(c)?JSON.parse(X(c,"utf-8")):{};s.checkpoints||(s.checkpoints={}),s.checkpoints.soma||(s.checkpoints.soma={}),s.checkpoints.soma.autoCommit=m,Me(c,JSON.stringify(s,null,2)+`
`),e.ui.notify(`${m?"\u2705":"\u274C"} Auto-commit .soma/ state: ${t}`,"info")}catch(c){e.ui.notify(`\u26A0\uFE0F Updated in-memory but failed to persist: ${c?.message?.slice(0,80)}`,"warning")}return}e.ui.notify("Usage: /auto-commit on | off | status","info")},"handler")});function de(n){let e=i?.checkpoints;if(!(e?.soma?.autoCommit??!0)||!o)return null;let m=e?.project?.prefix??"checkpoint:",c=new Date().toISOString().replace(/\.\d+Z$/,"Z");try{let s=M(o.path,".git");if(!O(s))try{W("git init -b main",{cwd:o.path,stdio:"pipe"}),W("git add -A",{cwd:o.path,stdio:"pipe"}),W('git commit -m "init: .soma/ state tracking"',{cwd:o.path,stdio:"pipe"})}catch{return null}return W("git add -A",{cwd:o.path,stdio:"pipe"}),W("git status --porcelain",{cwd:o.path,encoding:"utf-8",stdio:"pipe"}).trim()?(W(`git commit -m "${m} ${n} ${c}"`,{cwd:o.path,stdio:"pipe"}),`Committed .soma/ state: ${m} ${n}`):null}catch{return null}}S(de,"autoCommitSomaState");let ke=S(async(n,e)=>{if(!o){e.ui.notify("No .soma/ found. Run /soma init first.","error");return}let t=B(o.path,"preloads",i),m=M(t,re()),c=new Date().toISOString().split("T")[0],s=M(B(o.path,"sessions",i),ae());le();let d=de("exhale");d&&e.ui.notify(`\u2705 ${d}`,"info");let l=i?.checkpoints,{template:r,steps:u}=mt({target:m,logPath:s,today:c,sessionId:L,autoCheckpoint:l?.project?.autoCheckpoint??!1,checkpointPrefix:l?.project?.prefix??"checkpoint:"});h.sendUserMessage(`[EXHALE \u2014 save session state]

${u.join(`

`)}

${r}

**Final step:** Say "FLUSH COMPLETE".`,{deliverAs:"followUp"}),e.ui.notify("Exhale initiated \u2014 write preload, then FLUSH COMPLETE","info")},"exhaleHandler");h.registerCommand("exhale",{description:"Exhale \u2014 save session state",handler:ke}),h.registerCommand("rest",{description:"Rest \u2014 disable keepalive, save state, end session",handler:S(async(n,e)=>{ce(e);let m=z()?.get("keepalive:toggle");m&&m(!1),e.ui.notify("\u{1F4A4} Keepalive disabled \u2014 entering rest mode","info"),await ke(n,e)},"handler")}),h.registerCommand("inhale",{description:"Inhale \u2014 reset session and load preload from last session",handler:S(async(n,e)=>{if(ce(e),!o){e.ui.notify("No .soma/ \u2014 nothing to inhale. Run /soma init first.","info");return}let t=te(o);if(!t){e.ui.notify("\u{1FAE7} No preload found \u2014 nothing to inhale.","info");return}n.includes("--heat-saved")||le();let c=de("inhale");c&&e.ui.notify(`\u2705 ${c}`,"info"),e.ui.notify("\u{1FAE7} Inhaling \u2014 resetting session with preload...","info");try{if(!(await e.newSession({})).cancelled){let r=z()?.get("boot:rotationMessage")?.();if(r)h.sendUserMessage(r,{deliverAs:"followUp"}),e.ui.notify("\u2705 Inhaled \u2014 fresh session with preload injected","info");else{let u=t.stale?` \u26A0\uFE0F (${Math.floor(t.ageHours)}h old \u2014 may be stale)`:"";h.sendUserMessage(`[Soma Inhale \u2014 Loading Preload${u}]

${t.content}`,{deliverAs:"followUp"}),e.ui.notify(`\u2705 Inhaled \u2014 preload injected (${Math.floor(t.ageHours)}h old)`,"info")}}}catch(s){e.ui.notify(`\u274C Inhale failed: ${s?.message?.slice(0,100)}`,"error");let d=t.stale?` \u26A0\uFE0F (${Math.floor(t.ageHours)}h old \u2014 may be stale)`:"";h.sendUserMessage(`[Soma Inhale \u2014 Loading Preload (fallback, session not reset)${d}]

${t.content}`,{deliverAs:"followUp"})}},"handler")}),h.registerCommand("soma",{description:"Soma memory status and management",getArgumentCompletions:S(n=>["status","init","prompt","prompt full","prompt identity","preload","debug","debug on","debug off"].filter(e=>e.startsWith(n)).map(e=>({value:e,label:e})),"getArgumentCompletions"),handler:S(async(n,e)=>{ce(e);let t=n.trim().toLowerCase()||"status";if(t==="init"){if(o){e.ui.notify(`Soma already planted at ${o.path}`,"info");return}let m=Te(process.cwd());o=pe(),e.ui.notify(`\u{1F331} Soma planted at ${m}`,"info");return}if(t.startsWith("prompt")){if(!o||!i){e.ui.notify("No Soma found. Use /soma init","info");return}let m=t.replace("prompt","").trim(),c=h.getActiveTools?.()??[],s=h.getAllTools?.()??[],d=e.getSystemPrompt?.()??"",l=De({protocols:R,protocolState:C,muscles:P,settings:i,piSystemPrompt:d||"You are an expert coding assistant operating inside pi",activeTools:c,allTools:s,agentDir:He,identity:w,planOverrides:D??void 0}),r=[["Soma core","You are Soma"],["Identity","# Identity"],["Behavioral rules","## Active Behavioral Rules"],["Learned patterns","## Learned Patterns"],["Tools","Available tools:"],["Guard","## Guard"],["Soma docs","Soma documentation"],["External context","## External Project Context"],["Skills","<available_skills>"],["Date/time","Current date and time:"]],u=R.map($=>({name:$.name,heat:nt($,C)})).sort(($,v)=>v.heat-$.heat),a=i.protocols?.warmThreshold??3,b=i.protocols?.hotThreshold??8,g=i.muscles?.digestThreshold??1,p=i.muscles?.fullThreshold??4;if(m==="full"){h.sendUserMessage(`[/soma prompt full \u2014 compiled system prompt (${l.estimatedTokens} tokens)]

\`\`\`
`+l.block+"\n```",{deliverAs:"followUp"});return}if(m==="identity"){h.sendUserMessage(`[/soma prompt identity]

**Built identity:** ${w?`${w.length} chars`:"\u274C NONE"}
**In compiled prompt:** ${l.block.includes("# Identity")?"\u2705 yes":"\u274C NO \u2014 BUG"}
**persona.name:** ${i.persona?.name??"(null)"}
**identityInSystemPrompt:** ${i.systemPrompt?.identityInSystemPrompt??"(default: true)"}

`+(w?"```\n"+w.slice(0,2e3)+"\n```":"No identity found in chain."),{deliverAs:"followUp"});return}let f=[];f.push(`**Compiled System Prompt** \u2014 ${l.block.length} chars (~${l.estimatedTokens} tokens)`),f.push(`Full replacement: ${l.fullReplacement} | Cached: ${F}`),f.push(""),f.push("**Sections:**");for(let[$,v]of r){let N=l.block.includes(v);f.push(`  ${N?"\u2705":"\u274C"} ${$}`)}f.push(""),f.push(`**Identity:** ${w?`${w.length} chars`:"\u274C NONE"} \u2192 ${l.block.includes("# Identity")?"in prompt \u2705":"MISSING from prompt \u274C"}`),f.push(`  persona.name: ${i.persona?.name??"(null)"} | emoji: ${i.persona?.emoji??"(null)"}`),f.push(""),f.push(`**Protocols:** ${l.protocolCount} in prompt (max ${i.protocols?.maxBreadcrumbsInPrompt??12})`);for(let $ of u){let v=$.heat>=b?"\u{1F534}":$.heat>=a?"\u{1F7E1}":"\u26AA",N=$.heat>=a?"\u2705":"\u2014";f.push(`  ${v} ${$.name}: heat=${$.heat} ${N}`)}f.push(""),f.push(`**Muscles:** ${l.muscleCount} digests in prompt (max ${i.muscles?.maxDigest??5})`);for(let $ of P.slice(0,10)){let v=$.heat>=p?"\u{1F534}":$.heat>=g?"\u{1F7E1}":"\u26AA",N=$.status!=="active"?` [${$.status}]`:"";f.push(`  ${v} ${$.name}: heat=${$.heat}${N}`)}f.push("");let k=e.getContextUsage?.();f.push("**Runtime:**"),f.push(`  Context: ${k?.percent!=null?Math.round(k.percent)+"%":"unknown"}`);let A=z()?.get("breathe:state")?.()??{};f.push(`  Warnings sent at: ${A.pct>0?Math.round(A.pct)+"%":"none yet"}`),f.push(`  Thresholds: ${JSON.stringify(i.context??{notifyAt:50,warnAt:70,urgentAt:80,autoExhaleAt:85})}`),f.push(""),f.push("\u{1F4A1} `/soma prompt full` \u2014 dump compiled prompt | `/soma prompt identity` \u2014 identity debug"),e.ui.notify(f.join(`
`),"info");return}if(t==="status"){if(!o){e.ui.notify("No Soma found. Use /soma init","info");return}let m=te(o),c=ye(),s=Ae(c);e.ui.notify([`\u{1F33F} Soma: ${o.path} (${o.rootName}/)`,`Chain: ${c.length} level${c.length!==1?"s":""}`,`Preload: ${m?"\u2713":"none"}`,`Protocols: ${s.length}`,`System prompt: ~${F?"compiled":"pending"}`].join(`
`),"info");return}if(t==="preload"){if(!o){e.ui.notify("No .soma/ found","info");return}let m=te(o);if(m){let c=m.stale?" \u26A0\uFE0Fstale":"";e.ui.notify(`${m.name} (${Math.floor(m.ageHours)}h ago${c})`,"info")}else e.ui.notify("No preloads found","info");return}if(t.startsWith("debug")){let m=t.replace("debug","").trim()||"status";if(m==="status"){let c=o?M(o.path,"debug"):null,s=c&&O(c);e.ui.notify(`Debug mode: ${y.enabled?"ON \u{1F534}":"OFF"}
Debug dir: ${c||"(no .soma/)"}
`+(s?"Logs exist \u2014 read .soma/debug/ for diagnostics":"No debug logs yet"),"info");return}if(m==="on"){if(!o){e.ui.notify("No .soma/ found.","error");return}y=me(o.path,!0),y.boot("debug mode enabled via /soma debug on"),e.ui.notify("\u{1F534} Debug mode ON \u2014 logging to .soma/debug/","info");return}if(m==="off"){y.enabled&&y.boot("debug mode disabled via /soma debug off"),y=me(null),e.ui.notify("Debug mode OFF","info");return}e.ui.notify("Usage: /soma debug on|off|status","info");return}e.ui.notify("Usage: /soma status | init | prompt [full|identity] | preload | debug [on|off]","info")},"handler")});let oe=["protocol","muscle","skill","template"];h.registerCommand("install",{description:"Install a protocol, muscle, skill, or template from the Soma Hub",getArgumentCompletions:S(n=>oe.filter(e=>e.startsWith(n)).map(e=>({value:e,label:`${e} \u2014 install a ${e} from hub`})),"getArgumentCompletions"),handler:S(async(n,e)=>{if(!o){e.ui.notify("No .soma/ found. Run /soma init first.","error");return}let t=n.trim().split(/\s+/),m=t.includes("--force"),c=t.filter(l=>l!=="--force");if(c.length<2){e.ui.notify(`Usage: /install <type> <name> [--force]
Types: protocol, muscle, skill, template`,"info");return}let s=c[0],d=c[1];if(!oe.includes(s)){e.ui.notify(`Invalid type: ${s}. Use: ${oe.join(", ")}`,"error");return}e.ui.notify(`\u{1F4E6} Installing ${s}: ${d}...`,"info");try{let l=await rt(o,s,d,{force:m});if(l.success){let r=[`\u2705 Installed ${s}: ${d}`];if(l.path&&r.push(`   \u2192 ${l.path}`),l.dependencies&&l.dependencies.length>0){r.push("   Dependencies:");for(let u of l.dependencies){let a=u.success?"\u2713":u.error?.includes("Already exists")?"\xB7":"\u2717";r.push(`     ${a} ${u.type}: ${u.name}${u.error?` (${u.error})`:""}`)}}e.ui.notify(r.join(`
`),"info"),(s==="protocol"||s==="muscle")&&e.ui.notify("\u{1F4A1} New content will load on next session boot (or /breathe to rotate now)","info")}else e.ui.notify(`\u274C ${l.error||"Install failed"}`,"error")}catch(l){e.ui.notify(`\u274C Install error: ${l.message}`,"error")}},"handler")}),h.registerCommand("list",{description:"List installed or remote Soma content",getArgumentCompletions:S(n=>["local","remote",...oe].filter(e=>e.startsWith(n)).map(e=>({value:e,label:e})),"getArgumentCompletions"),handler:S(async(n,e)=>{let t=n.trim().split(/\s+/).filter(Boolean),m=t[0]||"local",c=t[1];if(m==="remote"){e.ui.notify("\u{1F50D} Fetching from hub...","info");try{let r=await at(c);if(r.length===0){e.ui.notify("No remote content found.","info");return}let u={};for(let b of r)u[b.type]||(u[b.type]=[]),u[b.type].push(b.name);let a=["\u{1F4E1} Hub content:"];for(let[b,g]of Object.entries(u))a.push(`  ${b}s: ${g.join(", ")}`);a.push(`
Install: /install <type> <name>`),e.ui.notify(a.join(`
`),"info")}catch(r){e.ui.notify(`\u274C Failed to fetch: ${r.message}`,"error")}return}if(!o){e.ui.notify("No .soma/ found.","info");return}let s=lt(o,c&&oe.includes(c)?c:void 0);if(s.length===0){e.ui.notify("No local content found. Try /list remote to see what's available.","info");return}let d={};for(let r of s)d[r.type]||(d[r.type]=[]),d[r.type].push(r.name);let l=["\u{1F4CB} Installed content:"];for(let[r,u]of Object.entries(d))l.push(`  ${r}s: ${u.join(", ")}`);e.ui.notify(l.join(`
`),"info")},"handler")});let Ce=S((n,e)=>{let t=n.trim().split(/\s+/).filter(Boolean);if(t.length===0)return{error:`Usage:
  /scrape <name>              Resolve + pull docs for a project
  /scrape <name> --resolve    Just show what's available (don't pull)
  /scrape <topic> --discover  Broad search across GitHub, npm, MDN
  /scrape --list              Show all scraped sources
  /scrape <name> --show       Show what we have locally
  /scrape <name> --update     Re-pull latest docs

Options: --full, --provider <github|npm|mdn|css|skills|code>`};let m=[],c=[],s="";for(let u=0;u<t.length;u++)t[u]==="--provider"&&t[u+1]?s=t[++u]:t[u].startsWith("--")?m.push(t[u].replace(/^--/,"")):c.push(t[u]);let d=c.join(" "),l=`${e}/amps/scripts/soma-scrape.sh`,r;return m.includes("list")?r=`bash "${l}" list`:m.includes("discover")?(r=`bash "${l}" discover "${d}"`,s&&(r+=` --provider ${s}`)):m.includes("resolve")?r=`bash "${l}" resolve "${d}"`:m.includes("show")?r=`bash "${l}" show "${d}"`:m.includes("update")?r=`bash "${l}" update "${d}"`:(r=`bash "${l}" pull "${d}"`,m.includes("full")&&(r+=" --full")),{cmd:r,display:r.replace(l,"soma-scrape.sh")}},"buildScrapeCmd"),Pe=S((n,e)=>{let t=n.trim().split(/\s+/).filter(Boolean);return t.length===0?{error:`Usage:
  /code find <pattern> [path]     \u2014 grep with file:line format
  /code lines <file> <start> [end] \u2014 show exact lines
  /code map <file>                 \u2014 function/class index
  /code refs <symbol> [path]       \u2014 all references (def vs use)
  /code replace <file> <ln> <old> <new>
  /code structure [path]           \u2014 file tree with sizes
  /code physics [path]             \u2014 all motion/animation code
  /code events [path]              \u2014 event listeners/dispatchers
  /code css-vars [path]            \u2014 CSS custom property audit
  /code config [path]              \u2014 config/options objects

Default target: $SOMA_SHELL_DIR (gravicity-io/shell)`}:{cmd:`bash "${`${e}/amps/scripts/soma-code.sh`}" ${t.join(" ")}`,display:`soma-code.sh ${t.join(" ")}`}},"buildCodeCmd");h.registerCommand("code",{description:"Fast codebase navigator. Usage: /code <find|lines|map|refs|replace|structure|physics|events|css-vars|config> [args]",handler:S(async(n,e)=>{if(!o){e.ui.notify("No .soma/ found.","error");return}let t=z();t&&!t.get("code:build")&&t.provide("code:build",Pe,{provider:"soma-boot",description:"Build a soma-code.sh command from args string"});let m=t?.get("code:build"),c=m?m(n,o.path):Pe(n,o.path);if("error"in c){e.ui.notify(c.error,"info");return}e.ui.notify(`\u{1F50D} Running: ${c.display}`,"info")},"handler")}),h.registerCommand("scrape",{description:"Scrape docs for a tool, library, or topic. Usage: /scrape <name|topic> [--discover] [--provider github|npm|mdn|css|skills]",handler:S(async(n,e)=>{if(!o){e.ui.notify("No .soma/ found.","error");return}let t=z();t&&!t.get("scrape:build")&&t.provide("scrape:build",Ce,{provider:"soma-boot",description:"Build a soma-scrape.sh command from args string"});let m=t?.get("scrape:build"),c=m?m(n,o.path):Ce(n,o.path);if("error"in c){e.ui.notify(c.error,"info");return}e.ui.notify(`\u{1F50D} Running: ${c.display}`,"info")},"handler")}),h.registerCommand("scan-logs",{description:"Scan conversation logs. Usage: /scan-logs [count] [--send] | /scan-logs tools <pattern> [--results] [--tool bash|read] [--last N] [--send]",handler:S(async(n,e)=>{let t=(n?.trim()||"").split(/\s+/).filter(Boolean),m=t.includes("--send"),c=t.filter(r=>r!=="--send"),s=S(r=>{m?h.sendUserMessage(`[scan-logs results]

${r}`):e.ui.notify(`\u{1F4DC} Session Analysis:

${r}`,"info")},"deliver");if(c[0]==="tools"&&c.length>=2){if(!o){e.ui.notify("No .soma/ found.","error");return}let r=M(o.path,"amps","scripts","soma-stats.sh");if(!O(r)){e.ui.notify("soma-stats.sh not found.","error");return}let u=c.slice(1).join(" "),a=`bash "${r}" tools ${u} --cwd "${process.cwd()}"`;if(m)try{let b=W(a,{encoding:"utf-8",timeout:15e3,stdio:["pipe","pipe","pipe"]}).trim();s(b||"No matching tool calls found.")}catch(b){s(b.stdout?.trim()||"No matching tool calls found.")}else e.ui.notify(`\u{1F50D} Searching tool calls: \`soma-stats.sh tools ${u}\``,"info");return}let d=10;for(let r of c)/^\d+$/.test(r)&&(d=parseInt(r,10));let l=e.sessionManager.getSessionFile?.()||void 0;try{let r=Fe(d,l),u="";if(r.length>0?u+=Le(r):u+=`No recent conversation logs found.
`,o){let a=M(o.path,"amps","scripts","soma-stats.sh");if(O(a))try{let b=W(`bash "${a}" --cwd "${process.cwd()}"`,{encoding:"utf-8",timeout:5e3,stdio:["pipe","pipe","pipe"]}).trim();u+=`
${b}
`}catch{}}s(u)}catch(r){e.ui.notify(`Failed to scan logs: ${r}`,"error")}},"handler")})}S(kt,"somaBootExtension");export{kt as default};
