// Centralized 12-Hour Time and Timezone Formatting Utilities for SureClock SDK
export const DEFAULT_TIMEZONE = "Asia/Dhaka";
export const TIMEZONE_OPTIONS = [
    { value: "Asia/Dhaka", label: "Bangladesh Time (GMT+6) - Default" },
    { value: "Asia/Kolkata", label: "India Standard Time (GMT+5:30)" },
    { value: "Asia/Dubai", label: "Gulf Standard Time (GMT+4)" },
    { value: "Asia/Singapore", label: "Singapore / Malaysia (GMT+8)" },
    { value: "Asia/Tokyo", label: "Japan Standard Time (GMT+9)" },
    { value: "Europe/London", label: "United Kingdom (GMT / BST)" },
    { value: "Europe/Paris", label: "Central European Time (GMT+1)" },
    { value: "America/New_York", label: "US Eastern Time (GMT-5)" },
    { value: "America/Chicago", label: "US Central Time (GMT-6)" },
    { value: "America/Los_Angeles", label: "US Pacific Time (GMT-8)" },
    { value: "UTC", label: "Coordinated Universal Time (UTC)" },
];
/**
 * Format timestamp into 12-hour clock (e.g. "09:15:30 AM") in the specified timezone.
 */
export function format12HourTime(date, timeZone = DEFAULT_TIMEZONE, includeSeconds = true) {
    if (!date)
        return "-";
    const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
    if (isNaN(d.getTime()))
        return "-";
    const safeTz = isValidTimezone(timeZone) ? timeZone : DEFAULT_TIMEZONE;
    try {
        return d.toLocaleTimeString("en-US", {
            timeZone: safeTz,
            hour: "2-digit",
            minute: "2-digit",
            second: includeSeconds ? "2-digit" : undefined,
            hour12: true,
        });
    }
    catch (_) {
        return d.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: includeSeconds ? "2-digit" : undefined,
            hour12: true,
        });
    }
}
/**
 * Format date (e.g. "Nov 21, 2026") in the specified timezone.
 */
export function formatDate(date, timeZone = DEFAULT_TIMEZONE) {
    if (!date)
        return "-";
    const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
    if (isNaN(d.getTime()))
        return "-";
    const safeTz = isValidTimezone(timeZone) ? timeZone : DEFAULT_TIMEZONE;
    try {
        return d.toLocaleDateString("en-US", {
            timeZone: safeTz,
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    }
    catch (_) {
        return d.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    }
}
/**
 * Format full date and 12-hour time (e.g. "Nov 21, 2026, 09:15 AM").
 */
export function format12HourDateTime(date, timeZone = DEFAULT_TIMEZONE, includeSeconds = false) {
    if (!date)
        return "-";
    return `${formatDate(date, timeZone)}, ${format12HourTime(date, timeZone, includeSeconds)}`;
}
/**
 * Format hourly label into 12-hour format (e.g. "08:00" -> "08:00 AM", "14:00" -> "02:00 PM")
 */
export function formatHourlyLabel(hourStr) {
    const num = parseInt(hourStr.split(":")[0], 10);
    if (isNaN(num))
        return hourStr;
    const period = num >= 12 ? "PM" : "AM";
    const hour12 = num === 0 ? 12 : num > 12 ? num - 12 : num;
    return `${hour12.toString().padStart(2, "0")}:00 ${period}`;
}
/**
 * Format Date object into YYYY-MM-DD in the specified timezone (not UTC).
 */
export function formatISODateInTimezone(date = new Date(), timeZone = DEFAULT_TIMEZONE) {
    const safeTz = isValidTimezone(timeZone) ? timeZone : DEFAULT_TIMEZONE;
    try {
        return new Intl.DateTimeFormat("en-CA", {
            timeZone: safeTz,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).format(date);
    }
    catch (_) {
        return date.toISOString().split("T")[0];
    }
}
function isValidTimezone(tz) {
    if (!tz)
        return false;
    try {
        Intl.DateTimeFormat(undefined, { timeZone: tz });
        return true;
    }
    catch (_) {
        return false;
    }
}
