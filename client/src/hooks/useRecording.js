import { useCallback, useRef, useState } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { Track } from 'livekit-client';

export function useRecording() {
  const room = useRoomContext();
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const stopRef = useRef(null);
  const timerRef = useRef(null);

  const start = useCallback(() => {
    if (isRecording) return;

    // 全参加者の音声をミックス
    const audioCtx = new AudioContext();
    const dest = audioCtx.createMediaStreamDestination();

    const addAudio = (track) => {
      if (!track?.mediaStreamTrack) return;
      try {
        audioCtx.createMediaStreamSource(
          new MediaStream([track.mediaStreamTrack])
        ).connect(dest);
      } catch {}
    };

    // ローカルマイク
    addAudio(room.localParticipant.getTrackPublication(Track.Source.Microphone)?.track);

    // リモート参加者
    room.remoteParticipants.forEach(p => {
      addAudio(p.getTrackPublication(Track.Source.Microphone)?.track);
    });

    // 映像はキャンバスに描画（現在表示中のタイルを合成）
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');

    let active = true;
    const drawFrame = () => {
      if (!active) return;
      ctx.fillStyle = '#111827';
      ctx.fillRect(0, 0, 1280, 720);

      const videos = document.querySelectorAll('.participant-video');
      const n = videos.length;
      if (n > 0) {
        const cols = Math.ceil(Math.sqrt(n));
        const rows = Math.ceil(n / cols);
        const w = 1280 / cols;
        const h = 720 / rows;
        videos.forEach((v, i) => {
          try {
            ctx.drawImage(v, (i % cols) * w, Math.floor(i / cols) * h, w, h);
          } catch {}
        });
      }
      requestAnimationFrame(drawFrame);
    };
    drawFrame();

    const canvasStream = canvas.captureStream(30);
    const combined = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...dest.stream.getAudioTracks(),
    ]);

    const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
      .find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm';

    const recorder = new MediaRecorder(combined, { mimeType });
    const chunks = [];
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
      active = false;
      audioCtx.close();
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recording-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    };

    recorder.start(1000);

    let secs = 0;
    timerRef.current = setInterval(() => setDuration(++secs), 1000);
    setIsRecording(true);
    setDuration(0);

    stopRef.current = () => {
      recorder.stop();
      clearInterval(timerRef.current);
      setIsRecording(false);
      setDuration(0);
    };
  }, [room, isRecording]);

  const stop = useCallback(() => {
    stopRef.current?.();
  }, []);

  const formatDuration = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return { isRecording, duration: formatDuration(duration), start, stop };
}
