import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { railwaySession } from '@/lib/railwaySession';
import { SESSION_HOOK_JS } from '@/lib/sessionInject';

interface RailwaySessionBridgeProps {
  url?: string;
  onSessionCaptured?: (credentials: { authToken: string; deviceId: string; deviceKey: string }) => void;
}

export const RailwaySessionBridge: React.FC<RailwaySessionBridgeProps> = ({
  url = 'https://eticket.railway.gov.bd/',
  onSessionCaptured,
}) => {
  const webRef = useRef<WebView>(null);

  useEffect(() => {
    const bridge = {
      inject: (js: string) => {
        webRef.current?.injectJavaScript(js);
      },
    };
    railwaySession.attach(bridge);
    return () => railwaySession.detach(bridge);
  }, []);

  const handleMessage = (event: WebViewMessageEvent) => {
    let data: {
      type?: string;
      id?: string;
      status?: number;
      text?: string;
      error?: string;
      authorization?: string;
      authToken?: string;
      deviceId?: string;
      deviceKey?: string;
    };
    try {
      data = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (!data || typeof data.type !== 'string') return;

    if (data.type === 'TSF_READY') {
      railwaySession.markReady();
      return;
    }

    if (data.type === 'TSF_XHR') {
      if (!data.id) return;
      if (data.error) {
        railwaySession.failGet(data.id, data.error);
        return;
      }
      railwaySession.completeGet(data.id, {
        status: Number(data.status) || 0,
        text: typeof data.text === 'string' ? data.text : '',
      });
      return;
    }

    if (data.type === 'RAILWAY_SESSION') {
      const authorization = data.authorization || data.authToken || '';
      railwaySession.applyCaptured({
        authorization,
        deviceId: data.deviceId || '',
        deviceKey: data.deviceKey || '',
      });
      if (onSessionCaptured && authorization) {
        onSessionCaptured({
          authToken: authorization,
          deviceId: data.deviceId || '',
          deviceKey: data.deviceKey || '',
        });
      }
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webRef}
        source={{ uri: url }}
        injectedJavaScriptBeforeContentLoaded={SESSION_HOOK_JS}
        injectedJavaScript={SESSION_HOOK_JS}
        onMessage={handleMessage}
        onLoadEnd={() => railwaySession.markReady()}
        onContentProcessDidTerminate={() => webRef.current?.reload()}
        javaScriptEnabled
        domStorageEnabled
        thirdPartyCookiesEnabled
        sharedCookiesEnabled
        cacheEnabled
        setSupportMultipleWindows={false}
        originWhitelist={['https://*', 'http://*']}
        startInLoadingState
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
