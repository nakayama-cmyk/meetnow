import { useState, useCallback } from 'react';
import {
  useTracks,
  VideoTrack,
  useIsSpeaking,
  isTrackReference,
} from '@livekit/components-react';
import { Track } from 'livekit-client';

const PER_PAGE = 25;

function getCols(n) {
  if (n <= 1) return 1;
  if (n <= 4) return 2;
  if (n <= 9) return 3;
  if (n <= 16) return 4;
  return 5;
}

function ParticipantTile({ trackRef, small = false }) {
  const isSpeaking = useIsSpeaking(trackRef.participant);
  const isLocal = trackRef.participant.isLocal;
  const isScreenShare = trackRef.source === Track.Source.ScreenShare;
  const name = trackRef.participant.name || trackRef.participant.identity;
  const hasVideo = isTrackReference(trackRef) && trackRef.publication?.isSubscribed !== false;
  const isMicOff = !trackRef.participant.isMicrophoneEnabled;

  return (
    <div className={`participant-tile${isSpeaking ? ' speaking' : ''}${small ? ' tile-small' : ''}`}>
      {hasVideo ? (
        <VideoTrack
          trackRef={trackRef}
          className="participant-video"
          style={{ width: '100%', height: '100%', objectFit: small ? 'cover' : 'contain' }}
        />
      ) : (
        <div className="avatar">
          <span>{name.charAt(0).toUpperCase()}</span>
        </div>
      )}
      {isLocal && isScreenShare && (
        <div className="sharing-badge">🖥 共有中</div>
      )}
      <div className="tile-label">
        {isMicOff && !isScreenShare && <span className="mic-off-icon">🔇</span>}
        <span className="tile-name">
          {isScreenShare ? `${name} の画面` : isLocal ? `${name} (あなた)` : name}
        </span>
      </div>
    </div>
  );
}

// 自分が共有中（リモートの共有なし）→ フルスクリーン共有 + 右上にカメラをフロート
function LocalShareLayout({ localScreenTrack, cameraTracks }) {
  return (
    <div className="screenshare-fullarea">
      <ParticipantTile trackRef={localScreenTrack} small={false} />
      <div className="local-share-badge">🖥 あなたの画面を共有中</div>
      {cameraTracks.length > 0 && (
        <div className="float-cams">
          {cameraTracks.map(trackRef => (
            <ParticipantTile
              key={`${trackRef.participant.identity}-${trackRef.source}`}
              trackRef={trackRef}
              small
            />
          ))}
        </div>
      )}
    </div>
  );
}

// 他の人が共有中 → フルスクリーン共有 + 右上にカメラをフロート
function RemoteShareLayout({ screenTracks, cameraTracks, localScreenTrack }) {
  const mainTrack = screenTracks[0];
  const floatTracks = [
    ...cameraTracks,
    ...(localScreenTrack ? [localScreenTrack] : []),
    ...screenTracks.slice(1),
  ];

  return (
    <div className="screenshare-fullarea">
      <ParticipantTile trackRef={mainTrack} small={false} />
      {floatTracks.length > 0 && (
        <div className="float-cams">
          {floatTracks.map(trackRef => (
            <ParticipantTile
              key={`${trackRef.participant.identity}-${trackRef.source}`}
              trackRef={trackRef}
              small
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function VideoGrid() {
  const [page, setPage] = useState(0);

  const allTracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  const localScreenTrack  = allTracks.find(t => t.source === Track.Source.ScreenShare && t.participant.isLocal);
  const remoteScreenTracks = allTracks.filter(t => t.source === Track.Source.ScreenShare && !t.participant.isLocal);
  const cameraTracks       = allTracks.filter(t => t.source === Track.Source.Camera);

  // 他の人が画面共有中 → リモート共有をメインに
  if (remoteScreenTracks.length > 0) {
    return (
      <div className="video-grid-container">
        <RemoteShareLayout
          screenTracks={remoteScreenTracks}
          cameraTracks={cameraTracks}
          localScreenTrack={localScreenTrack}
        />
      </div>
    );
  }

  // 自分だけが共有中 → 無限鏡を最小化したレイアウト
  if (localScreenTrack) {
    return (
      <div className="video-grid-container">
        <LocalShareLayout
          localScreenTrack={localScreenTrack}
          cameraTracks={cameraTracks}
        />
      </div>
    );
  }

  // 通常グリッド
  const totalPages = Math.ceil(cameraTracks.length / PER_PAGE);
  const visible = cameraTracks.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const cols = getCols(visible.length);

  return (
    <div className="video-grid-container">
      <div className="video-grid" style={{ '--grid-cols': cols }}>
        {visible.map(trackRef => (
          <ParticipantTile
            key={`${trackRef.participant.identity}-${trackRef.source}`}
            trackRef={trackRef}
          />
        ))}
      </div>
      {totalPages > 1 && (
        <div className="pagination">
          <button className="btn btn-ghost" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>◀</button>
          <span>{page + 1} / {totalPages}</span>
          <button className="btn btn-ghost" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}>▶</button>
          <span className="participant-count">参加者 {cameraTracks.length} 人</span>
        </div>
      )}
      {allTracks.length === 0 && (
        <div className="empty-room">
          <p>参加者を待っています...</p>
          <small>URLを共有して招待しましょう</small>
        </div>
      )}
    </div>
  );
}
