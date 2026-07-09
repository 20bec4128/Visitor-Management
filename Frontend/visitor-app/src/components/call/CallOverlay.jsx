/** Full-screen in-call surface: remote video large, local video PiP, and call controls. */
export default function CallOverlay({
  peer,
  status,
  muted,
  cameraOff,
  localStream,
  remoteStream,
  onToggleMute,
  onToggleCamera,
  onHangup,
}) {
  const isVideo = peer?.mode !== 'audio'

  // Bind MediaStreams via ref-callbacks so they attach whenever the element is (re)rendered,
  // regardless of when the track arrived.
  const bindStream = (stream) => (el) => {
    if (el && stream && el.srcObject !== stream) el.srcObject = stream
  }

  return (
    <div className="vm-call-overlay">
      <div className="vm-call-stage">
        {isVideo ? (
          <video ref={bindStream(remoteStream)} className="vm-call-remote" autoPlay playsInline />
        ) : (
          <>
            <div className="vm-call-audio-avatar">{(peer?.name || '?').charAt(0).toUpperCase()}</div>
            {/* Voice calls have no video element, so play the remote audio here. */}
            <audio ref={bindStream(remoteStream)} autoPlay />
          </>
        )}

        <div className="vm-call-peer-name">
          {peer?.name || peer?.username}
          <span className="vm-call-status">{status === 'calling' ? 'Calling…' : 'Connected'}</span>
        </div>

        {isVideo && (
          <video ref={bindStream(localStream)} className="vm-call-local" autoPlay playsInline muted />
        )}
      </div>

      <div className="vm-call-controls">
        <button
          type="button"
          className={`vm-call-control${muted ? ' active' : ''}`}
          onClick={onToggleMute}
          title={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? '🔇' : '🎤'}
        </button>
        {isVideo && (
          <button
            type="button"
            className={`vm-call-control${cameraOff ? ' active' : ''}`}
            onClick={onToggleCamera}
            title={cameraOff ? 'Turn camera on' : 'Turn camera off'}
          >
            {cameraOff ? '📷' : '🎥'}
          </button>
        )}
        <button type="button" className="vm-call-control vm-call-hangup" onClick={onHangup} title="Hang up">
          ✕
        </button>
      </div>
    </div>
  )
}
