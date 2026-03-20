var Ke=Object.defineProperty;var b=(h,t)=>Ke(h,"name",{value:t,configurable:!0}),Ve=(h=>typeof require<"u"?require:typeof Proxy<"u"?new Proxy(h,{get:(t,r)=>(typeof require<"u"?require:t)[r]}):h)(function(h){if(typeof require<"u")return require.apply(this,arguments);throw Error('Dynamic require of "'+h+'" is not supported')});import{join as I,dirname as Ce,resolve as Xe}from"path";import{existsSync as E,readdirSync as de,readFileSync as x,writeFileSync as De,statSync as Pe,unlinkSync as Ue}from"fs";import{execSync as G}from"child_process";import{fileURLToPath as Ze}from"url";import{findSomaDir as ge,getSomaChain as we,buildLayeredIdentity as Qe,findPreload as re,discoverProtocolChain as Ne,detectProjectSignals as xe,loadProtocolState as et,saveProtocolState as le,bootstrapProtocolState as tt,syncProtocolState as st,buildProtocolInjection as ot,applyDecay as nt,discoverMuscleChain as it,buildMuscleInjection as rt,trackMuscleLoads as at,decayMuscleHeat as lt,bumpMuscleHeat as ye,recordHeatEvent as ke,getProtocolHeat as ct,loadSettings as Oe,initSoma as Ee,ensureGlobalSoma as dt,installItem as pt,listRemote as ut,listLocal as mt,compileFrontalCortex as ft,compileFullSystemPrompt as Re,detectProjectContext as ht,resolveSomaPath as _,createDebugLogger as $e,preloadFilename as gt,sessionLogFilename as yt,buildPreloadInstructions as $t,discoverAutomationChain as bt,buildAutomationInjection as St,bumpAutomationHeat as Fe,decayAutomationHeat as vt,matchMusclesToFocus as wt,findMap as Le,findTargetedPreload as kt,trackMapRun as He,stripFrontmatter as ce}from"../core/index.js";function V(){return globalThis.e??null}b(V,"getRoute");var Be={"soma-audit.sh":"Ecosystem health check \u2014 11 audits: PII, drift, stale content/terms, docs sync, commands, roadmap, overlap, settings, tests, frontmatter. `--list`, `--quiet`, or name specific audits"},Ct=[".sh",".py",".ts",".js",".mjs"];function Pt(h,t){let r={description:"\u2014",useWhen:"",relatedMuscles:[],lastModified:""};try{let y=Pe(h);r.lastModified=y.mtime.toISOString().slice(0,10)}catch{}Be[t]&&(r.description=Be[t]);try{let C=x(h,"utf-8").split(`
`).slice(0,15);for(let k of C)if(!k.startsWith("#!")){if(r.description==="\u2014"&&k.startsWith("# ")){let T=k.replace(/^#\s*/,"");T=T.replace(/^\S+\.\w+\s*[—–-]\s*/,""),T.length>0&&(r.description=T);continue}if(/^#\s*USE WHEN:/i.test(k)){r.useWhen=k.replace(/^#\s*USE WHEN:\s*/i,"").trim();continue}if(/^#\s*Related muscles?:/i.test(k)){let Y=k.replace(/^#\s*Related muscles?:\s*/i,"").split(",").map(R=>R.trim().replace(/\s*\(.*\)/,"").replace(/\s*$/,"")).filter(R=>R.length>0);r.relatedMuscles.push(...Y);continue}if(r.description==="\u2014"&&k.startsWith("// ")&&!k.startsWith("// @")){let T=k.replace(/^\/\/\s*/,"");T=T.replace(/^\S+\.\w+\s*[—–-]\s*/,""),T.length>0&&(r.description=T)}}}catch{}return r}b(Pt,"getScriptMeta");function Je(){let h=process.env.HOME||process.env.USERPROFILE||"";return I(h,".pi","agent","sessions")}b(Je,"getAgentSessionDir");function We(h){let t=`--${h.replace(/^[/\\]/,"").replace(/[/\\:]/g,"-")}--`;return I(Je(),t)}b(We,"encodeCwdToSessionDir");function _e(h=10,t,r){if(h<=0)return[];let y=r||process.cwd(),C=[];C.push(We(y));let k=Ce(y);for(;k!==y&&k!=="/"&&k!==".";){C.push(We(k));let P=Ce(k);if(P===k)break;k=P}let T=Je();if(E(T))try{let P=de(T);for(let L of P){let z=I(T,L);!L.startsWith("--")&&Pe(z).isDirectory()&&C.push(z)}}catch{}let Y=[],R=new Set;for(let P of C)if(!(!E(P)||R.has(P))){R.add(P);try{let L=de(P).filter(z=>z.endsWith(".jsonl"));for(let z of L){let q=I(P,z);if(!(t&&q===t))try{let ee=Pe(q);Y.push({path:q,mtime:ee.mtimeMs})}catch{}}}catch{}}Y.sort((P,L)=>L.mtime-P.mtime);let X=[];for(let P of Y){if(X.length>=h)break;try{let z=x(P.path,"utf-8").trim().split(`
`),q=[];if(z.length>0)try{let Z=JSON.parse(z[0]);if(Z.type==="session"&&Z.cwd){let H=Z.cwd,U=(r||process.cwd()).replace(/\/$/,"");if(!U.startsWith(H)&&!H.startsWith(U))continue}}catch{}for(let Z of z)try{let H=JSON.parse(Z);if(H.type!=="message")continue;let U=H.message;if(!U||!U.role||!["user","assistant"].includes(U.role))continue;let N="";if(Array.isArray(U.content)){for(let se of U.content)if(se.type==="text"&&se.text){N=se.text;break}}else typeof U.content=="string"&&(N=U.content);if(!N||N.startsWith("[cache keepalive")||N.startsWith("[Soma Boot")||N.startsWith("[Soma ")||N.includes("FLUSH COMPLETE")||N.includes("BREATHE COMPLETE"))continue;q.push({role:U.role,text:N,timestamp:H.timestamp})}catch{}let ee=h-X.length,te=q.slice(-ee);X.unshift(...te)}catch{}break}return X.slice(-h)}b(_e,"scanSessionLogs");function Ge(h){if(h.length===0)return"";let t=[];for(let r of h){let y=r.role==="user"?"**User:**":"**Assistant:**",C=r.role==="assistant"?500:300,k=r.text;k.length>C&&(k=k.slice(0,C)+"\u2026"),t.push(`${y} ${k}`)}return`---
## Last Conversation (${h.length} messages)

${t.join(`

`)}
`}b(Ge,"formatConversationTail");function Mt(h){let t=I(h,"amps","scripts","soma-stats.sh");if(!E(t))return[];try{let r=G(`bash "${t}" --warnings --cwd "${process.cwd()}"`,{encoding:"utf-8",timeout:5e3,stdio:["pipe","pipe","pipe"]}).trim();return!r||r.startsWith("\u2705")?[]:r.split(`
`).filter(y=>y.trim().length>0)}catch{return[]}}b(Mt,"getSessionWarnings");var It=Ce(Ze(import.meta.url)),Ye=Xe(It,"..");function At(h){try{let n=ge();if(n)for(let e of[".restart-required",".rotate-signal"]){let s=I(n.path,e);E(s)&&G(`rm -f "${s}"`,{stdio:"ignore"})}}catch{}let t=null,r=null,y=$e(null),C=null,k=null,T=new Set,Y=new Set,R=[],X=[],P=[],L=[],z=[],q=[],ee=new Set,te=!1,Z=!1,H=!1,U=null,N=null,se=!1,be="",B="";function Se(){let n=new Date().toISOString().split("T")[0],e=t?_(t.path,"sessions",r):null,s=1;if(e&&E(e)){let i=de(e).filter(l=>l.startsWith(n)&&l.endsWith(".md"));for(let l of i){let a=l.match(/-s(\d+)/);a&&(s=Math.max(s,parseInt(a[1],10)+1))}}let m=`s${String(s).padStart(2,"0")}`,c;try{let{randomBytes:i}=Ve("crypto");c=i(3).toString("hex")}catch{c=Date.now().toString(16).slice(-6)}return`${m}-${c}`}b(Se,"generateSessionId");let oe=null,ne=null;function pe(){if(oe)return oe;let n=B||Se(),e=t?_(t.path,"preloads",r):null;return oe=gt(n,e),oe}b(pe,"getPreloadFilename");function ue(){if(ne)return ne;let n=B||Se(),e=t?_(t.path,"sessions",r):null;return ne=yt(n,e),ne}b(ue,"getSessionLogFilename");function me(){if(!t||se)return;let n=r?.protocols.decayRate??1;C&&(nt(C,T,n,R),le(t,C)),lt(t,Y,n,r),vt(t,ee,n,r),se=!0}b(me,"saveAllHeatState");function Me(n,e){if(!t||!r)return[];let s=[],m=r.boot.steps;for(let c of m)switch(y.boot(`step: ${c}`),c){case"identity":{k=Qe(n,r),y.boot(`identity built (${k?.length??0} chars)`);break}case"preload":break;case"protocols":{let i=xe(t.projectDir),l=Ne(n,i,r);if(R=l,X=l.map(a=>a.name),l.length>0){C=et(t);let a=r.protocols;C?st(C,l,a)&&le(t,C):(C=tt(l,a),le(t,C));let o=ot(l,C,a);if(o.hot.length>0){let u=o.hot.map(v=>{let w=ce(v.content);return w=w.replace(/^# [^\n]+\n+/,""),`### Protocol: ${v.name}
${w}`}).join(`

`);s.push(`
---
## Hot Protocols (full reference)

${u}`)}}break}case"muscles":{let i=it(n,r);if(P=i,L=i.map(l=>l.name),i.length>0){let l=rt(i,r.muscles);if(l.hot.length>0){let o=l.hot.map(u=>{let v=ce(u.content);return v=v.replace(/<!-- digest:start -->\n?/g,""),v=v.replace(/\n?<!-- digest:end -->/g,""),v=v.replace(/^# [^\n]+\n+/,""),`### Muscle: ${u.name}
${v}`}).join(`

`);s.push(`
---
## Hot Muscles (full reference)

${o}`)}let a=[...l.hot,...l.warm];a.length>0&&at(a)}break}case"automations":{let i=bt(n,r);if(z=i,q=i.map(l=>l.name),i.length>0){let l=St(i,r.automations);if(l.hot.length>0){let a=l.hot.map(o=>{let u=ce(o.content);return u=u.replace(/^# [^\n]+\n+/,""),`### Automation: ${o.name}
${u}`}).join(`

`);s.push(`
---
## Hot Automations (full reference)

${a}`)}if(l.warm.length>0){let a=l.warm.map(o=>{let u=o.description?` \u2014 ${o.description}`:"";return o.digest?`- **${o.name}**${u}
  ${o.digest}`:`- **${o.name}**${u}`}).join(`
`);s.push(`
**Available automations (digest):** ${a}`)}if(l.cold.length>0){let a=l.cold.map(o=>{let u=o.description?` (${o.description})`:"";return`${o.name}${u}`}).join("; ");s.push(`
**Available automations (not loaded):** ${a}`)}}break}case"scripts":{let i=[_(t.path,"scripts",r)];if(r.inherit.tools&&n.length>1)for(let o=1;o<n.length;o++)i.push(_(n[o].path,"scripts",r));let l=new Set,a=[];for(let o of i)if(E(o))try{let u=r?.scripts?.extensions??Ct,v=b((w,j)=>{if(!(j>2))try{let d=de(w,{withFileTypes:!0});for(let f of d)if(!(f.name.startsWith("_")||f.name.startsWith("."))){if(f.isDirectory())v(I(w,f.name),j+1);else if(f.isFile()&&u.some(g=>f.name.endsWith(g))&&!l.has(f.name)){l.add(f.name);let g=I(w,f.name),p=Pt(g,f.name);a.push({name:f.name,dir:w,meta:p})}}}catch{}},"scanScriptDir");v(o,0)}catch{}if(a.length>0){let o=I(t.path,"state.json"),u={};try{u=JSON.parse(x(o,"utf-8")).scripts??{}}catch{}a.sort((j,d)=>{let f=u[j.name]?.count??0,g=u[d.name]?.count??0;return g!==f?g-f:j.name.localeCompare(d.name)});let v=[`## Available Scripts
`,`**Before coding, check if a script already handles the task. Read the associated muscle first.**
`,"| Script | What it does | Uses |","|--------|-------------|------|",...a.map(({name:j,dir:d,meta:f})=>{let g=u[j]?.count??0,p=g>0?`${g}`:"";return`| \`${j}\` | ${f.description} | ${p} |`}),"","Run with `bash <path>`. Use `--help` for options.",""],w=new Set;for(let{meta:j}of a)for(let d of j.relatedMuscles)w.add(d);if(w.size>0&&P.length>0){let j=[];for(let d of w){let f=P.find(g=>g.name===d);if(f){let g=a.filter(S=>S.meta.relatedMuscles.includes(d)).map(S=>S.name.replace(/\.sh$/,"")),p=f.digest?f.digest.replace(/^>\s*\*\*[^*]+\*\*\s*—\s*/,"").split(/\.\s/)[0].trim():"",$=p.length>80?p.slice(0,77)+"...":p;j.push(`| \`${d}\` | ${g.join(", ")} | ${$} |`)}}j.length>0&&v.push(`
### Script \u2194 Muscle Reference
`,`Read the full muscle before using its script.
`,"| Muscle | Used by | Summary |","|--------|---------|---------|",...j,"")}s.push(`
---
${v.join(`
`)}`)}break}case"git-context":{if(e?.skipGitContext)break;let i=r.boot.gitContext;if(!i.enabled)break;if(r.checkpoints?.diffOnBoot)try{let l=I(t.path,".git");if(E(l)){let a=r.checkpoints.maxDiffLines??80,o=G(`git diff HEAD~1 --stat --no-color 2>/dev/null | head -${a}`,{cwd:t.path,encoding:"utf-8",stdio:["pipe","pipe","pipe"]}).trim();o&&s.push(`
---
## .soma Changes (since last checkpoint)

\`\`\`
${o}
\`\`\`
`)}}catch{}try{let l=t.projectDir;G("git rev-parse --is-inside-work-tree",{cwd:l,stdio:"pipe"});let a=[`## Recent Changes (git)
`];if(i.maxCommits>0){let o="";if(i.since==="last-session"){let v=re(t,r.preload.staleAfterHours,r);v?o=`--since="${new Date(Date.now()-v.ageHours*36e5).toISOString()}"`:o='--since="24 hours ago"'}else/^\d+h$/.test(i.since)?o=`--since="${parseInt(i.since)} hours ago"`:/^\d+d$/.test(i.since)?o=`--since="${parseInt(i.since)} days ago"`:o=`--since="${i.since}"`;let u=G(`git log --oneline ${o} -${i.maxCommits} 2>/dev/null`,{cwd:l,encoding:"utf-8",stdio:["pipe","pipe","pipe"]}).trim();u&&(a.push(`### Commits
`),a.push("```"),a.push(u),a.push("```\n"))}if(i.diffMode!=="none"&&i.maxDiffLines>0){let o=i.diffMode==="full"?`git diff HEAD~5 --no-color 2>/dev/null | head -${i.maxDiffLines}`:`git diff HEAD~5 --stat --no-color 2>/dev/null | head -${i.maxDiffLines}`,u=G(o,{cwd:l,encoding:"utf-8",stdio:["pipe","pipe","pipe"]}).trim();u&&(a.push(`### Changed Files
`),a.push("```"),a.push(u),a.push("```\n"))}a.length>1&&s.push(`
---
${a.join(`
`)}`)}catch{}break}default:break}return s}b(Me,"runBootDiscovery"),h.on("session_start",async(n,e)=>{if(Z){y.boot("session_start re-fired \u2014 skipping (already booted this session)"),Ie(e);return}Z=!0,Ie(e);try{let d=e.sessionManager.getSessionFile?.()||"";be=d&&d.split("/").pop()?.replace(/\.[^.]+$/,"")||""}catch{be=""}let s=e.sessionManager.getEntries(),m=s.some(d=>d.type==="message"),c=null;if(m)for(let d of s){let f="",g=d;if(g.type==="message"&&g.message){let $=g.message.content;f=typeof $=="string"?$:Array.isArray($)?$.filter(S=>S.type==="text").map(S=>S.text).join(`
`):""}else if(g.type==="custom_message"&&g.content){let $=g.content;f=typeof $=="string"?$:Array.isArray($)?$.filter(S=>S.type==="text").map(S=>S.text).join(`
`):""}let p=f.match(/Session ID:\s*`(s\d+-[a-f0-9]+)`/);if(p){c=p[1];break}}if(B=c||Se(),c){y.boot(`resumed session \u2014 reusing ID: ${c}`);let d=new Date().toISOString().split("T")[0];ne=`${d}-${c}.md`,oe=`preload-next-${d}-${c}.md`}let i=V();i&&i.provide("session:id",()=>B,{provider:"soma-boot",description:"Get current Soma session ID (e.g. s01-abc123)"});try{let d=dt();d&&y.boot(`global ~/.soma/ bootstrapped: ${d}`)}catch(d){y.boot(`global ~/.soma/ bootstrap skipped: ${d}`)}if(t=ge(),!t){let d=ht(process.cwd()),f=Ee(process.cwd());t=ge(),e.ui.notify(`\u{1F331} Soma planted at ${f}`,"info");let g=[];d.parent&&g.push(`Parent workspace detected at \`${d.parent.path}\` (${d.parent.distance} level${d.parent.distance>1?"s":""} up).`),d.claudeMd&&g.push(`CLAUDE.md found at \`${d.claudeMd.path}\` (${d.claudeMd.ageDays}d old). Review it as one input for understanding this project.`),d.agentsMd&&g.push(`AGENTS.md found at \`${d.agentsMd.path}\` (${d.agentsMd.ageDays}d old).`),d.signals.length>0&&g.push(`Detected stack: ${d.signals.join(", ")}.`),d.packageManager&&g.push(`Package manager: ${d.packageManager}.`);let p=g.length>0?`
**Context detected:**
${g.map($=>`- ${$}`).join(`
`)}
`:"";e.hasUI&&h.sendUserMessage(`[Soma Boot \u2014 First Run]

Created memory at \`${f}\`.
`+p+`
A starter identity file is at \`${f}/identity.md\` (pre-filled with detected context).
Review it, examine the project structure, and rewrite it to reflect who you are in this context. Keep it specific and under 30 lines.`,{deliverAs:"followUp"})}let l=we();r=Oe(l),y=$e(t?.path??null,r.debug),y.enabled&&(y.boot(`session start \u2014 soma: ${t?.path}, cwd: ${process.cwd()}`),y.boot(`settings loaded from chain: [${l.map(d=>d.path).join(", ")}]`),y.boot(`session id: ${be}`)),i&&(i.provide("soma:dir",()=>t,{provider:"soma-boot",description:"Get current SomaDir object"}),i.provide("soma:settings",()=>r,{provider:"soma-boot",description:"Get current SomaSettings object"}),i.provide("soma:sessionId",()=>B,{provider:"soma-boot",description:"Get current session ID string"}),i.provide("heat:save",()=>me(),{provider:"soma-boot",description:"Save all heat state (protocols, muscles, automations) to disk"}),i.provide("state:commit",d=>he(d),{provider:"soma-boot",description:"Auto-commit .soma/ state with label"}));let a=m,o=Me(l),u=r.protocols?.hotThreshold??3,v=r.muscles?.fullThreshold??3,w={hotProtocols:R.filter(d=>(C?.protocols?.[d.name]?.heat??0)>=u).map(d=>d.name).sort(),hotMuscles:P.filter(d=>d.heat>=v).map(d=>d.name).sort(),scriptNames:o.some(d=>d.includes("Available Scripts"))?[...new Set(L)].sort():[]};if(a){let d=e.sessionManager.getEntries().find(A=>A.customType==="soma-boot"&&A.content?.fingerprint);if(d){let A=d.content.fingerprint,M=[],K=w.hotProtocols.filter(W=>!A.hotProtocols?.includes(W)),O=(A.hotProtocols||[]).filter(W=>!w.hotProtocols.includes(W));K.length>0&&M.push(`**Newly hot protocols:** ${K.join(", ")}`),O.length>0&&M.push(`**Cooled protocols:** ${O.join(", ")}`);let D=w.hotMuscles.filter(W=>!A.hotMuscles?.includes(W)),J=(A.hotMuscles||[]).filter(W=>!w.hotMuscles.includes(W));D.length>0&&M.push(`**Newly hot muscles:** ${D.join(", ")}`),J.length>0&&M.push(`**Cooled muscles:** ${J.join(", ")}`);let Q=o.filter(W=>W.includes(".soma Changes")||W.includes("Recent Changes"));if(Q.length>0&&M.push(...Q),h.appendEntry("soma-boot",{timestamp:Date.now(),resumed:!0,fingerprint:w,diffed:!0}),M.length===0){te=!0;let W=B?`
Session ID: \`${B}\``:"";y.boot("resume: no changes since last boot \u2014 minimal injection"),e.hasUI&&h.sendUserMessage(`[Soma Boot \u2014 resumed, no changes]

Identity, protocols, and muscles unchanged since last boot. System prompt is current. Continue where you left off.${W}`,{deliverAs:"followUp"})}else{te=!0;let W=B?`
Session ID: \`${B}\``:"";y.boot(`resume: ${M.length} changes since last boot`),e.hasUI&&h.sendUserMessage(`[Soma Boot \u2014 resumed, delta only]

**Changes since last boot:**
${M.join(`
`)}

Everything else unchanged. System prompt is current.${W}`,{deliverAs:"followUp"})}return}y.boot("resume: no fingerprint \u2014 minimal boot (system prompt is current)"),te=!0;let f=B?`
Session ID: \`${B}\``:"",g=t?I(_(t.path,"sessions",r),ue()):null,p=t?I(_(t.path,"preloads",r),pe()):null,$=g||p?`

Session files:
${g?`- Session log: \`${g}\`
`:""}${p?`- Preload: \`${p}\`
`:""}`:"",S=o.filter(A=>A.includes(".soma Changes")||A.includes("Recent Changes")),F=S.length>0?`

${S.join(`
`)}`:"";h.appendEntry("soma-boot",{timestamp:Date.now(),resumed:!0,fingerprint:w}),e.hasUI&&h.sendUserMessage(`[Soma Boot \u2014 resumed]

Identity, protocols, and muscles are in your system prompt. Continue where you left off.${F}${f}${$}`,{deliverAs:"followUp"});return}if(!a&&t){let d=I(t.path,".boot-target");if(E(d))try{let f=x(d,"utf-8"),g=JSON.parse(f);if(Ue(d),g.type==="map"&&g.name){let p=Le(g.name,t,r);if(p){y.boot(`MAP loaded: ${p.name} (status: ${p.status})`),He(p),p.promptConfig&&(N=p.promptConfig,y.boot(`plan overrides active: ${Object.keys(p.promptConfig).join(", ")}`));let $=kt(g.name,t,r);$&&(o.unshift(`
---
## Targeted Preload (for MAP: ${p.name})

${$}
`),y.boot(`targeted preload injected for MAP: ${p.name}`));let S=ce(p.content);o.push(`
---
## Active MAP: ${p.name}

${S}
`)}else y.boot(`MAP not found: ${g.name}`),o.push(`
\u26A0\uFE0F MAP "${g.name}" not found in automations/maps/
`)}if(g.type==="focus"&&g.keyword){y.boot(`focus mode: "${g.keyword}"`);let p=g.promptConfig??{};if(P&&P.length>0){let A=wt(P,g.keyword);if(A.length>0){let M=p.heatOverrides?.muscles??{},K=p.forceInclude?.muscles??[];for(let{muscle:O,score:D}of A){let J=M[O.name]??0;D>=8&&!K.includes(O.name)&&K.push(O.name),D+2>J&&(M[O.name]=D+2)}p.heatOverrides={...p.heatOverrides,muscles:M},p.forceInclude={...p.forceInclude,muscles:K},y.boot(`focus: ${A.length} muscles matched via triggers/tags/keywords`)}}if(N=p,p&&y.boot(`focus overrides: ${Object.keys(p).join(", ")}`),g.preloadPath){let A=null;try{let M=I(t.path,g.preloadPath);E(M)&&(A=x(M,"utf-8"))}catch{}A&&(o.unshift(`
---
## Focus Context: ${g.keyword}

${A}
`),y.boot(`focus preload injected: ${g.preloadPath}`))}let $=g.relatedMaps??[],S=$.slice(0,3);for(let A of S){let M=Le(A,t,r);if(M){let K=ce(M.content);if(o.push(`
---
## Related MAP: ${M.name}

${K}
`),y.boot(`focus MAP loaded: ${M.name}`),M.promptConfig){let O=M.promptConfig;if(O.heatOverrides?.muscles){let D=p.heatOverrides?.muscles??{};for(let[J,Q]of Object.entries(O.heatOverrides.muscles))Q>(D[J]??0)&&(D[J]=Q);p.heatOverrides={...p.heatOverrides,muscles:D}}if(O.heatOverrides?.protocols){let D=p.heatOverrides?.protocols??{};for(let[J,Q]of Object.entries(O.heatOverrides.protocols))Q>(D[J]??0)&&(D[J]=Q);p.heatOverrides={...p.heatOverrides,protocols:D}}if(O.forceInclude?.muscles){let D=p.forceInclude?.muscles??[];for(let J of O.forceInclude.muscles)D.includes(J)||D.push(J);p.forceInclude={...p.forceInclude,muscles:D}}O.supplementaryIdentity&&!p.supplementaryIdentity?.includes(O.supplementaryIdentity)&&(p.supplementaryIdentity=(p.supplementaryIdentity??"")+`
`+O.supplementaryIdentity),y.boot(`focus: merged MAP ${M.name} prompt-config`),N=p}He(M)}}$.length>3&&o.push(`
*${$.length-3} more related MAPs available: ${$.slice(3).join(", ")}*
`);let F=(g.relatedSessions??[]).length;o.push(`
---
**\u{1F50D} Focused on: "${g.keyword}"** \u2014 ${S.length} MAPs loaded, ${F} related sessions found.
`)}}catch(f){y.boot(`boot-target read failed: ${f}`);try{Ue(d)}catch{}}}let j=process.env.SOMA_INHALE==="1";if(!a&&t&&j){let d=re(t,r.preload.staleAfterHours,r);if(d&&!d.stale){let p=d.stale?" \u26A0\uFE0Fstale":"";o.unshift(`
---
## Preload (from last session${p})

${d.content}
`),y.boot(`preload auto-injected: ${d.name} (${Math.floor(d.ageHours)}h old)`)}let f=Math.min(r.preload.lastSessionLogs??0,5);if(f>0&&t)try{let p=_(t.path,"sessions",r);if(E(p)){let $=de(p).filter(S=>S.endsWith(".md")&&!S.startsWith(".")&&!S.startsWith("_")).sort().reverse().slice(0,f);if($.length>0){let S=$.map(F=>{let A=x(I(p,F),"utf-8").trim(),M=3e3,K=A.length>M?A.slice(0,M)+`

[... truncated \u2014 full log: memory/sessions/${F}]`:A;return`### ${F}

${K}`});o.unshift(`---
## Recent Session Logs (${$.length})

${S.join(`

---

`)}
`),y.boot(`session logs injected: ${$.length} files`)}}}catch(p){y.boot(`session log injection failed: ${p}`)}let g=r.preload.lastMessages??10;if(g>0)try{let p=e.sessionManager.getSessionFile?.()||void 0,$=_e(g,p);if($.length>0){let S=Ge($);o.unshift(S),y.boot(`conversation tail injected: ${$.length} messages`)}}catch(p){y.boot(`conversation tail scan failed: ${p}`)}try{let p=Mt(t.path);if(p.length>0){let $=`---
## Session Warnings (from previous session)

${p.join(`
`)}

**Tool preference:** script > ls > grep > find (find hangs on large trees)
`;o.unshift($),y.boot(`session warnings injected: ${p.length}`)}}catch(p){y.boot(`session warnings failed: ${p}`)}}if(o.length>0){te=!0,h.appendEntry("soma-boot",{timestamp:Date.now(),resumed:a,fingerprint:w});let d=B?`
Session ID: \`${B}\``:"",f=t?I(_(t.path,"sessions",r),ue()):null,g=t?I(_(t.path,"preloads",r),pe()):null,p=f||g?`

Session files:
${f?`- Session log: \`${f}\`
`:""}${g?`- Preload: \`${g}\`
`:""}`:"",$=o.some(F=>F.includes("## Preload (from last session")),S=a?`You've resumed a Soma session. Your preload and hot protocols are above. Identity and behavioral rules are in your system prompt. If the preload has an "Orient From" section, read those files before doing anything else. Then greet the user briefly and await instructions.${d}${p}`:$?`You've booted into a fresh Soma session with a preload from your past self. **The preload's Resume Point is your ground truth** \u2014 trust it over conversation history. When conversation tail and preload conflict, the preload wins (it's curated; conversation tail is raw). Your first message MUST state: (1) what you're resuming from the preload, (2) what's next. If the preload has "Orient From" targets, read those before starting any work. Do not re-discover what the preload already tells you.${d}${p}`:`You've booted into a fresh Soma session. Identity and behavioral rules are in your system prompt. Hot protocols are above if any. Greet the user briefly and await instructions.${d}${p}`;e.hasUI&&h.sendUserMessage(`[Soma Boot${a?" \u2014 resumed":""}]

