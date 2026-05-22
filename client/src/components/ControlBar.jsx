import { useCallback, useState } from 'react';
import { useLocalParticipant } from '@livekit/components-react';

function IconBtn({ label, active, danger, onClick, children, badge }) {
  return (
    <button
      className={`ctrl-btn${active ? ' active' : ''}${danger ? ' danger' : ''}`}
      onClick={onClick}
      title={label}
    >
      <span className="ctrl-icon">{children}</span>
      {badge && <span className="ctrl-badge">{badge}</span>}
      <span className="ctrl-label">{label}</span>
    </button>
  );
}

export default function ControlBar({
  roomId,
  onLeave,
  showChat,
  onToggleChat,
  showTranscript,
  onToggleTranscript,
  recording,
  transcription,
}) {
  const { localParticipant } = useLocalParticipant();
  const [screenSharing, setScreenSharing] = useState(false);

  const toggleMic = useCallback(() => {
    localParticipant.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled);
  }, [localParticipant]);

  const toggleCamera = useCallback(() => {
    localParticipant.setCameraEnabled(!localParticipant.isCameraEnabled);
  }, [localParticipant]);

  const toggleScreen = useCallback(async () => {
    if (screenSharing) {
      await localParticipant.setScreenShareEnabled(false);
      setScreenSharing(false);
      return;
    }
    try {
      await localParticipant.setScreenShareEnabled(true, {
        selfBrowserSurface: 'exclude',
      });
      setScreenSharing(true);
    } catch (e) {
      if (e.name !== 'NotAllowedError') console.error(e);
    }
  }, [localParticipant, screenSharing]);

  const copyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      alert('会議URLをコピーしました');
    });
  }, []);

  const isMicOn = localParticipant?.isMicrophoneEnabled;
  const isCamOn = localParticipant?.isCameraEnabled;

  return (
    <div className="control-bar">
      <div className="ctrl-left">
        <span className="room-id-display">会議ID: {roomId}</span>
        <button className="btn btn-ghost btn-sm" onClick={copyLink} title="URLをコピー">
          🔗 コピー
        </button>
      </div>

      <div className="ctrl-center">
        <IconBtn
          label={isMicOn ? 'ミュート' : 'ミュート解除'}
          active={!isMicOn}
          onClick={toggleMic}
        >
          {isMicOn ? '🎤' : '🔇'}
        </IconBtn>

        <IconBtn
          label={isCamOn ? 'カメラOFF' : 'カメラON'}
          active={!isCamOn}
          onClick={toggleCamera}
        >
          {isCamOn ? '📹' : '📷'}
        </IconBtn>

        <IconBtn
          label={screenSharing ? '共有停止' : '画面共有'}
          active={screenSharing}
          onClick={toggleScreen}
        >
          🖥
        </IconBtn>

        <IconBtn
          label={recording.isRecording ? `録画停止 ${recording.duration}` : '録画開始'}
          active={recording.isRecording}
          onClick={recording.isRecording ? recording.stop : recording.start}
          badge={recording.isRecording ? '●' : null}
        >
          ⏺
        </IconBtn>

        <IconBtn
          label={transcription.isTranscribing ? '文字起こし停止' : '文字起こし'}
          active={transcription.isTranscribing}
          onClick={transcription.isTranscribing ? transcription.stop : transcription.start}
        >
          📝
        </IconBtn>

        <IconBtn
          label="チャット"
          active={showChat}
          onClick={onToggleChat}
        >
          💬
        </IconBtn>

        <IconBtn
          label="議事録"
          active={showTranscript}
          onClick={onToggleTranscript}
        >
          📄
        </IconBtn>
      </div>

      <div className="ctrl-right">
        <button className="btn btn-danger" onClick={onLeave}>
          退出
        </button>
      </div>
    </div>
  );
}
