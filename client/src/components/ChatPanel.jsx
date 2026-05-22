import { useState, useEffect, useRef } from 'react';
import { useDataChannel, useLocalParticipant } from '@livekit/components-react';

export default function ChatPanel({ onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);
  const { localParticipant } = useLocalParticipant();

  const { send } = useDataChannel('chat', (msg) => {
    try {
      const data = JSON.parse(new TextDecoder().decode(msg.payload));
      setMessages(prev => [...prev, { ...data, id: Math.random() }]);
    } catch {}
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text) return;

    const data = {
      sender: localParticipant.name || localParticipant.identity,
      text,
      time: Date.now(),
      isLocal: true,
    };

    // 自分のメッセージをローカルに表示
    setMessages(prev => [...prev, { ...data, id: Math.random() }]);
    // 他の参加者に送信
    send(new TextEncoder().encode(JSON.stringify({ ...data, isLocal: false })), { reliable: true });
    setInput('');
  };

  return (
    <div className="side-panel">
      <div className="panel-header">
        <h3>チャット</h3>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
      </div>

      <div className="message-list">
        {messages.length === 0 && (
          <div className="empty-msg">まだメッセージはありません</div>
        )}
        {messages.map(m => (
          <div key={m.id} className={`message${m.isLocal ? ' message-local' : ''}`}>
            <div className="message-meta">
              <span className="message-sender">{m.sender}</span>
              <span className="message-time">
                {new Date(m.time).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="message-text">{m.text}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input">
        <input
          type="text"
          placeholder="メッセージを入力..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
        />
        <button className="btn btn-primary btn-sm" onClick={sendMessage}>送信</button>
      </div>
    </div>
  );
}
