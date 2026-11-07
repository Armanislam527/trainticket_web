/**
 * Production-grade date utilities for handling railway booking and search dates.
 * Ensures strict compliance with the Shohoz/Bangladesh Railway 'd-M-Y' API requirement.
 */

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
] as const;

export class DateUtils {
  /**
   * Formats a Date object, ISO date string, or pre-formatted 'DD-MMM-YYYY' string into the required 'DD-MMM-YYYY' format.
   */
  public static formatApiDate(dateInput: string | Date): string {
    if (!dateInput) {
      return this.formatApiDate(new Date());
    }

    if (typeof dateInput === 'string') {
      const ready = dateInput.trim().match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
      if (ready) {
        const month = ready[2].charAt(0).toUpperCase() + ready[2].slice(1).toLowerCase();
        return `${ready[1].padStart(2, '0')}-${month}-${ready[3]}`;
      }
    }

    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    
    if (isNaN(date.getTime())) {
      // Fallback to current date if parsing fails completely
      const fallback = new Date();
      const day = String(fallback.getDate()).padStart(2, '0');
      const month = MONTH_NAMES[fallback.getMonth()];
      const year = fallback.getFullYear();
      return `${day}-${month}-${year}`;
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = MONTH_NAMES[date.getMonth()];
    const year = date.getFullYear();

    return `${day}-${month}-${year}`;
  }

  public static addDays(dateInput: string | Date, days: number): string {
    let date: Date;
    if (dateInput instanceof Date) {
      date = new Date(dateInput.getTime());
    } else {
      const ready = dateInput.trim().match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
      if (ready) {
        const month = MONTH_NAMES.findIndex((name) => name.toLowerCase() === ready[2].toLowerCase());
        date = month < 0
          ? new Date(Number.NaN)
          : new Date(Number(ready[3]), month, Number(ready[1]));
      } else {
        date = new Date(dateInput);
      }
    }

    if (Number.isNaN(date.getTime())) {
      throw new Error(`Invalid journey date: ${String(dateInput)}`);
    }
    date.setDate(date.getDate() + days);
    return this.formatApiDate(date);
  }

  /**
   * Formats a Date object into a standard display format (e.g., "Friday, 6 November 2026").
   */
  public static formatDisplayDate(dateInput: string | Date): string {
    try {
      const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
      if (isNaN(date.getTime())) return String(dateInput);

      return new Intl.DateTimeFormat('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(date);
    } catch (e) {
      return String(dateInput);
    }
  }

  /** Today plus the following days. Bangladesh e-ticket sells 10 days, including today. */
  public static bookingWindow(dayCount = 10): Date[] {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return Array.from({ length: dayCount }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }

  public static weekdayShort(date: Date): string {
    return date.toLocaleDateString('en-GB', { weekday: 'short' });
  }

  /**
   * Returns a normalized Date object set to midnight (00:00:00.000) for comparison.
   */
  public static normalizeDate(dateInput: string | Date): Date {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : new Date(dateInput.getTime());
    if (isNaN(date.getTime())) return new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }
}