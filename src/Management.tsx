"use client";

import React, { useState } from "react";
import { AnalyticsDashboard } from "./AnalyticsDashboard.js";
import { EmployeeTable } from "./EmployeeTable.js";
import { FaceEnrollment } from "./Enrollment.js";
import { FaceTable } from "./FaceTable.js";
import { KioskTheme, SureClockManagerProps } from "./types.js";

export const SureClockManager: React.FC<SureClockManagerProps> = ({
  apiKey,
  api_key,
  workspaceId,
  workspace_id,
  apiUrl = "https://api.sureclock.karalasoft.com",
  theme = "dark",
  styles = {},
  className = "",
  initialTab = "employees",
  title = "SureClock Biometric Hub",
}) => {
  const effectiveApiKey = apiKey || api_key || "";
  const effectiveWorkspaceId = workspaceId || workspace_id || "";

  const [activeTab, setActiveTab] = useState<"employees" | "faces" | "analytics">(initialTab);
  const [selectedEmpForFaces, setSelectedEmpForFaces] = useState<string>("");
  const [showEnrollModal, setShowEnrollModal] = useState<boolean>(false);
  const [enrollTargetEmpId, setEnrollTargetEmpId] = useState<string>("");

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

  const handleOpenEnroll = (empId?: string) => {
    setEnrollTargetEmpId(empId || "");
    setShowEnrollModal(true);
  };

  const handleSelectEmployeeForFaces = (empId: string) => {
    setSelectedEmpForFaces(empId);
    setActiveTab("faces");
  };

  return (
    <div
      className={`sureclock-manager-root ${className}`}
      style={{
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
      }}
    >
      {/* Top Header Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "20px",
          borderBottom: `1px solid ${themeTokens.border}`,
          paddingBottom: "16px",
          flexWrap: "wrap",
          gap: "12px",
          ...styles.header,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "12px",
              backgroundColor: isLight ? "#e0f2fe" : "#0c2847",
              border: `1px solid ${isLight ? "#bae6fd" : "#0284c7"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#0284c7",
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>
              {title}
            </h1>
            <p style={{ fontSize: "0.8rem", color: themeTokens.textMuted, margin: "2px 0 0 0" }}>
              Workspace: <strong style={{ color: "#38bdf8", fontFamily: "monospace" }}>{effectiveWorkspaceId || "Default"}</strong>
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: "flex",
            backgroundColor: isLight ? "#f1f5f9" : "#090d16",
            borderRadius: "10px",
            padding: "4px",
            border: `1px solid ${themeTokens.border}`,
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("employees")}
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: activeTab === "employees" ? themeTokens.tabActive : "transparent",
              color: activeTab === "employees" ? "#ffffff" : themeTokens.textMuted,
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            👥 Employees
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("faces")}
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: activeTab === "faces" ? themeTokens.tabActive : "transparent",
              color: activeTab === "faces" ? "#ffffff" : themeTokens.textMuted,
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            👤 Biometric Faces
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("analytics")}
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: activeTab === "analytics" ? themeTokens.tabActive : "transparent",
              color: activeTab === "analytics" ? "#ffffff" : themeTokens.textMuted,
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            📊 Analytics & Charts
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      {activeTab === "employees" && (
        <EmployeeTable
          apiKey={effectiveApiKey}
          workspaceId={effectiveWorkspaceId}
          apiUrl={apiUrl}
          theme={theme}
          onEnrollNew={() => handleOpenEnroll()}
          onSelectEmployee={handleSelectEmployeeForFaces}
        />
      )}

      {activeTab === "faces" && (
        <FaceTable
          apiKey={effectiveApiKey}
          workspaceId={effectiveWorkspaceId}
          selectedEmployeeId={selectedEmpForFaces}
          apiUrl={apiUrl}
          theme={theme}
          onReEnroll={(empId) => handleOpenEnroll(empId)}
        />
      )}

      {activeTab === "analytics" && (
        <AnalyticsDashboard
          apiKey={effectiveApiKey}
          workspaceId={effectiveWorkspaceId}
          apiUrl={apiUrl}
          theme={theme}
        />
      )}

      {/* Embedded Automated Enrollment Modal */}
      {showEnrollModal && (
        <div
          style={{
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
          }}
        >
          <div style={{ position: "relative", maxWidth: "540px", width: "100%" }}>
            <button
              type="button"
              onClick={() => setShowEnrollModal(false)}
              style={{
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
              }}
            >
              ✕
            </button>

            <FaceEnrollment
              apiKey={effectiveApiKey}
              workspaceId={effectiveWorkspaceId}
              employeeId={enrollTargetEmpId}
              apiUrl={apiUrl}
              theme={theme}
              onSuccess={() => {
                setTimeout(() => {
                  setShowEnrollModal(false);
                }, 2000);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Also export as Management for backward compatibility
export const Management = SureClockManager;
