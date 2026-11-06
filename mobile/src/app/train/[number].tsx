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
import { getRouteTrainTrips, TrainTripResponse, formatFare } from '../../lib/availability';
import { findSplitRoutes, SplitRouteResult, StationPairCount } from '../../lib/splitFinder';

export default function TrainDetailScreen() {
  const { number } = useLocalSearchParams<{ number: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [trainTrip, setTrainTrip] = useState<TrainTripResponse | null>(null);
  const [splitLoading, setSplitLoading] = useState(false);
  const [splitResults, setSplitResults] = useState<SplitRouteResult[] | null>(null);

  // Default query parameters; can be extended or parameterized
  const origin = 'DHAKA';
  const destination = 'CHITTAGONG';
  const dateOfJourney = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (number) {
      loadTrainDetails();
    }
  }, [number]);

  const loadTrainDetails = async () => {
    setLoading(true);
    try {
      const trips = await getRouteTrainTrips({
        origin,
        destination,
        dateOfJourney,
      });
      const matched = trips.find((t) => t.tripNumber.includes(number) || t.tripNumber === number) || trips[0];
      setTrainTrip(matched || null);
    } catch (error: any) {
      if (error.message === 'SESSION_EXPIRED') {
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please log in again via the portal.',
          [{ text: 'OK', onPress: () => router.push('/ticket-booking') }]
        );
      } else {
        Alert.alert('Error', error?.message || 'Failed to load train details.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRunSplitFinder = async () => {
    setSplitLoading(true);
    try {
      // Demonstration stations array along route for split calculation
      const dummyStations = [origin, 'BHAIRAB', 'AKHAURA', 'BRAMANBARIA', 'CUMILLA', 'FANI', destination];
      const mockCounts: Record<string, StationPairCount> = {};
      
      // Populate mock pair counts from train trip data for demonstration
      dummyStations.forEach((st, idx) => {
        for (let j = idx + 1; j < dummyStations.length; j++) {
          mockCounts[`${idx},${j}`] = {
            online: idx === 0 && j === dummyStations.length - 1 ? (trainTrip?.seats[0]?.availableSeats || 0) : 5,
            offline: 2,
            fare: 500 * (j - idx),
            oseq: idx,
            dseq: j,
          };
        }
      });

      const results = findSplitRoutes(dummyStations, mockCounts, 0, dummyStations.length - 1, 2);
      setSplitResults(results);
    } catch (e) {
      Alert.alert('Error', 'Failed to compute split routes.');
    } finally {
      setSplitLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1b4d3e" />
        <Text style={styles.loadingText}>Loading train #{number}...</Text>
      </View>
    );
  }

  if (!trainTrip) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorTitle}>Train Not Found</Text>
        <Text style={styles.errorText}>Could not retrieve details for train #{number}.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadTrainDetails}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.trainTitle}>{trainTrip.trainName}</Text>
        <Text style={styles.trainNumberBadge}>Trip: {trainTrip.tripNumber}</Text>
        
        <View style={styles.routeContainer}>
          <Text style={styles.routeText}>{origin} ➔ {destination}</Text>
          <Text style={styles.dateText}>Journey Date: {dateOfJourney}</Text>
        </View>

        <View style={styles.timeContainer}>
          <View>
            <Text style={styles.timeLabel}>Departure</Text>
            <Text style={styles.timeValue}>{trainTrip.departureTime || 'N/A'}</Text>
          </View>
          <View style={styles.timeDivider} />
          <View>
            <Text style={styles.timeLabel}>Arrival</Text>
            <Text style={styles.timeValue}>{trainTrip.arrivalTime || 'N/A'}</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.splitFinderButton} onPress={handleRunSplitFinder} disabled={splitLoading}>
        {splitLoading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.splitFinderText}>✨ Find Split-Ticket Combinations</Text>}
      </TouchableOpacity>

      {splitResults && (
        <View style={styles.splitCardContainer}>
          <Text style={styles.sectionHeader}>Optimal Split Routes Found:</Text>
          {splitResults.slice(0, 3).map((res, rIdx) => (
            <View key={rIdx} style={styles.splitRouteBox}>
              <Text style={styles.splitRouteTitle}>Option #{rIdx + 1} — {res.tickets} Ticket(s), {res.gaps} Gap(s)</Text>
              <Text style={styles.splitRouteFare}>Total Estimated Fare: {formatFare(res.fare)}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.sectionHeader}>Available Accommodation & Fares</Text>

      {trainTrip.seats.map((seat, index) => (
        <View key={index} style={styles.seatCard}>
          <View style={styles.seatInfo}>
            <Text style={styles.className}>{seat.className}</Text>
            <Text
              style={[
                styles.statusBadge,
                seat.status === 'SOLD_OUT' ? styles.soldOutBadge : styles.availableBadge,
              ]}
            >
              {seat.status} • Online: {seat.availableSeats} seats
            </Text>
          </View>
          <View style={styles.fareContainer}>
            <Text style={styles.fareValue}>{formatFare(seat.fare)}</Text>
            <TouchableOpacity
              style={[styles.bookButton, seat.status === 'SOLD_OUT' && styles.disabledButton]}
              disabled={seat.status === 'SOLD_OUT'}
              onPress={() => Alert.alert('Booking', `Proceeding with ${seat.className}`)}
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
  container: { padding: 16, backgroundColor: '#f5f7f8', flexGrow: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff', padding: 20 },
  loadingText: { marginTop: 12, fontSize: 15, color: '#555555' },
  errorTitle: { fontSize: 20, fontWeight: 'bold', color: '#c62828', marginBottom: 8 },
  errorText: { fontSize: 14, color: '#666666', textAlign: 'center', marginBottom: 20 },
  retryButton: { backgroundColor: '#1b4d3e', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryButtonText: { color: '#ffffff', fontWeight: '600' },
  headerCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 20, elevation: 2, marginBottom: 16 },
  trainTitle: { fontSize: 22, fontWeight: 'bold', color: '#1b4d3e' },
  trainNumberBadge: { fontSize: 13, color: '#555555', marginTop: 2, marginBottom: 12, fontWeight: '600' },
  routeContainer: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#eeeeee', paddingVertical: 10, marginBottom: 12 },
  routeText: { fontSize: 15, fontWeight: 'bold', color: '#222222' },
  dateText: { fontSize: 13, color: '#666666', marginTop: 2 },
  timeContainer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: '#f9fbfb', padding: 10, borderRadius: 8 },
  timeLabel: { fontSize: 12, color: '#777777' },
  timeValue: { fontSize: 15, fontWeight: 'bold', color: '#1b4d3e', marginTop: 2 },
  timeDivider: { width: 1, height: 24, backgroundColor: '#dddddd' },
  splitFinderButton: { backgroundColor: '#0288d1', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginBottom: 16 },
  splitFinderText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
  splitCardContainer: { backgroundColor: '#e1f5fe', padding: 14, borderRadius: 10, marginBottom: 16, borderWidth: 1, borderColor: '#b3e5fc' },
  splitRouteBox: { backgroundColor: '#ffffff', padding: 10, borderRadius: 6, marginBottom: 8 },
  splitRouteTitle: { fontSize: 14, fontWeight: 'bold', color: '#01579b' },
  splitRouteFare: { fontSize: 13, color: '#333333', marginTop: 2 },
  sectionHeader: { fontSize: 16, fontWeight: 'bold', color: '#333333', marginBottom: 12 },
  seatCard: { backgroundColor: '#ffffff', borderRadius: 10, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, elevation: 1 },
  seatInfo: { flex: 1, marginRight: 10 },
  className: { fontSize: 15, fontWeight: 'bold', color: '#222222' },
  statusBadge: { fontSize: 12, marginTop: 4, fontWeight: '500' },
  availableBadge: { color: '#2e7d32' },
  soldOutBadge: { color: '#c62828' },
  fareContainer: { alignItems: 'flex-end' },
  fareValue: { fontSize: 16, fontWeight: 'bold', color: '#1b4d3e', marginBottom: 6 },
  bookButton: { backgroundColor: '#1b4d3e', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 },
  disabledButton: { backgroundColor: '#cccccc' },
  bookButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '600' },
});