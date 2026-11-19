"use client";

import React, { useEffect, useState } from "react";
import { EnrolledEmployee, deleteEmployee, fetchEmployees } from "./api.js";
import { KioskTheme } from "./types.js";

interface EmployeeTableProps {
  apiKey: string;
  workspaceId: string;
  apiUrl?: string;
  theme?: KioskTheme;
  onEnrollNew?: () => void;
  onSelectEmployee?: (empId: string) => void;
}

export const EmployeeTable: React.FC<EmployeeTableProps> = ({
  apiKey,
  workspaceId,
  apiUrl = "https://api.sureclock.karalasoft.com",
  theme = "dark",
  onEnrollNew,
  onSelectEmployee,
}) => {
  const [employees, setEmployees] = useState<EnrolledEmployee[]>([]);
  const [search, setSearch] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isLight = theme === "light";
  const border = isLight ? "#e2e8f0" : "#1e293b";
  const surface = isLight ? "#f8fafc" : "#0f172a";
  const textPrimary = isLight ? "#0f172a" : "#f8fafc";
  const textMuted = isLight ? "#64748b" : "#94a3b8";

  const loadData = async () => {
    if (!apiKey || !workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEmployees(apiKey, workspaceId, apiUrl);
      setEmployees(data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [apiKey, workspaceId, apiUrl]);

  const handleDelete = async (employeeId: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete biometric data for ${employeeId}?`)) {
      return;
    }
    setDeletingId(employeeId);
    try {
      await deleteEmployee(apiKey, workspaceId, employeeId, apiUrl);
      setEmployees((prev) => prev.filter((e) => e.employee_id !== employeeId));
    } catch (err: any) {
      alert(`Error deleting employee: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = employees.filter((e) =>
    e.employee_id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ width: "100%", color: textPrimary }}>
      {/* Top action toolbar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          marginBottom: "16px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee ID..."
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: "8px",
              border: `1px solid ${border}`,
              backgroundColor: surface,
              color: textPrimary,
              fontSize: "0.85rem",
              boxSizing: "border-box",
              outline: "none",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            onClick={loadData}
            style={{
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
            }}
          >
            ↻ Refresh
          </button>
          {onEnrollNew && (
            <button
              type="button"
              onClick={onEnrollNew}
              style={{
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
              }}
            >
              + Enroll New Face
            </button>
          )}
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: "8px",
            backgroundColor: isLight ? "#fef2f2" : "#450a0a",
            color: isLight ? "#b91c1c" : "#fca5a5",
            fontSize: "0.82rem",
            marginBottom: "14px",
          }}
        >
          {error}
        </div>
      )}

      {/* Table */}
      <div
        style={{
          overflowX: "auto",
          borderRadius: "10px",
          border: `1px solid ${border}`,
          backgroundColor: surface,
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${border}`, backgroundColor: isLight ? "#f1f5f9" : "#090d16" }}>
              <th style={{ padding: "12px 14px", fontWeight: 600, color: textMuted }}>Employee ID</th>
              <th style={{ padding: "12px 14px", fontWeight: 600, color: textMuted }}>Workspace</th>
              <th style={{ padding: "12px 14px", fontWeight: 600, color: textMuted }}>Enrolled Date</th>
              <th style={{ padding: "12px 14px", fontWeight: 600, color: textMuted }}>Biometric Vector</th>
              <th style={{ padding: "12px 14px", fontWeight: 600, color: textMuted, textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ padding: "28px", textAlign: "center", color: textMuted }}>
                  Loading enrolled employees...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "28px", textAlign: "center", color: textMuted }}>
                  {search ? `No employees matching "${search}"` : "No enrolled employees found in this workspace."}
                </td>
              </tr>
            ) : (
              filtered.map((emp) => (
                <tr key={emp.employee_id} style={{ borderBottom: `1px solid ${border}` }}>
                  <td style={{ padding: "12px 14px", fontWeight: 600, fontFamily: "monospace" }}>
                    {emp.employee_id}
                  </td>
                  <td style={{ padding: "12px 14px", color: textMuted }}>
                    {emp.workspace_id}
                  </td>
                  <td style={{ padding: "12px 14px", color: textMuted }}>
                    {emp.enrolled_at ? new Date(emp.enrolled_at).toLocaleDateString() : "Active"}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "12px",
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        backgroundColor: isLight ? "#ecfdf5" : "rgba(16, 185, 129, 0.15)",
                        color: "#10b981",
                        border: "1px solid rgba(16, 185, 129, 0.3)",
                      }}
                    >
                      128D Active
                    </span>
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "right" }}>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                      {onSelectEmployee && (
                        <button
                          type="button"
                          onClick={() => onSelectEmployee(emp.employee_id)}
                          style={{
                            padding: "4px 8px",
                            borderRadius: "6px",
                            border: `1px solid ${border}`,
                            background: "transparent",
                            color: "#0ea5e9",
                            fontSize: "0.78rem",
                            cursor: "pointer",
                          }}
                        >
                          View Faces
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(emp.employee_id)}
                        disabled={deletingId === emp.employee_id}
                        style={{
                          padding: "4px 8px",
                          borderRadius: "6px",
                          border: `1px solid ${border}`,
                          background: "transparent",
                          color: "#ef4444",
                          fontSize: "0.78rem",
                          cursor: deletingId === emp.employee_id ? "not-allowed" : "pointer",
                        }}
                      >
                        {deletingId === emp.employee_id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
