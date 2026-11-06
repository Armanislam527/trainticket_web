import trainSchedules from '@/data/train-schedules.json';

export interface TrainRouteNode {
  city: string;
  station_code?: string;
  arrival_time?: string;
  departure_time?: string;
}

export interface TrainScheduleItem {
  train_number: string;
  train_name: string;
  origin_city: string;
  destination_city: string;
  departure_time: string;
  arrival_time: string;
  off_day: string[];
  schedule?: {
    routes: TrainRouteNode[];
  };
}

export class TrainDataService {
  /**
   * Retrieves all unique station names from the train schedules dataset, sorted alphabetically.
   */
  public static getAvailableStations(): string[] {
    const stationsSet = new Set<string>();

    const schedules = (trainSchedules as { trains: TrainScheduleItem[] }).trains || [];

    schedules.forEach((train) => {
      if (train.origin_city) {
        stationsSet.add(this.formatStationDisplay(train.origin_city));
      }
      if (train.destination_city) {
        stationsSet.add(this.formatStationDisplay(train.destination_city));
      }
      train.schedule?.routes?.forEach((route) => {
        if (route.city) {
          stationsSet.add(this.formatStationDisplay(route.city));
        }
      });
    });

    return Array.from(stationsSet).sort((a, b) => a.localeCompare(b));
  }

  /**
   * Sanitizes a station name for backend query submission (e.g., "Dhaka" -> "Dhaka", "Biman Bandar" -> "Biman_Bandar").
   */
  public static sanitizeStationName(stationName: string): string {
    if (!stationName) return '';
    return stationName
      .trim()
      .replace(/\s+/g, '_');
  }

  /**
   * Formats a raw database/API station string for clean UI presentation (e.g., "Biman_Bandar" -> "Biman Bandar").
   */
  public static formatStationDisplay(stationName: string): string {
    if (!stationName) return '';
    return stationName
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  /**
   * Finds all trains operating between an origin and destination city.
   */
  public static findTrainsBetweenStations(origin: string, destination: string): TrainScheduleItem[] {
    const schedules = (trainSchedules as { trains: TrainScheduleItem[] }).trains || [];
    const normalizedOrigin = this.sanitizeStationName(origin).toLowerCase();
    const normalizedDestination = this.sanitizeStationName(destination).toLowerCase();

    return schedules.filter((train) => {
      const trainOrigin = this.sanitizeStationName(train.origin_city).toLowerCase();
      const trainDest = this.sanitizeStationName(train.destination_city).toLowerCase();

      // Direct route check
      if (trainOrigin === normalizedOrigin && trainDest === normalizedDestination) {
        return true;
      }

      // Route stops check
      const routes = train.schedule?.routes || [];
      const originIndex = routes.findIndex((r) => this.sanitizeStationName(r.city).toLowerCase() === normalizedOrigin);
      const destIndex = routes.findIndex((r) => this.sanitizeStationName(r.city).toLowerCase() === normalizedDestination);

      return originIndex !== -1 && destIndex !== -1 && originIndex < destIndex;
    });
  }
}