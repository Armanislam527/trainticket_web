export interface SeatClassOption {
  code: string;
  label: string;
}

/** Class codes the e-ticket search API accepts. */
export const SEAT_CLASSES: SeatClassOption[] = [
  { code: 'S_CHAIR', label: 'Shovon Chair' },
  { code: 'SHOVAN', label: 'Shovon' },
  { code: 'SNIGDHA', label: 'Snigdha' },
  { code: 'F_SEAT', label: 'First Seat' },
  { code: 'F_BERTH', label: 'First Berth' },
  { code: 'F_CHAIR', label: 'First Chair' },
  { code: 'AC_S', label: 'AC Seat' },
  { code: 'AC_B', label: 'AC Berth' },
  { code: 'AC_CHAIR', label: 'AC Chair' },
  { code: 'SHULOV', label: 'Shulov' },
];

export function seatClassLabel(code: string): string {
  return SEAT_CLASSES.find((item) => item.code === code)?.label || code;
}
