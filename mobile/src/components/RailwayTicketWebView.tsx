import React, { useRef } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import * as SecureStore from 'expo-secure-store';

interface RailwayTicketWebViewProps {
  onSessionCaptured: () => void;
  targetUrl?: string;
}

export default function RailwayTicketWebView({
  onSessionCaptured,
  targetUrl = 'https://eticket.railway.gov.bd/',
}: RailwayTicketWebViewProps) {
  const webViewRef = useRef<WebView>(null);

  // JavaScript to inject to check for authentic user sessions rather than blank guest cookies
  const injectedJavaScriptBeforeContentLoaded = `
    (function() {
      function captureAndSendSession() {
        const cookies = document.cookie;
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        const user = localStorage.getItem('user');

        // Only send session data if an actual user token exists or specific auth cookies are present
        // (Adjust 'user_session' or similar keyword based on what the railway portal uses upon login)
        const isLoggedIn = token || (cookies && cookies.includes('session')) || user;

        if (isLoggedIn) {
          const sessionData = {
            cookies: cookies,
            localStorage: {
              token: token,
              user: user
            }
          };
          window.ReactNativeWebView.postMessage(JSON.stringify(sessionData));
        }
      }
      
      window.addEventListener('load', captureAndSendSession);
      setInterval(captureAndSendSession, 3000);
    })();
    true;
  `;

  const handleMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      // Double check that we received meaningful credential data
      if (data && (data.cookies || (data.localStorage && data.localStorage.token))) {
        await SecureStore.setItemAsync('railway_session_cookies', data.cookies || '');
        if (data.localStorage && data.localStorage.token) {
          await SecureStore.setItemAsync('railway_auth_token', data.localStorage.token);
        }

        onSessionCaptured();
      }
    } catch (error) {
      console.error('Failed to parse WebView session message:', error);
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: targetUrl }}
        injectedJavaScriptBeforeContentLoaded={injectedJavaScriptBeforeContentLoaded}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#1b4d3e" />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  loader: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
});