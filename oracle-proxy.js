// Yerel kapı. Anahtar .env içinde kalır; sayfa onu görmez.
const http = require('http');
const fs = require('fs');
const path = require('path');

const MODEL = 'deepseek-ai/deepseek-v4.1-flash';
const UPSTREAM = 'https://integrate.api.nvidia.com/v1/chat/completions';

function loadKey() {
  const raw = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  const line = raw.split('\n').find((item) => item.startsWith('NVIDIA_API_KEY='));
  if (!line) throw new Error('NVIDIA_API_KEY yok');
  return line.slice('NVIDIA_API_KEY='.length).trim();
}

const key = loadKey();

function send(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  });
  res.end(json);
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    });
    res.end();
    return;
  }
  if (req.method !== 'POST' || req.url !== '/closing') {
    send(res, 404, { error: 'not-found' });
    return;
  }
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString());
    const upstream = await fetch(UPSTREAM, {
      method: 'POST',
      signal: AbortSignal.timeout(90000),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.7,
        max_tokens: 2400,
        stream: true,
        chat_template_kwargs: { thinking: false },
        messages: [
          { role: 'system', content: String(body.system || '') },
          { role: 'user', content: String(body.user || '') },
        ],
      }),
    });
    if (!upstream.ok) {
      const data = await upstream.json().catch(() => ({}));
      console.log('upstream', upstream.status, data.error || data.detail || data.title || '');
      send(res, upstream.status, { error: upstream.status === 404 ? 'missing-model' : 'upstream' });
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'application/x-ndjson',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
    });
    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let chars = 0;
    while (true) {
      const step = await reader.read();
      if (step.done) break;
      buffer += decoder.decode(step.value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        const payload = line.trim().replace(/^data:\s*/, '');
        if (!payload || payload === '[DONE]') continue;
        let packet;
        try { packet = JSON.parse(payload); } catch (error) { continue; }
        const delta = packet.choices && packet.choices[0] && packet.choices[0].delta;
        const piece = delta && (delta.content || '');
        if (!piece) continue;
        chars += piece.length;
        res.write(JSON.stringify({ delta: piece }) + '\n');
      }
    }
    console.log('closing chars', chars);
    res.end();
  } catch (error) {
    console.log('proxy error', error.name || 'error');
    if (!res.headersSent) send(res, 500, { error: 'proxy' });
    else res.end();
  }
});

server.listen(18791, '127.0.0.1', () => {
  console.log('oracle proxy on 127.0.0.1:18791');
});
