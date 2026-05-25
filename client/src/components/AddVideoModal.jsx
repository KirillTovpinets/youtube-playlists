import { useState } from 'react';

function extractYouTubeId(input) {
  if (!input) return null;
  input = input.trim();

  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;

  try {
    const url = new URL(input);
    if (url.hostname === 'youtu.be') return url.pathname.slice(1).split('?')[0].slice(0, 11);
    if (url.hostname.includes('youtube.com')) {
      const v = url.searchParams.get('v');
      if (v) return v;
      const embedMatch = url.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
      if (embedMatch) return embedMatch[1];
    }
  } catch {}

  const match = input.match(/(?:v=|\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

export default function AddVideoModal({ onClose, onAdd }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const videoId = extractYouTubeId(input);

  const handleAdd = async () => {
    if (!videoId) return;
    setLoading(true);
    setError('');

    try {
      const infoRes = await fetch(`/api/youtube/info?videoId=${videoId}`);
      const info = await infoRes.json();

      await onAdd({
        youtube_id: videoId,
        title: info.title || videoId,
        thumbnail: info.thumbnail || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to add video');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <h3 className="font-semibold text-lg">Add YouTube Video</h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-zinc-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-sm text-zinc-400 block mb-2">YouTube URL or Video ID</label>
            <input
              autoFocus
              className="w-full bg-zinc-800 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 placeholder-zinc-500"
              placeholder="https://www.youtube.com/watch?v=..."
              value={input}
              onChange={e => { setInput(e.target.value); setError(''); }}
              onKeyDown={e => {
                if (e.key === 'Enter' && videoId) handleAdd();
                if (e.key === 'Escape') onClose();
              }}
            />
          </div>

          {videoId && (
            <div className="rounded-xl overflow-hidden bg-zinc-800">
              <img
                src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                alt="Video thumbnail preview"
                className="w-full aspect-video object-cover"
              />
              <div className="px-3 py-2">
                <p className="text-xs text-zinc-400">
                  Video ID: <span className="text-white font-mono">{videoId}</span>
                </p>
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-zinc-800 hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!videoId || loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Add Video'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
