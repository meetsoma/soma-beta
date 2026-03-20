var d=Object.defineProperty;var g=(r,i)=>d(r,"name",{value:i,configurable:!0});function p(){let r=new Map,i=new Map;return{version:"1.0.0",provide(n,e,t){r.set(n,{fn:e,provider:t?.provider??"unknown",providedAt:Date.now(),description:t?.description})},get(n){return r.get(n)?.fn??null},revoke(n){r.delete(n)},has(n){return r.has(n)},meta(n){let e=r.get(n);if(!e)return null;let{fn:t,...s}=e;return s},emit(n,e){let t=i.get(n);if(t)for(let s of t)try{Promise.resolve(s(e)).catch(a=>{console.error(`[soma-route] signal handler error (${n}):`,a)})}catch(a){console.error(`[soma-route] signal handler threw (${n}):`,a)}},on(n,e){return i.has(n)||i.set(n,new Set),i.get(n).add(e),()=>{i.get(n)?.delete(e),i.get(n)?.size===0&&i.delete(n)}},capabilities(){return[...r.keys()]},signals(){return[...i.keys()]},debug(){let n={};for(let[t,s]of r){let{fn:a,...l}=s;n[t]=l}let e={};for(let[t,s]of i)e[t]=s.size;return{capabilities:n,signals:e}}}}g(p,"createSomaRoute");function m(){return globalThis.n||(globalThis.n=p()),globalThis.n}g(m,"initRoute");function f(r){let i=m();r.registerCommand("route",{description:"Soma Route \u2014 capability router status and debugging",getArgumentCompletions:g(n=>["status","capabilities","signals","debug"].filter(e=>e.startsWith(n)).map(e=>({value:e,label:e})),"getArgumentCompletions"),handler:g(async(n,e)=>{let t=n.trim().toLowerCase()||"status";if(t==="status"||t==="capabilities"){let s=i.capabilities();if(s.length===0){e.ui.notify("\u{1F4E1} No capabilities registered yet","info");return}let a=s.map(l=>{let o=i.meta(l),u=o?`${Math.round((Date.now()-o.providedAt)/1e3)}s ago`:"?",c=o?.description?` \u2014 ${o.description}`:"";return`  ${l} (${o?.provider??"?"}, ${u})${c}`});e.ui.notify(`\u{1F4E1} Capabilities (${s.length}):
${a.join(`
`)}`,"info")}if(t==="signals"||t==="status"){let s=i.signals();if(s.length===0){e.ui.notify("\u{1F4E1} No signal listeners registered","info");return}let a=i.debug(),l=s.map(o=>`  ${o} (${a.signals[o]} listeners)`);e.ui.notify(`\u{1F4E1} Signals (${s.length}):
${l.join(`
`)}`,"info")}if(t==="debug"){let s=i.debug();r.sendUserMessage(`[Soma Route Debug]

**Capabilities:**
\`\`\`json
${JSON.stringify(s.capabilities,null,2)}
\`\`\`

**Signals:**
\`\`\`json
${JSON.stringify(s.signals,null,2)}
\`\`\``,{deliverAs:"followUp"})}},"handler")}),r.on("session_shutdown",async()=>{let n=i.debug(),e=Object.keys(n.capabilities).length,t=Object.keys(n.signals).length;(e>0||t>0)&&console.error(`[soma-route] shutdown: ${e} capabilities, ${t} signal channels`)})}g(f,"somaRoute");export{f as default};
