import{existsSync as u,readdirSync as b,readFileSync as y,writeFileSync as m,mkdirSync as v,unlinkSync as g}from"fs";import{join as c}from"path";function $(){let r=new Map,i=new Map;return{version:"1.1.0",provide(n,t,o){r.set(n,{fn:t,provider:o?.provider??"unknown",providedAt:Date.now(),description:o?.description})},get(n){return r.get(n)?.fn??null},revoke(n){r.delete(n)},has(n){return r.has(n)},meta(n){let t=r.get(n);if(!t)return null;let{fn:o,...e}=t;return e},emit(n,t){let o=i.get(n);if(o)for(let e of o)try{Promise.resolve(e(t)).catch(a=>{console.error(`[soma-route] signal handler error (${n}):`,a)})}catch(a){console.error(`[soma-route] signal handler threw (${n}):`,a)}},on(n,t){return i.has(n)||i.set(n,new Set),i.get(n).add(t),()=>{i.get(n)?.delete(t),i.get(n)?.size===0&&i.delete(n)}},capabilities(){return[...r.keys()]},signals(){return[...i.keys()]},debug(){let n={};for(let[o,e]of r){let{fn:a,...s}=e;n[o]=s}let t={};for(let[o,e]of i)t[o]=e.size;return{capabilities:n,signals:t}}}}function k(){return globalThis.n||(globalThis.n=$()),globalThis.n}var h=new Set(["studio:vote","studio:feedback","ci:result","deploy:status","fs:changed","browser:capture","scheduled:task","external:notify"]),p="";function w(r){p=crypto.randomUUID().split("-")[0];let i=c(r,"inbox");try{v(i,{recursive:!0}),m(c(i,".token"),p+`
`,"utf-8");let n=c(i,".gitignore");u(n)||m(n,`*
`,"utf-8")}catch{}}function C(r,i){let n=c(r,"inbox");if(!u(n))return;let t;try{t=b(n).filter(o=>o.endsWith(".json"))}catch{return}for(let o of t){let e=c(n,o);try{let a=y(e,"utf-8"),s=JSON.parse(a);if(!s.signal||typeof s.signal!="string"){g(e);continue}if(s.token!==p){console.error(`[soma-route] inbox: rejected ${o} (invalid token)`),g(e);continue}if(!h.has(s.signal)){console.error(`[soma-route] inbox: blocked signal "${s.signal}" (not in allowlist)`),g(e);continue}i.emit(s.signal,{...s.data??{},t:!0,e:s.source??"unknown",i:s.ts??new Date().toISOString()}),g(e)}catch{try{g(e)}catch{}}}}function x(r){let i=k();r.registerCommand("route",{description:"Soma Route \u2014 capability router status and debugging",getArgumentCompletions:n=>["status","capabilities","signals","inbox","debug"].filter(t=>t.startsWith(n)).map(t=>({value:t,label:t})),handler:async(n,t)=>{let o=n.trim().toLowerCase()||"status";if(o==="status"||o==="capabilities"){let e=i.capabilities();if(e.length===0){t.ui.notify("\u{1F4E1} No capabilities registered yet","info");return}let a=e.map(s=>{let l=i.meta(s),d=l?`${Math.round((Date.now()-l.providedAt)/1e3)}s ago`:"?",f=l?.description?` \u2014 ${l.description}`:"";return`  ${s} (${l?.provider??"?"}, ${d})${f}`});t.ui.notify(`\u{1F4E1} Capabilities (${e.length}):
${a.join(`
`)}`,"info")}if(o==="signals"||o==="status"){let e=i.signals();if(e.length===0){t.ui.notify("\u{1F4E1} No signal listeners registered","info");return}let a=i.debug(),s=e.map(l=>`  ${l} (${a.signals[l]} listeners)`);t.ui.notify(`\u{1F4E1} Signals (${e.length}):
${s.join(`
`)}`,"info")}if(o==="inbox"){let e=i.get("soma:dir")?.();if(!e?.path){t.ui.notify("\u{1F4E1} Inbox: no .soma/ found","warning");return}let a=c(e.path,"inbox"),s=c(a,".token"),l=u(s)?y(s,"utf-8").trim():"(none)",d=u(a)?b(a).filter(S=>S.endsWith(".json")).length:0,f=[...h].join(", ");t.ui.notify(`\u{1F4E1} Inbox
  Token: ${l}
  Pending: ${d} message(s)
  Allowed: ${f}`,"info");return}if(o==="debug"){let e=i.debug();r.sendUserMessage(`[Soma Route Debug]

**Capabilities:**
\`\`\`json
${JSON.stringify(e.capabilities,null,2)}
\`\`\`

**Signals:**
\`\`\`json
${JSON.stringify(e.signals,null,2)}
\`\`\``,{deliverAs:"followUp"})}}}),r.on("session_start",async()=>{setTimeout(()=>{let n=i.get("soma:dir")?.();n?.path&&w(n.path)},2e3)}),r.on("turn_end",async()=>{let n=i.get("soma:dir")?.();n?.path&&C(n.path,i)}),r.on("session_shutdown",async()=>{let n=i.debug(),t=Object.keys(n.capabilities).length,o=Object.keys(n.signals).length;(t>0||o>0)&&console.error(`[soma-route] shutdown: ${t} capabilities, ${o} signal channels`)})}export{x as default};
