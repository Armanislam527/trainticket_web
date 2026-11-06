import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { RailwaySessionBridge } from '@/components/RailwaySessionBridge';
import { useLocalSearchParams } from 'expo-router';

export default function TicketBookingScreen() {
  const params = useLocalSearchParams<{ tripId?: string }>();

  return (
    <View style={styles.container}>
      <View style={styles.banner}>
        <Text style={styles.bannerText}>
          {params.tripId ? `Booking for Trip: ${params.tripId}` : 'Official Railway Portal'} — Log in & complete your booking below:
        </Text>
      </View>
      <RailwaySessionBridge
        onSessionCaptured={(cred) => {
          console.log('Session credentials successfully captured from WebView:', cred.authToken ? 'Token present' : 'No token');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  banner: {
    backgroundColor: '#d8f3dc',
    padding: 10,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#b7e4c7',
  },
  bannerText: {
    fontSize: 12,
    color: '#1b4332',
    fontWeight: '600',
  },
});