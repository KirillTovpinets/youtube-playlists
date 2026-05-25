import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext.jsx';

export default function Settings() {
  const { settings, updateSettings } = useSettings();
  const navigate = useNavigate();
  const [duration, setDuration] = useState(String(settings.timerDuration));
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    const mins = Math.max(1, Math.min(300, parseInt(duration, 10) || 25));
    updateSettings({ timerDuration: mins, timerEnabled: settings.timerEnabled });
    setDuration(String(mins));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 max-w-xl">
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white"
          title="Go back"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-xl font-bold">Settings</h2>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <section className="bg-zinc-900 rounded-2xl p-5 space-y-5">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Video Timer</h3>

          {/* Enable toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Enable countdown timer</p>
              <p className="text-xs text-zinc-500 mt-0.5">Shows a countdown while a video is playing</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.timerEnabled}
              onClick={() => updateSettings({ timerEnabled: !settings.timerEnabled })}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                settings.timerEnabled ? 'bg-indigo-600' : 'bg-zinc-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  settings.timerEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Duration input */}
          <div className={`transition-opacity ${settings.timerEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
            <label className="block text-sm font-medium mb-2">
              Timer duration
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="300"
                value={duration}
                onChange={e => { setDuration(e.target.value); setSaved(false); }}
                className="w-24 bg-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500 text-center"
              />
              <span className="text-sm text-zinc-400">minutes</span>
            </div>
            <p className="text-xs text-zinc-500 mt-1.5">1 – 300 minutes</p>
          </div>
        </section>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-500 px-5 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Save changes
          </button>
          {saved && (
            <span className="text-sm text-green-400 flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Saved
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
