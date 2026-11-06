import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.headerTitle}>Railway Ticketing & Availability</Text>
        <Text style={styles.headerSubtitle}>
          Securely manage your railway sessions, check live seat availability, and plan your journeys seamlessly.
        </Text>
      </View>

      <View style={styles.menuContainer}>
        <TouchableOpacity
          style={styles.menuCard}
          onPress={() => router.push('/ticket-booking')}
        >
          <Text style={styles.menuIcon}>🔐</Text>
          <Text style={styles.menuTitle}>Railway Session Login</Text>
          <Text style={styles.menuDescription}>
            Authenticate via WebView and capture secure session cookies.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuCard}
          onPress={() => router.push('/availability')}
        >
          <Text style={styles.menuIcon}>💺</Text>
          <Text style={styles.menuTitle}>Check Availability</Text>
          <Text style={styles.menuDescription}>
            Search route seat availability, fares, and class status in real-time.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuCard}
          onPress={() => router.push('/train/701')}
        >
          <Text style={styles.menuIcon}>🚆</Text>
          <Text style={styles.menuTitle}>Sample Train View (#701)</Text>
          <Text style={styles.menuDescription}>
            View detailed schedules and coach accommodations for specific trains.
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f7f8',
    flexGrow: 1,
    justifyContent: 'center',
  },
  headerCard: {
    backgroundColor: '#1b4d3e',
    borderRadius: 14,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#e0f2f1',
    textAlign: 'center',
    lineHeight: 20,
  },
  menuContainer: {
    gap: 12,
  },
  menuCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#1b4d3e',
  },
  menuIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  menuTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1b4d3e',
    marginBottom: 4,
  },
  menuDescription: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
  },
});