import { fetchSeatAvailability } from '../components/railwayApi';

export interface SeatClassAvailability {
  className: string;
  classCode: string;
  availableSeats: number;
  fare: number;
  status: 'AVAILABLE' | 'BOOKING_OPEN' | 'SOLD_OUT' | 'RESERVED';
}

export interface TrainAvailabilityResponse {
  trainId: string;
  trainName: string;
  departureTime: string;
  arrivalTime: string;
  dateOfJourney: string;
  seats: SeatClassAvailability[];
}

/**
 * Fetches and processes seat availability for a specific train and route.
 */
export async function getProcessedTrainAvailability(params: {
  origin: string;
  destination: string;
  dateOfJourney: string;
  trainId: string;
}): Promise<TrainAvailabilityResponse | null> {
  try {
    const rawData = await fetchSeatAvailability(params);

    if (!rawData || !rawData.data) {
      return null;
    }

    const trainInfo = rawData.data;

    // Map and normalize raw seat classes into structured UI-friendly objects
    const processedSeats: SeatClassAvailability[] = (trainInfo.seat_types || []).map((seat: any) => ({
      className: seat.name || seat.class_name || 'Unknown',
      classCode: seat.code || seat.class_code || '',
      availableSeats: Number(seat.available_quantity ?? seat.seats_available ?? 0),
      fare: Number(seat.fare ?? seat.price ?? 0),
      status: determineSeatStatus(seat),
    }));

    return {
      trainId: params.trainId,
      trainName: trainInfo.train_name || trainInfo.name || 'Express Train',
      departureTime: trainInfo.departure_time || '',
      arrivalTime: trainInfo.arrival_time || '',
      dateOfJourney: params.dateOfJourney,
      seats: processedSeats,
    };
  } catch (error) {
    console.error(`Failed to process availability for train ${params.trainId}:`, error);
    throw error;
  }
}

/**
 * Helper to determine standardized seat availability status.
 */
function determineSeatStatus(seat: any): 'AVAILABLE' | 'BOOKING_OPEN' | 'SOLD_OUT' | 'RESERVED' {
  const qty = Number(seat.available_quantity ?? seat.seats_available ?? 0);
  const rawStatus = (seat.status || '').toUpperCase();

  if (rawStatus === 'SOLD_OUT' || qty === 0) {
    return 'SOLD_OUT';
  }
  if (rawStatus === 'RESERVED') {
    return 'RESERVED';
  }
  if (qty > 0) {
    return 'AVAILABLE';
  }
  return 'BOOKING_OPEN';
}

/**
 * Helper formatter for currency display in Taka (BDT)
 */
export function formatFare(amount: number): string {
  return `৳${amount.toLocaleString('en-BD')}`;
}