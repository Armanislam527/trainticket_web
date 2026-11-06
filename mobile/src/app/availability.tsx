import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { TrainScheduleTimeline } from '@/components/TrainScheduleTimeline';
import { seatClassLabel } from '@/lib/seatClasses';
import { scanJourneyCombinations, SeatPair } from '@/lib/seatMatrix';
import { TrainDataService, TrainScheduleItem } from '@/lib/train-data';
import { useRailwaySession } from '@/lib/railwaySession';

export default function AvailabilityScreen() {
  const router = useRouter();
  const session = useRailwaySession();
  const params = useLocalSearchParams<{
    origin?: string;
    destination?: string;
    date?: string;
    seatClass?: string;
  }>();

  const origin = params.origin || 'Dhaka';
  const destination = params.destination || 'Rajshahi';
  const date = params.date || '';
  const seatClass = params.seatClass || 'S_CHAIR';

  const trains = useMemo(
    () =>
      TrainDataService.findTrainsBetweenStations(origin, destination).filter((train) =>
        TrainDataService.runsOnApiDate(train, date)
      ),
    [origin, destination, date]
  );

  const [selectedNumber, setSelectedNumber] = useState(trains[0]?.train_number || '');
  const selected = trains.find((train) => train.train_number === selectedNumber) || trains[0] || null;
  const stops = selected ? TrainDataService.journeyStops(selected, origin, destination) : [];

  const [pairs, setPairs] = useState<SeatPair[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0, label: '' });
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [showEmpty, setShowEmpty] = useState(false);

  const scanKey = `${selected?.train_number || ''}|${origin}|${destination}|${date}|${seatClass}|${session.hasAuthorization ? '1' : '0'}`;

  useEffect(() => {
    if (!selected || stops.length < 2) {
      setPairs([]);
      setRunning(false);
      return;
    }
    if (!session.hasAuthorization) {
      setPairs([]);
      setRunning(false);
      setError('Open the portal tab and run one search there so this screen can read live seat counts.');
      return;
    }

    let cancelled = false;
    setError('');
    setRunning(true);
    setPairs([]);
    scanJourneyCombinations({
      trainNumber: selected.train_number,
      stops,
      dateOfJourney: date,
      seatClass,
      isCancelled: () => cancelled,
      onUpdate: (next, nextProgress) => {
        if (cancelled) return;
        setPairs(next);
        setProgress(nextProgress);
      },
    })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Seat check failed';
        setError(
          message === 'SESSION_EXPIRED'
            ? 'The site session expired. Open the portal, search once, then come back.'
            : message
        );
      })
      .finally(() => {
        if (!cancelled) setRunning(false);
      });

    return () => {
      cancelled = true;
    };
    // stops is derived from selected train and the search params already in scanKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanKey]);

  const withSeats = pairs.filter((pair) => pair.state === 'ready' && (pair.online || 0) > 0);
  const direct = pairs.find((pair) => pair.fromIndex === 0 && pair.toIndex === stops.length - 1);
  const visiblePairs = showEmpty ? pairs.filter((pair) => pair.state !== 'pending') : withSeats;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.route}>
        {TrainDataService.formatStationDisplay(origin)} → {TrainDataService.formatStationDisplay(destination)}
      </Text>
      <Text style={styles.meta}>
        {date} · {seatClassLabel(seatClass)}
      </Text>
      <Text style={styles.explain}>
        Each count is a separate ticket the railway sells between two stops. A seat from an intermediate station to
        another still appears, even when your own trip is longer.
      </Text>

      {!session.hasAuthorization ? (
        <Pressable style={styles.banner} onPress={() => router.push('/ticket-booking')}>
          <Text style={styles.bannerText}>Open the portal and search once to load live seat counts.</Text>
        </Pressable>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {trains.length === 0 ? (
        <Text style={styles.empty}>No train in the timetable runs between these stations on this day.</Text>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trainRow}>
            {trains.map((train) => {
              const active = train.train_number === selected?.train_number;
              return (
                <Pressable
                  key={train.train_number}
                  style={[styles.trainChip, active && styles.trainChipOn]}
                  onPress={() => setSelectedNumber(train.train_number)}
                >
                  <Text style={[styles.trainChipTitle, active && styles.trainChipTitleOn]} numberOfLines={1}>
                    {shortName(train)}
                  </Text>
                  <Text style={[styles.trainChipMeta, active && styles.trainChipTitleOn]}>
                    {train.train_number} · {train.departure_time || 'time n/a'}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {selected ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{selected.train_name}</Text>
              <Text style={styles.cardMeta}>
                {selected.days.length ? selected.days.join(', ') : 'Running days not listed'}
                {selected.schedule?.total_duration ? ` · ${selected.schedule.total_duration}` : ''}
              </Text>

              <View style={styles.directBox}>
                <Text style={styles.directLabel}>Your full trip</Text>
                {direct?.state === 'ready' ? (
                  <Text style={styles.directValue}>
                    {(direct.online || 0) > 0 ? `${direct.online} seats` : 'Sold out'}
                    {direct.fare != null ? ` · ৳${direct.fare}` : ''}
                  </Text>
                ) : (
                  <Text style={styles.directValue}>{running ? 'Checking…' : '—'}</Text>
                )}
              </View>

              {progress.total > 0 ? (
                <View style={styles.progressBlock}>
                  <Text style={styles.progressText}>
                    {running
                      ? `Checking ${progress.label} (${progress.done}/${progress.total})`
                      : `Checked ${progress.done} of ${progress.total} combinations`}
                  </Text>
                  <View style={styles.track}>
                    <View
                      style={[
                        styles.trackFill,
                        { width: `${progress.total ? Math.round((progress.done / progress.total) * 100) : 0}%` },
                      ]}
                    />
                  </View>
                  {running ? <ActivityIndicator color="#1b4332" style={styles.spinner} /> : null}
                </View>
              ) : null}

              <Text style={styles.section}>Timetable for this journey</Text>
              <TrainScheduleTimeline stops={stops} highlightFrom={origin} highlightTo={destination} />

              <View style={styles.summaryRow}>
                <View style={[styles.summary, styles.summaryYes]}>
                  <Text style={styles.summaryNumber}>{withSeats.length}</Text>
                  <Text style={styles.summaryLabel}>pairs with seats</Text>
                </View>
                <View style={styles.summary}>
                  <Text style={styles.summaryNumber}>{pairs.filter((pair) => pair.state === 'ready' && pair.online === 0).length}</Text>
                  <Text style={styles.summaryLabel}>sold out</Text>
                </View>
              </View>

              <Pressable onPress={() => setShowEmpty((value) => !value)}>
                <Text style={styles.toggle}>{showEmpty ? 'Hide sold-out pairs' : 'Also show sold-out pairs'}</Text>
              </Pressable>

              <Text style={styles.section}>Combinations</Text>
              {!running && pairs.length > 0 && visiblePairs.length === 0 ? (
                <Text style={styles.empty}>No seats in this class on any station pair for this journey.</Text>
              ) : (
                <CombinationList pairs={visiblePairs} />
              )}
            </View>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

function CombinationList({ pairs }: { pairs: SeatPair[] }) {
  const groups = useMemo(() => {
    const map = new Map<string, SeatPair[]>();
    pairs.forEach((pair) => {
      const list = map.get(pair.from) || [];
      list.push(pair);
      map.set(pair.from, list);
    });
    return Array.from(map.entries());
  }, [pairs]);

  if (!pairs.length) {
    return <Text style={styles.empty}>Pairs with seats show up here as each check finishes.</Text>;
  }

  return (
    <View>
      {groups.map(([from, list]) => (
        <View key={from} style={styles.group}>
          <Text style={styles.groupTitle}>From {TrainDataService.formatStationDisplay(from)}</Text>
          {list.map((pair) => (
            <View key={`${pair.from}-${pair.to}`} style={styles.pairRow}>
              <View style={[styles.pairDot, pairColor(pair)]} />
              <Text style={styles.pairTo}>{TrainDataService.formatStationDisplay(pair.to)}</Text>
              <Text style={styles.pairCount}>{pairText(pair)}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function pairColor(pair: SeatPair) {
  if (pair.state === 'ready' && (pair.online || 0) > 0) return styles.dotYes;
  if (pair.state === 'ready') return styles.dotNo;
  if (pair.state === 'failed') return styles.dotFail;
  return styles.dotWait;
}

function pairText(pair: SeatPair): string {
  if (pair.state === 'pending') return '…';
  if (pair.state === 'failed') return 'failed';
  if (pair.state === 'absent') return 'not sold';
  if ((pair.online || 0) <= 0) return '0';
  return pair.fare != null ? `${pair.online} · ৳${pair.fare}` : String(pair.online);
}

function shortName(train: TrainScheduleItem): string {
  return train.train_name.replace(/\s*\(\d+\)\s*$/, '');
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f3f7f4',
    paddingBottom: 32,
  },
  route: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1b4332',
  },
  meta: {
    marginTop: 4,
    color: '#52796f',
    fontSize: 13,
  },
  explain: {
    marginTop: 8,
    color: '#343a40',
    fontSize: 13,
    lineHeight: 18,
  },
  banner: {
    marginTop: 12,
    backgroundColor: '#fff3cd',
    borderRadius: 10,
    padding: 12,
  },
  bannerText: {
    color: '#7c5e10',
    fontWeight: '600',
    fontSize: 13,
  },
  error: {
    marginTop: 10,
    color: '#9b2226',
    fontSize: 13,
  },
  empty: {
    marginTop: 12,
    color: '#52796f',
    fontSize: 14,
  },
  trainRow: {
    gap: 8,
    paddingVertical: 14,
  },
  trainChip: {
    width: 180,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d8f3dc',
  },
  trainChipOn: {
    backgroundColor: '#1b4332',
    borderColor: '#1b4332',
  },
  trainChipTitle: {
    fontWeight: '700',
    color: '#1b4332',
  },
  trainChipTitleOn: {
    color: '#f4fff8',
  },
  trainChipMeta: {
    marginTop: 4,
    fontSize: 12,
    color: '#52796f',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#d8f3dc',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1b4332',
  },
  cardMeta: {
    color: '#52796f',
    marginTop: 4,
    marginBottom: 10,
  },
  directBox: {
    backgroundColor: '#e8f6ee',
    borderRadius: 12,
    padding: 12,
  },
  directLabel: {
    color: '#52796f',
    fontSize: 12,
    fontWeight: '600',
  },
  directValue: {
    marginTop: 4,
    fontSize: 22,
    fontWeight: '700',
    color: '#1b4332',
  },
  progressBlock: {
    marginTop: 12,
  },
  progressText: {
    fontSize: 12,
    color: '#1b4332',
    marginBottom: 6,
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e9ecef',
    overflow: 'hidden',
  },
  trackFill: {
    height: 8,
    backgroundColor: '#2d6a4f',
  },
  spinner: {
    marginTop: 8,
  },
  section: {
    marginTop: 16,
    marginBottom: 8,
    fontWeight: '700',
    color: '#1b4332',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  summary: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
  },
  summaryYes: {
    backgroundColor: '#d8f3dc',
  },
  summaryNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1b4332',
  },
  summaryLabel: {
    color: '#52796f',
    fontSize: 12,
    marginTop: 2,
  },
  toggle: {
    marginTop: 10,
    color: '#1b4332',
    fontWeight: '700',
  },
  group: {
    marginBottom: 12,
  },
  groupTitle: {
    fontWeight: '700',
    color: '#1b4332',
    marginBottom: 6,
  },
  pairRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
  },
  pairDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  dotYes: { backgroundColor: '#2d6a4f' },
  dotNo: { backgroundColor: '#c1121f' },
  dotFail: { backgroundColor: '#adb5bd' },
  dotWait: { backgroundColor: '#dee2e6' },
  pairTo: {
    flex: 1,
    color: '#212529',
    fontSize: 15,
  },
  pairCount: {
    fontWeight: '700',
    color: '#1b4332',
  },
});
