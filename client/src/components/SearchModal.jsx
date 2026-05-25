import { useState, useEffect, useRef } from 'react';

export default function SearchModal({ onClose, onAdd, existingVideoIds }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [nextPageToken, setNextPageToken] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [addedIds, setAddedIds] = useState(new Set(existingVideoIds));
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const doSearch = async (pageToken = null) => {
    if (!query.trim()) return;
    const isLoadMore = pageToken !== null;

    if (isLoadMore) setLoadingMore(true);
    else { setLoading(true); setResults([]); setNextPageToken(null); }

    setError('');

    try {
      const params = new URLSearchParams({ q: query.trim() });
      if (pageToken) params.set('pageToken', pageToken);

      const res = await fetch(`/api/youtube/search?${params}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Search failed');

      setResults(prev => isLoadMore ? [...prev, ...data.items] : data.items);
      setNextPageToken(data.nextPageToken);
      setHasSearched(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleAdd = async (item) => {
    try {
      await onAdd({
        youtube_id: item.youtube_id,
        title: item.title,
        thumbnail: item.thumbnail
      });
      setAddedIds(prev => new Set([...prev, item.youtube_id]));
    } catch (err) {
      if (err.message?.includes('already')) {
        setAddedIds(prev => new Set([...prev, item.youtube_id]));
      } else {
        throw err;
      }
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/85 flex flex-col z-50"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="flex flex-col flex-1 w-full max-w-5xl mx-auto my-8 bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 p-5 border-b border-zinc-800 flex-shrink-0">
          <div className="w-7 h-7 bg-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <h2 className="font-semibold text-lg">Search YouTube</h2>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-zinc-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search bar */}
        <div className="p-4 border-b border-zinc-800 flex-shrink-0">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                className="w-full bg-zinc-800 rounded-xl pl-10 pr-10 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 placeholder-zinc-500"
                placeholder="Search for videos..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') doSearch(); }}
              />
              {query && (
                <button
                  onClick={() => { setQuery(''); setResults([]); setHasSearched(false); inputRef.current?.focus(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <button
              onClick={() => doSearch()}
              disabled={!query.trim() || loading}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 flex-shrink-0"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Search'
              )}
            </button>
          </div>
        </div>

        {/* Results area */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
              </svg>
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {loading && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {!loading && results.length === 0 && !hasSearched && (
            <div className="flex flex-col items-center justify-center h-48 text-zinc-600">
              <svg className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="font-medium">Search for YouTube videos</p>
              <p className="text-sm mt-1">Type a query and press Enter or click Search</p>
            </div>
          )}

          {!loading && results.length === 0 && hasSearched && (
            <div className="flex flex-col items-center justify-center h-48 text-zinc-500">
              <p className="font-medium">No results found</p>
              <p className="text-sm mt-1">Try a different search term</p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {results.map(item => (
                  <ResultCard
                    key={item.youtube_id}
                    item={item}
                    added={addedIds.has(item.youtube_id)}
                    onAdd={() => handleAdd(item)}
                  />
                ))}
              </div>

              {nextPageToken && (
                <div className="flex justify-center mt-6">
                  <button
                    onClick={() => doSearch(nextPageToken)}
                    disabled={loadingMore}
                    className="flex items-center gap-2 px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {loadingMore ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      'Load more results'
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultCard({ item, added, onAdd }) {
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  const handleClick = async () => {
    if (added || adding) return;
    setAdding(true);
    setError('');
    try {
      await onAdd();
    } catch (err) {
      setError(err.message || 'Failed to add');
    } finally {
      setAdding(false);
    }
  };

  const publishYear = item.publishedAt
    ? new Date(item.publishedAt).getFullYear()
    : null;

  return (
    <div className="group flex flex-col bg-zinc-800 rounded-xl overflow-hidden hover:ring-2 hover:ring-indigo-500 transition-all">
      <div className="relative aspect-video bg-zinc-700 flex-shrink-0">
        <img
          src={item.thumbnail}
          alt={item.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {!added && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <svg className="w-10 h-10 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}
        {added && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="bg-green-500 rounded-full p-2">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col flex-1 p-2.5 gap-2">
        <div className="flex-1 min-h-0">
          <p className="text-xs text-zinc-100 line-clamp-2 leading-snug font-medium">{item.title}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <p className="text-xs text-zinc-500 truncate">{item.channelTitle}</p>
            {publishYear && (
              <span className="text-zinc-600 text-xs flex-shrink-0">&middot; {publishYear}</span>
            )}
          </div>
        </div>

        <button
          onClick={handleClick}
          disabled={added || adding}
          className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
            added
              ? 'bg-green-600/20 text-green-400 cursor-default'
              : error
              ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-60'
          }`}
        >
          {adding ? (
            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : added ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Added
            </>
          ) : error ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
              </svg>
              Retry
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Add to Playlist
            </>
          )}
        </button>
        {error && (
          <p className="text-xs text-red-400 text-center leading-tight">{error}</p>
        )}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="flex flex-col bg-zinc-800 rounded-xl overflow-hidden animate-pulse">
      <div className="aspect-video bg-zinc-700" />
      <div className="p-2.5 space-y-2">
        <div className="h-3 bg-zinc-700 rounded w-full" />
        <div className="h-3 bg-zinc-700 rounded w-3/4" />
        <div className="h-3 bg-zinc-700 rounded w-1/2" />
        <div className="h-7 bg-zinc-700 rounded-lg mt-1" />
      </div>
    </div>
  );
}
