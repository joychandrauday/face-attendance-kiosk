// API helper functions for SureClock SDK
// Enables unified employee management, multi-angle biometric administration, and analytics.

export interface EmployeeAngleImage {
  angle: string;
  image_url: string | null;
}

export interface EnrolledEmployee {
  employee_id: string;
  name?: string | null;
  workspace_id: string;
  enrolled_at?: string;
  angles?: string[];
  image_url?: string | null;
  angle_images?: EmployeeAngleImage[];
}

export interface AttendanceStatResult {
  workspace_id: string;
  date: string;
  total_enrolled_employees: number;
  unique_clocked_in: number;
  total_punches: number;
  absent_count: number;
  active_on_duty_count: number;
  total_work_hours: number;
  average_confidence: number;
  hourly_breakdown: Record<string, number>;
}

export interface AttendanceLogRecord {
  id: string | number;
  employee_id: string;
  employee_name?: string | null;
  workspace_id: string;
  punch_type: string;
  confidence?: number;
  confidence_score?: number;
  timestamp: string;
  status?: string;
  shift_status?: string | null;
  duration_minutes?: number | null;
  duration_hours?: number | null;
}

export interface RegisterFacePayload {
  workspace_id: string;
  employee_id: string;
  name?: string;
  image_base64: string;
  angle_label?: "left" | "right" | "front" | string;
}

export interface RegisterFaceResponse {
  status: string;
  employee_id: string;
  name?: string | null;
  workspace_id: string;
  message: string;
  image_url?: string | null;
}

/**
 * Standard authenticated fetch helper
 */
async function apiRequest<T>(
  endpoint: string,
  apiKey: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers({
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    ...((options.headers as Record<string, string>) || {}),
  });

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  let data: any = null;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = { message: await response.text() };
  }

  if (!response.ok) {
    throw new Error(data?.message || `Request failed with HTTP status ${response.status}`);
  }

  return data as T;
}

/** Fetch list of employees in workspace */
export async function fetchEmployees(
  apiKey: string,
  workspaceId: string,
  apiUrl = "https://api.sureclock.karalasoft.com"
): Promise<EnrolledEmployee[]> {
  const base = apiUrl.replace(/\/$/, "");
  const endpoint = `${base}/api/v1/employees?workspace_id=${encodeURIComponent(workspaceId)}`;
  return await apiRequest<EnrolledEmployee[]>(endpoint, apiKey, { method: "GET" });
}

/** Delete an employee and their biometric face vectors */
export async function deleteEmployee(
  apiKey: string,
  workspaceId: string,
  employeeId: string,
  apiUrl = "https://api.sureclock.karalasoft.com"
): Promise<{ status: string; message: string }> {
  const base = apiUrl.replace(/\/$/, "");
  const endpoint = `${base}/api/v1/employees/${encodeURIComponent(employeeId)}?workspace_id=${encodeURIComponent(workspaceId)}`;
  return await apiRequest<{ status: string; message: string }>(endpoint, apiKey, { method: "DELETE" });
}

