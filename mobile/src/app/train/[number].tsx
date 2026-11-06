import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { TrainScheduleTimeline } from '@/components/TrainScheduleTimeline';
import { TrainDataService } from '@/lib/train-data';

export default function TrainDetailScreen() {
  const { number } = useLocalSearchParams<{ number: string }>();
  const train = TrainDataService.getTrain(String(number || ''));
  const stops = train?.schedule?.routes || [];

  if (!train) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.title}>Train not in the timetable</Text>
        <Text style={styles.meta}>Number {number} is not in the saved route list.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.kicker}>Train {train.train_number}</Text>
      <Text style={styles.title}>{train.train_name}</Text>
      <Text style={styles.meta}>
        {TrainDataService.formatStationDisplay(train.origin_city)} →{' '}
        {TrainDataService.formatStationDisplay(train.destination_city)}
      </Text>
      <Text style={styles.meta}>
        {train.departure_time ? `Departs ${train.departure_time}` : 'Departure not listed'}
        {train.arrival_time ? ` · arrives ${train.arrival_time}` : ''}
      </Text>
      <Text style={styles.meta}>
        {train.days.length ? `Runs ${train.days.join(', ')}` : 'Running days were not saved'}
        {train.schedule?.total_duration ? ` · ${train.schedule.total_duration}` : ''}
      </Text>

      <View style={styles.card}>
        {stops.length ? (
          <TrainScheduleTimeline stops={stops} />
        ) : (
          <Text style={styles.meta}>No intermediate stops were saved for this train.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f3f7f4',
    paddingBottom: 32,
  },
  emptyWrap: {
    flex: 1,
    padding: 24,
    backgroundColor: '#f3f7f4',
    justifyContent: 'center',
  },
  kicker: {
    color: '#52796f',
    fontWeight: '700',
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1b4332',
  },
  meta: {
    marginTop: 6,
    color: '#52796f',
    lineHeight: 20,
  },
  card: {
    marginTop: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#d8f3dc',
  },
});
