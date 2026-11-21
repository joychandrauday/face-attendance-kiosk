import React from "react";
import { KioskTheme } from "./types.js";
export interface AttendanceLogsProps {
    apiKey: string;
    workspaceId: string;
    apiUrl?: string;
    theme?: KioskTheme;
    timezone?: string;
    limit?: number;
    autoRefresh?: boolean;
    refreshIntervalMs?: number;
    className?: string;
}
export declare const AttendanceLogs: React.FC<AttendanceLogsProps>;
