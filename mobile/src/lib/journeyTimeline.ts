import { TrainRouteNode } from '@/lib/train-data';

export interface StopTiming {
  dayOffset: number;
  elapsedMinutes: number | null;
  crossesMidnight: boolean;
}

function parseTime(value: string | undefined): number | null {
  if (!value) return null;
  const match = value.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 1 || hour > 12 || minute > 59) return null;

  let hour24 = hour % 12;
  if (match[3]?.toLowerCase() === 'pm') hour24 += 12;
  return hour24 * 60 + minute;
}

export function getStopTimings(stops: TrainRouteNode[]): StopTiming[] {
  let dayOffset = 0;
  let previousMinute: number | null = null;

  return stops.map((stop, index) => {
    const time = parseTime(
      index === 0
        ? stop.departure_time || stop.arrival_time
        : stop.arrival_time || stop.departure_time
    );
    const previousOffset = dayOffset;

    if (time !== null && previousMinute !== null && time < previousMinute) {
      dayOffset += 1;
    }
    if (time !== null) previousMinute = time;

    return {
      dayOffset,
      elapsedMinutes: time === null ? null : time + dayOffset * 24 * 60,
      crossesMidnight: dayOffset > previousOffset,
    };
  });
}

export function journeyDuration(
  timings: StopTiming[],
  fromIndex: number,
  toIndex: number
): number | null {
  const from = timings[fromIndex]?.elapsedMinutes;
  const to = timings[toIndex]?.elapsedMinutes;
  return from === null || from === undefined || to === null || to === undefined || to < from
    ? null
    : to - from;
}
