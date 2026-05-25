import { useEffect } from 'react';

export default function VideoPlayer({ video, videos, onClose, onNavigate, onMarkViewed }) {
  const currentIdx = videos.findIndex(v => v.id === video.id);
  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx < videos.length - 1;

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onNavigate(-1);
      if (e.key === 'ArrowRight') onNavigate(1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, onNavigate]);

  return (
    <div
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-4xl bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-4 gap-3 border-b border-zinc-800">
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
              <span className="text-xs text-zinc-500">
                {currentIdx + 1} of {videos.length}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1.5 hover:bg-zinc-700 rounded-lg transition-colors"
            title="Close (Esc)"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Embed */}
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          <iframe
            key={video.youtube_id}
            className="absolute inset-0 w-full h-full"
            src={`https://www.youtube.com/embed/${video.youtube_id}?autoplay=1&rel=0`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 gap-3 border-t border-zinc-800">
          <button
            onClick={() => onNavigate(-1)}
            disabled={!hasPrev}
            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-700 enabled:hover:bg-zinc-700"
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
            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-700 enabled:hover:bg-zinc-700"
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
