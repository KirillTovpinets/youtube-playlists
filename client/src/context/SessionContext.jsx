import { createContext, useContext, useState, useEffect } from 'react';
import { useSettings } from './SettingsContext.jsx';

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const { settings } = useSettings();

  const [active, setActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [paused, setPaused] = useState(false);
  const [expired, setExpired] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const startSession = () => {
    setActive(true);
    setTimeLeft(settings.timerDuration * 60);
    setPaused(false);
    setExpired(false);
    setDismissed(false);
  };

  const endSession = () => {
    setActive(false);
    setTimeLeft(0);
    setPaused(false);
    setExpired(false);
    setDismissed(false);
  };

  const pauseTimer = () => setPaused(true);
  const resumeTimer = () => setPaused(false);

  const resetTimer = () => {
    setTimeLeft(settings.timerDuration * 60);
    setPaused(false);
    setExpired(false);
    setDismissed(false);
  };

  const dismissExpiry = () => setDismissed(true);

  // Countdown tick
  useEffect(() => {
    if (!settings.timerEnabled || !active || paused || expired) return;
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          setExpired(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [settings.timerEnabled, active, paused, expired]);

  // Auto-advance is allowed only while timer is actively running
  const canAutoAdvance = active && !expired && !dismissed && timeLeft > 0;

  return (
    <SessionContext.Provider value={{
      sessionActive: active,
      timeLeft,
      paused,
      expired,
      dismissed,
      canAutoAdvance,
      startSession,
      endSession,
      pauseTimer,
      resumeTimer,
      resetTimer,
      dismissExpiry,
    }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
