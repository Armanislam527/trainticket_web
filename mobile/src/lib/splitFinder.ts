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