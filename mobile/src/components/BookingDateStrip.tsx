import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DateUtils } from '@/lib/dateUtils';

interface BookingDateStripProps {
  value: string;
  onChange: (apiDate: string) => void;
}

export function BookingDateStrip({ value, onChange }: BookingDateStripProps) {
  const days = useMemo(() => DateUtils.bookingWindow(10), []);
  const todayKey = DateUtils.formatApiDate(days[0]);
  const tomorrowKey = DateUtils.formatApiDate(days[1]);

  return (
    <View>
      <Text style={styles.caption}>Journey date · next 10 days, including today</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {days.map((date) => {
          const api = DateUtils.formatApiDate(date);
          const selected = api === value;
          let caption = DateUtils.weekdayShort(date);
          if (api === todayKey) caption = 'Today';
          else if (api === tomorrowKey) caption = 'Tomorrow';
          return (
            <Pressable
              key={api}
              onPress={() => onChange(api)}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.captionText, selected && styles.selectedText]}>{caption}</Text>
              <Text style={[styles.dayText, selected && styles.selectedText]}>{date.getDate()}</Text>
              <Text style={[styles.monthText, selected && styles.selectedText]}>
                {date.toLocaleDateString('en-GB', { month: 'short' })}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  caption: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1b4332',
    marginBottom: 8,
  },
  row: {
    gap: 8,
    paddingRight: 8,
  },
  chip: {
    width: 76,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#b7e4c7',
    backgroundColor: '#f8fbf9',
    alignItems: 'center',
    paddingVertical: 10,
  },
  chipSelected: {
    backgroundColor: '#1b4332',
    borderColor: '#1b4332',
  },
  captionText: {
    fontSize: 11,
    color: '#52796f',
    fontWeight: '600',
  },
  dayText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1b4332',
    marginTop: 2,
  },
  monthText: {
    fontSize: 12,
    color: '#52796f',
  },
  selectedText: {
    color: '#f4fff8',
  },
});
