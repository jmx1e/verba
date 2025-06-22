// ui/api/reports.js
import { LettaClient } from '@letta-ai/letta-client';

const client = new LettaClient({
  token: process.env.LETTA_API_KEY,
});

function parseMessage(content) {
  const lines = content.split('\n');
  const data = {};
  for (let line of lines) {
    const [k, ...rest] = line.split(':');
    if (k && rest.length) data[k.trim()] = rest.join(':').trim();
  }
  return {
    title: data['Symptoms'] || 'Unknown Incident',
    time: new Date().toLocaleTimeString(),
    location: data['Incident Location'],
    status: data['Treatment Urgency'] || 'Unknown',
    description: data['Recommendations'] || 'No summary available.',
    severity: data['Level of Consciousness']?.toLowerCase().includes('unconscious') ? 'CRITICAL' : 'HIGH',
  };
}

export default async function handler(req, res) {
  try {
    const agentId = process.env.AGENT_ID;

    const { data: messages } = await client.agents.messages.list({
      agent_id: agentId,
      limit: 20,
      use_assistant_message: true,
    });

    const reports = messages.map(msg => parseMessage(msg.content));
    res.status(200).json(reports);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load reports' });
  }
}
