import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LiveKitRoom, RoomAudioRenderer } from '@livekit/components-react';
import VideoGrid from '../components/VideoGrid.jsx';
import ControlBar from '../components/ControlBar.jsx';
import ChatPanel from '../components/ChatPanel.jsx';
import TranscriptPanel from '../components/TranscriptPanel.jsx';
import DeviceSetup from '../components/DeviceSetup.jsx';
import { useRecording } from '../hooks/useRecording.js';
import { useTranscription } from '../hooks/useTranscription.js';

function RoomContent({ roomId }) {
  const navigate = useNavigate();
  const [showChat, setShowChat] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const recording = useRecording();
  const transcription = useTranscription();

  return (
    <div className="room-wrapper">
      <div className="room-body">
        <div className="main-area">
          <VideoGrid />
        </div>
        {showChat && <ChatPanel onClose={() => setShowChat(false)} />}
        {showTranscript && (
          <TranscriptPanel
            transcripts={transcription.transcripts}
            interimText={transcription.interimText}
            onClear={transcription.clearTranscripts}
            onDownload={transcription.downloadTranscript}
            onClose={() => setShowTranscript(false)}
          />
        )}
      </div>
      <ControlBar
        roomId={roomId}
        onLeave={() => navigate('/')}
        showChat={showChat}
        onToggleChat={() => setShowChat(v => !v)}
        showTranscript={showTranscript}
        onToggleTranscript={() => setShowTranscript(v => !v)}
        recording={recording}
        transcription={transcription}
      />
    </div>
  );
}

export default function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [error, setError] = useState('');
  const [devices, setDevices] = useState(null); // null = デバイス選択前
  const userName = sessionStorage.getItem('userName') || 'Guest';

  useEffect(() => {
    if (!roomId) return navigate('/');
    fetch(`${import.meta.env.VITE_API_URL || ''}/api/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room: roomId, username: userName }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error);
        setToken(d.token);
        setServerUrl(d.url);
      })
      .catch(e => setError(e.message));
  }, [roomId]);

  if (error) {
    return (
      <div className="error-page">
        <p>接続エラー: {error}</p>
        <button className="btn btn-secondary" onClick={() => navigate('/')}>戻る</button>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="connecting-page">
        <div className="spinner" />
        <p>接続中...</p>
      </div>
    );
  }

  // デバイス選択画面（OBS Virtual Camera もここで選択可能）
  if (!devices) {
    return <DeviceSetup onConfirm={setDevices} />;
  }

  // LiveKit にデバイス ID を渡す
  const audioOptions = devices.micId
    ? { deviceId: devices.micId }
    : true;
  const videoOptions = devices.camId
    ? { deviceId: devices.camId }
    : true;

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect
      audio={audioOptions}
      video={videoOptions}
      onDisconnected={() => navigate('/')}
    >
      <RoomAudioRenderer />
      <RoomContent roomId={roomId} />
    </LiveKitRoom>
  );
}
