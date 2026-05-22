require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { AccessToken } = require('livekit-server-sdk');
const { OBSWebSocket } = require('obs-websocket-js');
const { spawn } = require('child_process');

const app = express();
app.use(cors({
  origin: process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : '*',
}));
app.use(express.json());

const LIVEKIT_HOST = process.env.LIVEKIT_HOST || 'ws://localhost:7880';
const API_KEY = process.env.LIVEKIT_API_KEY || 'devkey';
const API_SECRET = process.env.LIVEKIT_API_SECRET || 'devsecret';
const OBS_PATH = process.env.OBS_PATH || 'C:\\Program Files\\obs-studio\\bin\\64bit\\obs64.exe';
const OBS_WS_PORT = process.env.OBS_WS_PORT || 4455;
const OBS_WS_PASSWORD = process.env.OBS_WS_PASSWORD || '';

// 会議参加用トークン発行
app.post('/api/token', async (req, res) => {
  const { room, username } = req.body;
  if (!room || !username) {
    return res.status(400).json({ error: 'room と username は必須です' });
  }

  const identity = `${username}_${Date.now()}`;
  const token = new AccessToken(API_KEY, API_SECRET, {
    identity,
    name: username,
    ttl: '4h',
  });

  token.addGrant({
    roomJoin: true,
    room,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  const jwt = await token.toJwt();
  res.json({ token: jwt, url: LIVEKIT_HOST });
});

// OBS 起動 + 仮想カメラ開始
app.post('/api/obs/start', async (req, res) => {
  const { password = OBS_WS_PASSWORD } = req.body;
  const obs = new OBSWebSocket();

  const tryConnect = () =>
    obs.connect(`ws://localhost:${OBS_WS_PORT}`, password || undefined);

  let obsWasJustLaunched = false;

  try {
    // まず接続を試みる
    try {
      await tryConnect();
      console.log('OBS WebSocket 接続済み');
    } catch (firstErr) {
      // 接続失敗 → OBS が起動していないので起動する
      console.log('OBS未起動 → 起動中...');
      try {
        spawn(OBS_PATH, ['--minimize-to-tray'], {
          detached: true,
          stdio: 'ignore',
        }).unref();
        obsWasJustLaunched = true;
      } catch (spawnErr) {
        console.error('OBS起動失敗:', spawnErr.message);
        return res.status(503).json({
          error: `OBSを起動できませんでした`,
          hint: `OBSのパス確認: ${OBS_PATH}`,
        });
      }

      // OBS の WebSocket が受け付け可能になるまで最大 30 秒リトライ
      let connected = false;
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 1500));
        try {
          await tryConnect();
          connected = true;
          console.log(`OBS接続成功 (約${((i + 1) * 1.5).toFixed(0)}秒後)`);
          break;
        } catch {}
      }
      if (!connected) {
        return res.status(503).json({
          error: 'OBSのWebSocketに接続できません',
          hint: 'OBS を手動で起動し、「ツール → WebSocketサーバー設定」で「WebSocketサーバーを有効にする」にチェックを入れてください（初回のみ必要）。',
          wsEnabled: false,
        });
      }
    }

    // 仮想カメラの状態を確認して、停止中なら開始
    try {
      const { outputActive } = await obs.call('GetVirtualCamStatus');
      if (!outputActive) {
        await obs.call('StartVirtualCam');
        console.log('仮想カメラ開始');
      } else {
        console.log('仮想カメラはすでに起動中');
      }
    } catch (vcErr) {
      console.warn('仮想カメラ操作エラー（無視）:', vcErr.message);
    }

    await obs.disconnect();
    // 仮想カメラが OS に登録されるまで少し待つ
    if (obsWasJustLaunched) await new Promise(r => setTimeout(r, 1000));
    res.json({ status: 'ok', message: 'OBS仮想カメラを開始しました' });
  } catch (e) {
    console.error('OBSエラー:', e);
    try { await obs.disconnect(); } catch {}
    res.status(500).json({ error: e.message || 'OBSとの接続に失敗しました' });
  }
});

// ヘルスチェック
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`サーバー起動: http://localhost:${PORT}`);
  console.log(`LiveKit接続先: ${LIVEKIT_HOST}`);
});
