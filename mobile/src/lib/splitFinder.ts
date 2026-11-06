import { TrainDataService, TrainScheduleItem } from './train-data';

export interface SplitSegment {
  trainNumber: string;
  trainName: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
}

export interface SplitJourneyOption {
  id: string;
  trains: SplitSegment[];
  intermediateStation: string;
  totalDurationMinutes?: number;
}

export class SplitFinderService {
  /**
   * Finds possible split-journey options between an origin and destination for a given date.
   * Evaluates intermediate stops along direct train routes.
   */
  public static findSplitJourneys(origin: string, destination: string): SplitJourneyOption[] {
    const normalizedOrigin = TrainDataService.sanitizeStationName(origin);
    const normalizedDest = TrainDataService.sanitizeStationName(destination);

    // Find all trains that serve the origin
    const originTrains = TrainDataService.findTrainsBetweenStations(normalizedOrigin, normalizedDest);
    const splitOptions: SplitJourneyOption[] = [];

    originTrains.forEach((train) => {
      const routes = train.schedule?.routes || [];
      const originIndex = routes.findIndex(
        (r) => TrainDataService.sanitizeStationName(r.city).toLowerCase() === normalizedOrigin.toLowerCase()
      );
      const destIndex = routes.findIndex(
        (r) => TrainDataService.sanitizeStationName(r.city).toLowerCase() === normalizedDest.toLowerCase()
      );

      if (originIndex !== -1 && destIndex !== -1 && originIndex < destIndex) {
        // Extract intermediate stations between origin and destination
        const intermediateStops = routes.slice(originIndex + 1, destIndex);

        intermediateStops.forEach((stop) => {
          const stopCity = stop.city;
          if (!stopCity) return;

          const segment1: SplitSegment = {
            trainNumber: train.train_number,
            trainName: train.train_name,
            origin: TrainDataService.formatStationDisplay(normalizedOrigin),
            destination: TrainDataService.formatStationDisplay(stopCity),
            departureTime: routes[originIndex].departure_time || train.departure_time,
            arrivalTime: stop.arrival_time || '',
          };

          const segment2: SplitSegment = {
            trainNumber: train.train_number,
            trainName: train.train_name,
            origin: TrainDataService.formatStationDisplay(stopCity),
            destination: TrainDataService.formatStationDisplay(normalizedDest),
            departureTime: stop.departure_time || '',
            arrivalTime: routes[destIndex].arrival_time || train.arrival_time,
          };

          splitOptions.push({
            id: `${train.train_number}-${normalizedOrigin}-${stopCity}-${normalizedDest}`,
            trains: [segment1, segment2],
            intermediateStation: TrainDataService.formatStationDisplay(stopCity),
          });
        });
      }
    });

    return splitOptions;
  }
}

export interface StationPairCount {
  online: number;
  offline: number;
  fare: number;
  oseq?: number;
  dseq?: number;
}

export interface SplitRouteSegment {
  type: 't' | 'g';
  a: number;
  b: number;
  c?: StationPairCount;
}

export interface SplitRouteResult {
  segs: SplitRouteSegment[];
  gaps: number;
  tickets: number;
  min: number;
  fare: number;
  extra: number;
}

/**
 * Seat-split search from splitTicketFinder/scanner.js.
 * Tickets may start before the passenger's station or end after it.
 * Optional no-ticket stretches are allowed up to maxGap stops.
 */
export function findSplitRoutes(
  stations: string[],
  counts: Record<string, StationPairCount | null | undefined>,
  fi: number,
  ti: number,
  maxGap: number
): SplitRouteResult[] {
  const last = stations.length - 1;
  const out: SplitRouteResult[] = [];
  let budget = 500000;

  function dfs(
    p: number,
    segs: SplitRouteSegment[],
    gaps: number
  ): void {
    if (budget-- <= 0 || out.length >= 20000) return;
    if (p >= ti) {
      if (segs.some((s) => s.type === 't')) {
        out.push({
          segs: segs.map((s) => ({ ...s })),
          gaps,
          tickets: 0,
          min: 0,
          fare: 0,
          extra: 0,
        });
      }
      return;
    }
    const first = segs.length === 0;
    for (let q = last; q > p; q--) {
      const lo = first ? 0 : p;
      const hi = p;
      for (let s = lo; s <= hi; s++) {
        const c = counts[`${s},${q}`];
        if (c && c.online >= 1) {
          segs.push({ type: 't', a: s, b: q, c });
          dfs(q, segs, gaps);
          segs.pop();
        }
      }
    }
    if (gaps < maxGap && p < last) {
      const prev = segs[segs.length - 1];
      if (prev && prev.type === 'g') {
        const oldB = prev.b;
        prev.b = p + 1;
        dfs(p + 1, segs, gaps + 1);
        prev.b = oldB;
      } else {
        segs.push({ type: 'g', a: p, b: p + 1 });
        dfs(p + 1, segs, gaps + 1);
        segs.pop();
      }
    }
  }

  dfs(fi, [], 0);

  out.forEach((route) => {
    const tickets = route.segs.filter((s) => s.type === 't' && s.c);
    route.tickets = tickets.length;
    route.min = tickets.length ? Math.min(...tickets.map((s) => s.c?.online || 0)) : 0;
    route.fare = tickets.reduce((sum, s) => sum + (Number(s.c?.fare) || 0), 0);
    route.extra = tickets.reduce(
      (sum, s) => sum + Math.max(0, fi - s.a) + Math.max(0, s.b - ti),
      0
    );
  });

  out.sort(
    (a, b) => a.gaps - b.gaps || a.tickets - b.tickets || a.extra - b.extra || b.min - a.min || a.fare - b.fare
  );
  return out;
}