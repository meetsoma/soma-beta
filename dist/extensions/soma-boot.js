var Ke=Object.defineProperty;var b=(h,t)=>Ke(h,"name",{value:t,configurable:!0}),Ve=(h=>typeof require<"u"?require:typeof Proxy<"u"?new Proxy(h,{get:(t,r)=>(typeof require<"u"?require:t)[r]}):h)(function(h){if(typeof require<"u")return require.apply(this,arguments);throw Error('Dynamic require of "'+h+'" is not supported')});import{join as I,dirname as Ce,resolve as Xe}from"path";import{existsSync as E,readdirSync as de,readFileSync as x,writeFileSync as De,statSync as Pe,unlinkSync as Ue}from"fs";import{execSync as G}from"child_process";import{fileURLToPath as Ze}from"url";import{findSomaDir as ge,getSomaChain as we,buildLayeredIdentity as Qe,findPreload as re,discoverProtocolChain as Ne,detectProjectSignals as xe,loadProtocolState as et,saveProtocolState as le,bootstrapProtocolState as tt,syncProtocolState as ot,buildProtocolInjection as st,applyDecay as nt,discoverMuscleChain as it,buildMuscleInjection as rt,trackMuscleLoads as at,decayMuscleHeat as lt,bumpMuscleHeat as ye,recordHeatEvent as ke,getProtocolHeat as ct,loadSettings as Oe,initSoma as Ee,ensureGlobalSoma as dt,installItem as ut,listRemote as pt,listLocal as mt,compileFrontalCortex as ft,compileFullSystemPrompt as Re,detectProjectContext as ht,resolveSomaPath as _,createDebugLogger as $e,preloadFilename as gt,sessionLogFilename as yt,buildPreloadInstructions as $t,discoverAutomationChain as bt,buildAutomationInjection as St,bumpAutomationHeat as Fe,decayAutomationHeat as vt,matchMusclesToFocus as wt,findMap as Le,findTargetedPreload as kt,trackMapRun as He,stripFrontmatter as ce}from"../core/index.js";function V(){return globalThis.e??null}b(V,"getRoute");var Be={"soma-audit.sh":"Ecosystem health check \u2014 11 audits: PII, drift, stale content/terms, docs sync, commands, roadmap, overlap, settings, tests, frontmatter. `--list`, `--quiet`, or name specific audits"},Ct=[".sh",".py",".ts",".js",".mjs"];function Pt(h,t){let r={description:"\u2014",useWhen:"",relatedMuscles:[],lastModified:""};try{let g=Pe(h);r.lastModified=g.mtime.toISOString().slice(0,10)}catch{}Be[t]&&(r.description=Be[t]);try{let k=x(h,"utf-8").split(`
`).slice(0,15);for(let w of k)if(!w.startsWith("#!")){if(r.description==="\u2014"&&w.startsWith("# ")){let T=w.replace(/^#\s*/,"");T=T.replace(/^\S+\.\w+\s*[—–-]\s*/,""),T.length>0&&(r.description=T);continue}if(/^#\s*USE WHEN:/i.test(w)){r.useWhen=w.replace(/^#\s*USE WHEN:\s*/i,"").trim();continue}if(/^#\s*Related muscles?:/i.test(w)){let Y=w.replace(/^#\s*Related muscles?:\s*/i,"").split(",").map(R=>R.trim().replace(/\s*\(.*\)/,"").replace(/\s*$/,"")).filter(R=>R.length>0);r.relatedMuscles.push(...Y);continue}if(r.description==="\u2014"&&w.startsWith("// ")&&!w.startsWith("// @")){let T=w.replace(/^\/\/\s*/,"");T=T.replace(/^\S+\.\w+\s*[—–-]\s*/,""),T.length>0&&(r.description=T)}}}catch{}return r}b(Pt,"getScriptMeta");function Je(){let h=process.env.HOME||process.env.USERPROFILE||"";return I(h,".pi","agent","sessions")}b(Je,"getAgentSessionDir");function We(h){let t=`--${h.replace(/^[/\\]/,"").replace(/[/\\:]/g,"-")}--`;return I(Je(),t)}b(We,"encodeCwdToSessionDir");function _e(h=10,t,r){if(h<=0)return[];let g=r||process.cwd(),k=[];k.push(We(g));let w=Ce(g);for(;w!==g&&w!=="/"&&w!==".";){k.push(We(w));let P=Ce(w);if(P===w)break;w=P}let T=Je();if(E(T))try{let P=de(T);for(let L of P){let z=I(T,L);!L.startsWith("--")&&Pe(z).isDirectory()&&k.push(z)}}catch{}let Y=[],R=new Set;for(let P of k)if(!(!E(P)||R.has(P))){R.add(P);try{let L=de(P).filter(z=>z.endsWith(".jsonl"));for(let z of L){let q=I(P,z);if(!(t&&q===t))try{let ee=Pe(q);Y.push({path:q,mtime:ee.mtimeMs})}catch{}}}catch{}}Y.sort((P,L)=>L.mtime-P.mtime);let X=[];for(let P of Y){if(X.length>=h)break;try{let z=x(P.path,"utf-8").trim().split(`
`),q=[];if(z.length>0)try{let Z=JSON.parse(z[0]);if(Z.type==="session"&&Z.cwd){let H=Z.cwd,U=(r||process.cwd()).replace(/\/$/,"");if(!U.startsWith(H)&&!H.startsWith(U))continue}}catch{}for(let Z of z)try{let H=JSON.parse(Z);if(H.type!=="message")continue;let U=H.message;if(!U||!U.role||!["user","assistant"].includes(U.role))continue;let N="";if(Array.isArray(U.content)){for(let oe of U.content)if(oe.type==="text"&&oe.text){N=oe.text;break}}else typeof U.content=="string"&&(N=U.content);if(!N||N.startsWith("[cache keepalive")||N.startsWith("[Soma Boot")||N.startsWith("[Soma ")||N.includes("FLUSH COMPLETE")||N.includes("BREATHE COMPLETE"))continue;q.push({role:U.role,text:N,timestamp:H.timestamp})}catch{}let ee=h-X.length,te=q.slice(-ee);X.unshift(...te)}catch{}break}return X.slice(-h)}b(_e,"scanSessionLogs");function Ge(h){if(h.length===0)return"";let t=[];for(let r of h){let g=r.role==="user"?"**User:**":"**Assistant:**",k=r.role==="assistant"?500:300,w=r.text;w.length>k&&(w=w.slice(0,k)+"\u2026"),t.push(`${g} ${w}`)}return`---
## Last Conversation (${h.length} messages)

${t.join(`

`)}
`}b(Ge,"formatConversationTail");function Mt(h){let t=I(h,"amps","scripts","soma-stats.sh");if(!E(t))return[];try{let r=G(`bash "${t}" --warnings --cwd "${process.cwd()}"`,{encoding:"utf-8",timeout:5e3,stdio:["pipe","pipe","pipe"]}).trim();return!r||r.startsWith("\u2705")?[]:r.split(`
`).filter(g=>g.trim().length>0)}catch{return[]}}b(Mt,"getSessionWarnings");var It=Ce(Ze(import.meta.url)),Ye=Xe(It,"..");function At(h){try{let n=ge();if(n)for(let e of[".restart-required",".rotate-signal"]){let o=I(n.path,e);E(o)&&G(`rm -f "${o}"`,{stdio:"ignore"})}}catch{}let t=null,r=null,g=$e(null),k=null,w=null,T=new Set,Y=new Set,R=[],X=[],P=[],L=[],z=[],q=[],ee=new Set,te=!1,Z=!1,H=!1,U=null,N=null,oe=!1,be="",B="";function Se(){let n=new Date().toISOString().split("T")[0],e=t?_(t.path,"sessions",r):null,o=1;if(e&&E(e)){let i=de(e).filter(l=>l.startsWith(n)&&l.endsWith(".md"));for(let l of i){let a=l.match(/-s(\d+)/);a&&(o=Math.max(o,parseInt(a[1],10)+1))}}let m=`s${String(o).padStart(2,"0")}`,c;try{let{randomBytes:i}=Ve("crypto");c=i(3).toString("hex")}catch{c=Date.now().toString(16).slice(-6)}return`${m}-${c}`}b(Se,"generateSessionId");let se=null,ne=null;function ue(){if(se)return se;let n=B||Se(),e=t?_(t.path,"preloads",r):null;return se=gt(n,e),se}b(ue,"getPreloadFilename");function pe(){if(ne)return ne;let n=B||Se(),e=t?_(t.path,"sessions",r):null;return ne=yt(n,e),ne}b(pe,"getSessionLogFilename");function me(){if(!t||oe)return;let n=r?.protocols.decayRate??1;k&&(nt(k,T,n,R),le(t,k)),lt(t,Y,n,r),vt(t,ee,n,r),oe=!0}b(me,"saveAllHeatState");function Me(n,e){if(!t||!r)return[];let o=[],m=r.boot.steps;for(let c of m)switch(g.boot(`step: ${c}`),c){case"identity":{w=Qe(n,r),g.boot(`identity built (${w?.length??0} chars)`);break}case"preload":break;case"protocols":{let i=xe(t.projectDir),l=Ne(n,i,r);if(R=l,X=l.map(a=>a.name),l.length>0){k=et(t);let a=r.protocols;k?ot(k,l,a)&&le(t,k):(k=tt(l,a),le(t,k));let s=st(l,k,a);if(s.hot.length>0){let p=s.hot.map(S=>{let v=ce(S.content);return v=v.replace(/^# [^\n]+\n+/,""),`### Protocol: ${S.name}
${v}`}).join(`

`);o.push(`
---
## Hot Protocols (full reference)

${p}`)}}break}case"muscles":{let i=it(n,r);if(P=i,L=i.map(l=>l.name),i.length>0){let l=rt(i,r.muscles);if(l.hot.length>0){let s=l.hot.map(p=>{let S=ce(p.content);return S=S.replace(/<!-- digest:start -->\n?/g,""),S=S.replace(/\n?<!-- digest:end -->/g,""),S=S.replace(/^# [^\n]+\n+/,""),`### Muscle: ${p.name}
${S}`}).join(`

`);o.push(`
---
## Hot Muscles (full reference)

${s}`)}let a=[...l.hot,...l.warm];a.length>0&&at(a)}break}case"automations":{let i=bt(n,r);if(z=i,q=i.map(l=>l.name),i.length>0){let l=St(i,r.automations);if(l.hot.length>0){let a=l.hot.map(s=>{let p=ce(s.content);return p=p.replace(/^# [^\n]+\n+/,""),`### Automation: ${s.name}
${p}`}).join(`

`);o.push(`
---
## Hot Automations (full reference)

${a}`)}if(l.warm.length>0){let a=l.warm.map(s=>{let p=s.description?` \u2014 ${s.description}`:"";return s.digest?`- **${s.name}**${p}
  ${s.digest}`:`- **${s.name}**${p}`}).join(`
`);o.push(`
**Available automations (digest):** ${a}`)}if(l.cold.length>0){let a=l.cold.map(s=>{let p=s.description?` (${s.description})`:"";return`${s.name}${p}`}).join("; ");o.push(`
**Available automations (not loaded):** ${a}`)}}break}case"scripts":{let i=[_(t.path,"scripts",r)];if(r.inherit.tools&&n.length>1)for(let s=1;s<n.length;s++)i.push(_(n[s].path,"scripts",r));let l=new Set,a=[];for(let s of i)if(E(s))try{let p=r?.scripts?.extensions??Ct,S=b((v,j)=>{if(!(j>2))try{let d=de(v,{withFileTypes:!0});for(let f of d)if(!(f.name.startsWith("_")||f.name.startsWith("."))){if(f.isDirectory())S(I(v,f.name),j+1);else if(f.isFile()&&p.some(y=>f.name.endsWith(y))&&!l.has(f.name)){l.add(f.name);let y=I(v,f.name),u=Pt(y,f.name);a.push({name:f.name,dir:v,meta:u})}}}catch{}},"scanScriptDir");S(s,0)}catch{}if(a.length>0){let s=I(t.path,"state.json"),p={};try{p=JSON.parse(x(s,"utf-8")).scripts??{}}catch{}a.sort((j,d)=>{let f=p[j.name]?.count??0,y=p[d.name]?.count??0;return y!==f?y-f:j.name.localeCompare(d.name)});let S=[`## Available Scripts
`,`**Before coding, check if a script already handles the task. Read the associated muscle first.**
`,"| Script | What it does | Uses |","|--------|-------------|------|",...a.map(({name:j,dir:d,meta:f})=>{let y=p[j]?.count??0,u=y>0?`${y}`:"";return`| \`${j}\` | ${f.description} | ${u} |`}),"","Run with `bash <path>`. Use `--help` for options.",""],v=new Set;for(let{meta:j}of a)for(let d of j.relatedMuscles)v.add(d);if(v.size>0&&P.length>0){let j=[];for(let d of v){let f=P.find(y=>y.name===d);if(f){let y=a.filter(C=>C.meta.relatedMuscles.includes(d)).map(C=>C.name.replace(/\.sh$/,"")),u=f.digest?f.digest.replace(/^>\s*\*\*[^*]+\*\*\s*—\s*/,"").split(/\.\s/)[0].trim():"",$=u.length>80?u.slice(0,77)+"...":u;j.push(`| \`${d}\` | ${y.join(", ")} | ${$} |`)}}j.length>0&&S.push(`
### Script \u2194 Muscle Reference
`,`Read the full muscle before using its script.
`,"| Muscle | Used by | Summary |","|--------|---------|---------|",...j,"")}o.push(`
---
${S.join(`
`)}`)}break}case"git-context":{if(e?.skipGitContext)break;let i=r.boot.gitContext;if(!i.enabled)break;if(r.checkpoints?.diffOnBoot)try{let l=I(t.path,".git");if(E(l)){let a=r.checkpoints.maxDiffLines??80,s=G(`git diff HEAD~1 --stat --no-color 2>/dev/null | head -${a}`,{cwd:t.path,encoding:"utf-8",stdio:["pipe","pipe","pipe"]}).trim();s&&o.push(`
---
## .soma Changes (since last checkpoint)

\`\`\`
${s}
\`\`\`
`)}}catch{}try{let l=t.projectDir;G("git rev-parse --is-inside-work-tree",{cwd:l,stdio:"pipe"});let a=[`## Recent Changes (git)
`];if(i.maxCommits>0){let s="";if(i.since==="last-session"){let S=re(t,r.preload.staleAfterHours,r);S?s=`--since="${new Date(Date.now()-S.ageHours*36e5).toISOString()}"`:s='--since="24 hours ago"'}else/^\d+h$/.test(i.since)?s=`--since="${parseInt(i.since)} hours ago"`:/^\d+d$/.test(i.since)?s=`--since="${parseInt(i.since)} days ago"`:s=`--since="${i.since}"`;let p=G(`git log --oneline ${s} -${i.maxCommits} 2>/dev/null`,{cwd:l,encoding:"utf-8",stdio:["pipe","pipe","pipe"]}).trim();p&&(a.push(`### Commits
`),a.push("```"),a.push(p),a.push("```\n"))}if(i.diffMode!=="none"&&i.maxDiffLines>0){let s=i.diffMode==="full"?`git diff HEAD~5 --no-color 2>/dev/null | head -${i.maxDiffLines}`:`git diff HEAD~5 --stat --no-color 2>/dev/null | head -${i.maxDiffLines}`,p=G(s,{cwd:l,encoding:"utf-8",stdio:["pipe","pipe","pipe"]}).trim();p&&(a.push(`### Changed Files
`),a.push("```"),a.push(p),a.push("```\n"))}a.length>1&&o.push(`
---
${a.join(`
`)}`)}catch{}break}default:break}return o}b(Me,"runBootDiscovery"),h.on("session_start",async(n,e)=>{if(Z){g.boot("session_start re-fired \u2014 skipping (already booted this session)"),Ie(e);return}Z=!0,Ie(e);try{let d=e.sessionManager.getSessionFile?.()||"";be=d&&d.split("/").pop()?.replace(/\.[^.]+$/,"")||""}catch{be=""}let o=e.sessionManager.getEntries(),m=o.some(d=>d.type==="message"),c=null;if(m)for(let d of o){let f=typeof d=="object"&&d.content,u=(typeof f=="string"?f:f?.text??"").match(/Session ID:\s*`(s\d+-[a-f0-9]+)`/);if(u){c=u[1];break}}if(B=c||Se(),c){g.boot(`resumed session \u2014 reusing ID: ${c}`);let d=new Date().toISOString().split("T")[0];ne=`${d}-${c}.md`,se=`preload-next-${d}-${c}.md`}let i=V();i&&i.provide("session:id",()=>B,{provider:"soma-boot",description:"Get current Soma session ID (e.g. s01-abc123)"});try{let d=dt();d&&g.boot(`global ~/.soma/ bootstrapped: ${d}`)}catch(d){g.boot(`global ~/.soma/ bootstrap skipped: ${d}`)}if(t=ge(),!t){let d=ht(process.cwd()),f=Ee(process.cwd());t=ge(),e.ui.notify(`\u{1F331} Soma planted at ${f}`,"info");let y=[];d.parent&&y.push(`Parent workspace detected at \`${d.parent.path}\` (${d.parent.distance} level${d.parent.distance>1?"s":""} up).`),d.claudeMd&&y.push(`CLAUDE.md found at \`${d.claudeMd.path}\` (${d.claudeMd.ageDays}d old). Review it as one input for understanding this project.`),d.agentsMd&&y.push(`AGENTS.md found at \`${d.agentsMd.path}\` (${d.agentsMd.ageDays}d old).`),d.signals.length>0&&y.push(`Detected stack: ${d.signals.join(", ")}.`),d.packageManager&&y.push(`Package manager: ${d.packageManager}.`);let u=y.length>0?`
**Context detected:**
${y.map($=>`- ${$}`).join(`
`)}
`:"";e.hasUI&&h.sendUserMessage(`[Soma Boot \u2014 First Run]

Created memory at \`${f}\`.
`+u+`
A starter identity file is at \`${f}/identity.md\` (pre-filled with detected context).
Review it, examine the project structure, and rewrite it to reflect who you are in this context. Keep it specific and under 30 lines.`,{deliverAs:"followUp"})}let l=we();r=Oe(l),g=$e(t?.path??null,r.debug),g.enabled&&(g.boot(`session start \u2014 soma: ${t?.path}, cwd: ${process.cwd()}`),g.boot(`settings loaded from chain: [${l.map(d=>d.path).join(", ")}]`),g.boot(`session id: ${be}`)),i&&(i.provide("soma:dir",()=>t,{provider:"soma-boot",description:"Get current SomaDir object"}),i.provide("soma:settings",()=>r,{provider:"soma-boot",description:"Get current SomaSettings object"}),i.provide("soma:sessionId",()=>B,{provider:"soma-boot",description:"Get current session ID string"}),i.provide("heat:save",()=>me(),{provider:"soma-boot",description:"Save all heat state (protocols, muscles, automations) to disk"}),i.provide("state:commit",d=>he(d),{provider:"soma-boot",description:"Auto-commit .soma/ state with label"}));let a=m,s=Me(l),p=r.protocols?.hotThreshold??3,S=r.muscles?.fullThreshold??3,v={hotProtocols:R.filter(d=>(k?.protocols?.[d.name]?.heat??0)>=p).map(d=>d.name).sort(),hotMuscles:P.filter(d=>d.heat>=S).map(d=>d.name).sort(),scriptNames:s.some(d=>d.includes("Available Scripts"))?[...new Set(L)].sort():[]};if(a){let d=e.sessionManager.getEntries().find(A=>A.customType==="soma-boot"&&A.content?.fingerprint);if(d){let A=d.content.fingerprint,M=[],K=v.hotProtocols.filter(W=>!A.hotProtocols?.includes(W)),O=(A.hotProtocols||[]).filter(W=>!v.hotProtocols.includes(W));K.length>0&&M.push(`**Newly hot protocols:** ${K.join(", ")}`),O.length>0&&M.push(`**Cooled protocols:** ${O.join(", ")}`);let D=v.hotMuscles.filter(W=>!A.hotMuscles?.includes(W)),J=(A.hotMuscles||[]).filter(W=>!v.hotMuscles.includes(W));D.length>0&&M.push(`**Newly hot muscles:** ${D.join(", ")}`),J.length>0&&M.push(`**Cooled muscles:** ${J.join(", ")}`);let Q=s.filter(W=>W.includes(".soma Changes")||W.includes("Recent Changes"));if(Q.length>0&&M.push(...Q),h.appendEntry("soma-boot",{timestamp:Date.now(),resumed:!0,fingerprint:v,diffed:!0}),M.length===0){te=!0;let W=B?`
Session ID: \`${B}\``:"";g.boot("resume: no changes since last boot \u2014 minimal injection"),e.hasUI&&h.sendUserMessage(`[Soma Boot \u2014 resumed, no changes]

Identity, protocols, and muscles unchanged since last boot. System prompt is current. Continue where you left off.${W}`,{deliverAs:"followUp"})}else{te=!0;let W=B?`
Session ID: \`${B}\``:"";g.boot(`resume: ${M.length} changes since last boot`),e.hasUI&&h.sendUserMessage(`[Soma Boot \u2014 resumed, delta only]

**Changes since last boot:**
${M.join(`
`)}

Everything else unchanged. System prompt is current.${W}`,{deliverAs:"followUp"})}return}g.boot("resume: no fingerprint \u2014 minimal boot (system prompt is current)"),te=!0;let f=B?`
Session ID: \`${B}\``:"",y=t?I(_(t.path,"sessions",r),pe()):null,u=t?I(_(t.path,"preloads",r),ue()):null,$=y||u?`

Session files:
${y?`- Session log: \`${y}\`
`:""}${u?`- Preload: \`${u}\`
`:""}`:"",C=s.filter(A=>A.includes(".soma Changes")||A.includes("Recent Changes")),F=C.length>0?`

${C.join(`
`)}`:"";h.appendEntry("soma-boot",{timestamp:Date.now(),resumed:!0,fingerprint:v}),e.hasUI&&h.sendUserMessage(`[Soma Boot \u2014 resumed]

Identity, protocols, and muscles are in your system prompt. Continue where you left off.${F}${f}${$}`,{deliverAs:"followUp"});return}if(!a&&t){let d=I(t.path,".boot-target");if(E(d))try{let f=x(d,"utf-8"),y=JSON.parse(f);if(Ue(d),y.type==="map"&&y.name){let u=Le(y.name,t,r);if(u){g.boot(`MAP loaded: ${u.name} (status: ${u.status})`),He(u),u.promptConfig&&(N=u.promptConfig,g.boot(`plan overrides active: ${Object.keys(u.promptConfig).join(", ")}`));let $=kt(y.name,t,r);$&&(s.unshift(`
---
## Targeted Preload (for MAP: ${u.name})

${$}
`),g.boot(`targeted preload injected for MAP: ${u.name}`));let C=ce(u.content);s.push(`
---
## Active MAP: ${u.name}

${C}
`)}else g.boot(`MAP not found: ${y.name}`),s.push(`
\u26A0\uFE0F MAP "${y.name}" not found in automations/maps/
`)}if(y.type==="focus"&&y.keyword){g.boot(`focus mode: "${y.keyword}"`);let u=y.promptConfig??{};if(P&&P.length>0){let A=wt(P,y.keyword);if(A.length>0){let M=u.heatOverrides?.muscles??{},K=u.forceInclude?.muscles??[];for(let{muscle:O,score:D}of A){let J=M[O.name]??0;D>=8&&!K.includes(O.name)&&K.push(O.name),D+2>J&&(M[O.name]=D+2)}u.heatOverrides={...u.heatOverrides,muscles:M},u.forceInclude={...u.forceInclude,muscles:K},g.boot(`focus: ${A.length} muscles matched via triggers/tags/keywords`)}}if(N=u,u&&g.boot(`focus overrides: ${Object.keys(u).join(", ")}`),y.preloadPath){let A=null;try{let M=I(t.path,y.preloadPath);E(M)&&(A=x(M,"utf-8"))}catch{}A&&(s.unshift(`
---
## Focus Context: ${y.keyword}

${A}
`),g.boot(`focus preload injected: ${y.preloadPath}`))}let $=y.relatedMaps??[],C=$.slice(0,3);for(let A of C){let M=Le(A,t,r);if(M){let K=ce(M.content);if(s.push(`
---
## Related MAP: ${M.name}

${K}
`),g.boot(`focus MAP loaded: ${M.name}`),M.promptConfig){let O=M.promptConfig;if(O.heatOverrides?.muscles){let D=u.heatOverrides?.muscles??{};for(let[J,Q]of Object.entries(O.heatOverrides.muscles))Q>(D[J]??0)&&(D[J]=Q);u.heatOverrides={...u.heatOverrides,muscles:D}}if(O.heatOverrides?.protocols){let D=u.heatOverrides?.protocols??{};for(let[J,Q]of Object.entries(O.heatOverrides.protocols))Q>(D[J]??0)&&(D[J]=Q);u.heatOverrides={...u.heatOverrides,protocols:D}}if(O.forceInclude?.muscles){let D=u.forceInclude?.muscles??[];for(let J of O.forceInclude.muscles)D.includes(J)||D.push(J);u.forceInclude={...u.forceInclude,muscles:D}}O.supplementaryIdentity&&!u.supplementaryIdentity?.includes(O.supplementaryIdentity)&&(u.supplementaryIdentity=(u.supplementaryIdentity??"")+`
`+O.supplementaryIdentity),g.boot(`focus: merged MAP ${M.name} prompt-config`),N=u}He(M)}}$.length>3&&s.push(`
*${$.length-3} more related MAPs available: ${$.slice(3).join(", ")}*
`);let F=(y.relatedSessions??[]).length;s.push(`
---
**\u{1F50D} Focused on: "${y.keyword}"** \u2014 ${C.length} MAPs loaded, ${F} related sessions found.
`)}}catch(f){g.boot(`boot-target read failed: ${f}`);try{Ue(d)}catch{}}}let j=process.env.SOMA_INHALE==="1";if(!a&&t&&j){let d=re(t,r.preload.staleAfterHours,r);if(d&&!d.stale){let u=d.stale?" \u26A0\uFE0Fstale":"";s.unshift(`
---
## Preload (from last session${u})

${d.content}
`),g.boot(`preload auto-injected: ${d.name} (${Math.floor(d.ageHours)}h old)`)}let f=Math.min(r.preload.lastSessionLogs??0,5);if(f>0&&t)try{let u=_(t.path,"sessions",r);if(E(u)){let $=de(u).filter(C=>C.endsWith(".md")&&!C.startsWith(".")&&!C.startsWith("_")).sort().reverse().slice(0,f);if($.length>0){let C=$.map(F=>{let A=x(I(u,F),"utf-8").trim(),M=3e3,K=A.length>M?A.slice(0,M)+`

[... truncated \u2014 full log: memory/sessions/${F}]`:A;return`### ${F}

${K}`});s.unshift(`---
## Recent Session Logs (${$.length})

${C.join(`

---

`)}
`),g.boot(`session logs injected: ${$.length} files`)}}}catch(u){g.boot(`session log injection failed: ${u}`)}let y=r.preload.lastMessages??10;if(y>0)try{let u=e.sessionManager.getSessionFile?.()||void 0,$=_e(y,u);if($.length>0){let C=Ge($);s.unshift(C),g.boot(`conversation tail injected: ${$.length} messages`)}}catch(u){g.boot(`conversation tail scan failed: ${u}`)}try{let u=Mt(t.path);if(u.length>0){let $=`---
## Session Warnings (from previous session)

${u.join(`
`)}

**Tool preference:** script > ls > grep > find (find hangs on large trees)
`;s.unshift($),g.boot(`session warnings injected: ${u.length}`)}}catch(u){g.boot(`session warnings failed: ${u}`)}}if(s.length>0){te=!0,h.appendEntry("soma-boot",{timestamp:Date.now(),resumed:a,fingerprint:v});let d=B?`
Session ID: \`${B}\``:"",f=t?I(_(t.path,"sessions",r),pe()):null,y=t?I(_(t.path,"preloads",r),ue()):null,u=f||y?`

Session files:
${f?`- Session log: \`${f}\`
`:""}${y?`- Preload: \`${y}\`
`:""}`:"",$=s.some(F=>F.includes("## Preload (from last session")),C=a?`You've resumed a Soma session. Your preload and hot protocols are above. Identity and behavioral rules are in your system prompt. If the preload has an "Orient From" section, read those files before doing anything else. Then greet the user briefly and await instructions.${d}${u}`:$?`You've booted into a fresh Soma session with a preload from your past self. **The preload's Resume Point is your ground truth** \u2014 trust it over conversation history. When conversation tail and preload conflict, the preload wins (it's curated; conversation tail is raw). Your first message MUST state: (1) what you're resuming from the preload, (2) what's next. If the preload has "Orient From" targets, read those before starting any work. Do not re-discover what the preload already tells you.${d}${u}`:`You've booted into a fresh Soma session. Identity and behavioral rules are in your system prompt. Hot protocols are above if any. Greet the user briefly and await instructions.${d}${u}`;e.hasUI&&h.sendUserMessage(`[Soma Boot${a?" \u2014 resumed":""}]

