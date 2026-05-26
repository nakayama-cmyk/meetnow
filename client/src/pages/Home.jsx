import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function generateRoomId() {
  return Math.random().toString(36).slice(2, 6) + '-' +
         Math.random().toString(36).slice(2, 6) + '-' +
         Math.random().toString(36).slice(2, 6);
}

export default function Home() {
  const [name, setName]         = useState('');
  const [roomId, setRoomId]     = useState('');
  const [createdId, setCreatedId] = useState('');
  const [copied, setCopied]     = useState(false);
  const navigate = useNavigate();

  const baseUrl = `${location.protocol}//${location.host}${location.pathname.replace(/\/$/, '')}`;

  const createMeeting = () => {
    const trimmed = name.trim();
    if (!trimmed) return alert('名前を入力してください');
    sessionStorage.setItem('userName', trimmed);
    const id = generateRoomId();
    setCreatedId(id);
    setCopied(false);
  };

  const joinMeeting = (id) => {
    const trimmed = name.trim();
    if (!trimmed) return alert('名前を入力してください');
    sessionStorage.setItem('userName', trimmed);
    navigate(`/room/${id}`);
  };

  const copyLink = () => {
    const link = `${baseUrl}#/room/${createdId}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="home-page">
      <div className="home-card">
        <div className="logo">
          <span className="logo-icon">📹</span>
          <h1>MeetNow</h1>
        </div>
        <p className="tagline">無料のビデオ会議 · 録画 · 文字起こし</p>

        <div className="field">
          <label>あなたの名前</label>
          <input
            type="text"
            placeholder="名前を入力"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createMeeting()}
            autoFocus
          />
        </div>

        {!createdId ? (
          <button className="btn btn-primary btn-full" onClick={createMeeting}>
            新しい会議を開始
          </button>
        ) : (
          <div className="meeting-link-box">
            <p className="meeting-link-label">📎 参加リンク（コピーして共有）</p>
            <div className="meeting-link-row">
              <input
                className="meeting-link-input"
                readOnly
                value={`${baseUrl}#/room/${createdId}`}
                onFocus={e => e.target.select()}
              />
              <button className="btn btn-secondary" onClick={copyLink}>
                {copied ? '✅ コピー済' : 'コピー'}
              </button>
            </div>
            <button className="btn btn-primary btn-full" style={{ marginTop: 10 }} onClick={() => joinMeeting(createdId)}>
              🚀 会議に参加する
            </button>
            <button className="btn-text" onClick={() => setCreatedId('')}>← 戻る</button>
          </div>
        )}

        <div className="divider"><span>または参加</span></div>

        <div className="join-row">
          <input
            type="text"
            placeholder="会議IDを入力"
            value={roomId}
            onChange={e => setRoomId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && roomId.trim() && joinMeeting(roomId.trim())}
          />
          <button
            className="btn btn-secondary"
            onClick={() => roomId.trim() && joinMeeting(roomId.trim())}
          >
            参加
          </button>
        </div>

        <div className="features">
          <span>🎥 ビデオ</span>
          <span>🖥 画面共有</span>
          <span>⏺ 録画</span>
          <span>📝 文字起こし</span>
          <span>💬 チャット</span>
        </div>
      </div>
    </div>
  );
}
