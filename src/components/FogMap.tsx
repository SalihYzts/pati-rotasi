import { useEffect, useRef, useState, type ComponentType, type Ref } from 'react';
import { StyleSheet } from 'react-native';
import { WebView, type WebViewMessageEvent, type WebViewProps } from 'react-native-webview';


import { FOG_MAP_HTML, type FogMapData } from './fogMapHtml';

// react-native-webview sınıf tipleri React 19.3 tipleriyle uyuşmuyor; prop tiplerini koruyarak sarıyoruz.
const WV = WebView as unknown as ComponentType<WebViewProps & { ref?: Ref<WebView> }>;

export interface FogMapProps {
  data: FogMapData;
  onCatPress: (id: string) => void;
}

export default function FogMap({ data, onCatPress }: FogMapProps) {
  const ref = useRef<WebView>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!ready) return;
    ref.current?.injectJavaScript(`window.patiUpdate(${JSON.stringify(data)}); true;`);
  }, [data, ready]);

  return (
    <WV
      ref={ref}
      style={StyleSheet.absoluteFill}
      originWhitelist={['*']}
      source={{ html: FOG_MAP_HTML, baseUrl: 'https://patirotasi.local/' }}
      javaScriptEnabled
      scrollEnabled={false}
      overScrollMode="never"
      onMessage={(e: WebViewMessageEvent) => {
        try {
          const msg = JSON.parse(e.nativeEvent.data);
          if (msg.type === 'ready') setReady(true);
          if (msg.type === 'cat') onCatPress(msg.id);
        } catch {}
      }}
    />
  );
}