${s.join(`
`)}

${C}`,{deliverAs:"followUp"})}}),h.on("before_agent_start",async(n,e)=>{if(!t||!te)return;let o=U??n.systemPrompt;if(!H&&r){let m=h.getActiveTools?.()??[],c=h.getAllTools?.()??[];if(m.length>0)o=Re({protocols:R,protocolState:k,muscles:P,settings:r,piSystemPrompt:n.systemPrompt,activeTools:m,allTools:c,agentDir:Ye,identity:w,planOverrides:N??void 0}).block,U=o,H=!0,g.systemPrompt(o),g.boot(`system prompt compiled (${o.length} chars, ${R.length} protocols, ${P.length} muscles${N?", with plan overrides":""})`);else{let i=ft({protocols:R,protocolState:k,muscles:P,settings:r,planOverrides:N??void 0});i.block&&(o=i.block+`

---

`+n.systemPrompt,U=o,H=!0)}}return{systemPrompt:o}});let ve=0,ze=5;h.on("turn_end",async()=>{ve++,ve>=ze&&(ve=0,he("periodic"))}),h.on("session_switch",async(n,e)=>{if(n.reason==="new"&&(oe=!1,Z=!1,se=null,ne=null,T=new Set,Y=new Set,ee=new Set,H=!1,U=null,V()?.emit("session:reset",{reason:"new"}),t)){let m=we();r=Oe(m);let c=Me(m,{skipGitContext:!0}),i=re(t,r.preload?.staleAfterHours,r);if(i&&!i.stale&&c.unshift(`
---
## Preload (from last session)

