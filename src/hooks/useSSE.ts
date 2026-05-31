"use client";

import { useEffect } from "react";

type SSEMessage = { type: string; [key: string]: unknown };

export function useSSE(url: string, onMessage: (data: SSEMessage) => void) {
  useEffect(() => {
    const es = new EventSource(url);
    es.onmessage = (e) => {
      try { onMessage(JSON.parse(e.data)); } catch { /* ignorar mensajes malformados */ }
    };
    return () => es.close();
  }, [url]); // onMessage intencionalmente excluido — el caller debe memoizarlo si necesita
}
