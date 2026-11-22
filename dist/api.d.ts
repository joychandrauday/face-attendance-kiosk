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
    employee_name?: string;
    workspace_id: string;
    punch_type: string;
    confidence?: number;
    confidence_score?: number;
    timestamp: string;
    status?: string;
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
/** Fetch list of employees in workspace */
export declare function fetchEmployees(apiKey: string, workspaceId: string, apiUrl?: string): Promise<EnrolledEmployee[]>;
/** Delete an employee and their biometric face vectors */
export declare function deleteEmployee(apiKey: string, workspaceId: string, employeeId: string, apiUrl?: string): Promise<{
    status: string;
    message: string;
}>;
/** Register a single biometric face angle */
export declare function registerFaceAngle(apiKey: string, payload: RegisterFacePayload, apiUrl?: string): Promise<RegisterFaceResponse>;
/** Fetch aggregated attendance statistics & hourly breakdown */
export declare function fetchAttendanceStats(apiKey: string, workspaceId: string, date?: string, apiUrl?: string): Promise<AttendanceStatResult>;
/** Fetch attendance logs for workspace */
export declare function fetchAttendanceLogs(apiKey: string, workspaceId: string, limit?: number, apiUrl?: string): Promise<AttendanceLogRecord[]>;
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
export declare function fetchEmployeeDailyHours(apiKey: string, workspaceId: string, employeeId?: string, startDate?: string, endDate?: string, apiUrl?: string): Promise<EmployeeDailyHoursRecord[]>;
/** Fetch workspace settings and similarity threshold */
export declare function fetchWorkspaceSettings(apiKey: string, workspaceId: string, apiUrl?: string): Promise<WorkspaceSettings>;
/** Update workspace settings (name, similarity threshold, timezone, and logo URL) */
export declare function updateWorkspaceSettings(apiKey: string, workspaceId: string, payload: {
    name?: string;
    similarity_threshold?: number;
    timezone?: string;
    logo_url?: string;
}, apiUrl?: string): Promise<WorkspaceSettings>;
/** Ping biometric engine health */
export declare function checkEngineHealth(apiUrl?: string): Promise<{
    ok: boolean;
    latencyMs: number;
    message: string;
}>;
