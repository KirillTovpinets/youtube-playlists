import { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar.jsx';
import VideoGrid from './components/VideoGrid.jsx';
import VideoPlayer from './components/VideoPlayer.jsx';
import AddVideoModal from './components/AddVideoModal.jsx';
import SearchModal from './components/SearchModal.jsx';

export default function App() {
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  const fetchPlaylists = useCallback(async () => {
    const res = await fetch('/api/playlists');
    setPlaylists(await res.json());
  }, []);

  const fetchVideos = useCallback(async (playlistId) => {
    if (!playlistId) { setVideos([]); return; }
    setLoading(true);
    const res = await fetch(`/api/playlists/${playlistId}/videos`);
    setVideos(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchPlaylists(); }, [fetchPlaylists]);
  useEffect(() => { fetchVideos(selectedPlaylistId); }, [selectedPlaylistId, fetchVideos]);

  const createPlaylist = async (name) => {
    const res = await fetch('/api/playlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    const playlist = await res.json();
    setPlaylists(prev => [playlist, ...prev]);
    setSelectedPlaylistId(playlist.id);
  };

  const deletePlaylist = async (id) => {
    await fetch(`/api/playlists/${id}`, { method: 'DELETE' });
    setPlaylists(prev => prev.filter(p => p.id !== id));
    if (selectedPlaylistId === id) {
      setSelectedPlaylistId(null);
      setVideos([]);
    }
  };

  const addVideo = async ({ youtube_id, title, thumbnail }) => {
    const res = await fetch(`/api/playlists/${selectedPlaylistId}/videos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ youtube_id, title, thumbnail })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to add video');
    }
    const video = await res.json();
    setVideos(prev => [video, ...prev]);
    setPlaylists(prev => prev.map(p =>
      p.id === selectedPlaylistId ? { ...p, video_count: p.video_count + 1 } : p
    ));
  };

  const markViewed = async (videoId, viewed) => {
    const res = await fetch(`/api/videos/${videoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ viewed })
    });
    const updated = await res.json();
    setVideos(prev => prev.map(v => v.id === videoId ? updated : v));
    if (selectedVideo?.id === videoId) setSelectedVideo(updated);
    setPlaylists(prev => prev.map(p =>
      p.id === selectedPlaylistId
        ? { ...p, viewed_count: (p.viewed_count || 0) + (viewed ? 1 : -1) }
        : p
    ));
  };

  const removeVideo = async (videoId) => {
    const video = videos.find(v => v.id === videoId);
    await fetch(`/api/videos/${videoId}`, { method: 'DELETE' });
    setVideos(prev => prev.filter(v => v.id !== videoId));
    if (selectedVideo?.id === videoId) setSelectedVideo(null);
    setPlaylists(prev => prev.map(p =>
      p.id === selectedPlaylistId
        ? { ...p, video_count: p.video_count - 1, viewed_count: (p.viewed_count || 0) - (video?.viewed ? 1 : 0) }
        : p
    ));
  };

  const openVideo = async (video) => {
    setSelectedVideo(video);
    if (!video.viewed) {
      await markViewed(video.id, true);
    }
  };

  const filteredVideos = videos.filter(v => {
    if (filter === 'watched') return v.viewed;
    if (filter === 'unwatched') return !v.viewed;
    return true;
  });

  const navigateVideo = (direction) => {
    if (!selectedVideo) return;
    const idx = filteredVideos.findIndex(v => v.id === selectedVideo.id);
    const next = filteredVideos[idx + direction];
    if (next) openVideo(next);
  };

  const selectedPlaylist = playlists.find(p => p.id === selectedPlaylistId);

  return (
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden">
      <Sidebar
        playlists={playlists}
        selectedId={selectedPlaylistId}
        onSelect={setSelectedPlaylistId}
        onCreate={createPlaylist}
        onDelete={deletePlaylist}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        {selectedPlaylist ? (
          <VideoGrid
            playlist={selectedPlaylist}
            videos={filteredVideos}
            filter={filter}
            onFilterChange={setFilter}
            onVideoClick={openVideo}
            onVideoRemove={removeVideo}
            onAddVideo={() => setShowAddModal(true)}
            onSearchYouTube={() => setShowSearchModal(true)}
            loading={loading}
          />
        ) : (
          <EmptyState />
        )}
      </main>

      {selectedVideo && (
        <VideoPlayer
          video={selectedVideo}
          videos={filteredVideos}
          onClose={() => setSelectedVideo(null)}
          onNavigate={navigateVideo}
          onMarkViewed={markViewed}
        />
      )}

      {showAddModal && (
        <AddVideoModal
          onClose={() => setShowAddModal(false)}
          onAdd={addVideo}
        />
      )}

      {showSearchModal && (
        <SearchModal
          onClose={() => setShowSearchModal(false)}
          onAdd={addVideo}
          existingVideoIds={videos.map(v => v.youtube_id)}
        />
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
      <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M15 10l4.553-2.069A1 1 0 0121 8.845v6.31a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
      </svg>
      <p className="text-lg font-medium">Select a playlist to get started</p>
      <p className="text-sm mt-1">Or create a new one from the sidebar</p>
    </div>
  );
}
