import { useEffect, useState, useRef, useCallback } from 'react';
import { useSettings } from '../context/SettingsContext.jsx';
import { useSession } from '../context/SessionContext.jsx';

function playBeep() {
  try {
    const ctx = new AudioContext();
    [0, 0.28, 0.56].forEach(delay => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.35, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.22);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.22);
    });
  } catch {}
}

function sendYouTubeCommand(iframe, func) {
  iframe?.contentWindow?.postMessage(
    JSON.stringify({ event: 'command', func, args: [] }),
    'https://www.youtube.com'
  );
}

export default function VideoPlayer({ video, videos, onClose, onNavigate, onMarkViewed, syncCommand, onYtStateChange }) {
  const currentIdx = videos.findIndex(v => v.id === video.id);
  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx < videos.length - 1;

  const { settings } = useSettings();
  const {
    sessionActive, timeLeft, paused, expired, dismissed, canAutoAdvance,
    pauseTimer, resumeTimer, resetTimer, dismissExpiry,
  } = useSession();

  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef(null);
  const iframeRef = useRef(null);
  // Prevents firing onNavigate more than once per video-end event
  const navigatedRef = useRef(false);
  // Set to true just before we send a syncCommand to the iframe so the
  // resulting YouTube state-change event is not re-broadcast back to the sender
  const suppressYtReportRef = useRef(false);

  // Reset navigation guard when video changes
  useEffect(() => {
    navigatedRef.current = false;
  }, [video.id]);

  // Pause + beep when timer expires
  useEffect(() => {
    if (!expired || dismissed) return;
    sendYouTubeCommand(iframeRef.current, 'pauseVideo');
    playBeep();
  }, [expired, dismissed]);

  // Resume video when user dismisses the expiry modal
  useEffect(() => {
    if (!dismissed) return;
    sendYouTubeCommand(iframeRef.current, 'playVideo');
  }, [dismissed]);

  // Execute play/pause commands relayed from another device
  useEffect(() => {
    if (!syncCommand) return;
    suppressYtReportRef.current = true;
    sendYouTubeCommand(
      iframeRef.current,
      syncCommand.command === 'play' ? 'playVideo' : 'pauseVideo'
    );
  }, [syncCommand]); // syncCommand.seq changes every time so this always runs

  // Listen for YouTube playerState messages
  // playerState: -1 unstarted | 0 ended | 1 playing | 2 paused | 3 buffering | 5 cued
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.origin !== 'https://www.youtube.com') return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data.event !== 'infoDelivery') return;
        const ps = data.info?.playerState;

        if (ps === 0) {
          // Ended — auto-advance if session permits
          if (!navigatedRef.current && canAutoAdvance && hasNext) {
            navigatedRef.current = true;
            onNavigate(1);
          }
        }

        if (ps === 1 || ps === 2) {
          // Playing or paused — relay to other devices, but suppress if we
          // triggered this state ourselves via a syncCommand
          if (suppressYtReportRef.current) {
            suppressYtReportRef.current = false;
          } else {
            onYtStateChange?.({ playing: ps === 1 });
          }
        }
      } catch {}
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [canAutoAdvance, hasNext, onNavigate, onYtStateChange]);

  // Fullscreen tracking
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && !document.fullscreenElement) onClose();
      if (e.key === 'ArrowLeft' && !document.fullscreenElement) onNavigate(-1);
      if (e.key === 'ArrowRight' && !document.fullscreenElement) onNavigate(1);
      if (e.key === 'f' || e.key === 'F') toggleFullscreen();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, onNavigate, toggleFullscreen]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Timer badge — visible while session is running (not yet expired)
  const timerBadge = settings.timerEnabled && sessionActive && !expired && (
    <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-1.5 pointer-events-none">
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-mono font-semibold shadow-lg pointer-events-auto select-none ${
        timeLeft <= 60 ? 'bg-orange-500/90 text-white' : 'bg-black/60 text-white backdrop-blur-sm'
      }`}>
        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {formatTime(timeLeft)}
      </div>
      <div className="flex gap-1 pointer-events-auto">
        <button
          onClick={paused ? resumeTimer : pauseTimer}
          className="bg-black/60 backdrop-blur-sm hover:bg-black/80 text-white px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
        >
          {paused ? '▶ Resume' : '⏸ Pause'}
        </button>
        <button
          onClick={resetTimer}
          className="bg-black/60 backdrop-blur-sm hover:bg-black/80 text-white px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
        >
          ↺ Reset
        </button>
      </div>
    </div>
  );

  // Expired modal — shown when timer hits 0 (until dismissed or closed)
  const expiredModal = settings.timerEnabled && expired && !dismissed && (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 mx-4 max-w-sm w-full text-center shadow-2xl">
        <div className="w-16 h-16 bg-red-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold mb-2">Time's up!</h2>
        <p className="text-zinc-400 text-sm mb-6">
          Your {settings.timerDuration}-minute session has ended. Ready for a break?
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={onClose}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl transition-colors"
          >
            Close video
          </button>
          <button
            onClick={dismissExpiry}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-medium py-2.5 rounded-xl transition-colors"
          >
            Watch till the end
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={containerRef}
        className={`w-full bg-zinc-900 flex flex-col overflow-hidden shadow-2xl ${
          isFullscreen ? 'h-full rounded-none' : 'max-w-4xl rounded-2xl'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 gap-3 border-b border-zinc-800 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base leading-snug line-clamp-2">{video.title}</h3>
            <div className="flex items-center gap-3 mt-1">
              {video.viewed && (
                <span className="flex items-center gap-1 text-xs text-green-400">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Watched
                </span>
              )}
              <span className="text-xs text-zinc-500">{currentIdx + 1} of {videos.length}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={toggleFullscreen}
              className="p-1.5 hover:bg-zinc-700 rounded-lg transition-colors"
              title={isFullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}
            >
              {isFullscreen ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-zinc-700 rounded-lg transition-colors"
              title="Close (Esc)"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Video area — single iframe, layout toggled via CSS */}
        <div
          className={isFullscreen ? 'flex-1 relative min-h-0' : 'relative w-full'}
          style={isFullscreen ? {} : { paddingBottom: '56.25%' }}
        >
          <iframe
            ref={iframeRef}
            key={video.youtube_id}
            className="absolute inset-0 w-full h-full"
            src={`https://www.youtube.com/embed/${video.youtube_id}?autoplay=1&rel=0&enablejsapi=1`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
          {timerBadge}
          {expiredModal}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 gap-3 border-t border-zinc-800 flex-shrink-0">
          <button
            onClick={() => onNavigate(-1)}
            disabled={!hasPrev}
            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed enabled:hover:bg-zinc-700"
            title="Previous (←)"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </button>

          <button
            onClick={() => onMarkViewed(video.id, !video.viewed)}
            className={`flex items-center gap-2 px-4 py-1.5 text-sm rounded-lg font-medium transition-colors ${
              video.viewed
                ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
                : 'bg-green-600 hover:bg-green-500 text-white'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {video.viewed ? 'Mark Unwatched' : 'Mark as Watched'}
          </button>

          <button
            onClick={() => onNavigate(1)}
            disabled={!hasNext}
            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed enabled:hover:bg-zinc-700"
            title="Next (→)"
          >
            Next
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
