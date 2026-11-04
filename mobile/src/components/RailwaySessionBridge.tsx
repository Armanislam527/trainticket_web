import React, { useRef } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

export interface RailwaySession {
  authorization: string;
  deviceId: string;
  deviceKey: string;
}

interface BridgeProps {
  onSessionCaptured: (session: RailwaySession) => void;
  onLoginStateChange?: (url: string) => void;
}

export const RailwaySessionBridge: React.FC<BridgeProps> = ({ 
  onSessionCaptured,
  onLoginStateChange 
}) => {
  const webViewRef = useRef<WebView>(null);

  // This script mirrors the exact XHR proxy interception used in the Chrome extension
  const injectionScript = `
    (function() {
      const KEEP = ["authorization", "x-device-id", "x-device-key"];
      const sessionData = { authorization: '', deviceId: '', deviceKey: '' };
      
      const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
      
      XMLHttpRequest.prototype.setRequestHeader = function(key, value) {
        try {
          const lowerKey = String(key).toLowerCase();
          if (KEEP.includes(lowerKey)) {
            if (lowerKey === 'authorization') sessionData.authorization = value;
            if (lowerKey === 'x-device-id') sessionData.deviceId = value;
            if (lowerKey === 'x-device-key') sessionData.deviceKey = value;
            
            // Dispatch to the native App environment as soon as tokens emerge
            if (sessionData.authorization && sessionData.deviceId) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'SESSION_INTERCEPTED',
                data: sessionData
              }));
            }
          }
        } catch (e) {
          // Silent catch to match the extension context
        }
        return originalSetRequestHeader.apply(this, arguments);
      };
      true;
    })();
  `;

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.type === 'SESSION_INTERCEPTED' && message.data.authorization) {
        onSessionCaptured({
          authorization: message.data.authorization,
          deviceId: message.data.deviceId || '',
          deviceKey: message.data.deviceKey || '',
        });
      }
    } catch (err) {
      console.error('Failed parsing event transmission data:', err);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.banner}>
        <Text style={styles.bannerText}>🔒 Log in via the official portal to secure your session</Text>
      </View>
      <WebView
        ref={webViewRef}
        source={{ uri: 'https://eticket.railway.gov.bd/' }}
        injectedJavaScriptBeforeContentLoaded={injectionScript}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        onNavigationStateChange={(navState) => {
          if (onLoginStateChange) onLoginStateChange(navState.url);
        }}
        startInLoadingState={true}
        renderLoading={() => (
          <ActivityIndicator size="large" color="#0a6" style={styles.loader} />
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  banner: { backgroundColor: '#f2f7ff', padding: 12, borderBottomWidth: 1, borderColor: '#cde' },
  bannerText: { color: '#06c', fontSize: 13, textAlign: 'center', fontWeight: '500' },
  loader: { position: 'absolute', top: '45%', left: '45%' }
});
