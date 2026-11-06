import * as SecureStore from 'expo-secure-store';

// Base URL for the railway portal API (adjust if your endpoints use a specific subdomain or path)
const BASE_URL = 'https://eticket.railway.gov.bd';

interface ApiOptions extends RequestInit {
  requiresAuth?: boolean;
}

/**
 * Helper to execute authenticated requests against the railway backend using stored session data.
 */
export async function railwayApiFetch(endpoint: string, options: ApiOptions = { requiresAuth: true }) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (options.requiresAuth) {
    try {
      // Retrieve the session cookies and auth token captured by the WebView bridge
      const sessionCookies = await SecureStore.getItemAsync('railway_session_cookies');
      const authToken = await SecureStore.getItemAsync('railway_auth_token');

      if (sessionCookies) {
        headers['Cookie'] = sessionCookies;
      }

      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
    } catch (error) {
      console.error('Error retrieving session credentials from SecureStore:', error);
    }
  }

  // Construct the full URL (handling absolute or relative paths)
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle session expiration / unauthorized access
    if (response.status === 401 || response.status === 403) {
      throw new Error('SESSION_EXPIRED');
    }

    if (!response.ok) {
      throw new Error(`Railway API error: ${response.status} ${response.statusText}`);
    }

    // Parse response safely
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }

    return await response.text();
  } catch (error) {
    console.error(`API Request failed for [${endpoint}]:`, error);
    throw error;
  }
}

/**
 * Specific function to check seat availability for a given train, date, and route.
 */
export async function fetchSeatAvailability(params: {
  origin: string;
  destination: string;
  dateOfJourney: string;
  trainId: string;
  seatType?: string;
}) {
  const queryParams = new URLSearchParams({
    from_city: params.origin,
    to_city: params.destination,
    date_of_journey: params.dateOfJourney,
    train_id: params.trainId,
    ...(params.seatType ? { seat_type: params.seatType } : {}),
  });

  // Replace with your exact endpoint path discovered from network inspection
  const endpoint = `/api/v1/booking/availability?${queryParams.toString()}`;

  return await railwayApiFetch(endpoint, {
    method: 'GET',
    requiresAuth: true,
  });
}