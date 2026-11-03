export type SeatType = {
  type: string;
  fare: number | string;
  seat_counts: {
    online: number;
    offline?: number;
  };
};

export type AvailableTrain = {
  trip_number: string;
  seat_types: SeatType[];
};

type AvailabilityPayload = {
  data?: { trains?: AvailableTrain[] };
  trains?: AvailableTrain[];
  error?: { message?: string; messages?: string[] };
};

export type AvailabilitySearch = {
  from: string;
  to: string;
  date: string;
  seatClass: string;
};

export async function searchAvailability(search: AvailabilitySearch): Promise<AvailableTrain[]> {
  const endpoint = process.env.EXPO_PUBLIC_AVAILABILITY_ENDPOINT?.trim();
  if (!endpoint) {
    throw new Error("Live seat availability needs an authorized API endpoint. See the mobile README.");
  }

  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new Error("EXPO_PUBLIC_AVAILABILITY_ENDPOINT must be a valid absolute URL.");
  }
  if (url.protocol !== "https:") {
    throw new Error("The availability endpoint must use HTTPS.");
  }

  url.searchParams.set("from_city", search.from);
  url.searchParams.set("to_city", search.to);
  url.searchParams.set("date_of_journey", search.date);
  url.searchParams.set("seat_class", search.seatClass);

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });
  const payload = (await response.json()) as AvailabilityPayload;
  if (!response.ok) {
    const message = payload.error?.messages?.join("; ") || payload.error?.message;
    throw new Error(message || `Availability service returned HTTP ${response.status}.`);
  }

  const results = payload.data?.trains ?? payload.trains;
  if (!Array.isArray(results)) {
    throw new Error("Availability service returned an unexpected response; expected data.trains.");
  }

  return results;
}