${i.content}
`),c.length>0&&e.hasUI){let l=I(_(t.path,"sessions",r),pe()),a=I(_(t.path,"preloads",r),ue()),s=`

Session files:
- Session log: \`${l}\`
- Preload: \`${a}\`
`,p=`[Soma Boot \u2014 rotated session]

${c.join(`
`)}

You've rotated into a fresh session. Identity and behavioral rules are in your system prompt. Hot protocols and muscles are above. `+(i?`Your preload from the previous session is included above. **The preload's Resume Point is your ground truth.** Your first message MUST state what you're resuming and what's next. If it has "Orient From" targets, read those before starting work. Do not re-discover what the preload already tells you.`:"Greet the user briefly and await instructions.")+s;V()?.provide("boot:rotationMessage",()=>p,{provider:"soma-boot",description:"Queued boot message for post-rotation delivery"})}}}),h.on("session_shutdown",async()=>{t&&me()});let qe=[{match:b((n,e)=>n==="write"&&typeof e?.content=="string"&&e.content.startsWith(`---
`),"match"),target:"frontmatter-standard",type:"protocol"},{match:b((n,e)=>n==="bash"&&typeof e?.command=="string"&&/git (config|commit|push|remote)/.test(e.command),"match"),target:"git-identity",type:"protocol"},{match:b((n,e)=>n==="write"&&typeof e?.path=="string"&&/preload|continuation/.test(e.path),"match"),target:"breath-cycle",type:"protocol"},{match:b((n,e)=>n==="bash"&&typeof e?.command=="string"&&/checkpoint:|\.soma.*git (add|commit)/.test(e.command),"match"),target:"session-checkpoints",type:"protocol"},{match:b((n,e)=>n==="write"&&typeof e?.path=="string"&&e.path.endsWith(".svg"),"match"),target:"svg-logo-design",type:"muscle"}];h.on("tool_result",async n=>{if(!t||!k||!r?.heat.autoDetect)return;let e=n.toolName,o=n.input,m=n.content?.map(i=>i.text||"").join("")||"",c=r.heat.autoDetectBump;if(e==="read"&&typeof o?.path=="string"){let i=o.path;if(/muscles\/[^/]+\.md$/.test(i)){let l=i.replace(/^.*muscles\//,"").replace(/\.md$/,"");L.includes(l)&&!Y.has(l)&&(Y.add(l),ye(t,l,c,r),g.heat(`muscle read: ${l} +${c} (dynamic: file read)`))}}if(e==="bash"&&typeof o?.command=="string"){let l=o.command.match(/(?:bash|sh)\s+(?:.*\/)?scripts\/([\w.-]+\.sh)/);if(l){let a=l[1];g.heat(`script executed: ${a} (dynamic: bash command)`);try{let s=I(t.path,"state.json"),p=E(s)?JSON.parse(x(s,"utf-8")):{};p.scripts||(p.scripts={}),p.scripts[a]||(p.scripts[a]={count:0,lastUsed:""}),p.scripts[a].count+=1,p.scripts[a].lastUsed=new Date().toISOString().slice(0,10),De(s,JSON.stringify(p,null,"	")+`
`)}catch(s){g.heat(`failed to persist script usage: ${s}`)}}}for(let i of qe)i.match(e,o,m)&&(i.type==="protocol"&&X.includes(i.target)?T.has(i.target)||(T.add(i.target),ke(k,i.target,"applied"),g.heat(`protocol detected: ${i.target} (auto-detect from tool_result)`)):i.type==="muscle"&&L.includes(i.target)&&(Y.has(i.target)||(Y.add(i.target),ye(t,i.target,c,r),g.heat(`muscle detected: ${i.target} +${c} (auto-detect from tool_result)`))))});function ie(){H=!1,U=null}b(ie,"invalidateCompiledPrompt");function fe(n){let e=V();e&&(n.newSession&&e.provide("session:new",n.newSession.bind(n),{provider:"soma-boot",description:"Start fresh session (clears messages, fires session_switch)"}),n.compact&&e.provide("session:compact",n.compact.bind(n),{provider:"soma-boot",description:"Trigger context compaction"}),n.reload&&e.provide("session:reload",n.reload.bind(n),{provider:"soma-boot",description:"Reload all extensions without restarting process"}),n.waitForIdle&&e.provide("session:waitForIdle",n.waitForIdle.bind(n),{provider:"soma-boot",description:"Wait for agent to stop streaming before acting"}),n.fork&&e.provide("session:fork",n.fork.bind(n),{provider:"soma-boot",description:"Fork session from a specific entry"}),n.navigateTree&&e.provide("session:navigate",n.navigateTree.bind(n),{provider:"soma-boot",description:"Navigate to different point in session tree"}),n.switchSession&&e.provide("session:switch",n.switchSession.bind(n),{provider:"soma-boot",description:"Switch to a different session file"}))}b(fe,"provideCommandCapabilities");function Ie(n){let e=V();e&&(n.getContextUsage&&e.provide("context:usage",n.getContextUsage.bind(n),{provider:"soma-boot",description:"Get context token usage ({ percent, tokensUsed, tokenLimit })"}),n.getSystemPrompt&&e.provide("context:systemPrompt",n.getSystemPrompt.bind(n),{provider:"soma-boot",description:"Get current compiled system prompt"}),n.ui?.notify&&e.provide("ui:notify",n.ui.notify.bind(n.ui),{provider:"soma-boot",description:"Show UI notification (message, level)"}),e.provide("message:send",(o,m)=>{h.sendUserMessage(o,m)},{provider:"soma-boot",description:"Send user message to agent (does NOT trigger /commands)"}))}b(Ie,"provideEventCapabilities"),h.registerCommand("pin",{description:"Pin a protocol or muscle to hot \u2014 keeps it loaded across sessions",handler:b(async(n,e)=>{fe(e);let o=n.trim();if(!o){e.ui.notify("Usage: /pin <protocol-or-muscle-name>","info");return}if(!t||!k){e.ui.notify("No soma booted","error");return}X.includes(o)?(ke(k,o,"pinned"),le(t,k),T.add(o),ie(),e.ui.notify(`\u{1F4CC} ${o} pinned (heat locked hot) \u2014 prompt will recompile`,"info")):L.includes(o)?(ye(t,o,r?.heat.pinBump??5,r),Y.add(o),ie(),e.ui.notify(`\u{1F4CC} ${o} pinned (heat bumped to hot) \u2014 prompt will recompile`,"info")):q.includes(o)?(Fe(t,o,r?.heat.pinBump??5,r),ee.add(o),ie(),e.ui.notify(`\u{1F4CC} ${o} automation pinned (heat bumped to hot) \u2014 prompt will recompile`,"info")):e.ui.notify(`Unknown protocol, muscle, or automation: ${o}`,"error")},"handler")}),h.registerCommand("kill",{description:"Kill a protocol, muscle, or automation \u2014 drops heat to zero",handler:b(async(n,e)=>{let o=n.trim();if(!o){e.ui.notify("Usage: /kill <name>","info");return}if(!t||!k){e.ui.notify("No soma booted","error");return}X.includes(o)?(ke(k,o,"killed"),le(t,k),ie(),e.ui.notify(`\u{1F480} ${o} killed (heat \u2192 0) \u2014 prompt will recompile`,"info")):L.includes(o)?(ye(t,o,-15,r),ie(),e.ui.notify(`\u{1F480} ${o} killed (heat \u2192 0) \u2014 prompt will recompile`,"info")):q.includes(o)?(Fe(t,o,-15,r),ie(),e.ui.notify(`\u{1F480} ${o} automation killed (heat \u2192 0) \u2014 prompt will recompile`,"info")):e.ui.notify(`Unknown protocol, muscle, or automation: ${o}`,"error")},"handler")}),h.registerCommand("auto-commit",{description:"Toggle auto-commit of .soma/ state on exhale/breathe",getArgumentCompletions:b(n=>["on","off","status"].filter(e=>e.startsWith(n)).map(e=>({value:e,label:e})),"getArgumentCompletions"),handler:b(async(n,e)=>{if(!t||!r){e.ui.notify("No soma booted","error");return}let o=n.trim().toLowerCase();if(o==="status"||!o){let m=r.checkpoints?.soma?.autoCommit??!0,c=r.checkpoints?.project?.autoCheckpoint??!1;e.ui.notify(`Auto-commit status:
  .soma/ state: ${m?"\u2705 on":"\u274C off"}
  project code: ${c?"\u2705 on":"\u274C off"}

Toggle: /auto-commit on | /auto-commit off
Persists in settings.json via checkpoints.soma.autoCommit`,"info");return}if(o==="on"||o==="off"){let m=o==="on";r.checkpoints||(r.checkpoints={}),r.checkpoints.soma||(r.checkpoints.soma={}),r.checkpoints.soma.autoCommit=m;try{let c=I(t.path,"settings.json"),i=E(c)?JSON.parse(x(c,"utf-8")):{};i.checkpoints||(i.checkpoints={}),i.checkpoints.soma||(i.checkpoints.soma={}),i.checkpoints.soma.autoCommit=m,De(c,JSON.stringify(i,null,2)+`
`),e.ui.notify(`${m?"\u2705":"\u274C"} Auto-commit .soma/ state: ${o}`,"info")}catch(c){e.ui.notify(`\u26A0\uFE0F Updated in-memory but failed to persist: ${c?.message?.slice(0,80)}`,"warning")}return}e.ui.notify("Usage: /auto-commit on | off | status","info")},"handler")});function he(n){let e=r?.checkpoints;if(!(e?.soma?.autoCommit??!0)||!t)return null;let m=e?.project?.prefix??"checkpoint:",c=new Date().toISOString().replace(/\.\d+Z$/,"Z");try{let i=I(t.path,".git");if(!E(i))try{G("git init -b main",{cwd:t.path,stdio:"pipe"}),G("git add -A",{cwd:t.path,stdio:"pipe"}),G('git commit -m "init: .soma/ state tracking"',{cwd:t.path,stdio:"pipe"})}catch{return null}return G("git add -A",{cwd:t.path,stdio:"pipe"}),G("git status --porcelain",{cwd:t.path,encoding:"utf-8",stdio:"pipe"}).trim()?(G(`git commit -m "${m} ${n} ${c}"`,{cwd:t.path,stdio:"pipe"}),`Committed .soma/ state: ${m} ${n}`):null}catch{return null}}b(he,"autoCommitSomaState");let Ae=b(async(n,e)=>{if(!t){e.ui.notify("No .soma/ found. Run /soma init first.","error");return}let o=_(t.path,"preloads",r),m=I(o,ue()),c=new Date().toISOString().split("T")[0],i=I(_(t.path,"sessions",r),pe());me();let l=he("exhale");l&&e.ui.notify(`\u2705 ${l}`,"info");let a=r?.checkpoints,{template:s,steps:p}=$t({target:m,logPath:i,today:c,sessionId:B,autoCheckpoint:a?.project?.autoCheckpoint??!1,checkpointPrefix:a?.project?.prefix??"checkpoint:"});h.sendUserMessage(`[EXHALE \u2014 save session state]

${p.join(`

`)}

${s}

**Final step:** Say "FLUSH COMPLETE".`,{deliverAs:"followUp"}),e.ui.notify("Exhale initiated \u2014 write preload, then FLUSH COMPLETE","info")},"exhaleHandler");h.registerCommand("exhale",{description:"Exhale \u2014 save session state",handler:Ae}),h.registerCommand("rest",{description:"Rest \u2014 disable keepalive, save state, end session",handler:b(async(n,e)=>{fe(e);let m=V()?.get("keepalive:toggle");m&&m(!1),e.ui.notify("\u{1F4A4} Keepalive disabled \u2014 entering rest mode","info"),await Ae(n,e)},"handler")}),h.registerCommand("inhale",{description:"Inhale \u2014 reset session and load preload from last session",handler:b(async(n,e)=>{if(fe(e),!t){e.ui.notify("No .soma/ \u2014 nothing to inhale. Run /soma init first.","info");return}let o=re(t);if(!o){e.ui.notify("\u{1FAE7} No preload found \u2014 nothing to inhale.","info");return}n.includes("--heat-saved")||me();let c=he("inhale");c&&e.ui.notify(`\u2705 ${c}`,"info"),e.ui.notify("\u{1FAE7} Inhaling \u2014 resetting session with preload...","info");try{if(!(await e.newSession({})).cancelled){let s=V()?.get("boot:rotationMessage")?.();if(s)h.sendUserMessage(s,{deliverAs:"followUp"}),e.ui.notify("\u2705 Inhaled \u2014 fresh session with preload injected","info");else{let p=o.stale?` \u26A0\uFE0F (${Math.floor(o.ageHours)}h old \u2014 may be stale)`:"";h.sendUserMessage(`[Soma Inhale \u2014 Loading Preload${p}]

${o.content}`,{deliverAs:"followUp"}),e.ui.notify(`\u2705 Inhaled \u2014 preload injected (${Math.floor(o.ageHours)}h old)`,"info")}}}catch(i){e.ui.notify(`\u274C Inhale failed: ${i?.message?.slice(0,100)}`,"error");let l=o.stale?` \u26A0\uFE0F (${Math.floor(o.ageHours)}h old \u2014 may be stale)`:"";h.sendUserMessage(`[Soma Inhale \u2014 Loading Preload (fallback, session not reset)${l}]

${o.content}`,{deliverAs:"followUp"})}},"handler")}),h.registerCommand("soma",{description:"Soma memory status and management",getArgumentCompletions:b(n=>["status","init","prompt","prompt full","prompt identity","preload","debug","debug on","debug off"].filter(e=>e.startsWith(n)).map(e=>({value:e,label:e})),"getArgumentCompletions"),handler:b(async(n,e)=>{fe(e);let o=n.trim().toLowerCase()||"status";if(o==="init"){if(t){e.ui.notify(`Soma already planted at ${t.path}`,"info");return}let m=Ee(process.cwd());t=ge(),e.ui.notify(`\u{1F331} Soma planted at ${m}`,"info");return}if(o.startsWith("prompt")){if(!t||!r){e.ui.notify("No Soma found. Use /soma init","info");return}let m=o.replace("prompt","").trim(),c=h.getActiveTools?.()??[],i=h.getAllTools?.()??[],l=e.getSystemPrompt?.()??"",a=Re({protocols:R,protocolState:k,muscles:P,settings:r,piSystemPrompt:l||"You are an expert coding assistant operating inside pi",activeTools:c,allTools:i,agentDir:Ye,identity:w,planOverrides:N??void 0}),s=[["Soma core","You are Soma"],["Identity","# Identity"],["Behavioral rules","## Active Behavioral Rules"],["Learned patterns","## Learned Patterns"],["Tools","Available tools:"],["Guard","## Guard"],["Soma docs","Soma documentation"],["External context","## External Project Context"],["Skills","<available_skills>"],["Date/time","Current date and time:"]],p=R.map($=>({name:$.name,heat:ct($,k)})).sort(($,C)=>C.heat-$.heat),S=r.protocols?.warmThreshold??3,v=r.protocols?.hotThreshold??8,j=r.muscles?.digestThreshold??1,d=r.muscles?.fullThreshold??4;if(m==="full"){h.sendUserMessage(`[/soma prompt full \u2014 compiled system prompt (${a.estimatedTokens} tokens)]

\`\`\`
`+a.block+"\n```",{deliverAs:"followUp"});return}if(m==="identity"){h.sendUserMessage(`[/soma prompt identity]

**Built identity:** ${w?`${w.length} chars`:"\u274C NONE"}
**In compiled prompt:** ${a.block.includes("# Identity")?"\u2705 yes":"\u274C NO \u2014 BUG"}
**persona.name:** ${r.persona?.name??"(null)"}
**identityInSystemPrompt:** ${r.systemPrompt?.identityInSystemPrompt??"(default: true)"}

`+(w?"```\n"+w.slice(0,2e3)+"\n```":"No identity found in chain."),{deliverAs:"followUp"});return}let f=[];f.push(`**Compiled System Prompt** \u2014 ${a.block.length} chars (~${a.estimatedTokens} tokens)`),f.push(`Full replacement: ${a.fullReplacement} | Cached: ${H}`),f.push(""),f.push("**Sections:**");for(let[$,C]of s){let F=a.block.includes(C);f.push(`  ${F?"\u2705":"\u274C"} ${$}`)}f.push(""),f.push(`**Identity:** ${w?`${w.length} chars`:"\u274C NONE"} \u2192 ${a.block.includes("# Identity")?"in prompt \u2705":"MISSING from prompt \u274C"}`),f.push(`  persona.name: ${r.persona?.name??"(null)"} | emoji: ${r.persona?.emoji??"(null)"}`),f.push(""),f.push(`**Protocols:** ${a.protocolCount} in prompt (max ${r.protocols?.maxBreadcrumbsInPrompt??12})`);for(let $ of p){let C=$.heat>=v?"\u{1F534}":$.heat>=S?"\u{1F7E1}":"\u26AA",F=$.heat>=S?"\u2705":"\u2014";f.push(`  ${C} ${$.name}: heat=${$.heat} ${F}`)}f.push(""),f.push(`**Muscles:** ${a.muscleCount} digests in prompt (max ${r.muscles?.maxDigest??5})`);for(let $ of P.slice(0,10)){let C=$.heat>=d?"\u{1F534}":$.heat>=j?"\u{1F7E1}":"\u26AA",F=$.status!=="active"?` [${$.status}]`:"";f.push(`  ${C} ${$.name}: heat=${$.heat}${F}`)}f.push("");let y=e.getContextUsage?.();f.push("**Runtime:**"),f.push(`  Context: ${y?.percent!=null?Math.round(y.percent)+"%":"unknown"}`);let u=V()?.get("breathe:state")?.()??{};f.push(`  Warnings sent at: ${u.pct>0?Math.round(u.pct)+"%":"none yet"}`),f.push(`  Thresholds: ${JSON.stringify(r.context??{notifyAt:50,warnAt:70,urgentAt:80,autoExhaleAt:85})}`),f.push(""),f.push("\u{1F4A1} `/soma prompt full` \u2014 dump compiled prompt | `/soma prompt identity` \u2014 identity debug"),e.ui.notify(f.join(`
`),"info");return}if(o==="status"){if(!t){e.ui.notify("No Soma found. Use /soma init","info");return}let m=re(t),c=we(),i=Ne(c);e.ui.notify([`\u{1F33F} Soma: ${t.path} (${t.rootName}/)`,`Chain: ${c.length} level${c.length!==1?"s":""}`,`Preload: ${m?"\u2713":"none"}`,`Protocols: ${i.length}`,`System prompt: ~${H?"compiled":"pending"}`].join(`
`),"info");return}if(o==="preload"){if(!t){e.ui.notify("No .soma/ found","info");return}let m=re(t);if(m){let c=m.stale?" \u26A0\uFE0Fstale":"";e.ui.notify(`${m.name} (${Math.floor(m.ageHours)}h ago${c})`,"info")}else e.ui.notify("No preloads found","info");return}if(o.startsWith("debug")){let m=o.replace("debug","").trim()||"status";if(m==="status"){let c=t?I(t.path,"debug"):null,i=c&&E(c);e.ui.notify(`Debug mode: ${g.enabled?"ON \u{1F534}":"OFF"}
Debug dir: ${c||"(no .soma/)"}
`+(i?"Logs exist \u2014 read .soma/debug/ for diagnostics":"No debug logs yet"),"info");return}if(m==="on"){if(!t){e.ui.notify("No .soma/ found.","error");return}g=$e(t.path,!0),g.boot("debug mode enabled via /soma debug on"),e.ui.notify("\u{1F534} Debug mode ON \u2014 logging to .soma/debug/","info");return}if(m==="off"){g.enabled&&g.boot("debug mode disabled via /soma debug off"),g=$e(null),e.ui.notify("Debug mode OFF","info");return}e.ui.notify("Usage: /soma debug on|off|status","info");return}e.ui.notify("Usage: /soma status | init | prompt [full|identity] | preload | debug [on|off]","info")},"handler")});let ae=["protocol","muscle","skill","template"];h.registerCommand("install",{description:"Install a protocol, muscle, skill, or template from the Soma Hub",getArgumentCompletions:b(n=>ae.filter(e=>e.startsWith(n)).map(e=>({value:e,label:`${e} \u2014 install a ${e} from hub`})),"getArgumentCompletions"),handler:b(async(n,e)=>{if(!t){e.ui.notify("No .soma/ found. Run /soma init first.","error");return}let o=n.trim().split(/\s+/),m=o.includes("--force"),c=o.filter(a=>a!=="--force");if(c.length<2){e.ui.notify(`Usage: /install <type> <name> [--force]
Types: protocol, muscle, skill, template`,"info");return}let i=c[0],l=c[1];if(!ae.includes(i)){e.ui.notify(`Invalid type: ${i}. Use: ${ae.join(", ")}`,"error");return}e.ui.notify(`\u{1F4E6} Installing ${i}: ${l}...`,"info");try{let a=await ut(t,i,l,{force:m});if(a.success){let s=[`\u2705 Installed ${i}: ${l}`];if(a.path&&s.push(`   \u2192 ${a.path}`),a.dependencies&&a.dependencies.length>0){s.push("   Dependencies:");for(let p of a.dependencies){let S=p.success?"\u2713":p.error?.includes("Already exists")?"\xB7":"\u2717";s.push(`     ${S} ${p.type}: ${p.name}${p.error?` (${p.error})`:""}`)}}e.ui.notify(s.join(`
`),"info"),(i==="protocol"||i==="muscle")&&e.ui.notify("\u{1F4A1} New content will load on next session boot (or /breathe to rotate now)","info")}else e.ui.notify(`\u274C ${a.error||"Install failed"}`,"error")}catch(a){e.ui.notify(`\u274C Install error: ${a.message}`,"error")}},"handler")}),h.registerCommand("list",{description:"List installed or remote Soma content",getArgumentCompletions:b(n=>["local","remote",...ae].filter(e=>e.startsWith(n)).map(e=>({value:e,label:e})),"getArgumentCompletions"),handler:b(async(n,e)=>{let o=n.trim().split(/\s+/).filter(Boolean),m=o[0]||"local",c=o[1];if(m==="remote"){e.ui.notify("\u{1F50D} Fetching from hub...","info");try{let s=await pt(c);if(s.length===0){e.ui.notify("No remote content found.","info");return}let p={};for(let v of s)p[v.type]||(p[v.type]=[]),p[v.type].push(v.name);let S=["\u{1F4E1} Hub content:"];for(let[v,j]of Object.entries(p))S.push(`  ${v}s: ${j.join(", ")}`);S.push(`
Install: /install <type> <name>`),e.ui.notify(S.join(`
`),"info")}catch(s){e.ui.notify(`\u274C Failed to fetch: ${s.message}`,"error")}return}if(!t){e.ui.notify("No .soma/ found.","info");return}let i=mt(t,c&&ae.includes(c)?c:void 0);if(i.length===0){e.ui.notify("No local content found. Try /list remote to see what's available.","info");return}let l={};for(let s of i)l[s.type]||(l[s.type]=[]),l[s.type].push(s.name);let a=["\u{1F4CB} Installed content:"];for(let[s,p]of Object.entries(l))a.push(`  ${s}s: ${p.join(", ")}`);e.ui.notify(a.join(`
`),"info")},"handler")});let je=b((n,e)=>{let o=n.trim().split(/\s+/).filter(Boolean);if(o.length===0)return{error:`Usage:
  /scrape <name>              Resolve + pull docs for a project
  /scrape <name> --resolve    Just show what's available (don't pull)
  /scrape <topic> --discover  Broad search across GitHub, npm, MDN
  /scrape --list              Show all scraped sources
  /scrape <name> --show       Show what we have locally
  /scrape <name> --update     Re-pull latest docs

Options: --full, --provider <github|npm|mdn|css|skills|code>`};let m=[],c=[],i="";for(let p=0;p<o.length;p++)o[p]==="--provider"&&o[p+1]?i=o[++p]:o[p].startsWith("--")?m.push(o[p].replace(/^--/,"")):c.push(o[p]);let l=c.join(" "),a=`${e}/amps/scripts/soma-scrape.sh`,s;return m.includes("list")?s=`bash "${a}" list`:m.includes("discover")?(s=`bash "${a}" discover "${l}"`,i&&(s+=` --provider ${i}`)):m.includes("resolve")?s=`bash "${a}" resolve "${l}"`:m.includes("show")?s=`bash "${a}" show "${l}"`:m.includes("update")?s=`bash "${a}" update "${l}"`:(s=`bash "${a}" pull "${l}"`,m.includes("full")&&(s+=" --full")),{cmd:s,display:s.replace(a,"soma-scrape.sh")}},"buildScrapeCmd"),Te=b((n,e)=>{let o=n.trim().split(/\s+/).filter(Boolean);return o.length===0?{error:`Usage:
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

Default target: $SOMA_SHELL_DIR (gravicity-io/shell)`}:{cmd:`bash "${`${e}/amps/scripts/soma-code.sh`}" ${o.join(" ")}`,display:`soma-code.sh ${o.join(" ")}`}},"buildCodeCmd");h.registerCommand("code",{description:"Fast codebase navigator. Usage: /code <find|lines|map|refs|replace|structure|physics|events|css-vars|config> [args]",handler:b(async(n,e)=>{if(!t){e.ui.notify("No .soma/ found.","error");return}let o=V();o&&!o.get("code:build")&&o.provide("code:build",Te,{provider:"soma-boot",description:"Build a soma-code.sh command from args string"});let m=o?.get("code:build"),c=m?m(n,t.path):Te(n,t.path);if("error"in c){e.ui.notify(c.error,"info");return}e.ui.notify(`\u{1F50D} Running: ${c.display}`,"info")},"handler")}),h.registerCommand("scrape",{description:"Scrape docs for a tool, library, or topic. Usage: /scrape <name|topic> [--discover] [--provider github|npm|mdn|css|skills]",handler:b(async(n,e)=>{if(!t){e.ui.notify("No .soma/ found.","error");return}let o=V();o&&!o.get("scrape:build")&&o.provide("scrape:build",je,{provider:"soma-boot",description:"Build a soma-scrape.sh command from args string"});let m=o?.get("scrape:build"),c=m?m(n,t.path):je(n,t.path);if("error"in c){e.ui.notify(c.error,"info");return}e.ui.notify(`\u{1F50D} Running: ${c.display}`,"info")},"handler")}),h.registerCommand("scan-logs",{description:"Scan conversation logs. Usage: /scan-logs [count] [--send] | /scan-logs tools <pattern> [--results] [--tool bash|read] [--last N] [--send]",handler:b(async(n,e)=>{let o=(n?.trim()||"").split(/\s+/).filter(Boolean),m=o.includes("--send"),c=o.filter(s=>s!=="--send"),i=b(s=>{m?h.sendUserMessage(`[scan-logs results]

${s}`):e.ui.notify(`\u{1F4DC} Session Analysis:

${s}`,"info")},"deliver");if(c[0]==="tools"&&c.length>=2){if(!t){e.ui.notify("No .soma/ found.","error");return}let s=I(t.path,"amps","scripts","soma-stats.sh");if(!E(s)){e.ui.notify("soma-stats.sh not found.","error");return}let p=c.slice(1).join(" "),S=`bash "${s}" tools ${p} --cwd "${process.cwd()}"`;if(m)try{let v=G(S,{encoding:"utf-8",timeout:15e3,stdio:["pipe","pipe","pipe"]}).trim();i(v||"No matching tool calls found.")}catch(v){i(v.stdout?.trim()||"No matching tool calls found.")}else e.ui.notify(`\u{1F50D} Searching tool calls: \`soma-stats.sh tools ${p}\``,"info");return}let l=10;for(let s of c)/^\d+$/.test(s)&&(l=parseInt(s,10));let a=e.sessionManager.getSessionFile?.()||void 0;try{let s=_e(l,a),p="";if(s.length>0?p+=Ge(s):p+=`No recent conversation logs found.
`,t){let S=I(t.path,"amps","scripts","soma-stats.sh");if(E(S))try{let v=G(`bash "${S}" --cwd "${process.cwd()}"`,{encoding:"utf-8",timeout:5e3,stdio:["pipe","pipe","pipe"]}).trim();p+=`
${v}
`}catch{}}i(p)}catch(s){e.ui.notify(`Failed to scan logs: ${s}`,"error")}},"handler")})}b(At,"somaBootExtension");export{At as default};
