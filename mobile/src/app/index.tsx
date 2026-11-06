import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BookingDateStrip } from '@/components/BookingDateStrip';
import { SeatClassPicker } from '@/components/SeatClassPicker';
import { DateUtils } from '@/lib/dateUtils';
import { TrainDataService } from '@/lib/train-data';

export default function HomeScreen() {
  const router = useRouter();
  const [origin, setOrigin] = useState('Dhaka');
  const [destination, setDestination] = useState('Rajshahi');
  const [date, setDate] = useState(DateUtils.formatApiDate(new Date()));
  const [seatClass, setSeatClass] = useState('S_CHAIR');
  const [activeField, setActiveField] = useState<'origin' | 'destination' | null>(null);

  const allStations = useMemo(() => TrainDataService.getAvailableStations(), []);

  const filteredOriginStations = useMemo(() => {
    if (!origin) return allStations.slice(0, 6);
    return allStations.filter((station) => station.toLowerCase().includes(origin.toLowerCase())).slice(0, 6);
  }, [origin, allStations]);

  const filteredDestinationStations = useMemo(() => {
    if (!destination) return allStations.slice(0, 6);
    return allStations.filter((station) => station.toLowerCase().includes(destination.toLowerCase())).slice(0, 6);
  }, [destination, allStations]);

  const handleSearch = () => {
    const from = TrainDataService.resolveStation(origin);
    const to = TrainDataService.resolveStation(destination);
    if (!from || !to) {
      Alert.alert('Choose stations', 'Pick the from and to stations from the suggestions.');
      return;
    }
    if (TrainDataService.sameStation(from, to)) {
      Alert.alert('Choose stations', 'From and to must be different stations.');
      return;
    }
    const trains = TrainDataService.findTrainsBetweenStations(from, to).filter((train) =>
      TrainDataService.runsOnApiDate(train, date)
    );
    if (!trains.length) {
      Alert.alert(
        'No scheduled train',
        'The timetable has no train from that station to the other on the selected day.'
      );
      return;
    }
    router.push({
      pathname: '/availability',
      params: { origin: from, destination: to, date, seatClass },
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>See every seat pair on the train</Text>
      <Text style={styles.subtitle}>
        Search by the stations on a train’s timetable. The result lists each from-to combination the railway sells.
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>From station</Text>
        <TextInput
          style={styles.input}
          value={origin}
          onChangeText={(text) => {
            setOrigin(text);
            setActiveField('origin');
          }}
          onFocus={() => setActiveField('origin')}
          placeholder="e.g. Dhaka"
          placeholderTextColor="#90a4ae"
        />
        {activeField === 'origin' && filteredOriginStations.length > 0 ? (
          <View style={styles.suggestions}>
            {filteredOriginStations.map((station) => (
              <TouchableOpacity
                key={station}
                style={styles.suggestionItem}
                onPress={() => {
                  setOrigin(station);
                  setActiveField(null);
                }}
              >
                <Text style={styles.suggestionText}>{station}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        <Text style={styles.label}>To station</Text>
        <TextInput
          style={styles.input}
          value={destination}
          onChangeText={(text) => {
            setDestination(text);
            setActiveField('destination');
          }}
          onFocus={() => setActiveField('destination')}
          placeholder="e.g. Dinajpur"
          placeholderTextColor="#90a4ae"
        />
        {activeField === 'destination' && filteredDestinationStations.length > 0 ? (
          <View style={styles.suggestions}>
            {filteredDestinationStations.map((station) => (
              <TouchableOpacity
                key={station}
                style={styles.suggestionItem}
                onPress={() => {
                  setDestination(station);
                  setActiveField(null);
                }}
              >
                <Text style={styles.suggestionText}>{station}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        <View style={styles.block}>
          <BookingDateStrip value={date} onChange={setDate} />
        </View>
        <View style={styles.block}>
          <SeatClassPicker value={seatClass} onChange={setSeatClass} />
        </View>

        <TouchableOpacity style={styles.button} onPress={handleSearch}>
          <Text style={styles.buttonText}>Show seat combinations</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: '#f3f7f4',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1b4332',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#52796f',
    marginBottom: 16,
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d8f3dc',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1b4332',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#b7e4c7',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f8fbf9',
    color: '#1b4332',
  },
  suggestions: {
    borderWidth: 1,
    borderColor: '#d8f3dc',
    borderRadius: 10,
    marginTop: 4,
    overflow: 'hidden',
  },
  suggestionItem: {
    padding: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
  },
  suggestionText: {
    fontSize: 15,
    color: '#1b4332',
  },
  block: {
    marginTop: 16,
  },
  button: {
    backgroundColor: '#1b4332',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#f4fff8',
    fontSize: 16,
    fontWeight: '700',
  },
});
