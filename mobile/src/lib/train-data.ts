import trainSchedules from '@/data/train-schedules.json';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

interface RawRoute {
  city?: string;
  arrival_time?: string | null;
  departure_time?: string | null;
  halt?: string | null;
  duration?: string | null;
}

interface RawTrain {
  train_number?: string;
  origin_city?: string;
  destination_city?: string;
  zone?: string;
  schedule?: {
    days?: string[];
    routes?: RawRoute[];
    total_duration?: string;
    train_name?: string;
  };
}

export interface TrainRouteNode {
  city: string;
  station_code?: string;
  arrival_time?: string;
  departure_time?: string;
  halt?: string;
  duration?: string;
}

export interface TrainScheduleItem {
  train_number: string;
  train_name: string;
  origin_city: string;
  destination_city: string;
  departure_time: string;
  arrival_time: string;
  off_day: string[];
  days: string[];
  zone?: string;
  schedule?: {
    routes: TrainRouteNode[];
    total_duration?: string;
  };
}

function cleanTime(value: string | null | undefined): string {
  return String(value || '').trim();
}

function normalizeTrain(raw: RawTrain): TrainScheduleItem {
  const routes: TrainRouteNode[] = (raw.schedule?.routes || [])
    .filter((stop) => stop.city)
    .map((stop) => ({
      city: String(stop.city),
      arrival_time: cleanTime(stop.arrival_time),
      departure_time: cleanTime(stop.departure_time),
      halt: cleanTime(stop.halt),
      duration: cleanTime(stop.duration),
    }));
  const days = (raw.schedule?.days || []).map((day) => String(day));
  const running = new Set(days);
  const offDay = days.length ? WEEKDAYS.filter((day) => !running.has(day)) : [];
  const trainName = String(raw.schedule?.train_name || '').trim();
  return {
    train_number: String(raw.train_number || ''),
    train_name: trainName || `Train ${raw.train_number || ''}`,
    origin_city: String(raw.origin_city || routes[0]?.city || ''),
    destination_city: String(raw.destination_city || routes[routes.length - 1]?.city || ''),
    departure_time: routes[0]?.departure_time || '',
    arrival_time: routes[routes.length - 1]?.arrival_time || '',
    off_day: [...offDay],
    days,
    zone: raw.zone,
    schedule: {
      routes,
      total_duration: raw.schedule?.total_duration,
    },
  };
}

const ALL_TRAINS: TrainScheduleItem[] = ((trainSchedules as { trains?: RawTrain[] }).trains || []).map(normalizeTrain);

export class TrainDataService {
  public static getTrains(): TrainScheduleItem[] {
    return ALL_TRAINS;
  }

  public static getAvailableStations(): string[] {
    const stations = new Set<string>();
    ALL_TRAINS.forEach((train) => {
      if (train.origin_city) stations.add(this.formatStationDisplay(train.origin_city));
      if (train.destination_city) stations.add(this.formatStationDisplay(train.destination_city));
      train.schedule?.routes?.forEach((route) => {
        if (route.city) stations.add(this.formatStationDisplay(route.city));
      });
    });
    return Array.from(stations).sort((a, b) => a.localeCompare(b));
  }

  public static sanitizeStationName(stationName: string): string {
    if (!stationName) return '';
    return stationName.trim().replace(/\s+/g, '_');
  }

  public static formatStationDisplay(stationName: string): string {
    if (!stationName) return '';
    return stationName.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  }

  public static sameStation(a: string, b: string): boolean {
    return this.sanitizeStationName(a).toLowerCase() === this.sanitizeStationName(b).toLowerCase();
  }

  public static resolveStation(input: string): string | null {
    const query = input.trim().toLowerCase();
    if (!query) return null;
    const stations = this.getAvailableStations();
    const exact = stations.find((station) => station.toLowerCase() === query);
    if (exact) return exact;
    const compact = query.replace(/\s+/g, '');
    return (
      stations.find((station) => station.toLowerCase().replace(/\s+/g, '') === compact) || null
    );
  }

  public static stationIndex(train: TrainScheduleItem, station: string): number {
    const routes = train.schedule?.routes || [];
    return routes.findIndex((stop) => this.sameStation(stop.city, station));
  }

  public static findTrainsBetweenStations(origin: string, destination: string): TrainScheduleItem[] {
    return ALL_TRAINS.filter((train) => this.servesJourney(train, origin, destination));
  }

  public static servesJourney(train: TrainScheduleItem, origin: string, destination: string): boolean {
    if (this.sameStation(origin, destination)) return false;
    const routes = train.schedule?.routes || [];
    const originIndex = routes.findIndex((stop) => this.sameStation(stop.city, origin));
    const destIndex = routes.findIndex((stop) => this.sameStation(stop.city, destination));
    if (originIndex !== -1 && destIndex !== -1) return originIndex < destIndex;
    return this.sameStation(train.origin_city, origin) && this.sameStation(train.destination_city, destination);
  }

  /** Stops from the passenger's boarding station through the alighting station, in travel order. */
  public static journeyStops(train: TrainScheduleItem, origin: string, destination: string): TrainRouteNode[] {
    const routes = train.schedule?.routes || [];
    const originIndex = routes.findIndex((stop) => this.sameStation(stop.city, origin));
    const destIndex = routes.findIndex((stop) => this.sameStation(stop.city, destination));
    if (originIndex !== -1 && destIndex !== -1 && originIndex < destIndex) {
      return routes.slice(originIndex, destIndex + 1);
    }
    if (this.sameStation(train.origin_city, origin) && this.sameStation(train.destination_city, destination)) {
      return [
        { city: train.origin_city, departure_time: train.departure_time },
        { city: train.destination_city, arrival_time: train.arrival_time },
      ];
    }
    return [];
  }

  public static runsOnApiDate(train: TrainScheduleItem, apiDate: string): boolean {
    if (!train.days.length) return true;
    const parsed = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(apiDate.trim());
    if (!parsed) return true;
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const month = months.indexOf(parsed[2].toLowerCase());
    if (month < 0) return true;
    const date = new Date(Number(parsed[3]), month, Number(parsed[1]));
    if (Number.isNaN(date.getTime())) return true;
    return train.days.includes(WEEKDAYS[date.getDay()]);
  }

  public static searchTrains(query: string): TrainScheduleItem[] {
    const text = query.trim().toLowerCase();
    if (!text) return [];
    const numericQuery = /^\d+$/.test(text);
    const matches = ALL_TRAINS.filter((train) => {
      if (numericQuery) return String(parseInt(train.train_number, 10)) === String(parseInt(text, 10));
      return train.train_name.toLowerCase().includes(text) || train.train_number.toLowerCase() === text;
    });
    matches.sort((a, b) => rankMatch(a, text) - rankMatch(b, text));
    return matches;
  }

  public static getTrain(number: string): TrainScheduleItem | null {
    const wanted = String(parseInt(number, 10));
    return (
      ALL_TRAINS.find((train) => train.train_number === number) ||
      ALL_TRAINS.find((train) => String(parseInt(train.train_number, 10)) === wanted) ||
      null
    );
  }
}

function rankMatch(train: TrainScheduleItem, text: string): number {
  const number = train.train_number.toLowerCase();
  if (number === text || String(parseInt(number, 10)) === text) return 0;
  if (train.train_name.toLowerCase().startsWith(text)) return 1;
  return 2;
}
