"use client";
import React, { useEffect, useState } from "react";
import { deleteEmployee, fetchEmployees } from "./api.js";
import { ConfirmModal, Toast } from "./components/Modal.js";
export const EmployeeTable = ({ apiKey, workspaceId, apiUrl = "https://api.sureclock.karalasoft.com", theme = "dark", onEnrollNew, onSelectEmployee, }) => {
    const [employees, setEmployees] = useState([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState(null);
    const [error, setError] = useState(null);
    const [employeeToDelete, setEmployeeToDelete] = useState(null);
    const [toast, setToast] = useState(null);
    const isLight = theme === "light";
    const border = isLight ? "#e2e8f0" : "#1e293b";
    const surface = isLight ? "#f8fafc" : "#0f172a";
    const textPrimary = isLight ? "#0f172a" : "#f8fafc";
    const textMuted = isLight ? "#64748b" : "#94a3b8";
    const loadData = async () => {
        if (!apiKey || !workspaceId)
            return;
        setLoading(true);
        setError(null);
        try {
            const data = await fetchEmployees(apiKey, workspaceId, apiUrl);
            setEmployees(Array.isArray(data) ? data : (Array.isArray(data?.employees) ? data.employees : []));
        }
        catch (err) {
            setError(err.message || "Failed to load employees");
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        loadData();
    }, [apiKey, workspaceId, apiUrl]);
    const handleDelete = (employeeId) => {
        setEmployeeToDelete(employeeId);
    };
    const confirmDelete = async () => {
        if (!employeeToDelete)
            return;
        setDeletingId(employeeToDelete);
        try {
            await deleteEmployee(apiKey, workspaceId, employeeToDelete, apiUrl);
            setEmployees((prev) => prev.filter((e) => e.employee_id !== employeeToDelete));
            setToast({ message: `Biometric data for ${employeeToDelete} permanently deleted.`, type: "success" });
            setTimeout(() => setToast(null), 3500);
        }
        catch (err) {
            setToast({ message: `Error deleting employee: ${err.message}`, type: "error" });
            setTimeout(() => setToast(null), 4000);
        }
        finally {
            setDeletingId(null);
            setEmployeeToDelete(null);
        }
    };
    const filtered = employees.filter((e) => e.employee_id.toLowerCase().includes(search.toLowerCase()) ||
        (e.name && e.name.toLowerCase().includes(search.toLowerCase())));
    return (React.createElement("div", { style: { width: "100%", color: textPrimary } },
        React.createElement("div", { style: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
                marginBottom: "16px",
                flexWrap: "wrap",
            } },
            React.createElement("div", { style: { position: "relative", flex: 1, minWidth: "200px" } },
                React.createElement("input", { type: "text", value: search, onChange: (e) => setSearch(e.target.value), placeholder: "Search employee ID or name...", style: {
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: `1px solid ${border}`,
                        backgroundColor: surface,
                        color: textPrimary,
                        fontSize: "0.85rem",
                        boxSizing: "border-box",
                        outline: "none",
                    } })),
            React.createElement("div", { style: { display: "flex", gap: "8px" } },
                React.createElement("button", { type: "button", onClick: loadData, style: {
                        padding: "8px 14px",
                        borderRadius: "8px",
                        border: `1px solid ${border}`,
                        backgroundColor: surface,
                        color: textMuted,
                        fontSize: "0.82rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                    } }, "\u21BB Refresh"),
                onEnrollNew && (React.createElement("button", { type: "button", onClick: onEnrollNew, style: {
                        padding: "8px 16px",
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
                    } }, "+ Enroll New Face")))),
        error && (React.createElement("div", { style: {
                padding: "10px 14px",
                borderRadius: "8px",
                backgroundColor: isLight ? "#fef2f2" : "#450a0a",
                color: isLight ? "#b91c1c" : "#fca5a5",
                fontSize: "0.82rem",
                marginBottom: "14px",
            } }, error)),
        React.createElement("div", { style: {
                overflowX: "auto",
                borderRadius: "10px",
                border: `1px solid ${border}`,
                backgroundColor: surface,
            } },
            React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" } },
                React.createElement("thead", null,
                    React.createElement("tr", { style: { borderBottom: `1px solid ${border}`, backgroundColor: isLight ? "#f1f5f9" : "#090d16" } },
                        React.createElement("th", { style: { padding: "12px 14px", fontWeight: 600, color: textMuted } }, "Employee"),
                        React.createElement("th", { style: { padding: "12px 14px", fontWeight: 600, color: textMuted } }, "Workspace"),
                        React.createElement("th", { style: { padding: "12px 14px", fontWeight: 600, color: textMuted } }, "Enrolled Date"),
                        React.createElement("th", { style: { padding: "12px 14px", fontWeight: 600, color: textMuted } }, "Biometric Vector"),
                        React.createElement("th", { style: { padding: "12px 14px", fontWeight: 600, color: textMuted, textAlign: "right" } }, "Actions"))),
                React.createElement("tbody", null, loading ? (React.createElement("tr", null,
                    React.createElement("td", { colSpan: 5, style: { padding: "28px", textAlign: "center", color: textMuted } }, "Loading enrolled employees..."))) : filtered.length === 0 ? (React.createElement("tr", null,
                    React.createElement("td", { colSpan: 5, style: { padding: "28px", textAlign: "center", color: textMuted } }, search ? `No employees matching "${search}"` : "No enrolled employees found in this workspace."))) : (filtered.map((emp) => (React.createElement("tr", { key: emp.employee_id, style: { borderBottom: `1px solid ${border}` } },
                    React.createElement("td", { style: { padding: "12px 14px" } },
                        React.createElement("div", { style: { fontWeight: 600, color: textPrimary } }, emp.name || emp.employee_id),
                        React.createElement("div", { style: { fontSize: "0.75rem", fontFamily: "monospace", color: textMuted } }, emp.name ? emp.employee_id : "Badge Code")),
                    React.createElement("td", { style: { padding: "12px 14px", color: textMuted } }, emp.workspace_id),
                    React.createElement("td", { style: { padding: "12px 14px", color: textMuted } }, emp.enrolled_at ? new Date(emp.enrolled_at).toLocaleDateString() : "Active"),
                    React.createElement("td", { style: { padding: "12px 14px" } },
                        React.createElement("span", { style: {
                                padding: "2px 8px",
                                borderRadius: "12px",
                                fontSize: "0.72rem",
                                fontWeight: 600,
                                backgroundColor: isLight ? "#ecfdf5" : "rgba(16, 185, 129, 0.15)",
                                color: "#10b981",
                                border: "1px solid rgba(16, 185, 129, 0.3)",
                            } }, "128D Active")),
                    React.createElement("td", { style: { padding: "12px 14px", textAlign: "right" } },
                        React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: "6px" } },
                            onSelectEmployee && (React.createElement("button", { type: "button", onClick: () => onSelectEmployee(emp.employee_id), style: {
                                    padding: "4px 8px",
                                    borderRadius: "6px",
                                    border: `1px solid ${border}`,
                                    background: "transparent",
                                    color: "#0ea5e9",
                                    fontSize: "0.78rem",
                                    cursor: "pointer",
                                } }, "View Faces")),
                            React.createElement("button", { type: "button", onClick: () => handleDelete(emp.employee_id), disabled: deletingId === emp.employee_id, style: {
                                    padding: "4px 8px",
                                    borderRadius: "6px",
                                    border: `1px solid ${border}`,
                                    background: "transparent",
                                    color: "#ef4444",
                                    fontSize: "0.78rem",
                                    cursor: deletingId === emp.employee_id ? "not-allowed" : "pointer",
                                } }, deletingId === emp.employee_id ? "Deleting..." : "Delete")))))))))),
        React.createElement(ConfirmModal, { isOpen: !!employeeToDelete, title: "Delete Biometric Profile", message: React.createElement("span", null,
                "Are you sure you want to permanently delete biometric vectors and profile records for employee",
                " ",
                React.createElement("strong", { style: { color: "#ef4444", fontFamily: "monospace" } }, employeeToDelete),
                "? This action cannot be undone."), confirmLabel: "Delete Biometrics", cancelLabel: "Cancel", danger: true, theme: theme, loading: !!deletingId, onCancel: () => setEmployeeToDelete(null), onConfirm: confirmDelete }),
        toast && (React.createElement("div", { style: { position: "fixed", bottom: "24px", right: "24px", zIndex: 99999 } },
            React.createElement(Toast, { message: toast.message, type: toast.type, onClose: () => setToast(null) })))));
};
