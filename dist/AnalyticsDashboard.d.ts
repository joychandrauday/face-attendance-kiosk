import React from "react";
import { KioskTheme } from "./types.js";
interface AnalyticsDashboardProps {
    apiKey: string;
    workspaceId: string;
    apiUrl?: string;
    theme?: KioskTheme;
    timezone?: string;
}
export declare const AnalyticsDashboard: React.FC<AnalyticsDashboardProps>;
export {};