${o.join(`
`)}

${S}`,{deliverAs:"followUp"})}}),h.on("before_agent_start",async(n,e)=>{if(!t||!te)return;let s=U??n.systemPrompt;if(!H&&r){let m=h.getActiveTools?.()??[],c=h.getAllTools?.()??[];if(m.length>0)s=Re({protocols:R,protocolState:C,muscles:P,settings:r,piSystemPrompt:n.systemPrompt,activeTools:m,allTools:c,agentDir:Ye,identity:k,planOverrides:N??void 0}).block,U=s,H=!0,y.systemPrompt(s),y.boot(`system prompt compiled (${s.length} chars, ${R.length} protocols, ${P.length} muscles${N?", with plan overrides":""})`);else{let i=ft({protocols:R,protocolState:C,muscles:P,settings:r,planOverrides:N??void 0});i.block&&(s=i.block+`

---

`+n.systemPrompt,U=s,H=!0)}}return{systemPrompt:s}});let ve=0,ze=5;h.on("turn_end",async()=>{ve++,ve>=ze&&(ve=0,he("periodic"))}),h.on("session_switch",async(n,e)=>{if(n.reason==="new"&&(se=!1,Z=!1,oe=null,ne=null,T=new Set,Y=new Set,ee=new Set,H=!1,U=null,V()?.emit("session:reset",{reason:"new"}),t)){let m=we();r=Oe(m);let c=Me(m,{skipGitContext:!0}),i=re(t,r.preload?.staleAfterHours,r);if(i&&!i.stale&&c.unshift(`
---
## Preload (from last session)

