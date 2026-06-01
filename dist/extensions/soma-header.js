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

import{existsSync as i}from"fs";import{join as a}from"path";import{findSomaDir as x,hasPreload as w,hasIdentity as E,discoverProtocols as P}from"../core/index.js";function S(c){c.on("session_start",async(v,$)=>{$.ui.setHeader((I,d)=>({invalidate(){},dispose(){},render(p){let _="\x1B[0m",r=n=>d.fg("accent",n),l=n=>d.fg("muted",n),o=n=>d.fg("muted",n),e=n=>d.fg("dim",n),u=r("\u03C3\u1FF6\u03BC\u03B1"),h=l("the body that grows around you"),t=x(),s=[];if(t){let n=i(a(t.path,"body","soul.md")),b=i(a(t.path,"body"));n?s.push(`${r("\u25CF")} ${o("soul")}`):E(t)&&s.push(`${r("\u25CF")} ${o("identity")}`),w(t)?s.push(`${r("\u25CF")} ${o("preload")}`):(i(a(t.path,"amps"))||i(a(t.path,"memory")))&&s.push(`${r("\u25CF")} ${o("memory")}`),b&&i(a(t.path,"body","_mind.md"))&&s.push(`${r("\u25CF")} ${o("body")}`);let m=P(t);m.length>0&&s.push(`${r("\u25CF")} ${o(`${m.length} protocols`)}`)}s.length===0&&s.push(e("\u25CB empty \u2014 will grow"));let f=s.join(`  ${e("\xB7")}  `),g=`${e("esc")}${o(" interrupt")}  ${e("ctrl+l")}${o(" clear")}  ${e("/")}${o(" commands")}  ${e("!")}${o(" bash")}`,y=`${e("\u2500".repeat(Math.min(p-2,50)))}`;return["",`  ${u}  ${e("\xB7")}  ${h}`,`  ${f}`,`  ${g}`,`  ${y}`,""]}}))})}export{S as default};
