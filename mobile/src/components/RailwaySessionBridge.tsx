import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { railwayApi } from './railwayApi';

interface RailwaySessionBridgeProps {
  onSessionCaptured?: (credentials: { authToken: string; deviceId: string; deviceKey: string }) => void;
}

const INJECTED_JS = `
  (function() {
    const origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
      this.addEventListener('load', function() {
        try {
          const auth = this.getResponseHeader('authorization') || localStorage.getItem('authorization');
          // Dispatch session credentials back to React Native container
          if (auth) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'RAILWAY_SESSION',
              authToken: auth,
              deviceId: window.localStorage.getItem('x-device-id') || '',
              deviceKey: window.localStorage.getItem('x-device-key') || ''
            }));
          }
        } catch(e) {}
      });
      origOpen.apply(this, arguments);
    };
  })();
  true;
`;

export const RailwaySessionBridge: React.FC<RailwaySessionBridgeProps> = ({ onSessionCaptured }) => {
  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data && data.type === 'RAILWAY_SESSION') {
        const { authToken, deviceId, deviceKey } = data;
        railwayApi.setCredentials(authToken, deviceId, deviceKey);
        if (onSessionCaptured) {
          onSessionCaptured({ authToken, deviceId, deviceKey });
        }
      }
    } catch (e) {
      // Ignore parsing errors for non-json messages
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: 'https://eticket.railway.gov.bd' }}
        injectedJavaScript={INJECTED_JS}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        sharedCookiesEnabled={true}
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