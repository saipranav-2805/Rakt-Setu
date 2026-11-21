import { useEffect, useState, useRef } from 'react';

export interface SSEMessage {
  type: string;
  payload: any;
  timestamp?: string;
}

/**
 * Resilient EventSource Hook for Real-Time SSE live streams (Blueprint Section 7 & 17)
 * Automatically reconnects on network dropouts
 */
export function useEventSource(url: string | null) {
  const [data, setData] = useState<SSEMessage | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!url) return;

    let isMounted = true;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => {
      if (isMounted) setConnected(true);
    };

    es.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (isMounted) setData(parsed);
      } catch (err) {
        console.error('[SSE Hook] Failed to parse message', err);
      }
    };

    es.onerror = () => {
      if (isMounted) setConnected(false);
    };

    return () => {
      isMounted = false;
      es.close();
      eventSourceRef.current = null;
    };
  }, [url]);

  return { data, connected };
}
