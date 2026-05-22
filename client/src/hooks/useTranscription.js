import { useCallback, useRef, useState } from 'react';
import { useDataChannel, useLocalParticipant } from '@livekit/components-react';

export function useTranscription() {
  const [transcripts, setTranscripts] = useState([]);
  const [interimText, setInterimText] = useState(''); // 認識中のリアルタイムテキスト
  const [isTranscribing, setIsTranscribing] = useState(false);
  const { localParticipant } = useLocalParticipant();
  const recognitionRef = useRef(null);
  const activeRef = useRef(false);
  const restartTimerRef = useRef(null);

  const { send } = useDataChannel('transcript', (msg) => {
    try {
      const data = JSON.parse(new TextDecoder().decode(msg.payload));
      setTranscripts(prev => [...prev, { ...data, id: Date.now() + Math.random() }]);
    } catch {}
  });

  const start = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert('文字起こしはChrome/Edgeが必要です（Web Speech API）');
      return;
    }

    const createRecognition = () => {
      const recognition = new SR();
      recognition.lang = 'ja-JP';
      recognition.continuous = true;
      recognition.interimResults = true;   // ← 中間結果も取得（拾い漏れ防止）
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            const text = event.results[i][0].transcript.trim();
            if (!text) continue;
            const entry = {
              speaker: localParticipant.name || localParticipant.identity,
              text,
              time: Date.now(),
              id: Math.random(),
            };
            setTranscripts(prev => [...prev, entry]);
            send(new TextEncoder().encode(JSON.stringify(entry)), { reliable: true });
            setInterimText(''); // 確定したらリアルタイム表示をクリア
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        if (interim) setInterimText(interim);
      };

      recognition.onerror = (e) => {
        if (e.error === 'not-allowed') {
          alert('マイクのアクセス許可が必要です');
          activeRef.current = false;
          setIsTranscribing(false);
        }
        // network/aborted エラーは無視して再起動に任せる
      };

      recognition.onend = () => {
        setInterimText('');
        if (!activeRef.current) return;
        // 少し間隔を空けてから再起動（即時再起動だとブラウザがブロックする場合がある）
        restartTimerRef.current = setTimeout(() => {
          if (activeRef.current) {
            recognitionRef.current = createRecognition();
            recognitionRef.current.start();
          }
        }, 200);
      };

      return recognition;
    };

    activeRef.current = true;
    recognitionRef.current = createRecognition();
    recognitionRef.current.start();
    setIsTranscribing(true);
  }, [localParticipant, send]);

  const stop = useCallback(() => {
    activeRef.current = false;
    clearTimeout(restartTimerRef.current);
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsTranscribing(false);
    setInterimText('');
  }, []);

  const clearTranscripts = useCallback(() => setTranscripts([]), []);

  const downloadTranscript = useCallback(() => {
    if (transcripts.length === 0) return;
    const text = transcripts.map(t => {
      const time = new Date(t.time).toLocaleTimeString('ja-JP');
      return `[${time}] ${t.speaker}: ${t.text}`;
    }).join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }, [transcripts]);

  return { transcripts, interimText, isTranscribing, start, stop, clearTranscripts, downloadTranscript };
}
