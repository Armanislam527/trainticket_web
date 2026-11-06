import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { TrainScheduleTimeline } from '@/components/TrainScheduleTimeline';
import { TrainDataService, TrainScheduleItem } from '@/lib/train-data';

export default function TrainsScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [openNumber, setOpenNumber] = useState('');

  const results = useMemo(() => TrainDataService.searchTrains(query).slice(0, 30), [query]);

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Train timetable</Text>
      <Text style={styles.subtitle}>Type a train name or number. The schedule comes from the saved route list.</Text>
      <TextInput
        style={styles.input}
        value={query}
        onChangeText={(text) => {
          setQuery(text);
          setOpenNumber('');
        }}
        placeholder="e.g. 704 or Suborno"
        placeholderTextColor="#90a4ae"
        autoCorrect={false}
        autoCapitalize="none"
      />

      {!query.trim() ? (
        <Text style={styles.hint}>Search matches the train number and the name stored with its route.</Text>
      ) : results.length === 0 ? (
        <Text style={styles.hint}>No train in the timetable matches that name or number.</Text>
      ) : (
        results.map((train) => {
          const open = openNumber === train.train_number || (results.length === 1 && !openNumber);
          return (
            <View key={train.train_number} style={styles.card}>
              <Pressable onPress={() => setOpenNumber(open && results.length > 1 ? '' : train.train_number)}>
                <Text style={styles.name}>{train.train_name}</Text>
                <Text style={styles.meta}>
                  {TrainDataService.formatStationDisplay(train.origin_city)} →{' '}
                  {TrainDataService.formatStationDisplay(train.destination_city)}
                </Text>
                <Text style={styles.meta}>
                  {train.departure_time || 'Departure n/a'}
                  {train.arrival_time ? ` · arrives ${train.arrival_time}` : ''}
                  {train.days.length ? ` · ${train.days.join(', ')}` : ''}
                </Text>
              </Pressable>
              {open ? <ScheduleBody train={train} onOpen={() => router.push(`/train/${train.train_number}`)} /> : null}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

function ScheduleBody({ train, onOpen }: { train: TrainScheduleItem; onOpen: () => void }) {
  const stops = train.schedule?.routes || [];
  return (
    <View style={styles.schedule}>
      {stops.length ? (
        <TrainScheduleTimeline stops={stops} />
      ) : (
        <Text style={styles.meta}>This number has no stop list in the saved timetable.</Text>
      )}
      <Pressable onPress={onOpen}>
        <Text style={styles.link}>Open this train</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f3f7f4',
    paddingBottom: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1b4332',
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 12,
    color: '#52796f',
    lineHeight: 20,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#b7e4c7',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1b4332',
    marginBottom: 12,
  },
  hint: {
    color: '#52796f',
    marginTop: 8,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#d8f3dc',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1b4332',
  },
  meta: {
    marginTop: 4,
    color: '#52796f',
    fontSize: 13,
  },
  schedule: {
    marginTop: 12,
  },
  link: {
    marginTop: 4,
    color: '#1b4332',
    fontWeight: '700',
  },
});
