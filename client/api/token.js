import { AccessToken } from 'livekit-server-sdk';

const LIVEKIT_HOST = process.env.LIVEKIT_HOST || 'wss://demo.livekit.cloud';
const API_KEY    = process.env.LIVEKIT_API_KEY    || 'devkey';
const API_SECRET = process.env.LIVEKIT_API_SECRET || 'devsecret';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { room, username } = req.body || {};
  if (!room || !username) {
    return res.status(400).json({ error: 'room と username は必須です' });
  }

  const identity = `${username}_${Date.now()}`;
  const at = new AccessToken(API_KEY, API_SECRET, {
    identity,
    name: username,
    ttl: '4h',
  });

  at.addGrant({
    roomJoin: true,
    room,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  const jwt = await at.toJwt();
  return res.json({ token: jwt, url: LIVEKIT_HOST });
}
