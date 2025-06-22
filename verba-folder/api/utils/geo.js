/****************  api/utils/geo.js  ****************/
require('dotenv').config({ path: '../.env' });
const fetch   = require('node-fetch');          //  v2 CommonJS build
const memoize = require('p-memoize').default || require('p-memoize');

/* ---------- A.  use Claude (optional) to tidy the address ---------- */
async function refineWithClaude(raw) {
  if (!process.env.CLAUDE_API_KEY) return raw;          // skip if key missing

  const body = {
    model       : process.env.CLAUDE_MODEL || 'claude-3-haiku-20240307',
    max_tokens  : 40,
    temperature : 0,
    messages    : [{ role: 'user', content: `Return the clearest address for: ${raw}` }]
  };

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method : 'POST',
    headers: {
      'Content-Type'      : 'application/json',
      'X-API-Key'         : process.env.CLAUDE_API_KEY,
      'anthropic-version' : '2023-06-01'
    },
    body: JSON.stringify(body)
  });

  if (!r.ok) throw new Error(`Claude ❌ ${r.status} ${r.statusText}`);
  const j = await r.json();
  return j?.content?.[0]?.text?.trim() || raw;
}

/* ---------- B.  trivial Open-Street-Map / Nominatim geocoder -------- */
async function nominatim(q) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
  const r   = await fetch(url, { headers: { 'User-Agent':'cal-hacks-demo/1.0' } });
  const j   = await r.json().catch(() => null);
  if (!j?.length) return null;
  return { lat:+j[0].lat, lng:+j[0].lon, label:j[0].display_name };
}

/* ---------- C.  exported helper:  raw → {lat,lng,label}  ------------ */
const locate = memoize(async raw => {
  try {
    const clean = await refineWithClaude(raw);
    return await nominatim(clean);
  } catch (e) {
    console.warn('🌐  geocode failed:', e.message);
    return null;
  }
}, { maxAge: 60 * 60 * 1000 });    // 1 h cache

module.exports = { locate };
