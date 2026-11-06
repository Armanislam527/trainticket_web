import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import RailwayTicketWebView from '../components/RailwayTicketWebView';

export default function TicketBookingScreen() {
  const [isSessionReady, setIsSessionReady] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      const sessionCookies = await SecureStore.getItemAsync('railway_session_cookies');
      if (sessionCookies) {
        setIsSessionReady(true);
      } else {
        setIsSessionReady(false);
      }
    } catch (error) {
      console.error('Failed to check session storage:', error);
      setIsSessionReady(false);
    }
  };

  const handleSessionCaptured = () => {
    setIsSessionReady(true);
  };

  const handleResetSession = async () => {
    try {
      await SecureStore.deleteItemAsync('railway_session_cookies');
      await SecureStore.deleteItemAsync('railway_auth_token');
      setIsSessionReady(false);
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  };

  if (isSessionReady === null) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1b4d3e" />
        <Text style={styles.loadingText}>Checking railway session...</Text>
      </View>
    );
  }

  // If session is active, show the dashboard/actions or navigate directly to availability
  if (isSessionReady) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Session Active ✅</Text>
          <Text style={styles.subtitle}>
            Your railway login session is successfully captured and active. You can now check seat availability and book tickets.
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/availability')}
          >
            <Text style={styles.buttonText}>Check Seat Availability</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleResetSession}
          >
            <Text style={styles.secondaryButtonText}>Re-login / Clear Session</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // If no session exists, render the WebView login portal
  return (
    <View style={styles.container}>
      <View style={styles.banner}>
        <Text style={styles.bannerText}>Please log in to your Railway Account below</Text>
      </View>
      <RailwayTicketWebView onSessionCaptured={handleSessionCaptured} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7f8',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#555555',
  },
  banner: {
    padding: 12,
    backgroundColor: '#1b4d3e',
    alignItems: 'center',
  },
  bannerText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  card: {
    margin: 24,
    padding: 24,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1b4d3e',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#1b4d3e',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    width: '100%',
    backgroundColor: 'transparent',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d9534f',
  },
  secondaryButtonText: {
    color: '#d9534f',
    fontSize: 14,
    fontWeight: '600',
  },
});