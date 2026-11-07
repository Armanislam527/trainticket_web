import { fetchSeatAvailability } from '@/components/railwayApi';
import { DateUtils } from '@/lib/dateUtils';
import { getStopTimings, journeyDuration } from '@/lib/journeyTimeline';
import { TrainDataService, TrainRouteNode } from '@/lib/train-data';

export interface SeatPair {
  from: string;
  to: string;
  fromIndex: number;
  toIndex: number;
  dateOfJourney: string;
  durationMinutes: number | null;
  online: number | null;
  offline: number;
  fare: number | null;
  state: 'pending' | 'ready' | 'absent' | 'failed';
}

export interface ScanProgress {
  done: number;
  total: number;
  label: string;
}

const pairCache = new Map<string, SeatPair>();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function tripMatchesNumber(tripNumber: string, trainNumber: string): boolean {
  const wanted = String(parseInt(trainNumber, 10));
  if (!wanted || wanted === 'NaN') return false;
  const match = String(tripNumber || '').match(/\((\d+)\)/);
  if (match) return String(parseInt(match[1], 10)) === wanted;
  const loose = String(tripNumber || '').match(/\d{2,4}/g) || [];
  return loose.some((digits) => String(parseInt(digits, 10)) === wanted);
}

function readPair(
  raw: any,
  trainNumber: string,
  seatClass: string,
  from: string,
  to: string,
  fromIndex: number,
  toIndex: number,
  dateOfJourney: string,
  durationMinutes: number | null
): SeatPair {
  const trains = raw?.data?.trains || [];
  const train = trains.find((item: any) => tripMatchesNumber(item.trip_number || item.train_number || '', trainNumber));
  if (!train) {
    return { from, to, fromIndex, toIndex, dateOfJourney, durationMinutes, online: null, offline: 0, fare: null, state: 'absent' };
  }
  const seat = (train.seat_types || []).find((item: any) => item.type === seatClass);
  if (!seat) {
    return { from, to, fromIndex, toIndex, dateOfJourney, durationMinutes, online: 0, offline: 0, fare: null, state: 'absent' };
  }
  return {
    from,
    to,
    fromIndex,
    toIndex,
    dateOfJourney,
    durationMinutes,
    online: Number(seat.seat_counts?.online ?? 0),
    offline: Number(seat.seat_counts?.offline ?? 0),
    fare: seat.fare == null ? null : Number(seat.fare),
    state: 'ready',
  };
}

/**
 * Asks the seat API for every from→to pair on the journey.
 * A Natore→Santahar seat is its own pair, so it is counted even when the passenger's trip is longer.
 */
export async function scanJourneyCombinations(options: {
  trainNumber: string;
  stops: TrainRouteNode[];
  dateOfJourney: string;
  seatClass: string;
  isCancelled: () => boolean;
  onUpdate: (pairs: SeatPair[], progress: ScanProgress) => void;
}): Promise<void> {
  const stops = options.stops;
  const timings = getStopTimings(stops);
  const jobs: Array<[number, number]> = [];
  for (let fromIndex = 0; fromIndex < stops.length - 1; fromIndex++) {
    for (let toIndex = fromIndex + 1; toIndex < stops.length; toIndex++) {
      jobs.push([fromIndex, toIndex]);
    }
  }

  const pairs: SeatPair[] = jobs.map(([fromIndex, toIndex]) => ({
    from: stops[fromIndex].city,
    to: stops[toIndex].city,
    fromIndex,
    toIndex,
    dateOfJourney: DateUtils.addDays(options.dateOfJourney, timings[fromIndex].dayOffset),
    durationMinutes: journeyDuration(timings, fromIndex, toIndex),
    online: null,
    offline: 0,
    fare: null,
    state: 'pending',
  }));

  options.onUpdate(pairs, { done: 0, total: jobs.length, label: 'Starting seat check' });

  for (let index = 0; index < jobs.length; index++) {
    if (options.isCancelled()) return;
    const [fromIndex, toIndex] = jobs[index];
    const from = stops[fromIndex].city;
    const to = stops[toIndex].city;
    const dateOfJourney = DateUtils.addDays(options.dateOfJourney, timings[fromIndex].dayOffset);
    const durationMinutes = journeyDuration(timings, fromIndex, toIndex);
    const cacheKey = `${options.trainNumber}|${options.seatClass}|${dateOfJourney}|${from}|${to}`;
    const label = `${TrainDataService.formatStationDisplay(from)} → ${TrainDataService.formatStationDisplay(to)}`;
    const cached = pairCache.get(cacheKey);
    let next = cached;
    if (!next) {
      try {
        const raw = await fetchSeatAvailability({
          origin: from,
          destination: to,
          dateOfJourney,
          seatClass: options.seatClass,
        });
        next = readPair(
          raw,
          options.trainNumber,
          options.seatClass,
          from,
          to,
          fromIndex,
          toIndex,
          dateOfJourney,
          durationMinutes
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        if (message === 'SESSION_EXPIRED') throw error;
        next = {
          from,
          to,
          fromIndex,
          toIndex,
          dateOfJourney,
          durationMinutes,
          online: null,
          offline: 0,
          fare: null,
          state: 'failed',
        };
      }
      pairCache.set(cacheKey, next);
      if (index < jobs.length - 1) await sleep(450);
    }
    if (options.isCancelled()) return;
    pairs[index] = next;
    options.onUpdate(
      pairs.slice(),
      { done: index + 1, total: jobs.length, label }
    );
  }
}
