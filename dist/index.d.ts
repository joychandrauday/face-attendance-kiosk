import React from "react";
export interface AttendanceSuccessResult {
    match: boolean;
    employee_id: string;
    confidence: number;
    timestamp: string;
    message: string;
}
export interface FaceAttendanceKioskProps {
    apiKey?: string;
    api_key?: string;
    workspaceId?: string;
    workspace_id?: string;
    apiUrl?: string;
    onSuccess?: (result: AttendanceSuccessResult) => void;
    onError?: (errorMessage: string) => void;
    className?: string;
    title?: string;
}
export declare const FaceAttendanceKiosk: React.FC<FaceAttendanceKioskProps>;
export { FaceEnrollment } from "./Enrollment";
export type { FaceEnrollmentProps, EnrollmentSuccessResult } from "./Enrollment";
export default FaceAttendanceKiosk;
