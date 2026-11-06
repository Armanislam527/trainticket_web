import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getProcessedTrainAvailability, TrainAvailabilityResponse, formatFare } from '../../lib/availability';

export default function TrainDetailScreen() {
  const { number } = useLocalSearchParams<{ number: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [trainData, setTrainData] = useState<TrainAvailabilityResponse | null>(null);

  // Default query parameters for demonstration; can be extended to accept query search params
  const origin = 'DHAKA';
  const destination = 'CHITTAGONG';
  const dateOfJourney = new Date().toISOString().split('T')[0]; // Today's date YYYY-MM-DD

  useEffect(() => {
    if (number) {
      loadTrainDetails();
    }
  }, [number]);

  const loadTrainDetails = async () => {
    setLoading(true);
    try {
      const result = await getProcessedTrainAvailability({
        origin,
        destination,
        dateOfJourney,
        trainId: number,
      });
      setTrainData(result);
    } catch (error: any) {
      if (error.message === 'SESSION_EXPIRED') {
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please log in again via the booking portal.',
          [{ text: 'OK', onPress: () => router.push('/ticket-booking') }]
        );
      } else {
        Alert.alert('Error', 'Failed to load train details. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1b4d3e" />
        <Text style={styles.loadingText}>Loading train details for #{number}...</Text>
      </View>
    );
  }

  if (!trainData) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorTitle}>No Data Found</Text>
        <Text style={styles.errorText}>Could not retrieve info for train #{number}.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadTrainDetails}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.trainTitle}>{trainData.trainName}</Text>
        <Text style={styles.trainNumberBadge}>Train ID: {trainData.trainId}</Text>
        
        <View style={styles.routeContainer}>
          <Text style={styles.routeText}>{origin} ➔ {destination}</Text>
          <Text style={styles.dateText}>Journey Date: {trainData.dateOfJourney}</Text>
        </View>

        <View style={styles.timeContainer}>
          <View>
            <Text style={styles.timeLabel}>Departure</Text>
            <Text style={styles.timeValue}>{trainData.departureTime || 'N/A'}</Text>
          </View>
          <View style={styles.timeDivider} />
          <View>
            <Text style={styles.timeLabel}>Arrival</Text>
            <Text style={styles.timeValue}>{trainData.arrivalTime || 'N/A'}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionHeader}>Available Accommodation & Fares</Text>

      {trainData.seats.map((seat, index) => (
        <View key={index} style={styles.seatCard}>
          <View style={styles.seatInfo}>
            <Text style={styles.className}>{seat.className}</Text>
            <Text
              style={[
                styles.statusBadge,
                seat.status === 'SOLD_OUT' ? styles.soldOutBadge : styles.availableBadge,
              ]}
            >
              {seat.status} • {seat.availableSeats} seats available
            </Text>
          </View>
          <View style={styles.fareContainer}>
            <Text style={styles.fareValue}>{formatFare(seat.fare)}</Text>
            <TouchableOpacity
              style={[styles.bookButton, seat.status === 'SOLD_OUT' && styles.disabledButton]}
              disabled={seat.status === 'SOLD_OUT'}
              onPress={() => {
                Alert.alert('Booking Action', `Proceeding to select seats for ${seat.className}`);
              }}
            >
              <Text style={styles.bookButtonText}>
                {seat.status === 'SOLD_OUT' ? 'Sold Out' : 'Select'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f7f8',
    flexGrow: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#555555',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#c62828',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#1b4d3e',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  headerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    marginBottom: 20,
  },
  trainTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1b4d3e',
  },
  trainNumberBadge: {
    fontSize: 13,
    color: '#555555',
    marginTop: 2,
    marginBottom: 12,
    fontWeight: '600',
  },
  routeContainer: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eeeeee',
    paddingVertical: 10,
    marginBottom: 12,
  },
  routeText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#222222',
  },
  dateText: {
    fontSize: 13,
    color: '#666666',
    marginTop: 2,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#f9fbfb',
    padding: 10,
    borderRadius: 8,
  },
  timeLabel: {
    fontSize: 12,
    color: '#777777',
  },
  timeValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1b4d3e',
    marginTop: 2,
  },
  timeDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#dddddd',
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
  },
  seatCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  seatInfo: {
    flex: 1,
    marginRight: 10,
  },
  className: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#222222',
  },
  statusBadge: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  availableBadge: {
    color: '#2e7d32',
  },
  soldOutBadge: {
    color: '#c62828',
  },
  fareContainer: {
    alignItems: 'flex-end',
  },
  fareValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1b4d3e',
    marginBottom: 6,
  },
  bookButton: {
    backgroundColor: '#1b4d3e',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  bookButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
});