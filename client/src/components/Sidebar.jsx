import { useState } from 'react';

export default function Sidebar({ playlists, selectedId, onSelect, onCreate, onDelete }) {
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await onCreate(newName.trim());
    setNewName('');
    setCreating(false);
  };

  return (
    <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col flex-shrink-0">
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <h1 className="font-bold text-lg tracking-tight">PlayTube</h1>
        </div>
      </div>

      <div className="p-3 border-b border-zinc-800">
        {creating ? (
          <form onSubmit={handleCreate} className="flex gap-2">
            <input
              autoFocus
              className="flex-1 bg-zinc-800 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-indigo-500 min-w-0"
              placeholder="Playlist name..."
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Escape' && setCreating(false)}
            />
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-500 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors flex-shrink-0"
            >
              Add
            </button>
          </form>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="w-full flex items-center gap-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg px-2.5 py-2 transition-colors"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Playlist
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {playlists.length === 0 && (
          <p className="text-xs text-zinc-600 text-center py-6">No playlists yet</p>
        )}
        {playlists.map(playlist => (
          <PlaylistItem
            key={playlist.id}
            playlist={playlist}
            isSelected={playlist.id === selectedId}
            onSelect={() => { onSelect(playlist.id); setConfirmDelete(null); }}
            onDelete={() => {
              if (confirmDelete === playlist.id) {
                onDelete(playlist.id);
                setConfirmDelete(null);
              } else {
                setConfirmDelete(playlist.id);
              }
            }}
            confirmingDelete={confirmDelete === playlist.id}
            onCancelDelete={() => setConfirmDelete(null)}
          />
        ))}
      </nav>
    </aside>
  );
}

function PlaylistItem({ playlist, isSelected, onSelect, onDelete, confirmingDelete, onCancelDelete }) {
  const unwatched = playlist.video_count - (playlist.viewed_count || 0);

  return (
    <div
      className={`group flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${
        isSelected ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
      }`}
      onClick={onSelect}
    >
      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M4 6h16M4 10h16M4 14h10" />
      </svg>
      <span className="flex-1 text-sm truncate">{playlist.name}</span>

      {confirmingDelete ? (
        <div className="flex gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <button
            onClick={onDelete}
            className="text-xs text-red-400 hover:text-red-300 font-semibold"
            title="Confirm delete"
          >✓</button>
          <button
            onClick={onCancelDelete}
            className="text-xs text-zinc-400 hover:text-white"
            title="Cancel"
          >✕</button>
        </div>
      ) : (
        <div className="flex items-center gap-1 flex-shrink-0">
          {unwatched > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium leading-none ${
              isSelected ? 'bg-indigo-500' : 'bg-zinc-700 text-zinc-300'
            }`}>
              {unwatched}
            </span>
          )}
          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-400 transition-all"
            title="Delete playlist"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
