import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getRouteTrainTrips, TrainTripResponse } from '@/lib/availability';
import { SplitFinderService, SplitJourneyOption } from '@/lib/splitFinder';

export default function AvailabilityScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ origin?: string; destination?: string; date?: string }>();
  
  // Extract primitive values to prevent useEffect loops
  const origin = params.origin || 'Dhaka';
  const destination = params.destination || 'Rajshahi';
  const date = params.date || '06-Nov-2026';

  const [loading, setLoading] = useState(true);
  const [trainTrips, setTrainTrips] = useState<TrainTripResponse[]>([]);
  const [splitOptions, setSplitOptions] = useState<SplitJourneyOption[]>([]);
  const [activeTab, setActiveTab] = useState<'split' | 'direct'>('split');

  const fetchedRef = useRef<string>('');

  useEffect(() => {
    const queryKey = `${origin}-${destination}-${date}`;
    if (fetchedRef.current === queryKey) return;
    fetchedRef.current = queryKey;

    let isMounted = true;

    async function loadData() {
      setLoading(true);
      try {
        const splits = SplitFinderService.findSplitJourneys(origin, destination);
        if (isMounted) setSplitOptions(splits);

        const trips = await getRouteTrainTrips({ origin, destination, dateOfJourney: date });
        if (isMounted) {
          setTrainTrips(trips);
          if (trips.length > 0) setActiveTab('direct');
        }
      } catch (err) {
        console.warn('Data loading warning:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [origin, destination, date]);

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Route: {origin} $\rightarrow$ {destination}</Text>
      <Text style={styles.subtitle}>Journey Date: {date}</Text>

      {/* Auth Banner to jump to WebView */}
      <TouchableOpacity 
        style={styles.authBanner}
        onPress={() => router.push('/ticket-booking')}
      >
        <Text style={styles.authBannerText}>🔒 Log in via Official WebView Portal to enable live seat data</Text>
      </TouchableOpacity>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'split' && styles.activeTab]}
          onPress={() => setActiveTab('split')}
        >
          <Text style={[styles.tabText, activeTab === 'split' && styles.activeTabText]}>Split Options ({splitOptions.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'direct' && styles.activeTab]}
          onPress={() => setActiveTab('direct')}
        >
          <Text style={[styles.tabText, activeTab === 'direct' && styles.activeTabText]}>Direct Trains ({trainTrips.length})</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2d6a4f" style={styles.loader} />
      ) : activeTab === 'split' ? (
        <FlatList
          data={splitOptions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.trainName}>{item.trains[0].trainName} ({item.trains[0].trainNumber})</Text>
              <Text style={styles.splitText}>Break journey at: <Text style={styles.bold}>{item.intermediateStation}</Text></Text>
              
              <View style={styles.segmentBox}>
                <Text style={styles.segmentText}>Segment 1: {item.trains[0].origin} $\rightarrow$ {item.trains[0].destination}</Text>
                <Text style={styles.segmentText}>Segment 2: {item.trains[1].origin} $\rightarrow$ {item.trains[1].destination}</Text>
              </View>

              <TouchableOpacity
                style={styles.bookButton}
                onPress={() => router.push('/ticket-booking')}
              >
                <Text style={styles.bookButtonText}>Book via Official Portal WebView</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No split journeys found for this route.</Text>
          }
        />
      ) : (
        <FlatList
          data={trainTrips}
          keyExtractor={(item, index) => `${item.tripNumber}-${index}`}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.trainName}>{item.trainName}</Text>
                <Text style={styles.tripNo}>{item.tripNumber}</Text>
              </View>
              <Text style={styles.timeText}>Departure: {item.departureTime} | Arrival: {item.arrivalTime}</Text>

              <View style={styles.seatContainer}>
                {item.seats.map((seat, idx) => (
                  <View key={idx} style={styles.seatBadge}>
                    <Text style={styles.seatClass}>{seat.className}</Text>
                    <Text style={[styles.seatCount, seat.availableSeats > 0 ? styles.greenText : styles.redText]}>
                      {seat.availableSeats} seats (৳{seat.fare})
                    </Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={styles.bookButton}
                onPress={() => router.push('/ticket-booking')}
              >
                <Text style={styles.bookButtonText}>Book via Official Portal WebView</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Live direct seats require login. Use Split Options or log in via WebView.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1b4332',
  },
  subtitle: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 8,
  },
  authBanner: {
    backgroundColor: '#fff3cd',
    padding: 10,
    borderRadius: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ffeeba',
    alignItems: 'center',
  },
  authBannerText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#856404',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#e9ecef',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#2d6a4f',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
  },
  activeTabText: {
    color: '#ffffff',
  },
  loader: {
    marginTop: 40,
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trainName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d6a4f',
  },
  tripNo: {
    fontSize: 13,
    color: '#6c757d',
    fontWeight: '600',
  },
  timeText: {
    fontSize: 13,
    color: '#495057',
    marginTop: 4,
    marginBottom: 8,
  },
  seatContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 8,
  },
  seatBadge: {
    backgroundColor: '#f1f3f5',
    padding: 8,
    borderRadius: 6,
    minWidth: '47%',
  },
  seatClass: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#343a40',
  },
  seatCount: {
    fontSize: 13,
    marginTop: 2,
  },
  greenText: {
    color: '#2b9348',
    fontWeight: 'bold',
  },
  redText: {
    color: '#d90429',
  },
  splitText: {
    fontSize: 14,
    color: '#495057',
    marginTop: 4,
  },
  bold: {
    fontWeight: 'bold',
  },
  segmentBox: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#52b788',
  },
  segmentText: {
    fontSize: 13,
    color: '#343a40',
  },
  bookButton: {
    backgroundColor: '#1b4332',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 12,
  },
  bookButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6c757d',
    marginTop: 30,
    fontSize: 14,
  },
});