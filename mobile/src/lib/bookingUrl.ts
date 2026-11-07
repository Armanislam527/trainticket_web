import { DateUtils } from '@/lib/dateUtils';
import { TrainDataService } from '@/lib/train-data';

const BOOKING_SEARCH_URL = 'https://eticket.railway.gov.bd/booking/train/search';

export function buildBookingSearchUrl(params: {
  origin: string;
  destination: string;
  date: string;
  seatClass: string;
}): string {
  const query = [
    `fromcity=${encodeURIComponent(TrainDataService.formatStationDisplay(params.origin))}`,
    `tocity=${encodeURIComponent(TrainDataService.formatStationDisplay(params.destination))}`,
    `doj=${encodeURIComponent(DateUtils.formatApiDate(params.date))}`,
    `class=${encodeURIComponent(params.seatClass)}`,
  ].join('&');
  return `${BOOKING_SEARCH_URL}?${query}`;
}
