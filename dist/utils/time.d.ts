export declare const DEFAULT_TIMEZONE = "Asia/Dhaka";
export interface TimezoneOption {
    value: string;
    label: string;
}
export declare const TIMEZONE_OPTIONS: TimezoneOption[];
/**
 * Format timestamp into 12-hour clock (e.g. "09:15:30 AM") in the specified timezone.
 */
export declare function format12HourTime(date: Date | string | number | null | undefined, timeZone?: string, includeSeconds?: boolean): string;
/**
 * Format date (e.g. "Nov 21, 2026") in the specified timezone.
 */
export declare function formatDate(date: Date | string | number | null | undefined, timeZone?: string): string;
/**
 * Format full date and 12-hour time (e.g. "Nov 21, 2026, 09:15 AM").
 */
export declare function format12HourDateTime(date: Date | string | number | null | undefined, timeZone?: string, includeSeconds?: boolean): string;
/**
 * Format hourly label into 12-hour format (e.g. "08:00" -> "08:00 AM", "14:00" -> "02:00 PM")
 */
export declare function formatHourlyLabel(hourStr: string): string;
/**
 * Format Date object into YYYY-MM-DD in the specified timezone (not UTC).
 */
export declare function formatISODateInTimezone(date?: Date, timeZone?: string): string;
