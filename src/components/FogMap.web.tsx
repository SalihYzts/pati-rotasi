// Web sürümü: WebView yerine iframe + postMessage.
import { createElement, useEffect, useRef, useState } from 'react';

import { FOG_MAP_HTML } from './fogMapHtml';
import type { FogMapProps } from './FogMap';

export default function FogMap({ data, onCatPress }: FogMapProps) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const onCat = useRef(onCatPress);
  onCat.current = onCatPress;

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.source !== ref.current?.contentWindow) return;
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'ready') setReady(true);
        if (msg.type === 'cat') onCat.current(msg.id);
      } catch {}
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  useEffect(() => {
    if (!ready) return;
    ref.current?.contentWindow?.postMessage(JSON.stringify({ type: 'update', data }), '*');
  }, [data, ready]);

  return createElement('iframe', {
    ref,
    srcDoc: FOG_MAP_HTML,
    title: 'Sisli harita',
    style: { position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 },
  });
}
