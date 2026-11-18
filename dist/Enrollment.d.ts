import React from "react";
export interface EnrollmentSuccessResult {
    status: string;
    employee_id: string;
    workspace_id: string;
    message: string;
}
export interface FaceEnrollmentProps {
    apiKey?: string;
    api_key?: string;
    workspaceId?: string;
    workspace_id?: string;
    employeeId?: string;
    employee_id?: string;
    apiUrl?: string;
    onSuccess?: (result: EnrollmentSuccessResult) => void;
    onError?: (errorMessage: string) => void;
    className?: string;
    title?: string;
}
export declare const FaceEnrollment: React.FC<FaceEnrollmentProps>;
export default FaceEnrollment;
