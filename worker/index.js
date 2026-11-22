// capimm-figma • servidor (Cloudflare Worker)
// 1) Login OAuth 2.0 com o Roblox (o plugin abre o navegador e fica consultando /oauth/poll)
// 2) Proxy de upload para a Open Cloud (evita CORS do Figma)
// Segredos (wrangler secret put): ROBLOX_CLIENT_ID, ROBLOX_CLIENT_SECRET
// KV: SESSIONS (guarda a sessão de login por ~2 minutos, até o plugin buscar)
const AUTH = 'https://apis.roblox.com/oauth/v1/authorize';
const TOKEN = 'https://apis.roblox.com/oauth/v1/token';
const USERINFO = 'https://apis.roblox.com/oauth/v1/userinfo';
const SCOPES = 'openid profile asset:read asset:write';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'x-api-key, authorization, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: Object.assign({ 'content-type': 'application/json' }, CORS) });
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const rand = (n = 32) => b64url(crypto.getRandomValues(new Uint8Array(n)));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function page(title, msg) {
  return new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>capimm-figma</title>
<style>html,body{height:100%;margin:0;background:#000;color:#fff;font-family:system-ui,sans-serif}body{display:grid;place-content:center;text-align:center;gap:10px}
h1{margin:0;font-size:28px;animation:u .7s both}p{margin:0;color:#999;animation:u .7s .15s both}@keyframes u{from{opacity:0;transform:translateY(14px)}}</style>
<h1>${esc(title)}</h1><p>${esc(msg)}</p>`, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}

async function exchange(env, params) {
  const r = await fetch(TOKEN, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(Object.assign({ client_id: env.ROBLOX_CLIENT_ID, client_secret: env.ROBLOX_CLIENT_SECRET }, params)),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error(j.error_description || j.error || 'token ' + r.status);
  return j;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const p = url.pathname;
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (p === '/health') return json({ ok: true, service: 'capimm-figma', oauth: !!(env.ROBLOX_CLIENT_ID && env.SESSIONS) });

    // ---------- OAuth ----------
    if (p === '/oauth/start') {
      const sid = url.searchParams.get('sid') || '';
      if (!/^[a-f0-9]{32}$/.test(sid)) return page('Pedido inválido', 'Volte ao Figma e tente de novo.');
      if (!env.ROBLOX_CLIENT_ID || !env.SESSIONS) return page('Servidor sem configuração', 'Defina ROBLOX_CLIENT_ID, ROBLOX_CLIENT_SECRET e o KV SESSIONS.');
      const verifier = rand(48);
      const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
      await env.SESSIONS.put('pkce:' + sid, verifier, { expirationTtl: 600 });
      const a = new URL(AUTH);
      a.search = new URLSearchParams({
        client_id: env.ROBLOX_CLIENT_ID,
        redirect_uri: url.origin + '/oauth/callback',
        scope: SCOPES,
        response_type: 'code',
        state: sid,
        code_challenge: challenge,
        code_challenge_method: 'S256',
      }).toString();
      return Response.redirect(a.toString(), 302);
    }
    if (p === '/oauth/callback') {
      const sid = url.searchParams.get('state') || '', code = url.searchParams.get('code');
      if (!/^[a-f0-9]{32}$/.test(sid)) return page('Pedido inválido', 'Volte ao Figma e tente de novo.');
      if (!code) {
        const msg = url.searchParams.get('error_description') || url.searchParams.get('error') || 'Autorização negada.';
        await env.SESSIONS.put('done:' + sid, JSON.stringify({ status: 'error', message: msg }), { expirationTtl: 120 });
        return page('Não autorizado', msg);
      }
      try {
        const verifier = await env.SESSIONS.get('pkce:' + sid);
        if (!verifier) throw new Error('sessão expirada');
        const t = await exchange(env, { grant_type: 'authorization_code', code, code_verifier: verifier, redirect_uri: url.origin + '/oauth/callback' });
        const u = await (await fetch(USERINFO, { headers: { Authorization: 'Bearer ' + t.access_token } })).json();
        await env.SESSIONS.put('done:' + sid, JSON.stringify({
          status: 'done', access_token: t.access_token, refresh_token: t.refresh_token, expires_in: t.expires_in,
          user: { id: u.sub, name: u.preferred_username || u.nickname || u.name, picture: u.picture },
        }), { expirationTtl: 120 });
        await env.SESSIONS.delete('pkce:' + sid);
        return page('Conectado', 'Pode fechar esta aba e voltar ao Figma.');
      } catch (e) {
        await env.SESSIONS.put('done:' + sid, JSON.stringify({ status: 'error', message: e.message }), { expirationTtl: 120 });
        return page('Erro no login', e.message);
      }
    }
    if (p === '/oauth/poll') {
      const sid = url.searchParams.get('sid') || '';
      if (!/^[a-f0-9]{32}$/.test(sid)) return json({ status: 'error', message: 'sid inválido' }, 400);
      const v = await env.SESSIONS.get('done:' + sid);
      if (!v) return json({ status: 'pending' });
      await env.SESSIONS.delete('done:' + sid); // entrega uma única vez
      return new Response(v, { headers: Object.assign({ 'content-type': 'application/json' }, CORS) });
    }
    if (p === '/oauth/refresh' && req.method === 'POST') {
      try {
        const { refresh_token } = await req.json();
        const t = await exchange(env, { grant_type: 'refresh_token', refresh_token });
        return json({ access_token: t.access_token, refresh_token: t.refresh_token, expires_in: t.expires_in });
      } catch (e) { return json({ error: e.message }, 401); }
    }

    // ---------- upload (Bearer do OAuth ou x-api-key) ----------
    const auth = req.headers.get('authorization'), key = req.headers.get('x-api-key');
    if (!auth && !key) return json({ error: 'sem credenciais' }, 401);
    const h = auth ? { Authorization: auth } : { 'x-api-key': key };
    let target, init;
    if (p === '/upload' && req.method === 'POST') {
      target = 'https://apis.roblox.com/assets/v1/assets';
      init = { method: 'POST', headers: Object.assign({ 'content-type': req.headers.get('content-type') }, h), body: await req.arrayBuffer() };
    } else if (/^\/operations\/[\w-]+$/.test(p) && req.method === 'GET') {
      target = 'https://apis.roblox.com/assets/v1' + p;
      init = { method: 'GET', headers: h };
    } else return json({ error: 'rota inválida' }, 404);
    const r = await fetch(target, init);
    return new Response(await r.arrayBuffer(), { status: r.status, headers: Object.assign({ 'content-type': r.headers.get('content-type') || 'application/json' }, CORS) });
  },
};
