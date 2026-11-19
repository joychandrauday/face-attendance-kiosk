"use client";
import React, { useEffect, useState } from "react";
import { fetchEmployees } from "./api.js";
export const FaceTable = ({ apiKey, workspaceId, selectedEmployeeId, apiUrl = "https://api.sureclock.karalasoft.com", theme = "dark", onReEnroll, }) => {
    const [employees, setEmployees] = useState([]);
    const [activeEmpId, setActiveEmpId] = useState(selectedEmployeeId || "");
    const [loading, setLoading] = useState(true);
    const isLight = theme === "light";
    const border = isLight ? "#e2e8f0" : "#1e293b";
    const surface = isLight ? "#f8fafc" : "#0f172a";
    const textPrimary = isLight ? "#0f172a" : "#f8fafc";
    const textMuted = isLight ? "#64748b" : "#94a3b8";
    useEffect(() => {
        if (selectedEmployeeId) {
            setActiveEmpId(selectedEmployeeId);
        }
    }, [selectedEmployeeId]);
    useEffect(() => {
        async function load() {
            if (!apiKey || !workspaceId)
                return;
            setLoading(true);
            try {
                const data = await fetchEmployees(apiKey, workspaceId, apiUrl);
                setEmployees(data || []);
                if (!activeEmpId && data && data.length > 0) {
                    setActiveEmpId(data[0].employee_id);
                }
            }
            catch (_) {
            }
            finally {
                setLoading(false);
            }
        }
        load();
    }, [apiKey, workspaceId, apiUrl]);
    const currentEmp = employees.find((e) => e.employee_id === activeEmpId);
    return (React.createElement("div", { style: { width: "100%", color: textPrimary } },
        React.createElement("div", { style: {
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "16px",
                gap: "12px",
                flexWrap: "wrap",
            } },
            React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "8px" } },
                React.createElement("label", { style: { fontSize: "0.82rem", color: textMuted, fontWeight: 600 } }, "Employee:"),
                React.createElement("select", { value: activeEmpId, onChange: (e) => setActiveEmpId(e.target.value), style: {
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: `1px solid ${border}`,
                        backgroundColor: surface,
                        color: textPrimary,
                        fontSize: "0.85rem",
                        fontFamily: "monospace",
                        outline: "none",
                    } }, employees.length === 0 ? (React.createElement("option", { value: "" }, "No employees found")) : (employees.map((emp) => (React.createElement("option", { key: emp.employee_id, value: emp.employee_id }, emp.employee_id)))))),
            activeEmpId && onReEnroll && (React.createElement("button", { type: "button", onClick: () => onReEnroll(activeEmpId), style: {
                    padding: "8px 14px",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: "#0ea5e9",
                    color: "#ffffff",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                } }, "\u21BB Re-Enroll Biometric Angles"))),
        loading ? (React.createElement("div", { style: { padding: "32px", textAlign: "center", color: textMuted } }, "Loading biometric vector repository...")) : !currentEmp ? (React.createElement("div", { style: {
                padding: "32px",
                textAlign: "center",
                borderRadius: "10px",
                border: `1px solid ${border}`,
                backgroundColor: surface,
                color: textMuted,
            } }, "Select an employee to inspect multi-angle biometric vectors.")) : (React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" } }, ["left", "right", "front"].map((angle) => (React.createElement("div", { key: angle, style: {
                borderRadius: "12px",
                border: `1px solid ${border}`,
                backgroundColor: surface,
                padding: "16px",
                boxSizing: "border-box",
            } },
            React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" } },
                React.createElement("span", { style: { fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase", color: "#38bdf8" } },
                    angle,
                    " Angle"),
                React.createElement("span", { style: {
                        padding: "2px 8px",
                        borderRadius: "12px",
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        backgroundColor: isLight ? "#ecfdf5" : "rgba(16, 185, 129, 0.15)",
                        color: "#10b981",
                    } }, "\u2713 Registered")),
            React.createElement("div", { style: {
                    height: "110px",
                    borderRadius: "8px",
                    backgroundColor: isLight ? "#f1f5f9" : "#080c17",
                    border: `1px dashed ${border}`,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "12px",
                    color: textMuted,
                } },
                React.createElement("span", { style: { fontSize: "1.8rem", marginBottom: "4px" } }, angle === "left" ? "👤⬅" : angle === "right" ? "👤➡" : "👤🎯"),
                React.createElement("span", { style: { fontSize: "0.72rem" } }, "128D Mathematical Vector")),
            React.createElement("div", { style: { fontSize: "0.76rem", color: textMuted } },
                React.createElement("div", null,
                    "Employee: ",
                    React.createElement("strong", { style: { color: textPrimary, fontFamily: "monospace" } }, currentEmp.employee_id)),
                React.createElement("div", { style: { marginTop: "4px" } },
                    "Workspace: ",
                    currentEmp.workspace_id),
                React.createElement("div", { style: { marginTop: "4px" } }, "Status: Active 1:N Matchable")))))))));
};
