import { DateUtils } from '@/lib/dateUtils';
import { TrainDataService } from '@/lib/train-data';

export interface RailwayApiConfig {
  baseUrl?: string;
  authToken?: string;
  deviceId?: string;
  deviceKey?: string;
}

export interface SeatAvailabilityQuery {
  origin: string;
  destination: string;
  dateOfJourney: string | Date;
  seatClass?: string;
}

export class RailwayApiClient {
  private static DEFAULT_BASE_URL = 'https://railspaapi.shohoz.com/v1.0/web';
  private authToken: string;
  private deviceId: string;
  private deviceKey: string;

  constructor(config?: RailwayApiConfig) {
    this.authToken = config?.authToken || '';
    this.deviceId = config?.deviceId || '';
    this.deviceKey = config?.deviceKey || '';
  }

  public setCredentials(authToken: string, deviceId: string, deviceKey: string): void {
    this.authToken = authToken;
    this.deviceId = deviceId;
    this.deviceKey = deviceKey;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    };

    if (this.authToken) {
      headers['authorization'] = this.authToken;
    }
    if (this.deviceId) {
      headers['x-device-id'] = this.deviceId;
    }
    if (this.deviceKey) {
      headers['x-device-key'] = this.deviceKey;
    }

    return headers;
  }

  /**
   * Fetches live seat availability using Shohoz search-trips-v2 endpoint.
   */
  public async checkAvailability(query: SeatAvailabilityQuery): Promise<any> {
    const formattedDate = DateUtils.formatApiDate(query.dateOfJourney);
    const origin = TrainDataService.sanitizeStationName(query.origin);
    const destination = TrainDataService.sanitizeStationName(query.destination);
    const seatClass = query.seatClass || 'S_CHAIR';

    const endpoint = `${RailwayApiClient.DEFAULT_BASE_URL}/bookings/search-trips-v2?from_city=${encodeURIComponent(
      origin
    )}&to_city=${encodeURIComponent(destination)}&date_of_journey=${encodeURIComponent(
      formattedDate
    )}&seat_class=${encodeURIComponent(seatClass)}`;

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.error?.message || `Railway API error: HTTP ${response.status} - Unprocessable Entity / Request Failed`
      );
    }

    return data;
  }
}

export const railwayApi = new RailwayApiClient();

// Helper export to match availability.ts imports
export async function fetchSeatAvailability(query: SeatAvailabilityQuery): Promise<any> {
  return railwayApi.checkAvailability(query);
}