${i.content}
`),c.length>0&&e.hasUI){let l=I(_(t.path,"sessions",r),ue()),a=I(_(t.path,"preloads",r),pe()),o=`

Session files:
- Session log: \`${l}\`
- Preload: \`${a}\`
`,u=`[Soma Boot \u2014 rotated session]

${c.join(`
`)}

You've rotated into a fresh session. Identity and behavioral rules are in your system prompt. Hot protocols and muscles are above. `+(i?`Your preload from the previous session is included above. **The preload's Resume Point is your ground truth.** Your first message MUST state what you're resuming and what's next. If it has "Orient From" targets, read those before starting work. Do not re-discover what the preload already tells you.`:"Greet the user briefly and await instructions.")+o;V()?.provide("boot:rotationMessage",()=>u,{provider:"soma-boot",description:"Queued boot message for post-rotation delivery"})}}}),h.on("session_shutdown",async()=>{t&&me()});let qe=[{match:b((n,e)=>n==="write"&&typeof e?.content=="string"&&e.content.startsWith(`---
`),"match"),target:"frontmatter-standard",type:"protocol"},{match:b((n,e)=>n==="bash"&&typeof e?.command=="string"&&/git (config|commit|push|remote)/.test(e.command),"match"),target:"git-identity",type:"protocol"},{match:b((n,e)=>n==="write"&&typeof e?.path=="string"&&/preload|continuation/.test(e.path),"match"),target:"breath-cycle",type:"protocol"},{match:b((n,e)=>n==="bash"&&typeof e?.command=="string"&&/checkpoint:|\.soma.*git (add|commit)/.test(e.command),"match"),target:"session-checkpoints",type:"protocol"},{match:b((n,e)=>n==="write"&&typeof e?.path=="string"&&e.path.endsWith(".svg"),"match"),target:"svg-logo-design",type:"muscle"}];h.on("tool_result",async n=>{if(!t||!C||!r?.heat.autoDetect)return;let e=n.toolName,s=n.input,m=n.content?.map(i=>i.text||"").join("")||"",c=r.heat.autoDetectBump;if(e==="read"&&typeof s?.path=="string"){let i=s.path;if(/muscles\/[^/]+\.md$/.test(i)){let l=i.replace(/^.*muscles\//,"").replace(/\.md$/,"");L.includes(l)&&!Y.has(l)&&(Y.add(l),ye(t,l,c,r),y.heat(`muscle read: ${l} +${c} (dynamic: file read)`))}}if(e==="bash"&&typeof s?.command=="string"){let l=s.command.match(/(?:bash|sh)\s+(?:.*\/)?scripts\/([\w.-]+\.sh)/);if(l){let a=l[1];y.heat(`script executed: ${a} (dynamic: bash command)`);try{let o=I(t.path,"state.json"),u=E(o)?JSON.parse(x(o,"utf-8")):{};u.scripts||(u.scripts={}),u.scripts[a]||(u.scripts[a]={count:0,lastUsed:""}),u.scripts[a].count+=1,u.scripts[a].lastUsed=new Date().toISOString().slice(0,10),De(o,JSON.stringify(u,null,"	")+`
`)}catch(o){y.heat(`failed to persist script usage: ${o}`)}}}for(let i of qe)i.match(e,s,m)&&(i.type==="protocol"&&X.includes(i.target)?T.has(i.target)||(T.add(i.target),ke(C,i.target,"applied"),y.heat(`protocol detected: ${i.target} (auto-detect from tool_result)`)):i.type==="muscle"&&L.includes(i.target)&&(Y.has(i.target)||(Y.add(i.target),ye(t,i.target,c,r),y.heat(`muscle detected: ${i.target} +${c} (auto-detect from tool_result)`))))});function ie(){H=!1,U=null}b(ie,"invalidateCompiledPrompt");function fe(n){let e=V();e&&(n.newSession&&e.provide("session:new",n.newSession.bind(n),{provider:"soma-boot",description:"Start fresh session (clears messages, fires session_switch)"}),n.compact&&e.provide("session:compact",n.compact.bind(n),{provider:"soma-boot",description:"Trigger context compaction"}),n.reload&&e.provide("session:reload",n.reload.bind(n),{provider:"soma-boot",description:"Reload all extensions without restarting process"}),n.waitForIdle&&e.provide("session:waitForIdle",n.waitForIdle.bind(n),{provider:"soma-boot",description:"Wait for agent to stop streaming before acting"}),n.fork&&e.provide("session:fork",n.fork.bind(n),{provider:"soma-boot",description:"Fork session from a specific entry"}),n.navigateTree&&e.provide("session:navigate",n.navigateTree.bind(n),{provider:"soma-boot",description:"Navigate to different point in session tree"}),n.switchSession&&e.provide("session:switch",n.switchSession.bind(n),{provider:"soma-boot",description:"Switch to a different session file"}))}b(fe,"provideCommandCapabilities");function Ie(n){let e=V();e&&(n.getContextUsage&&e.provide("context:usage",n.getContextUsage.bind(n),{provider:"soma-boot",description:"Get context token usage ({ percent, tokensUsed, tokenLimit })"}),n.getSystemPrompt&&e.provide("context:systemPrompt",n.getSystemPrompt.bind(n),{provider:"soma-boot",description:"Get current compiled system prompt"}),n.ui?.notify&&e.provide("ui:notify",n.ui.notify.bind(n.ui),{provider:"soma-boot",description:"Show UI notification (message, level)"}),e.provide("message:send",(s,m)=>{h.sendUserMessage(s,m)},{provider:"soma-boot",description:"Send user message to agent (does NOT trigger /commands)"}))}b(Ie,"provideEventCapabilities"),h.registerCommand("pin",{description:"Pin a protocol or muscle to hot \u2014 keeps it loaded across sessions",handler:b(async(n,e)=>{fe(e);let s=n.trim();if(!s){e.ui.notify("Usage: /pin <protocol-or-muscle-name>","info");return}if(!t||!C){e.ui.notify("No soma booted","error");return}X.includes(s)?(ke(C,s,"pinned"),le(t,C),T.add(s),ie(),e.ui.notify(`\u{1F4CC} ${s} pinned (heat locked hot) \u2014 prompt will recompile`,"info")):L.includes(s)?(ye(t,s,r?.heat.pinBump??5,r),Y.add(s),ie(),e.ui.notify(`\u{1F4CC} ${s} pinned (heat bumped to hot) \u2014 prompt will recompile`,"info")):q.includes(s)?(Fe(t,s,r?.heat.pinBump??5,r),ee.add(s),ie(),e.ui.notify(`\u{1F4CC} ${s} automation pinned (heat bumped to hot) \u2014 prompt will recompile`,"info")):e.ui.notify(`Unknown protocol, muscle, or automation: ${s}`,"error")},"handler")}),h.registerCommand("kill",{description:"Kill a protocol, muscle, or automation \u2014 drops heat to zero",handler:b(async(n,e)=>{let s=n.trim();if(!s){e.ui.notify("Usage: /kill <name>","info");return}if(!t||!C){e.ui.notify("No soma booted","error");return}X.includes(s)?(ke(C,s,"killed"),le(t,C),ie(),e.ui.notify(`\u{1F480} ${s} killed (heat \u2192 0) \u2014 prompt will recompile`,"info")):L.includes(s)?(ye(t,s,-15,r),ie(),e.ui.notify(`\u{1F480} ${s} killed (heat \u2192 0) \u2014 prompt will recompile`,"info")):q.includes(s)?(Fe(t,s,-15,r),ie(),e.ui.notify(`\u{1F480} ${s} automation killed (heat \u2192 0) \u2014 prompt will recompile`,"info")):e.ui.notify(`Unknown protocol, muscle, or automation: ${s}`,"error")},"handler")}),h.registerCommand("auto-commit",{description:"Toggle auto-commit of .soma/ state on exhale/breathe",getArgumentCompletions:b(n=>["on","off","status"].filter(e=>e.startsWith(n)).map(e=>({value:e,label:e})),"getArgumentCompletions"),handler:b(async(n,e)=>{if(!t||!r){e.ui.notify("No soma booted","error");return}let s=n.trim().toLowerCase();if(s==="status"||!s){let m=r.checkpoints?.soma?.autoCommit??!0,c=r.checkpoints?.project?.autoCheckpoint??!1;e.ui.notify(`Auto-commit status:
  .soma/ state: ${m?"\u2705 on":"\u274C off"}
  project code: ${c?"\u2705 on":"\u274C off"}

Toggle: /auto-commit on | /auto-commit off
Persists in settings.json via checkpoints.soma.autoCommit`,"info");return}if(s==="on"||s==="off"){let m=s==="on";r.checkpoints||(r.checkpoints={}),r.checkpoints.soma||(r.checkpoints.soma={}),r.checkpoints.soma.autoCommit=m;try{let c=I(t.path,"settings.json"),i=E(c)?JSON.parse(x(c,"utf-8")):{};i.checkpoints||(i.checkpoints={}),i.checkpoints.soma||(i.checkpoints.soma={}),i.checkpoints.soma.autoCommit=m,De(c,JSON.stringify(i,null,2)+`
`),e.ui.notify(`${m?"\u2705":"\u274C"} Auto-commit .soma/ state: ${s}`,"info")}catch(c){e.ui.notify(`\u26A0\uFE0F Updated in-memory but failed to persist: ${c?.message?.slice(0,80)}`,"warning")}return}e.ui.notify("Usage: /auto-commit on | off | status","info")},"handler")});function he(n){let e=r?.checkpoints;if(!(e?.soma?.autoCommit??!0)||!t)return null;let m=e?.project?.prefix??"checkpoint:",c=new Date().toISOString().replace(/\.\d+Z$/,"Z");try{let i=I(t.path,".git");if(!E(i))try{G("git init -b main",{cwd:t.path,stdio:"pipe"}),G("git add -A",{cwd:t.path,stdio:"pipe"}),G('git commit -m "init: .soma/ state tracking"',{cwd:t.path,stdio:"pipe"})}catch{return null}return G("git add -A",{cwd:t.path,stdio:"pipe"}),G("git status --porcelain",{cwd:t.path,encoding:"utf-8",stdio:"pipe"}).trim()?(G(`git commit -m "${m} ${n} ${c}"`,{cwd:t.path,stdio:"pipe"}),`Committed .soma/ state: ${m} ${n}`):null}catch{return null}}b(he,"autoCommitSomaState");let Ae=b(async(n,e)=>{if(!t){e.ui.notify("No .soma/ found. Run /soma init first.","error");return}let s=_(t.path,"preloads",r),m=I(s,pe()),c=new Date().toISOString().split("T")[0],i=I(_(t.path,"sessions",r),ue());me();let l=he("exhale");l&&e.ui.notify(`\u2705 ${l}`,"info");let a=r?.checkpoints,{template:o,steps:u}=$t({target:m,logPath:i,today:c,sessionId:B,autoCheckpoint:a?.project?.autoCheckpoint??!1,checkpointPrefix:a?.project?.prefix??"checkpoint:"});h.sendUserMessage(`[EXHALE \u2014 save session state]

${u.join(`

`)}

${o}

**Final step:** Say "FLUSH COMPLETE".`,{deliverAs:"followUp"}),e.ui.notify("Exhale initiated \u2014 write preload, then FLUSH COMPLETE","info")},"exhaleHandler");h.registerCommand("exhale",{description:"Exhale \u2014 save session state",handler:Ae}),h.registerCommand("rest",{description:"Rest \u2014 disable keepalive, save state, end session",handler:b(async(n,e)=>{fe(e);let m=V()?.get("keepalive:toggle");m&&m(!1),e.ui.notify("\u{1F4A4} Keepalive disabled \u2014 entering rest mode","info"),await Ae(n,e)},"handler")}),h.registerCommand("inhale",{description:"Inhale \u2014 reset session and load preload from last session",handler:b(async(n,e)=>{if(fe(e),!t){e.ui.notify("No .soma/ \u2014 nothing to inhale. Run /soma init first.","info");return}let s=re(t);if(!s){e.ui.notify("\u{1FAE7} No preload found \u2014 nothing to inhale.","info");return}n.includes("--heat-saved")||me();let c=he("inhale");c&&e.ui.notify(`\u2705 ${c}`,"info"),e.ui.notify("\u{1FAE7} Inhaling \u2014 resetting session with preload...","info");try{if(!(await e.newSession({})).cancelled){let o=V()?.get("boot:rotationMessage")?.();if(o)h.sendUserMessage(o,{deliverAs:"followUp"}),e.ui.notify("\u2705 Inhaled \u2014 fresh session with preload injected","info");else{let u=s.stale?` \u26A0\uFE0F (${Math.floor(s.ageHours)}h old \u2014 may be stale)`:"";h.sendUserMessage(`[Soma Inhale \u2014 Loading Preload${u}]

${s.content}`,{deliverAs:"followUp"}),e.ui.notify(`\u2705 Inhaled \u2014 preload injected (${Math.floor(s.ageHours)}h old)`,"info")}}}catch(i){e.ui.notify(`\u274C Inhale failed: ${i?.message?.slice(0,100)}`,"error");let l=s.stale?` \u26A0\uFE0F (${Math.floor(s.ageHours)}h old \u2014 may be stale)`:"";h.sendUserMessage(`[Soma Inhale \u2014 Loading Preload (fallback, session not reset)${l}]

${s.content}`,{deliverAs:"followUp"})}},"handler")}),h.registerCommand("soma",{description:"Soma memory status and management",getArgumentCompletions:b(n=>["status","init","prompt","prompt full","prompt identity","preload","debug","debug on","debug off"].filter(e=>e.startsWith(n)).map(e=>({value:e,label:e})),"getArgumentCompletions"),handler:b(async(n,e)=>{fe(e);let s=n.trim().toLowerCase()||"status";if(s==="init"){if(t){e.ui.notify(`Soma already planted at ${t.path}`,"info");return}let m=Ee(process.cwd());t=ge(),e.ui.notify(`\u{1F331} Soma planted at ${m}`,"info");return}if(s.startsWith("prompt")){if(!t||!r){e.ui.notify("No Soma found. Use /soma init","info");return}let m=s.replace("prompt","").trim(),c=h.getActiveTools?.()??[],i=h.getAllTools?.()??[],l=e.getSystemPrompt?.()??"",a=Re({protocols:R,protocolState:C,muscles:P,settings:r,piSystemPrompt:l||"You are an expert coding assistant operating inside pi",activeTools:c,allTools:i,agentDir:Ye,identity:k,planOverrides:N??void 0}),o=[["Soma core","You are Soma"],["Identity","# Identity"],["Behavioral rules","## Active Behavioral Rules"],["Learned patterns","## Learned Patterns"],["Tools","Available tools:"],["Guard","## Guard"],["Soma docs","Soma documentation"],["External context","## External Project Context"],["Skills","<available_skills>"],["Date/time","Current date and time:"]],u=R.map($=>({name:$.name,heat:ct($,C)})).sort(($,S)=>S.heat-$.heat),v=r.protocols?.warmThreshold??3,w=r.protocols?.hotThreshold??8,j=r.muscles?.digestThreshold??1,d=r.muscles?.fullThreshold??4;if(m==="full"){h.sendUserMessage(`[/soma prompt full \u2014 compiled system prompt (${a.estimatedTokens} tokens)]

\`\`\`
`+a.block+"\n```",{deliverAs:"followUp"});return}if(m==="identity"){h.sendUserMessage(`[/soma prompt identity]

**Built identity:** ${k?`${k.length} chars`:"\u274C NONE"}
**In compiled prompt:** ${a.block.includes("# Identity")?"\u2705 yes":"\u274C NO \u2014 BUG"}
**persona.name:** ${r.persona?.name??"(null)"}
**identityInSystemPrompt:** ${r.systemPrompt?.identityInSystemPrompt??"(default: true)"}

`+(k?"```\n"+k.slice(0,2e3)+"\n```":"No identity found in chain."),{deliverAs:"followUp"});return}let f=[];f.push(`**Compiled System Prompt** \u2014 ${a.block.length} chars (~${a.estimatedTokens} tokens)`),f.push(`Full replacement: ${a.fullReplacement} | Cached: ${H}`),f.push(""),f.push("**Sections:**");for(let[$,S]of o){let F=a.block.includes(S);f.push(`  ${F?"\u2705":"\u274C"} ${$}`)}f.push(""),f.push(`**Identity:** ${k?`${k.length} chars`:"\u274C NONE"} \u2192 ${a.block.includes("# Identity")?"in prompt \u2705":"MISSING from prompt \u274C"}`),f.push(`  persona.name: ${r.persona?.name??"(null)"} | emoji: ${r.persona?.emoji??"(null)"}`),f.push(""),f.push(`**Protocols:** ${a.protocolCount} in prompt (max ${r.protocols?.maxBreadcrumbsInPrompt??12})`);for(let $ of u){let S=$.heat>=w?"\u{1F534}":$.heat>=v?"\u{1F7E1}":"\u26AA",F=$.heat>=v?"\u2705":"\u2014";f.push(`  ${S} ${$.name}: heat=${$.heat} ${F}`)}f.push(""),f.push(`**Muscles:** ${a.muscleCount} digests in prompt (max ${r.muscles?.maxDigest??5})`);for(let $ of P.slice(0,10)){let S=$.heat>=d?"\u{1F534}":$.heat>=j?"\u{1F7E1}":"\u26AA",F=$.status!=="active"?` [${$.status}]`:"";f.push(`  ${S} ${$.name}: heat=${$.heat}${F}`)}f.push("");let g=e.getContextUsage?.();f.push("**Runtime:**"),f.push(`  Context: ${g?.percent!=null?Math.round(g.percent)+"%":"unknown"}`);let p=V()?.get("breathe:state")?.()??{};f.push(`  Warnings sent at: ${p.pct>0?Math.round(p.pct)+"%":"none yet"}`),f.push(`  Thresholds: ${JSON.stringify(r.context??{notifyAt:50,warnAt:70,urgentAt:80,autoExhaleAt:85})}`),f.push(""),f.push("\u{1F4A1} `/soma prompt full` \u2014 dump compiled prompt | `/soma prompt identity` \u2014 identity debug"),e.ui.notify(f.join(`
`),"info");return}if(s==="status"){if(!t){e.ui.notify("No Soma found. Use /soma init","info");return}let m=re(t),c=we(),i=Ne(c);e.ui.notify([`\u{1F33F} Soma: ${t.path} (${t.rootName}/)`,`Chain: ${c.length} level${c.length!==1?"s":""}`,`Preload: ${m?"\u2713":"none"}`,`Protocols: ${i.length}`,`System prompt: ~${H?"compiled":"pending"}`].join(`
`),"info");return}if(s==="preload"){if(!t){e.ui.notify("No .soma/ found","info");return}let m=re(t);if(m){let c=m.stale?" \u26A0\uFE0Fstale":"";e.ui.notify(`${m.name} (${Math.floor(m.ageHours)}h ago${c})`,"info")}else e.ui.notify("No preloads found","info");return}if(s.startsWith("debug")){let m=s.replace("debug","").trim()||"status";if(m==="status"){let c=t?I(t.path,"debug"):null,i=c&&E(c);e.ui.notify(`Debug mode: ${y.enabled?"ON \u{1F534}":"OFF"}
Debug dir: ${c||"(no .soma/)"}
`+(i?"Logs exist \u2014 read .soma/debug/ for diagnostics":"No debug logs yet"),"info");return}if(m==="on"){if(!t){e.ui.notify("No .soma/ found.","error");return}y=$e(t.path,!0),y.boot("debug mode enabled via /soma debug on"),e.ui.notify("\u{1F534} Debug mode ON \u2014 logging to .soma/debug/","info");return}if(m==="off"){y.enabled&&y.boot("debug mode disabled via /soma debug off"),y=$e(null),e.ui.notify("Debug mode OFF","info");return}e.ui.notify("Usage: /soma debug on|off|status","info");return}e.ui.notify("Usage: /soma status | init | prompt [full|identity] | preload | debug [on|off]","info")},"handler")});let ae=["protocol","muscle","skill","template"];h.registerCommand("install",{description:"Install a protocol, muscle, skill, or template from the Soma Hub",getArgumentCompletions:b(n=>ae.filter(e=>e.startsWith(n)).map(e=>({value:e,label:`${e} \u2014 install a ${e} from hub`})),"getArgumentCompletions"),handler:b(async(n,e)=>{if(!t){e.ui.notify("No .soma/ found. Run /soma init first.","error");return}let s=n.trim().split(/\s+/),m=s.includes("--force"),c=s.filter(a=>a!=="--force");if(c.length<2){e.ui.notify(`Usage: /install <type> <name> [--force]
Types: protocol, muscle, skill, template`,"info");return}let i=c[0],l=c[1];if(!ae.includes(i)){e.ui.notify(`Invalid type: ${i}. Use: ${ae.join(", ")}`,"error");return}e.ui.notify(`\u{1F4E6} Installing ${i}: ${l}...`,"info");try{let a=await pt(t,i,l,{force:m});if(a.success){let o=[`\u2705 Installed ${i}: ${l}`];if(a.path&&o.push(`   \u2192 ${a.path}`),a.dependencies&&a.dependencies.length>0){o.push("   Dependencies:");for(let u of a.dependencies){let v=u.success?"\u2713":u.error?.includes("Already exists")?"\xB7":"\u2717";o.push(`     ${v} ${u.type}: ${u.name}${u.error?` (${u.error})`:""}`)}}e.ui.notify(o.join(`
`),"info"),(i==="protocol"||i==="muscle")&&e.ui.notify("\u{1F4A1} New content will load on next session boot (or /breathe to rotate now)","info")}else e.ui.notify(`\u274C ${a.error||"Install failed"}`,"error")}catch(a){e.ui.notify(`\u274C Install error: ${a.message}`,"error")}},"handler")}),h.registerCommand("list",{description:"List installed or remote Soma content",getArgumentCompletions:b(n=>["local","remote",...ae].filter(e=>e.startsWith(n)).map(e=>({value:e,label:e})),"getArgumentCompletions"),handler:b(async(n,e)=>{let s=n.trim().split(/\s+/).filter(Boolean),m=s[0]||"local",c=s[1];if(m==="remote"){e.ui.notify("\u{1F50D} Fetching from hub...","info");try{let o=await ut(c);if(o.length===0){e.ui.notify("No remote content found.","info");return}let u={};for(let w of o)u[w.type]||(u[w.type]=[]),u[w.type].push(w.name);let v=["\u{1F4E1} Hub content:"];for(let[w,j]of Object.entries(u))v.push(`  ${w}s: ${j.join(", ")}`);v.push(`
Install: /install <type> <name>`),e.ui.notify(v.join(`
`),"info")}catch(o){e.ui.notify(`\u274C Failed to fetch: ${o.message}`,"error")}return}if(!t){e.ui.notify("No .soma/ found.","info");return}let i=mt(t,c&&ae.includes(c)?c:void 0);if(i.length===0){e.ui.notify("No local content found. Try /list remote to see what's available.","info");return}let l={};for(let o of i)l[o.type]||(l[o.type]=[]),l[o.type].push(o.name);let a=["\u{1F4CB} Installed content:"];for(let[o,u]of Object.entries(l))a.push(`  ${o}s: ${u.join(", ")}`);e.ui.notify(a.join(`
`),"info")},"handler")});let je=b((n,e)=>{let s=n.trim().split(/\s+/).filter(Boolean);if(s.length===0)return{error:`Usage:
  /scrape <name>              Resolve + pull docs for a project
  /scrape <name> --resolve    Just show what's available (don't pull)
  /scrape <topic> --discover  Broad search across GitHub, npm, MDN
  /scrape --list              Show all scraped sources
  /scrape <name> --show       Show what we have locally
  /scrape <name> --update     Re-pull latest docs

Options: --full, --provider <github|npm|mdn|css|skills|code>`};let m=[],c=[],i="";for(let u=0;u<s.length;u++)s[u]==="--provider"&&s[u+1]?i=s[++u]:s[u].startsWith("--")?m.push(s[u].replace(/^--/,"")):c.push(s[u]);let l=c.join(" "),a=`${e}/amps/scripts/soma-scrape.sh`,o;return m.includes("list")?o=`bash "${a}" list`:m.includes("discover")?(o=`bash "${a}" discover "${l}"`,i&&(o+=` --provider ${i}`)):m.includes("resolve")?o=`bash "${a}" resolve "${l}"`:m.includes("show")?o=`bash "${a}" show "${l}"`:m.includes("update")?o=`bash "${a}" update "${l}"`:(o=`bash "${a}" pull "${l}"`,m.includes("full")&&(o+=" --full")),{cmd:o,display:o.replace(a,"soma-scrape.sh")}},"buildScrapeCmd"),Te=b((n,e)=>{let s=n.trim().split(/\s+/).filter(Boolean);return s.length===0?{error:`Usage:
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

Default target: $SOMA_SHELL_DIR (gravicity-io/shell)`}:{cmd:`bash "${`${e}/amps/scripts/soma-code.sh`}" ${s.join(" ")}`,display:`soma-code.sh ${s.join(" ")}`}},"buildCodeCmd");h.registerCommand("code",{description:"Fast codebase navigator. Usage: /code <find|lines|map|refs|replace|structure|physics|events|css-vars|config> [args]",handler:b(async(n,e)=>{if(!t){e.ui.notify("No .soma/ found.","error");return}let s=V();s&&!s.get("code:build")&&s.provide("code:build",Te,{provider:"soma-boot",description:"Build a soma-code.sh command from args string"});let m=s?.get("code:build"),c=m?m(n,t.path):Te(n,t.path);if("error"in c){e.ui.notify(c.error,"info");return}e.ui.notify(`\u{1F50D} Running: ${c.display}`,"info")},"handler")}),h.registerCommand("scrape",{description:"Scrape docs for a tool, library, or topic. Usage: /scrape <name|topic> [--discover] [--provider github|npm|mdn|css|skills]",handler:b(async(n,e)=>{if(!t){e.ui.notify("No .soma/ found.","error");return}let s=V();s&&!s.get("scrape:build")&&s.provide("scrape:build",je,{provider:"soma-boot",description:"Build a soma-scrape.sh command from args string"});let m=s?.get("scrape:build"),c=m?m(n,t.path):je(n,t.path);if("error"in c){e.ui.notify(c.error,"info");return}e.ui.notify(`\u{1F50D} Running: ${c.display}`,"info")},"handler")}),h.registerCommand("scan-logs",{description:"Scan conversation logs. Usage: /scan-logs [count] [--send] | /scan-logs tools <pattern> [--results] [--tool bash|read] [--last N] [--send]",handler:b(async(n,e)=>{let s=(n?.trim()||"").split(/\s+/).filter(Boolean),m=s.includes("--send"),c=s.filter(o=>o!=="--send"),i=b(o=>{m?h.sendUserMessage(`[scan-logs results]

${o}`):e.ui.notify(`\u{1F4DC} Session Analysis:

${o}`,"info")},"deliver");if(c[0]==="tools"&&c.length>=2){if(!t){e.ui.notify("No .soma/ found.","error");return}let o=I(t.path,"amps","scripts","soma-stats.sh");if(!E(o)){e.ui.notify("soma-stats.sh not found.","error");return}let u=c.slice(1).join(" "),v=`bash "${o}" tools ${u} --cwd "${process.cwd()}"`;if(m)try{let w=G(v,{encoding:"utf-8",timeout:15e3,stdio:["pipe","pipe","pipe"]}).trim();i(w||"No matching tool calls found.")}catch(w){i(w.stdout?.trim()||"No matching tool calls found.")}else e.ui.notify(`\u{1F50D} Searching tool calls: \`soma-stats.sh tools ${u}\``,"info");return}let l=10;for(let o of c)/^\d+$/.test(o)&&(l=parseInt(o,10));let a=e.sessionManager.getSessionFile?.()||void 0;try{let o=_e(l,a),u="";if(o.length>0?u+=Ge(o):u+=`No recent conversation logs found.
`,t){let v=I(t.path,"amps","scripts","soma-stats.sh");if(E(v))try{let w=G(`bash "${v}" --cwd "${process.cwd()}"`,{encoding:"utf-8",timeout:5e3,stdio:["pipe","pipe","pipe"]}).trim();u+=`
${w}
`}catch{}}i(u)}catch(o){e.ui.notify(`Failed to scan logs: ${o}`,"error")}},"handler")})}b(At,"somaBootExtension");export{At as default};
