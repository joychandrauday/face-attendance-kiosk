"use client";

export { FaceAttendanceKiosk } from "./FaceAttendanceKiosk.js";
export { FaceEnrollment } from "./Enrollment.js";
export { SureClockManager, Management } from "./Management.js";
export { AttendanceLogs } from "./AttendanceLogs.js";
export type { AttendanceLogsProps } from "./AttendanceLogs.js";
export { SureClockSettings } from "./Settings.js";
export { EmployeeTable } from "./EmployeeTable.js";
export { FaceTable } from "./FaceTable.js";
export { AnalyticsDashboard } from "./AnalyticsDashboard.js";
export { ConfirmModal, Toast } from "./components/Modal.js";
export type { ConfirmModalProps, ToastProps } from "./components/Modal.js";
export { cropAlignedFace, computeFrameMicroMotion, getFaceDetector } from "./faceDetector.js";
export type { FaceCropResult } from "./faceDetector.js";

export * as api from "./api.js";
export {
  fetchEmployees,
  deleteEmployee,
  registerFaceAngle,
  fetchAttendanceStats,
  fetchAttendanceLogs,
  fetchEmployeeDailyHours,
  fetchWorkspaceSettings,
  updateWorkspaceSettings,
  checkEngineHealth,
} from "./api.js";

export {
  DEFAULT_TIMEZONE,
  TIMEZONE_OPTIONS,
  format12HourTime,
  formatDate,
  format12HourDateTime,
  formatHourlyLabel,
} from "./utils/time.js";
export type { TimezoneOption } from "./utils/time.js";

export type {
  AttendanceSuccessResult,
  EnrollmentSuccessResult,
  FaceAttendanceKioskProps,
  FaceEnrollmentProps,
  SureClockManagerProps,
  SureClockSettingsProps,
  KioskCustomStyles,
  KioskTheme,
  PunchDirection,
  EnrollmentAngle,
} from "./types.js";

export type {
  EnrolledEmployee,
  AttendanceStatResult,
  AttendanceLogRecord,
  EmployeeDailyHoursRecord,
  RegisterFacePayload,
  RegisterFaceResponse,
  WorkspaceSettings,
} from "./api.js";
