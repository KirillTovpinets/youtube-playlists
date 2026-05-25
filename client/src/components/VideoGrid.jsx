export default function VideoGrid({
  playlist, videos, filter, onFilterChange,
  onVideoClick, onVideoRemove, onAddVideo, onSearchYouTube, loading
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 flex-shrink-0">
        <div>
          <h2 className="text-xl font-bold leading-tight">{playlist.name}</h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            {playlist.video_count} video{playlist.video_count !== 1 ? 's' : ''} &middot; {playlist.viewed_count || 0} watched
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-zinc-800 rounded-lg p-0.5">
            {[
              { value: 'all', label: 'All' },
              { value: 'unwatched', label: 'Unwatched' },
              { value: 'watched', label: 'Watched' }
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => onFilterChange(opt.value)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  filter === opt.value
                    ? 'bg-zinc-600 text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            onClick={onSearchYouTube}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
            </svg>
            Search YouTube
          </button>
          <button
            onClick={onAddVideo}
            className="flex items-center gap-2 bg-zinc-700 hover:bg-zinc-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Paste URL
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 min-h-64">
            <svg className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M15 10l4.553-2.069A1 1 0 0121 8.845v6.31a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
            <p className="font-medium">
              {filter !== 'all' ? `No ${filter} videos` : 'No videos yet'}
            </p>
            {filter === 'all' && (
              <p className="text-sm mt-1">Click "Add Video" to get started</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
            {videos.map(video => (
              <VideoCard
                key={video.id}
                video={video}
                onClick={() => onVideoClick(video)}
                onRemove={() => onVideoRemove(video.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function VideoCard({ video, onClick, onRemove }) {
  const thumbnail = video.thumbnail || `https://img.youtube.com/vi/${video.youtube_id}/mqdefault.jpg`;

  return (
    <div
      className="group relative cursor-pointer rounded-xl overflow-hidden bg-zinc-800 hover:ring-2 hover:ring-indigo-500 transition-all"
      onClick={onClick}
    >
      <div className="relative aspect-video bg-zinc-700">
        <img
          src={thumbnail}
          alt={video.title}
          className={`w-full h-full object-cover transition-opacity ${video.viewed ? 'opacity-50' : 'opacity-100'}`}
          loading="lazy"
        />

        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-black/60 rounded-full p-3">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>

        {video.viewed && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/70 rounded-full px-2 py-0.5">
            <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-xs text-green-400 font-medium">Watched</span>
          </div>
        )}

        <button
          onClick={e => { e.stopPropagation(); onRemove(); }}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-black/70 hover:bg-red-600 rounded-full p-1 transition-all"
          title="Remove video"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-2.5">
        <p className="text-xs text-zinc-200 line-clamp-2 leading-snug">{video.title}</p>
      </div>
    </div>
  );
}
