import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getStopTimings } from '@/lib/journeyTimeline';
import { TrainDataService, TrainRouteNode } from '@/lib/train-data';

interface TrainScheduleTimelineProps {
  stops: TrainRouteNode[];
  highlightFrom?: string;
  highlightTo?: string;
}

export function TrainScheduleTimeline({ stops, highlightFrom, highlightTo }: TrainScheduleTimelineProps) {
  const fromIndex = highlightFrom ? stops.findIndex((stop) => TrainDataService.sameStation(stop.city, highlightFrom)) : -1;
  const toIndex = highlightTo ? stops.findIndex((stop) => TrainDataService.sameStation(stop.city, highlightTo)) : -1;
  const timings = getStopTimings(stops);

  return (
    <View>
      {stops.map((stop, index) => {
        const onJourney = fromIndex >= 0 && toIndex > fromIndex && index >= fromIndex && index <= toIndex;
        return (
          <View key={`${stop.city}-${index}`} style={styles.row}>
            <View style={styles.rail}>
              <View style={[styles.dot, onJourney && styles.dotOn]} />
              {index < stops.length - 1 ? <View style={[styles.line, onJourney && styles.lineOn]} /> : null}
            </View>
            <View style={styles.copy}>
              <View style={styles.stationLine}>
                <Text style={[styles.city, onJourney && styles.cityOn]}>
                  {TrainDataService.formatStationDisplay(stop.city)}
                </Text>
                {timings[index].crossesMidnight ? (
                  <Text style={styles.dayChange}>Next day</Text>
                ) : null}
              </View>
              <Text style={styles.time}>
                {stop.arrival_time ? `Arr ${stop.arrival_time}` : ''}
                {stop.arrival_time && stop.departure_time ? '  ·  ' : ''}
                {stop.departure_time ? `Dep ${stop.departure_time}` : ''}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    minHeight: 52,
  },
  rail: {
    width: 22,
    alignItems: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#95d5b2',
    marginTop: 4,
  },
  dotOn: {
    backgroundColor: '#1b4332',
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: '#d8f3dc',
  },
  lineOn: {
    backgroundColor: '#2d6a4f',
  },
  copy: {
    flex: 1,
    paddingBottom: 12,
  },
  stationLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  city: {
    fontSize: 15,
    fontWeight: '600',
    color: '#343a40',
  },
  cityOn: {
    color: '#1b4332',
  },
  time: {
    fontSize: 12,
    color: '#52796f',
    marginTop: 2,
  },
  dayChange: {
    color: '#7c5e10',
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 2,
    fontSize: 10,
    fontWeight: '700',
  },
});
