'use strict';
const cards = require('../cards.js');
const spreads = require('../spreads.js');
const oracle = require('../oracle.js');
const UPSTREAM = 'https://integrate.api.nvidia.com/v1/chat/completions';
const MAX_BODY = 16384;

function reply(res, status, error) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify({ error }));
}

function validatedReading(body) {
  const r = body?.reading;
  const spread = r && spreads.getSpread(r.spreadId);
  if (!spread || typeof r.id !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(r.id)) return null;
  if (!Array.isArray(r.cards) || r.cards.length !== spread.cardCount) return null;
  if (body.attempt !== undefined && ![0, 1].includes(body.attempt)) return null;
  const result = { id: r.id, spreadId: spread.id, cards: [] };
  const seen = new Set();
  for (let i = 0; i < r.cards.length; i++) {
    const card = r.cards[i];
    if (!card || card.positionKey !== spread.positions[i].key || !cards.getCard(card.cardId) || seen.has(card.cardId) || typeof card.reversed !== 'boolean') return null;
    seen.add(card.cardId);
    result.cards.push({ positionKey: card.positionKey, cardId: card.cardId, reversed: card.reversed });
  }
  for (const [key, max] of Object.entries({question:200, optionA:40, optionB:40, personName:30})) {
    if (r[key] === undefined) continue;
    if (typeof r[key] !== 'string' || r[key].length > max) return null;
    result[key] = r[key].trim();
  }
  if (spread.inputs.options === 'required' && (!result.optionA || !result.optionB)) return null;
  return { reading: result, spread, attempt: body.attempt || 0 };
}

async function readBody(req) {
  if (Number(req.headers['content-length']) > MAX_BODY) throw Object.assign(new Error(), {status:413});
  if (req.body !== undefined) {
    const raw = typeof req.body === 'string' || Buffer.isBuffer(req.body) ? String(req.body) : JSON.stringify(req.body);
    if (Buffer.byteLength(raw) > MAX_BODY) throw Object.assign(new Error(), {status:413});
    return JSON.parse(raw);
  }
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw Object.assign(new Error(), {status:413});
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function createHandler({env = process.env, fetchImpl = globalThis.fetch, now = Date.now} = {}) {
  const clients = new Map();
  return async (req, res) => {
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return reply(res,405,'method-not-allowed'); }
    const origin = req.headers.origin;
    try {
      if (req.headers['sec-fetch-site'] === 'cross-site' || (origin && (new URL(origin).host !== req.headers.host || !['https:', 'http:'].includes(new URL(origin).protocol)))) return reply(res,403,'origin-not-allowed');
    } catch { return reply(res,403,'origin-not-allowed'); }
    if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) return reply(res,415,'json-required');
    let input;
    try { input = validatedReading(await readBody(req)); }
    catch (error) { return reply(res,error.status || 400,error.status === 413 ? 'body-too-large' : 'invalid-reading'); }
    if (!input) return reply(res,400,'invalid-reading');
    if (!env.NVIDIA_API_KEY || !env.NVIDIA_MODEL) return reply(res,503,'not-configured');
    const at = now();
    for (const [key, value] of clients) if (at - value.start >= 60000) clients.delete(key);
    const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
    const client = clients.get(ip) || {start:at, count:0};
    if (client.count >= 6 || clients.size >= 10000) { res.setHeader('Retry-After','60'); return reply(res,429,'rate-limited'); }
    client.count++; clients.set(ip,client);
    try {
      const upstream = await fetchImpl(UPSTREAM, {
        method:'POST', signal:AbortSignal.timeout(20000),
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${env.NVIDIA_API_KEY}`},
        body:JSON.stringify({ model:env.NVIDIA_MODEL, temperature:0.7, max_tokens:2400, stream:false,
          messages:[{role:'system',content:oracle.SYSTEM},{role:'user',content:oracle.brief(input.reading,input.spread,cards,input.attempt)}] })
      });
      if (!upstream.ok) return reply(res,502,'upstream-unavailable');
      const data = await upstream.json();
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || !content.trim() || content.length > 12000) return reply(res,502,'invalid-upstream-response');
      res.writeHead(200, {'Content-Type':'application/x-ndjson; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
      res.end(JSON.stringify({delta:content.trim().slice(0,8000)}) + '\n');
    } catch (error) {
      return reply(res, ['TimeoutError','AbortError'].includes(error.name) ? 504 : 502, 'upstream-unavailable');
    }
  };
}
module.exports = { createHandler };
