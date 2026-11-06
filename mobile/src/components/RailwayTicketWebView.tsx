import React from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

interface RailwayTicketWebViewProps {
  url?: string;
  onNavigationStateChange?: (navState: any) => void;
}

export const RailwayTicketWebView: React.FC<RailwayTicketWebViewProps> = ({
  url = 'https://eticket.railway.gov.bd',
  onNavigationStateChange,
}) => {
  return (
    <View style={styles.container}>
      <WebView
        source={{ uri }}
        onNavigationStateChange={onNavigationStateChange}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        sharedCookiesEnabled={true}
        startInLoadingState={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
});