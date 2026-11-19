"use client";
import React, { useState } from "react";
import { AnalyticsDashboard } from "./AnalyticsDashboard.js";
import { EmployeeTable } from "./EmployeeTable.js";
import { FaceEnrollment } from "./Enrollment.js";
import { FaceAttendanceKiosk } from "./FaceAttendanceKiosk.js";
import { FaceTable } from "./FaceTable.js";
export const SureClockManager = ({ apiKey, api_key, workspaceId, workspace_id, apiUrl = "https://api.sureclock.karalasoft.com", theme = "dark", styles = {}, className = "", initialTab = "kiosk", title = "SureClock Biometric Hub", showKioskTab = true, kioskProps = {}, onAttendance, onEnrollment, }) => {
    const effectiveApiKey = apiKey || api_key || "";
    const effectiveWorkspaceId = workspaceId || workspace_id || "";
    const [activeTab, setActiveTab] = useState(initialTab);
    const [selectedEmpForFaces, setSelectedEmpForFaces] = useState("");
    const [showEnrollModal, setShowEnrollModal] = useState(false);
    const [enrollTargetEmpId, setEnrollTargetEmpId] = useState("");
    const isLight = theme === "light";
    const isTransparent = theme === "transparent";
    const themeTokens = {
        bg: isTransparent ? "transparent" : isLight ? "#ffffff" : "#080d1a",
        surface: isLight ? "#f8fafc" : "#0f172a",
        border: isLight ? "#e2e8f0" : "#1e293b",
        textPrimary: isLight ? "#0f172a" : "#f8fafc",
        textMuted: isLight ? "#64748b" : "#94a3b8",
        tabActive: "#0ea5e9",
    };
    const handleOpenEnroll = (empId) => {
        setEnrollTargetEmpId(empId || "");
        setShowEnrollModal(true);
    };
    const handleSelectEmployeeForFaces = (empId) => {
        setSelectedEmpForFaces(empId);
        setActiveTab("faces");
    };
    return (React.createElement("div", { className: `sureclock-manager-root ${className}`, style: {
            maxWidth: "960px",
            width: "100%",
            margin: "0 auto",
            padding: "24px",
            borderRadius: "18px",
            backgroundColor: themeTokens.bg,
            color: themeTokens.textPrimary,
            border: `1px solid ${themeTokens.border}`,
            boxSizing: "border-box",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            ...styles.container,
        } },
        React.createElement("div", { style: {
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "20px",
                borderBottom: `1px solid ${themeTokens.border}`,
                paddingBottom: "16px",
                flexWrap: "wrap",
                gap: "12px",
                ...styles.header,
            } },
            React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "12px" } },
                React.createElement("div", { style: {
                        width: "40px",
                        height: "40px",
                        borderRadius: "12px",
                        backgroundColor: isLight ? "#e0f2fe" : "#0c2847",
                        border: `1px solid ${isLight ? "#bae6fd" : "#0284c7"}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#0284c7",
                    } },
                    React.createElement("svg", { width: "22", height: "22", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
                        React.createElement("path", { d: "M12 2v20" }),
                        React.createElement("path", { d: "M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" }))),
                React.createElement("div", null,
                    React.createElement("h1", { style: { fontSize: "1.25rem", fontWeight: 700, margin: 0 } }, title),
                    React.createElement("p", { style: { fontSize: "0.8rem", color: themeTokens.textMuted, margin: "2px 0 0 0" } },
                        "Workspace: ",
                        React.createElement("strong", { style: { color: "#38bdf8", fontFamily: "monospace" } }, effectiveWorkspaceId || "Default")))),
            React.createElement("div", { style: {
                    display: "flex",
                    backgroundColor: isLight ? "#f1f5f9" : "#090d16",
                    borderRadius: "10px",
                    padding: "4px",
                    border: `1px solid ${themeTokens.border}`,
                    flexWrap: "wrap",
                    gap: "2px",
                } },
                showKioskTab && (React.createElement("button", { type: "button", onClick: () => setActiveTab("kiosk"), style: {
                        padding: "6px 14px",
                        borderRadius: "8px",
                        border: "none",
                        backgroundColor: activeTab === "kiosk" ? themeTokens.tabActive : "transparent",
                        color: activeTab === "kiosk" ? "#ffffff" : themeTokens.textMuted,
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                    } }, "\uD83D\uDCF8 Attendance Kiosk")),
                React.createElement("button", { type: "button", onClick: () => setActiveTab("employees"), style: {
                        padding: "6px 14px",
                        borderRadius: "8px",
                        border: "none",
                        backgroundColor: activeTab === "employees" ? themeTokens.tabActive : "transparent",
                        color: activeTab === "employees" ? "#ffffff" : themeTokens.textMuted,
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                    } }, "\uD83D\uDC65 Employees"),
                React.createElement("button", { type: "button", onClick: () => setActiveTab("faces"), style: {
                        padding: "6px 14px",
                        borderRadius: "8px",
                        border: "none",
                        backgroundColor: activeTab === "faces" ? themeTokens.tabActive : "transparent",
                        color: activeTab === "faces" ? "#ffffff" : themeTokens.textMuted,
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                    } }, "\uD83D\uDC64 Biometric Faces"),
                React.createElement("button", { type: "button", onClick: () => setActiveTab("analytics"), style: {
                        padding: "6px 14px",
                        borderRadius: "8px",
                        border: "none",
                        backgroundColor: activeTab === "analytics" ? themeTokens.tabActive : "transparent",
                        color: activeTab === "analytics" ? "#ffffff" : themeTokens.textMuted,
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                    } }, "\uD83D\uDCCA Analytics & Charts"))),
        activeTab === "kiosk" && showKioskTab && (React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", width: "100%", padding: "12px 0" } },
            React.createElement("div", { style: { maxWidth: "480px", width: "100%", margin: "0 auto" } },
                React.createElement(FaceAttendanceKiosk, { apiKey: effectiveApiKey, workspaceId: effectiveWorkspaceId, apiUrl: apiUrl, theme: theme, buttonLabel: "Verify Attendance", enableSound: true, mirror: true, onSuccess: (result) => {
                        if (onAttendance)
                            onAttendance(result);
                    }, ...kioskProps })))),
        activeTab === "employees" && (React.createElement(EmployeeTable, { apiKey: effectiveApiKey, workspaceId: effectiveWorkspaceId, apiUrl: apiUrl, theme: theme, onEnrollNew: () => handleOpenEnroll(), onSelectEmployee: handleSelectEmployeeForFaces })),
        activeTab === "faces" && (React.createElement(FaceTable, { apiKey: effectiveApiKey, workspaceId: effectiveWorkspaceId, selectedEmployeeId: selectedEmpForFaces, apiUrl: apiUrl, theme: theme, onReEnroll: (empId) => handleOpenEnroll(empId) })),
        activeTab === "analytics" && (React.createElement(AnalyticsDashboard, { apiKey: effectiveApiKey, workspaceId: effectiveWorkspaceId, apiUrl: apiUrl, theme: theme })),
        showEnrollModal && (React.createElement("div", { style: {
                position: "fixed",
                inset: 0,
                backgroundColor: "rgba(0, 0, 0, 0.75)",
                backdropFilter: "blur(6px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 9999,
                padding: "20px",
                boxSizing: "border-box",
            } },
            React.createElement("div", { style: { position: "relative", maxWidth: "540px", width: "100%" } },
                React.createElement("button", { type: "button", onClick: () => setShowEnrollModal(false), style: {
                        position: "absolute",
                        top: "14px",
                        right: "14px",
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        border: "none",
                        backgroundColor: "rgba(0, 0, 0, 0.4)",
                        color: "#ffffff",
                        fontSize: "1rem",
                        cursor: "pointer",
                        zIndex: 10,
                    } }, "\u2715"),
                React.createElement(FaceEnrollment, { apiKey: effectiveApiKey, workspaceId: effectiveWorkspaceId, employeeId: enrollTargetEmpId, apiUrl: apiUrl, theme: theme, onSuccess: (result) => {
                        if (onEnrollment)
                            onEnrollment(result);
                        setTimeout(() => {
                            setShowEnrollModal(false);
                        }, 2000);
                    } }))))));
};
// Also export as Management for backward compatibility
export const Management = SureClockManager;
