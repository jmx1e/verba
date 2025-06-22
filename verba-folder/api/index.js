/*********************  api/index.js  **************************/
require('dotenv').config({ path: '../.env' });
const express   = require('express');
const cors      = require('cors');
const fetch     = require('node-fetch');
const memoize   = require('p-memoize').default || require('p-memoize');
const { LettaClient } = require('@letta-ai/letta-client');

const app = express();
app.use(cors());

/* ───────────────────────── 0. Letta client ───────────────────────── */
const letta = new LettaClient({
  token  : process.env.LETTA_API_KEY,
  baseUrl: 'https://api.letta.com',
});

/* ───────────── 1. Claude → cleaned address (optional) ───────────── */
async function refineWithClaude(raw) {
  if (!process.env.CLAUDE_API_KEY) return raw;                  // skip if key missing
  const body = {
    model       : process.env.CLAUDE_MODEL || 'claude-3-haiku-20240307',
    max_tokens  : 40,
    temperature : 0,
    messages    : [{ role:'user', content:`Return the clearest address for: ${raw}` }]
  };
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method :'POST',
    headers:{
      'Content-Type'      : 'application/json',
      'X-API-Key'         : process.env.CLAUDE_API_KEY,
      'anthropic-version' : '2023-06-01'
    },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error(`Claude ❌ ${r.status}`);
  const j = await r.json();
  return j?.content?.[0]?.text?.trim() || raw;
}

/* ────────────────── 2. Open‑Street‑Map geocoder ─────────────────── */
async function nominatim(q) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers:{ 'User-Agent':'cal-hacks/1.0' } });
  const j   = await res.json().catch(()=>null);
  if (!j?.length) return null;
  return { lat:+j[0].lat, lng:+j[0].lon, label:j[0].display_name };
}

/* ───────────── 3. locate()  =  Claude → Nominatim (memoised) ─────── */
const locate = memoize(async raw => {
  try {
    const clean = await refineWithClaude(raw);
    return await nominatim(clean);
  } catch (e) {
    console.warn('🌐 geocode failed:', e.message);
    return null;
  }
}, { maxAge: 3600_000 });

/* ───────────── 4. Markdown or JSON → report object ───────────── */
function parseMessage(content='') {
  try {
    if (!content) return {};

    const report = {};
    if (typeof content === 'object' && content !== null) {
      report.patient_full_name = content.patient_full_name || '';
      report.patient_age = content.patient_age || content.age || '';
      report.patient_sex = content.patient_sex || content.sex || '';
      report.initial_report = content.initial_report || content.condition || '';
      report.dispatch_time = content.dispatch_time || '';
      report.incident_location = content.incident_location || '';
      report.vehicle_number = content.vehicle_number || '';
      report.ems_officer_name = content.ems_officer_name || '';
      report.treatment_urgency = content.treatment_urgency || '';
      report.heart_rate = content.heart_rate || '';
      report.oxygen_saturation = content.oxygen_saturation || '';
      report.level_of_consciousness = content.level_of_consciousness || '';
      report.allergies_and_reactions = content.allergies_and_reactions || '';
      report.misc = content.misc || '';

      const symText = content.initial_report || content.misc || '';
      const matches = symText.match(/[^,.]+(?=,|\.|$)/g);
      if (matches) report.symptoms = matches.map(s => s.trim()).filter(Boolean);

      if (content.recommendations) {
        report.recommendations = content.recommendations;
      } else if (content.misc?.includes('Administered')) {
        report.recommendations = content.misc;
      }
    } else if (typeof content === 'string') {
      const lines = content.split('\n').map(l => l.trim()).filter(Boolean);

      const headerMatch = content.match(/Report for\s+(.+?):/i);
      if (headerMatch) report.patient_full_name = headerMatch[1].trim();

      let currentSection = '';
      const abbreviations = [], recommendations = [];

      for (const line of lines) {
        if (line.startsWith('### Recommendations:')) currentSection = 'recommendations';
        else if (line.startsWith('**Abbreviations**:')) currentSection = 'abbreviations';
        else if (currentSection === 'recommendations' && line.startsWith('-')) recommendations.push(line.slice(1).trim());
        else if (currentSection === 'abbreviations') {
          const m = line.match(/([A-Za-z0-9]+)\s*:\s*Categorized under\s*([\w\s]+)/i);
          if (m) abbreviations.push({ abbr: m[1], category: m[2].trim() });
        } else {
          const m = line.match(/- \*\*(.+?)\*\*: (.+)/);
          if (!m) continue;
          const key = m[1].trim().toLowerCase().replace(/\s+/g, '_');
          const val = m[2].trim();
          if (key === 'condition') {
            report.initial_report = val;
            const symMatch = val.match(/[^,.]+(?=,|\.|$)/g);
            if (symMatch) report.symptoms = symMatch.map(s => s.trim()).filter(Boolean);
          } else if (key === 'age') report.patient_age = val;
          else if (key === 'sex') report.patient_sex = val;
          else if (key === 'vital_signs') {
            for (const pair of val.split(', ')) {
              const [k, v] = pair.split(': ').map(x => x.trim());
              if (k && v) report[k.toLowerCase().replace(/\s+/g,'_')] = v;
            }
          } else report[key] = val;
        }
      }

      if (recommendations.length) report.recommendations = recommendations.join(' ');
      if (abbreviations.length) report.abbreviations = abbreviations;
    }

    return Object.fromEntries(Object.entries(report).filter(([_,v]) => v && v.length > 0));
  } catch(e) {
    console.warn('⚠️ parseMessage failed:', e);
    return {};
  }
}

/* ───────────────────────── 5. /api/reports ───────────────────────── */
app.get('/api/reports', async (_req,res)=>{
  console.log('▶️  /api/reports hit');
  try{
    const messages = await letta.agents.messages.list(process.env.AGENT_ID,{ limit:25, use_assistant_message:true });

    const reports=[];
    for(const [i,m] of messages.entries()){
      if(!m.content?.trim()) continue;
      const parsed = parseMessage(m.content);
      if(!parsed || typeof parsed !== 'object' || Object.keys(parsed).length === 0) continue;
      if(parsed.incident_location){
        parsed.coords = await locate(parsed.incident_location);
        parsed.hasCoords = !!parsed.coords;
      } else parsed.hasCoords = false;
      reports.push({ id:i+1, raw_markdown:m.content, ...parsed });
    }

    console.log(`✅ returning ${reports.length} parsed reports`);
    res.json(reports);
  }catch(err){
    console.error('🔥 /api/reports error:',err);
    res.status(500).json({ error:'Failed to fetch/parse reports', details:err.message });
  }
});

/* ─────────────────────────── server start ────────────────────────── */
const PORT = process.env.PORT || 3001;
app.listen(PORT, ()=> console.log(`API listening on http://localhost:${PORT}`));