/** Register a single biometric face angle */
export async function registerFaceAngle(
  apiKey: string,
  payload: RegisterFacePayload,
  apiUrl = "https://api.sureclock.karalasoft.com"
): Promise<RegisterFaceResponse> {
  const base = apiUrl.replace(/\/$/, "");
  const endpoint = `${base}/api/v1/faces/register`;
  return await apiRequest<RegisterFaceResponse>(endpoint, apiKey, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Fetch aggregated attendance statistics & hourly breakdown */
export async function fetchAttendanceStats(
  apiKey: string,
  workspaceId: string,
  date?: string,
  apiUrl = "https://api.sureclock.karalasoft.com"
): Promise<AttendanceStatResult> {
  const base = apiUrl.replace(/\/$/, "");
  const dateParam = date ? `&date=${encodeURIComponent(date)}` : "";
  const endpoint = `${base}/api/v1/attendance/stats?workspace_id=${encodeURIComponent(workspaceId)}${dateParam}`;
  return await apiRequest<AttendanceStatResult>(endpoint, apiKey, { method: "GET" });
}

/** Fetch attendance logs for workspace */
export async function fetchAttendanceLogs(
  apiKey: string,
  workspaceId: string,
  limit = 50,
  apiUrl = "https://api.sureclock.karalasoft.com"
): Promise<AttendanceLogRecord[]> {
  const base = apiUrl.replace(/\/$/, "");
  const endpoint = `${base}/api/v1/attendance/logs?workspace_id=${encodeURIComponent(workspaceId)}&limit=${limit}`;
  return await apiRequest<AttendanceLogRecord[]>(endpoint, apiKey, { method: "GET" });
}

export interface WorkspaceSettings {
  workspace_id: string;
  name: string;
  similarity_threshold?: number;
  timezone?: string;
  logo_url?: string | null;
  enrolled_employees_count?: number;
  created_at?: string;
}

export interface EmployeeDailyHoursRecord {
  employee_id: string;
  employee_name?: string | null;
  date: string;
  first_clock_in: string;
  last_clock_out: string | null;
  sessions_count: number;
  total_minutes: number;
  total_hours: number;
  has_open_session: boolean;
  shift_status?: string;
  average_confidence?: number | null;
}

/** Fetch aggregated day-wise total work hours of employees */
export async function fetchEmployeeDailyHours(
  apiKey: string,
  workspaceId: string,
  employeeId?: string,
  startDate?: string,
  endDate?: string,
  apiUrl = "https://api.sureclock.karalasoft.com"
): Promise<EmployeeDailyHoursRecord[]> {
  const base = apiUrl.replace(/\/$/, "");
  const params = new URLSearchParams({ workspace_id: workspaceId });
  if (employeeId) params.append("employee_id", employeeId);
  if (startDate) params.append("start_date", startDate);
  if (endDate) params.append("end_date", endDate);
  const endpoint = `${base}/api/v1/attendance/employee-daily-hours?${params.toString()}`;
  return await apiRequest<EmployeeDailyHoursRecord[]>(endpoint, apiKey, { method: "GET" });
}

/** Fetch workspace settings and similarity threshold */
export async function fetchWorkspaceSettings(
  apiKey: string,
  workspaceId: string,
  apiUrl = "https://api.sureclock.karalasoft.com"
): Promise<WorkspaceSettings> {
  const base = apiUrl.replace(/\/$/, "");
  const endpoint = `${base}/api/v1/workspaces/${encodeURIComponent(workspaceId)}`;
  return await apiRequest<WorkspaceSettings>(endpoint, apiKey, { method: "GET" });
}

/** Update workspace settings (name, similarity threshold, timezone, and logo URL) */
export async function updateWorkspaceSettings(
  apiKey: string,
  workspaceId: string,
  payload: { name?: string; similarity_threshold?: number; timezone?: string; logo_url?: string },
  apiUrl = "https://api.sureclock.karalasoft.com"
): Promise<WorkspaceSettings> {
  const base = apiUrl.replace(/\/$/, "");
  const endpoint = `${base}/api/v1/workspaces/${encodeURIComponent(workspaceId)}`;
  return await apiRequest<WorkspaceSettings>(endpoint, apiKey, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/** Ping biometric engine health */
export async function checkEngineHealth(
  apiUrl = "https://api.sureclock.karalasoft.com"
): Promise<{ ok: boolean; latencyMs: number; message: string }> {
  const start = performance.now();
  const base = apiUrl.replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/health`, { method: "GET" });
    const latencyMs = Math.round(performance.now() - start);
    if (res.ok) {
      const text = await res.text();
      return { ok: true, latencyMs, message: text.trim() || "Healthy" };
    }
    return { ok: false, latencyMs, message: `HTTP ${res.status}` };
  } catch (err: any) {
    return {
      ok: false,
      latencyMs: Math.round(performance.now() - start),
      message: err.message || "Unreachable",
    };
  }
}
