import { useState, useEffect, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar.jsx';
import VideoGrid from './components/VideoGrid.jsx';
import VideoPlayer from './components/VideoPlayer.jsx';
import AddVideoModal from './components/AddVideoModal.jsx';
import SearchModal from './components/SearchModal.jsx';
import Settings from './pages/Settings.jsx';
import { useSettings } from './context/SettingsContext.jsx';
import { useSession } from './context/SessionContext.jsx';

export default function App() {
  const { settings } = useSettings();
  const { sessionActive, startSession, endSession } = useSession();

  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [pendingVideo, setPendingVideo] = useState(null);
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
    if (selectedVideo?.id === videoId) {
      setSelectedVideo(null);
      endSession();
    }
    setPlaylists(prev => prev.map(p =>
      p.id === selectedPlaylistId
        ? { ...p, video_count: p.video_count - 1, viewed_count: (p.viewed_count || 0) - (video?.viewed ? 1 : 0) }
        : p
    ));
  };

  // Open a video, bypassing the session modal (used internally after session is confirmed).
  const doOpenVideo = useCallback(async (video) => {
    setSelectedVideo(video);
    if (!video.viewed) {
      await fetch(`/api/videos/${video.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viewed: true })
      }).then(r => r.json()).then(updated => {
        setVideos(prev => prev.map(v => v.id === video.id ? updated : v));
        setSelectedVideo(updated);
        setPlaylists(prev => prev.map(p =>
          p.id === selectedPlaylistId
            ? { ...p, viewed_count: (p.viewed_count || 0) + 1 }
            : p
        ));
      });
    }
  }, [selectedPlaylistId]);

  // Open a video. Shows session-start modal first if timer is enabled and no session is running.
  const openVideo = useCallback(async (video) => {
    if (settings.timerEnabled && !sessionActive) {
      setPendingVideo(video);
      return;
    }
    await doOpenVideo(video);
  }, [settings.timerEnabled, sessionActive, doOpenVideo]);

  const handleStartSession = async () => {
    startSession();
    if (pendingVideo) {
      await doOpenVideo(pendingVideo);
      setPendingVideo(null);
    }
  };

  const handleCancelSession = () => setPendingVideo(null);

  const handleClosePlayer = useCallback(() => {
    setSelectedVideo(null);
    endSession();
  }, [endSession]);

  const filteredVideos = videos.filter(v => {
    if (filter === 'watched') return v.viewed;
    if (filter === 'unwatched') return !v.viewed;
    return true;
  });

  // Recreated each render intentionally — VideoPlayer's message handler uses a ref guard
  // so the listener re-registration on prop change is harmless.
  const navigateVideoFn = (direction) => {
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
        <Routes>
          <Route path="/settings" element={<Settings />} />
          <Route
            path="*"
            element={
              selectedPlaylist ? (
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
              )
            }
          />
        </Routes>
      </main>

      {selectedVideo && (
        <VideoPlayer
          video={selectedVideo}
          videos={filteredVideos}
          onClose={handleClosePlayer}
          onNavigate={navigateVideoFn}
          onMarkViewed={markViewed}
        />
      )}

      {pendingVideo && (
        <SessionStartModal
          duration={settings.timerDuration}
          onStart={handleStartSession}
          onCancel={handleCancelSession}
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

function SessionStartModal({ duration, onStart, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
        <div className="w-14 h-14 bg-indigo-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold mb-2">New Viewing Session</h2>
        <p className="text-zinc-400 text-sm mb-1">
          You have <span className="text-white font-semibold">{duration} minutes</span> of viewing time.
        </p>
        <p className="text-zinc-500 text-xs mb-6">
          The timer starts as soon as the first video begins playing.
          Videos will play automatically while time remains.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={onStart}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl transition-colors"
          >
            Start Session
          </button>
          <button
            onClick={onCancel}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-medium py-2.5 rounded-xl transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
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
