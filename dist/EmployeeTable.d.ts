import React from "react";
import { KioskTheme } from "./types.js";
interface EmployeeTableProps {
    apiKey: string;
    workspaceId: string;
    apiUrl?: string;
    theme?: KioskTheme;
    onEnrollNew?: () => void;
    onSelectEmployee?: (empId: string) => void;
}
export declare const EmployeeTable: React.FC<EmployeeTableProps>;
export {};
