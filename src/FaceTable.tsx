"use client";

import React, { useEffect, useState } from "react";
import { EnrolledEmployee, fetchEmployees } from "./api.js";
import { KioskTheme } from "./types.js";

interface FaceTableProps {
  apiKey: string;
  workspaceId: string;
  selectedEmployeeId?: string;
  apiUrl?: string;
  theme?: KioskTheme;
  onReEnroll?: (employeeId: string) => void;
}

export const FaceTable: React.FC<FaceTableProps> = ({
  apiKey,
  workspaceId,
  selectedEmployeeId,
  apiUrl = "https://api.sureclock.karalasoft.com",
  theme = "dark",
  onReEnroll,
}) => {
  const [employees, setEmployees] = useState<EnrolledEmployee[]>([]);
  const [activeEmpId, setActiveEmpId] = useState<string>(selectedEmployeeId || "");
  const [loading, setLoading] = useState<boolean>(true);

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
      if (!apiKey || !workspaceId) return;
      setLoading(true);
      try {
        const data = await fetchEmployees(apiKey, workspaceId, apiUrl);
        setEmployees(data || []);
        if (!activeEmpId && data && data.length > 0) {
          setActiveEmpId(data[0].employee_id);
        }
      } catch (_) {
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [apiKey, workspaceId, apiUrl]);

  const currentEmp = employees.find((e) => e.employee_id === activeEmpId);

  return (
    <div style={{ width: "100%", color: textPrimary }}>
      {/* Selector row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <label style={{ fontSize: "0.82rem", color: textMuted, fontWeight: 600 }}>Employee:</label>
          <select
            value={activeEmpId}
            onChange={(e) => setActiveEmpId(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              border: `1px solid ${border}`,
              backgroundColor: surface,
              color: textPrimary,
              fontSize: "0.85rem",
              fontFamily: "monospace",
              outline: "none",
            }}
          >
            {employees.length === 0 ? (
              <option value="">No employees found</option>
            ) : (
              employees.map((emp) => (
                <option key={emp.employee_id} value={emp.employee_id}>
                  {emp.employee_id}
                </option>
              ))
            )}
          </select>
        </div>

        {activeEmpId && onReEnroll && (
          <button
            type="button"
            onClick={() => onReEnroll(activeEmpId)}
            style={{
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
            }}
          >
            ↻ Re-Enroll Biometric Angles
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ padding: "32px", textAlign: "center", color: textMuted }}>
          Loading biometric vector repository...
        </div>
      ) : !currentEmp ? (
        <div
          style={{
            padding: "32px",
            textAlign: "center",
            borderRadius: "10px",
            border: `1px solid ${border}`,
            backgroundColor: surface,
            color: textMuted,
          }}
        >
          Select an employee to inspect multi-angle biometric vectors.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
          {["left", "right", "front"].map((angle) => {
            const angleImg =
              currentEmp.angle_images?.find((ai) => ai.angle === angle)?.image_url ||
              (angle === "front" ? currentEmp.image_url : null);

            return (
              <div
                key={angle}
                style={{
                  borderRadius: "12px",
                  border: `1px solid ${border}`,
                  backgroundColor: surface,
                  padding: "16px",
                  boxSizing: "border-box",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase", color: "#38bdf8" }}>
                    {angle} Angle
                  </span>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "12px",
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      backgroundColor: isLight ? "#ecfdf5" : "rgba(16, 185, 129, 0.15)",
                      color: "#10b981",
                    }}
                  >
                    ✓ Registered
                  </span>
                </div>

                <div
                  style={{
                    height: "140px",
                    borderRadius: "8px",
                    backgroundColor: isLight ? "#f1f5f9" : "#080c17",
                    border: `1px solid ${border}`,
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "12px",
                    color: textMuted,
                    position: "relative",
                  }}
                >
                  {angleImg ? (
                    <img
                      src={angleImg}
                      alt={`${currentEmp.employee_id} ${angle}`}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <>
                      <span style={{ fontSize: "1.8rem", marginBottom: "4px" }}>
                        {angle === "left" ? "👤⬅" : angle === "right" ? "👤➡" : "👤🎯"}
                      </span>
                      <span style={{ fontSize: "0.72rem" }}>128D Mathematical Vector</span>
                    </>
                  )}
                </div>

                <div style={{ fontSize: "0.76rem", color: textMuted }}>
                  <div>Employee: <strong style={{ color: textPrimary, fontFamily: "monospace" }}>{currentEmp.employee_id}</strong></div>
                  <div style={{ marginTop: "4px" }}>Workspace: {currentEmp.workspace_id}</div>
                  <div style={{ marginTop: "4px" }}>Status: Active 1:N Matchable</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
