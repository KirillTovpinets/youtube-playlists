import { useEffect, useRef, useCallback } from 'react';

const WS_URL = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`;
const RECONNECT_DELAY = 3000;

/**
 * @param {object} handlers
 *   onState(state)      – persistent state pushed from server (video, playlist, filter, settings)
 *   onControl(command)  – ephemeral play/pause command from another device
 *   onDbRefresh()       – another device mutated the database, re-fetch
 */
export function useSync({ onState, onControl, onDbRefresh }) {
  const wsRef = useRef(null);
  const handlersRef = useRef({ onState, onControl, onDbRefresh });
  const reconnectTimer = useRef(null);
  const sentStateRef = useRef(null); // last state we sent, to suppress echoes

  useEffect(() => { handlersRef.current = { onState, onControl, onDbRefresh }; });

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => clearTimeout(reconnectTimer.current);

    ws.onmessage = ({ data }) => {
      try {
        const msg = JSON.parse(data);
        const { onState, onControl, onDbRefresh } = handlersRef.current;

        if (msg.type === 'sync') {
          // Suppress echo: if this state looks like what we just sent, ignore.
          const sent = sentStateRef.current;
          const isEcho = sent && JSON.stringify(msg.state) === JSON.stringify({ ...msg.state, ...sent });
          if (!isEcho) onState(msg.state);
        }

        if (msg.type === 'control') onControl?.(msg.command);
        if (msg.type === 'db_refresh') onDbRefresh?.();
      } catch {}
    };

    ws.onclose = () => {
      reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY);
    };
    ws.onerror = () => ws.close();
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  /** Send persistent state. Merges with server state (partial updates allowed). */
  const sendState = useCallback((partialState) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    sentStateRef.current = partialState;
    ws.send(JSON.stringify({ type: 'update', state: partialState }));
  }, []);

  /** Relay ephemeral play/pause command — not stored on server. */
  const sendControl = useCallback((command) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'control', command }));
  }, []);

  return { sendState, sendControl };
}
