import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { colors } from "../theme";

const TICKETING_URL = "https://eticket.railway.gov.bd/";

export function RailwayTicketWebView() {
  const [attempt, setAttempt] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const retry = () => {
    setHasError(false);
    setIsLoading(true);
    setAttempt((current) => current + 1);
  };

  if (hasError) {
    return (
      <View style={styles.message}>
        <Text style={styles.title}>Unable to load ticket booking</Text>
        <Text style={styles.description}>
          Check your internet connection and try opening the official railway website again.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={retry}
          style={styles.retryButton}
        >
          <Text style={styles.retryButtonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isLoading && (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Loading Bangladesh Railway e-ticketing…</Text>
        </View>
      )}
      <WebView
        key={attempt}
        source={{ uri: TICKETING_URL }}
        javaScriptEnabled
        domStorageEnabled
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        style={styles.webView}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webView: { flex: 1 },
  loading: {
    alignItems: "center",
    backgroundColor: colors.background,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    padding: 12,
  },
  loadingText: { color: colors.muted, fontSize: 13 },
  message: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: "700", textAlign: "center" },
  description: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 8, textAlign: "center" },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    marginTop: 18,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  retryButtonText: { color: colors.surface, fontSize: 14, fontWeight: "700" },
});
