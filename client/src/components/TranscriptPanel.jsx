import { useEffect, useRef } from 'react';

export default function TranscriptPanel({ transcripts, interimText, onClear, onDownload, onClose }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  return (
    <div className="side-panel">
      <div className="panel-header">
        <h3>文字起こし</h3>
        <div className="panel-actions">
          <button className="btn btn-ghost btn-sm" onClick={onDownload} title="テキストで保存">
            💾
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onClear} title="クリア">
            🗑
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
      </div>

      <div className="transcript-list">
        {transcripts.length === 0 && (
          <div className="empty-msg">
            <p>まだ文字起こしはありません</p>
            <small>コントロールバーの 📝 ボタンで開始<br />※ Chrome/Edge のみ対応</small>
          </div>
        )}
        {transcripts.map(t => (
          <div key={t.id} className="transcript-entry">
            <div className="transcript-meta">
              <span className="transcript-speaker">{t.speaker}</span>
              <span className="transcript-time">
                {new Date(t.time).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
            <div className="transcript-text">{t.text}</div>
          </div>
        ))}
        {/* リアルタイム認識中テキスト */}
        {interimText && (
          <div className="transcript-entry transcript-interim">
            <div className="transcript-meta">
              <span className="transcript-speaker">認識中...</span>
            </div>
            <div className="transcript-text">{interimText}</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
