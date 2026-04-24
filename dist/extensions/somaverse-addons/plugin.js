/**
 * Soma Agent — © 2026 Curtis Mercier
 * Licensed under BSL 1.1 (Business Source License)
 *
 * You may view, use personally, and contribute to this software.
 * Commercial use requires a license. See LICENSE for details.
 */

import{bridgeRequest as i}from"../_shared/bridge-client.js";async function a(s){try{let e=s.scope||"workspace",r=s.scopeId||"default",n=e==="space"?`/api/spaces/${r}/plugins/${s.pluginId}`:`/api/workspaces/${r}/plugins/${s.pluginId}`,t=await i(n);if(t.error)return`Error: ${t.error}`;let p=t.data?JSON.stringify(t.data,null,2):"(no state saved yet \u2014 will use defaults)";return`Plugin state for ${s.pluginId} (${e}/${r}):
${p}`}catch(e){return`Failed to read plugin state: ${e.message}`}}async function o(s){try{let e=s.scope||"workspace",r=s.scopeId||"default",n=e==="space"?`/api/spaces/${r}/plugins/${s.pluginId}`:`/api/workspaces/${r}/plugins/${s.pluginId}`,t=await i(n,{method:"PUT",body:s.data});return t.error?`Error: ${t.error}`:`Saved ${s.pluginId} state (${e}/${r})`}catch(e){return`Failed to write plugin state: ${e.message}`}}function u(s){s.provide("somaverse:plugin.read",async e=>e?.pluginId?a(e):"somaverse:plugin.read requires {pluginId, scope?, scopeId?}",{provider:"somaverse-tools",description:"Read a plugin's persistent state from Somadian. args: {pluginId, scope?: 'workspace'|'space', scopeId?: 'default'}."}),s.provide("somaverse:plugin.write",async e=>e?.pluginId?e?.data===void 0?"somaverse:plugin.write requires {data} (JSON payload)":o(e):"somaverse:plugin.write requires {pluginId, data, scope?, scopeId?}",{provider:"somaverse-tools",description:"Save a plugin's persistent state to Somadian. args: {pluginId, data, scope?: 'workspace'|'space', scopeId?: 'default'}. Updates FAQ entries, plugin config, etc."})}export{a as pluginReadImpl,o as pluginWriteImpl,u as register};
