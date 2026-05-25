/**
 * SyncBanner — shown when another device is watching a video but the local
 * player hasn't opened yet.
 *
 * Clicking "Join" is the user gesture that satisfies the browser's autoplay
 * policy, so the video can start with sound immediately.
 */
export default function SyncBanner({ video, onJoin, onDismiss }) {
  if (!video) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center px-4 pb-4 pointer-events-none">
      <div className="flex items-center gap-3 bg-zinc-800/95 backdrop-blur-sm border border-zinc-700 rounded-2xl shadow-2xl px-4 py-3 max-w-lg w-full pointer-events-auto">
        {/* Thumbnail */}
        {video.thumbnail && (
          <img
            src={video.thumbnail}
            alt=""
            className="w-14 h-10 object-cover rounded-lg flex-shrink-0 bg-zinc-700"
          />
        )}

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-zinc-400 mb-0.5 flex items-center gap-1.5">
            {/* Pulsing dot */}
            <span className="relative flex h-2 w-2 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
            </span>
            Playing on another device
          </p>
          <p className="text-sm font-medium text-white truncate">{video.title}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onJoin}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-1.5 rounded-xl transition-colors"
          >
            Join →
          </button>
          <button
            onClick={onDismiss}
            className="p-1.5 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-400 hover:text-white"
            title="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
