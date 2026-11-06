import { fetchSeatAvailability } from '../components/railwayApi';

export interface SeatClassAvailability {
  className: string;
  classCode: string;
  availableSeats: number;
  offlineSeats: number;
  fare: number;
  status: 'AVAILABLE' | 'SOLD_OUT' | 'RESERVED';
}

export interface TrainTripResponse {
  tripNumber: string;
  trainName: string;
  departureTime: string;
  arrivalTime: string;
  originCitySeq: number;
  destinationCitySeq: number;
  seats: SeatClassAvailability[];
}

export async function getRouteTrainTrips(params: {
  origin: string;
  destination: string;
  dateOfJourney: string;
  seatClass?: string;
}): Promise<TrainTripResponse[]> {
  try {
    const rawData = await fetchSeatAvailability(params);

    if (!rawData || !rawData.data || !rawData.data.trains) {
      return [];
    }

    const trains = rawData.data.trains;

    return trains.map((train: any) => {
      const seatTypes = train.seat_types || [];
      
      const processedSeats: SeatClassAvailability[] = seatTypes.map((seat: any) => {
        const onlineCount = Number(seat.seat_counts?.online ?? seat.available_quantity ?? 0);
        const offlineCount = Number(seat.seat_counts?.offline ?? 0);
        
        let status: 'AVAILABLE' | 'SOLD_OUT' | 'RESERVED' = 'AVAILABLE';
        if (seat.status === 'RESERVED') {
          status = 'RESERVED';
        } else if (onlineCount <= 0) {
          status = 'SOLD_OUT';
        }

        return {
          className: seat.type || seat.name || 'Unknown',
          classCode: seat.code || seat.type || '',
          availableSeats: onlineCount,
          offlineSeats: offlineCount,
          fare: Number(seat.fare ?? 0),
          status,
        };
      });

      const primarySeat = seatTypes[0] || {};
      return {
        tripNumber: train.trip_number || train.train_number || '',
        trainName: train.train_name || train.name || 'Express Train',
        departureTime: train.departure_time || '',
        arrivalTime: train.arrival_time || '',
        originCitySeq: Number(primarySeat.origin_city_seq ?? train.origin_city_seq ?? 0),
        destinationCitySeq: Number(primarySeat.destination_city_seq ?? train.destination_city_seq ?? 0),
        seats: processedSeats,
      };
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load trains';
    if (message === 'SESSION_EXPIRED') {
      throw error;
    }
    throw new Error(message);
  }
}

export function formatFare(amount: number): string {
  return `৳${amount.toLocaleString('en-BD')}`;
}