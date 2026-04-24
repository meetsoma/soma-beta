/**
 * Soma Agent — © 2026 Curtis Mercier
 * Licensed under BSL 1.1 (Business Source License)
 *
 * You may view, use personally, and contribute to this software.
 * Commercial use requires a license. See LICENSE for details.
 */

import{execFile as u}from"node:child_process";import{existsSync as c,unlinkSync as m}from"node:fs";import{homedir as g}from"node:os";import{join as d}from"node:path";import{promisify as p}from"node:util";var v=p(u),l=/\u001b\[[0-9;]*m/g,i=r=>r.replace(l,""),o=d(g(),".soma","device-key");async function a(r,e){try{let{stdout:t,stderr:s}=await v("soma",["login",...r],{encoding:"utf-8",maxBuffer:2e6,timeout:e,env:{...process.env,r:"0",e:"1"}});return i(t.trim()||s.trim())||"(no output)"}catch(t){let s=t?.stderr?i(String(t.stderr)):"",n=t?.stdout?i(String(t.stdout)):"";return`[somaverse:auth] exit ${t?.code??t?.status??"?"}
${n}${s}`.trim()}}async function y(r={}){return a([],1e4)}async function h(r={}){let e=["start"];return r?.hubUrl&&e.push(String(r.hubUrl)),a(e,6e5)}async function f(r={}){if(!c(o))return`[somaverse:auth.logout] Already logged out (no device key at ${o}).`;try{return m(o),`\u2713 Logged out (removed ${o}). Re-pair with somaverse:auth.start.`}catch(e){return`[somaverse:auth.logout] Failed to remove ${o}: ${e.message}`}}function P(r){r.provide("somaverse:auth.status",async(e={})=>y(e),{provider:"somaverse-tools",description:"Show pairing status: device key present? path? Hub URL. No args. Local filesystem only \u2014 no network."}),r.provide("somaverse:auth.start",async(e={})=>h(e),{provider:"somaverse-tools",description:"Begin device pairing with Somaverse hub. Opens browser, polls until paired, writes ~/.soma/device-key. args: {hubUrl?:string}. Long-running \u2014 can take minutes while waiting for user to click 'Pair device' on web UI."}),r.provide("somaverse:auth.logout",async(e={})=>f(e),{provider:"somaverse-tools",description:"Remove ~/.soma/device-key. Next auth requires re-pairing. No args."})}export{P as register};
