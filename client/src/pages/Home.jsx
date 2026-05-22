import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function generateRoomId() {
  return Math.random().toString(36).slice(2, 6) + '-' +
         Math.random().toString(36).slice(2, 6) + '-' +
         Math.random().toString(36).slice(2, 6);
}

export default function Home() {
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');
  const navigate = useNavigate();

  const go = (id) => {
    const trimmed = name.trim();
    if (!trimmed) return alert('名前を入力してください');
    sessionStorage.setItem('userName', trimmed);
    navigate(`/room/${id}`);
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
            onKeyDown={e => e.key === 'Enter' && go(generateRoomId())}
            autoFocus
          />
        </div>

        <button
          className="btn btn-primary btn-full"
          onClick={() => go(generateRoomId())}
        >
          新しい会議を開始
        </button>

        <div className="divider"><span>または参加</span></div>

        <div className="join-row">
          <input
            type="text"
            placeholder="会議IDを入力"
            value={roomId}
            onChange={e => setRoomId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && roomId.trim() && go(roomId.trim())}
          />
          <button
            className="btn btn-secondary"
            onClick={() => roomId.trim() && go(roomId.trim())}
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
