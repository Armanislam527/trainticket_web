import { RailwaySession } from './RailwaySessionBridge';

const API_BASE = 'https://shohoz.com';

export interface TrainSearchQuery {
  fromCity: string;
  toCity: string;
  dateOfJourney: string; // Expected Format: DD-Mon-YYYY (e.g., 04-Nov-2026)
  seatClass: string;     // e.g., 'S_CHAIR', 'SNIGDHA'
}

/**
 * Directly hits Shohoz's backend endpoints bypassing CORS constraints natively.
 */
export async function fetchTrainAvailability(
  session: RailwaySession,
  query: TrainSearchQuery
): Promise<any> {
  const url = `${API_BASE}/search-trips-v2?from_city=${encodeURIComponent(query.fromCity)}&to_city=${encodeURIComponent(query.toCity)}&date_of_journey=${encodeURIComponent(query.dateOfJourney)}&seat_class=${encodeURIComponent(query.seatClass)}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'Authorization': session.authorization,
      'X-Device-Id': session.deviceId,
      'X-Device-Key': session.deviceKey,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    throw new Error(`Invalid server response formatting: ${text.slice(0, 100)}`);
  }

  if (response.status === 201 || response.status === 403) {
    throw new Error('AUTH_EXPIRED');
  }

  if (!response.ok) {
    throw new Error(json?.error?.messages?.[0] || `HTTP Fetch Exception: ${response.status}`);
  }

  return json?.data?.trains || [];
}
