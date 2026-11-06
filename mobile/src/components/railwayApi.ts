import { DateUtils } from '@/lib/dateUtils';
import { railwaySession, sanitizeCityForApi } from '@/lib/railwaySession';

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

const SEARCH_URL = 'https://railspaapi.shohoz.com/v1.0/web/bookings/search-trips-v2';

export class RailwayApiClient {
  constructor(config?: RailwayApiConfig) {
    if (config?.authToken || config?.deviceId || config?.deviceKey) {
      railwaySession.setCredentials(config.authToken || '', config.deviceId || '', config.deviceKey || '');
    }
  }

  public setCredentials(authToken: string, deviceId: string, deviceKey: string): void {
    railwaySession.setCredentials(authToken, deviceId, deviceKey);
  }

  /**
   * Same query the extension builds in scanner.js fetchTrains().
   * Headers are applied inside the eticket page, or replayed natively from the captured session.
   */
  public async checkAvailability(query: SeatAvailabilityQuery): Promise<any> {
    const formattedDate = DateUtils.formatApiDate(query.dateOfJourney);
    const origin = sanitizeCityForApi(query.origin);
    const destination = sanitizeCityForApi(query.destination);
    const seatClass = query.seatClass || 'S_CHAIR';

    const endpoint =
      `${SEARCH_URL}?from_city=${encodeURIComponent(origin)}` +
      `&to_city=${encodeURIComponent(destination)}` +
      `&date_of_journey=${encodeURIComponent(formattedDate)}` +
      `&seat_class=${encodeURIComponent(seatClass)}`;

    return railwaySession.fetchJson(endpoint);
  }
}

export const railwayApi = new RailwayApiClient();

export async function fetchSeatAvailability(query: SeatAvailabilityQuery): Promise<any> {
  return railwayApi.checkAvailability(query);
}
