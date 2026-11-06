import React, { useState, useMemo } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { TrainDataService } from '@/lib/train-data';
import { DateUtils } from '@/lib/dateUtils';
import { theme } from '@/theme';

export default function HomeScreen() {
  const router = useRouter();
  const [origin, setOrigin] = useState('Dhaka');
  const [destination, setDestination] = useState('Rajshahi');
  const [date, setDate] = useState(DateUtils.formatApiDate(new Date()));

  const [activeField, setActiveField] = useState<'origin' | 'destination' | null>(null);

  // Get available stations from JSON dataset
  const allStations = useMemo(() => TrainDataService.getAvailableStations(), []);

  const filteredOriginStations = useMemo(() => {
    if (!origin) return allStations.slice(0, 5);
    return allStations.filter(s => s.toLowerCase().includes(origin.toLowerCase())).slice(0, 5);
  }, [origin, allStations]);

  const filteredDestinationStations = useMemo(() => {
    if (!destination) return allStations.slice(0, 5);
    return allStations.filter(s => s.toLowerCase().includes(destination.toLowerCase())).slice(0, 5);
  }, [destination, allStations]);

  const handleSearch = () => {
    if (!origin || !destination) {
      Alert.alert('Error', 'Please enter both origin and destination stations.');
      return;
    }

    router.push({
      pathname: '/availability',
      params: { origin, destination, date },
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Bangladesh Railway Ticket & Split Finder</Text>
      
      <View style={styles.card}>
        {/* Origin Station */}
        <Text style={styles.label}>From Station</Text>
        <TextInput
          style={styles.input}
          value={origin}
          onChangeText={(text) => {
            setOrigin(text);
            setActiveField('origin');
          }}
          onFocus={() => setActiveField('origin')}
          placeholder="e.g. Dhaka"
        />
        {activeField === 'origin' && filteredOriginStations.length > 0 && (
          <View style={styles.autocompleteContainer}>
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
        )}

        {/* Destination Station */}
        <Text style={styles.label}>To Station</Text>
        <TextInput
          style={styles.input}
          value={destination}
          onChangeText={(text) => {
            setDestination(text);
            setActiveField('destination');
          }}
          onFocus={() => setActiveField('destination')}
          placeholder="e.g. Rajshahi"
        />
        {activeField === 'destination' && filteredDestinationStations.length > 0 && (
          <View style={styles.autocompleteContainer}>
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
        )}

        {/* Journey Date */}
        <Text style={styles.label}>Journey Date (DD-MMM-YYYY)</Text>
        <TextInput
          style={styles.input}
          value={date}
          onChangeText={setDate}
          placeholder="e.g. 06-Nov-2026"
        />

        <TouchableOpacity style={styles.button} onPress={handleSearch}>
          <Text style={styles.buttonText}>Search Available Tickets & Splits</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1b4332',
    textAlign: 'center',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  autocompleteContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    marginTop: 2,
    marginBottom: 8,
    maxHeight: 150,
  },
  suggestionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
  },
  suggestionText: {
    fontSize: 15,
    color: '#212529',
  },
  button: {
    backgroundColor: '#2d6a4f',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});