import React from "react";
import { KioskTheme } from "./types.js";
interface FaceTableProps {
    apiKey: string;
    workspaceId: string;
    selectedEmployeeId?: string;
    apiUrl?: string;
    theme?: KioskTheme;
    onReEnroll?: (employeeId: string) => void;
}
export declare const FaceTable: React.FC<FaceTableProps>;
export {};
