import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getProcessedTrainAvailability, TrainAvailabilityResponse, formatFare } from '../lib/availability';

export default function AvailabilityScreen() {
  const router = useRouter();

  const [origin, setOrigin] = useState('DHAKA');
  const [destination, setDestination] = useState('CHITTAGONG');
  const [dateOfJourney, setDateOfJourney] = useState('2026-06-01');
  const [trainId, setTrainId] = useState('701'); // e.g., Subarna Express

  const [loading, setLoading] = useState(false);
  const [availabilityData, setAvailabilityData] = useState<TrainAvailabilityResponse | null>(null);

  const handleCheckAvailability = async () => {
    if (!origin || !destination || !dateOfJourney || !trainId) {
      Alert.alert('Error', 'Please fill in all search fields.');
      return;
    }

    setLoading(true);
    setAvailabilityData(null);

    try {
      const result = await getProcessedTrainAvailability({
        origin: origin.toUpperCase(),
        destination: destination.toUpperCase(),
        dateOfJourney,
        trainId,
      });

      setAvailabilityData(result);
      if (!result) {
        Alert.alert('Notice', 'No availability data found for this train/route.');
      }
    } catch (error: any) {
      if (error.message === 'SESSION_EXPIRED') {
        Alert.alert(
          'Session Expired',
          'Your login session has expired. Please log in again.',
          [{ text: 'OK', onPress: () => router.push('/ticket-booking') }]
        );
      } else {
        Alert.alert('Error', 'Failed to fetch seat availability. Please check your network or inputs.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.headerTitle}>Check Seat Availability</Text>

      <View style={styles.formCard}>
        <Text style={styles.label}>Origin Station</Text>
        <TextInput
          style={styles.input}
          value={origin}
          onChangeText={setOrigin}
          placeholder="e.g. DHAKA"
        />

        <Text style={styles.label}>Destination Station</Text>
        <TextInput
          style={styles.input}
          value={destination}
          onChangeText={setDestination}
          placeholder="e.g. CHITTAGONG"
        />

        <Text style={styles.label}>Date of Journey (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={dateOfJourney}
          onChangeText={setDateOfJourney}
          placeholder="YYYY-MM-DD"
        />

        <Text style={styles.label}>Train ID / Number</Text>
        <TextInput
          style={styles.input}
          value={trainId}
          onChangeText={setTrainId}
          placeholder="e.g. 701"
        />

        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleCheckAvailability}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.searchButtonText}>Search Availability</Text>
          )}
        </TouchableOpacity>
      </View>

      {availabilityData && (
        <View style={styles.resultCard}>
          <Text style={styles.trainName}>{availabilityData.trainName} (Train: {availabilityData.trainId})</Text>
          <Text style={styles.trainTime}>
            Departure: {availabilityData.departureTime} | Arrival: {availabilityData.arrivalTime}
          </Text>
          <Text style={styles.dateText}>Date: {availabilityData.dateOfJourney}</Text>

          <View style={styles.divider} />

          <Text style={styles.sectionHeader}>Available Classes & Seats:</Text>
          {availabilityData.seats.map((seat, index) => (
            <View key={index} style={styles.seatRow}>
              <View>
                <Text style={styles.className}>{seat.className}</Text>
                <Text style={[styles.statusText, seat.status === 'SOLD_OUT' ? styles.soldOut : styles.available]}>
                  {seat.status} ({seat.availableSeats} seats left)
                </Text>
              </View>
              <Text style={styles.fareText}>{formatFare(seat.fare)}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f7f8',
    flexGrow: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1b4d3e',
    marginBottom: 16,
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#fafafa',
  },
  searchButton: {
    backgroundColor: '#1b4d3e',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  searchButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  trainName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1b4d3e',
  },
  trainTime: {
    fontSize: 13,
    color: '#666666',
    marginTop: 4,
  },
  dateText: {
    fontSize: 13,
    color: '#666666',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#eeeeee',
    marginVertical: 12,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 10,
  },
  seatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  className: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222222',
  },
  statusText: {
    fontSize: 12,
    marginTop: 2,
  },
  available: {
    color: '#2e7d32',
  },
  soldOut: {
    color: '#c62828',
  },
  fareText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1b4d3e',
  },
});