// API helper functions for SureClock SDK
// Enables unified employee management, multi-angle biometric administration, and analytics.
/**
 * Standard authenticated fetch helper
 */
async function apiRequest(endpoint, apiKey, options = {}) {
    const headers = new Headers({
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        ...(options.headers || {}),
    });
    const response = await fetch(endpoint, {
        ...options,
        headers,
    });
    let data = null;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
        data = await response.json();
    }
    else {
        data = { message: await response.text() };
    }
    if (!response.ok) {
        throw new Error(data?.message || `Request failed with HTTP status ${response.status}`);
    }
    return data;
}
/** Fetch list of employees in workspace */
export async function fetchEmployees(apiKey, workspaceId, apiUrl = "https://api.sureclock.karalasoft.com") {
    const base = apiUrl.replace(/\/$/, "");
    const endpoint = `${base}/api/v1/employees?workspace_id=${encodeURIComponent(workspaceId)}`;
    return await apiRequest(endpoint, apiKey, { method: "GET" });
}
/** Delete an employee and their biometric face vectors */
export async function deleteEmployee(apiKey, workspaceId, employeeId, apiUrl = "https://api.sureclock.karalasoft.com") {
    const base = apiUrl.replace(/\/$/, "");
    const endpoint = `${base}/api/v1/employees/${encodeURIComponent(employeeId)}?workspace_id=${encodeURIComponent(workspaceId)}`;
    return await apiRequest(endpoint, apiKey, { method: "DELETE" });
}
/** Register a single biometric face angle */
export async function registerFaceAngle(apiKey, payload, apiUrl = "https://api.sureclock.karalasoft.com") {
    const base = apiUrl.replace(/\/$/, "");
    const endpoint = `${base}/api/v1/faces/register`;
    return await apiRequest(endpoint, apiKey, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}
/** Fetch aggregated attendance statistics & hourly breakdown */
export async function fetchAttendanceStats(apiKey, workspaceId, date, apiUrl = "https://api.sureclock.karalasoft.com") {
    const base = apiUrl.replace(/\/$/, "");
    const dateParam = date ? `&date=${encodeURIComponent(date)}` : "";
    const endpoint = `${base}/api/v1/attendance/stats?workspace_id=${encodeURIComponent(workspaceId)}${dateParam}`;
    return await apiRequest(endpoint, apiKey, { method: "GET" });
}
/** Fetch attendance logs for workspace */
export async function fetchAttendanceLogs(apiKey, workspaceId, limit = 50, apiUrl = "https://api.sureclock.karalasoft.com") {
    const base = apiUrl.replace(/\/$/, "");
    const endpoint = `${base}/api/v1/attendance/logs?workspace_id=${encodeURIComponent(workspaceId)}&limit=${limit}`;
    return await apiRequest(endpoint, apiKey, { method: "GET" });
}
