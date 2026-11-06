import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useRailwaySession } from '@/lib/railwaySession';

export default function TicketBookingScreen() {
  const session = useRailwaySession();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Official railway portal</Text>
      <Text style={styles.body}>
        {session.hasAuthorization
          ? 'The site session is saved. Seat searches on the other tabs reuse the same Authorization, device id, and device key the website sends.'
          : 'The portal loads over this tab. Sign in if the site asks, then search a trip once. That is when the site attaches the session headers the seat API requires.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1b4332',
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    color: '#495057',
    lineHeight: 20,
  },
});