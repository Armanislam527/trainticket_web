import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SEAT_CLASSES, seatClassLabel } from '@/lib/seatClasses';

interface SeatClassPickerProps {
  value: string;
  onChange: (code: string) => void;
}

export function SeatClassPicker({ value, onChange }: SeatClassPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <View>
      <Text style={styles.label}>Seat type</Text>
      <Pressable style={styles.field} onPress={() => setOpen(true)}>
        <Text style={styles.value}>{seatClassLabel(value)}</Text>
        <Text style={styles.chevron}>▾</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <Text style={styles.sheetTitle}>Choose a seat type</Text>
            {SEAT_CLASSES.map((item) => {
              const selected = item.code === value;
              return (
                <Pressable
                  key={item.code}
                  style={[styles.option, selected && styles.optionSelected]}
                  onPress={() => {
                    onChange(item.code);
                    setOpen(false);
                  }}
                >
                  <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{item.label}</Text>
                  <Text style={[styles.optionCode, selected && styles.optionLabelSelected]}>{item.code}</Text>
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1b4332',
    marginBottom: 6,
  },
  field: {
    borderWidth: 1,
    borderColor: '#b7e4c7',
    borderRadius: 10,
    backgroundColor: '#f8fbf9',
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  value: {
    fontSize: 16,
    color: '#1b4332',
    fontWeight: '600',
  },
  chevron: {
    fontSize: 16,
    color: '#2d6a4f',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(13, 40, 24, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    paddingBottom: 28,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1b4332',
    marginBottom: 8,
  },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  optionSelected: {
    backgroundColor: '#d8f3dc',
  },
  optionLabel: {
    fontSize: 16,
    color: '#1b4332',
  },
  optionLabelSelected: {
    fontWeight: '700',
    color: '#1b4332',
  },
  optionCode: {
    fontSize: 12,
    color: '#52796f',
  },
});
