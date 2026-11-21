import React from "react";

export type KioskTheme = "dark" | "light" | "transparent";

export type PunchDirection = "AUTO" | "IN" | "OUT";

export type EnrollmentAngle = "left" | "right" | "front";

export interface AttendanceSuccessResult {
  match: boolean;
  employee_id: string;
  confidence: number;
  timestamp: string;
  punch_type?: string;
  session_duration_minutes?: number;
  action_required?: string;
  message: string;
}

export interface EnrollmentSuccessResult {
  status: string;
  employee_id: string;
  employee_name?: string;
  workspace_id: string;
  message: string;
  angles_captured?: string[];
  image_urls?: Record<string, string | null>;
}

export interface KioskCustomStyles {
  container?: React.CSSProperties;
  header?: React.CSSProperties;
  viewfinder?: React.CSSProperties;
  button?: React.CSSProperties;
  hud?: React.CSSProperties;
  overlay?: React.CSSProperties;
  card?: React.CSSProperties;
  table?: React.CSSProperties;
}

export interface FaceAttendanceKioskProps {
  apiKey?: string;
  api_key?: string;
  workspaceId?: string;
  workspace_id?: string;
  apiUrl?: string;

  /** Punch mode: "AUTO" (smart auto-toggle), "IN" (clock in only), "OUT" (clock out only). Default: "AUTO" */
  punchType?: PunchDirection;

  /** Whether to show the interactive mode selector (Auto / In / Out). Default: false */
  showModeSelector?: boolean;

  /** Primary button label. Default: "Verify" */
  buttonLabel?: string;

  /** Button label when verifying. Default: "Verifying..." */
  loadingLabel?: string;

  /** Visual theme preset: "dark" (default), "light", or "transparent" for seamless CRM embedding */
  theme?: KioskTheme;

  /** Custom granular CSS style overrides */
  styles?: KioskCustomStyles;

  /** Whether to render the default header bar */
  hideHeader?: boolean;

  /** Custom title for the kiosk header */
  title?: string;

  /** Custom subtitle or workspace label */
  subtitle?: string;

  /** Enable audio chime on successful attendance scan (default: true) */
  enableSound?: boolean;

  /** Mirror camera horizontally for selfie orientation (default: true) */
  mirror?: boolean;

  /** Enable hands-free continuous presence scan (default: false) */
  autoScan?: boolean;

  /** Callbacks */
  onSuccess?: (result: AttendanceSuccessResult) => void;
  onError?: (errorMessage: string) => void;
  onStatusChange?: (status: string) => void;

  className?: string;
}

export interface FaceEnrollmentProps {
  apiKey?: string;
  api_key?: string;
  workspaceId?: string;
  workspace_id?: string;
  employeeId?: string;
  employee_id?: string;
  employeeName?: string;
  employee_name?: string;
  apiUrl?: string;

  /** Visual theme preset */
  theme?: KioskTheme;

  /** Granular style overrides */
  styles?: KioskCustomStyles;

  /** Whether to hide default header */
  hideHeader?: boolean;

  title?: string;
  className?: string;

  /** Enable sound chime on angle captures (default: true) */
  enableSound?: boolean;

  onSuccess?: (result: EnrollmentSuccessResult) => void;
  onError?: (errorMessage: string) => void;
  onAngleComplete?: (angle: EnrollmentAngle, index: number, total: number) => void;
}

export interface SureClockManagerProps {
  apiKey?: string;
  api_key?: string;
  workspaceId?: string;
  workspace_id?: string;
  apiUrl?: string;
  theme?: KioskTheme;
  styles?: KioskCustomStyles;
  className?: string;
  initialTab?: "kiosk" | "logs" | "employees" | "faces" | "analytics";
  title?: string;
  showKioskTab?: boolean;
  kioskProps?: Partial<FaceAttendanceKioskProps>;
  onAttendance?: (result: AttendanceSuccessResult) => void;
  onEnrollment?: (result: EnrollmentSuccessResult) => void;
}
