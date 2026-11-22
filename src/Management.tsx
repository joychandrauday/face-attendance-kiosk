"use client";

import React, { useEffect, useState } from "react";
import { AnalyticsDashboard } from "./AnalyticsDashboard.js";
import { AttendanceLogs } from "./AttendanceLogs.js";
import { EmployeeTable } from "./EmployeeTable.js";
import { FaceEnrollment } from "./Enrollment.js";
import { FaceAttendanceKiosk } from "./FaceAttendanceKiosk.js";
import { FaceTable } from "./FaceTable.js";
import { SureClockSettings } from "./Settings.js";
import { KioskTheme, SureClockManagerProps } from "./types.js";
import { DEFAULT_TIMEZONE } from "./utils/time.js";
import { fetchWorkspaceSettings } from "./api.js";

export const SureClockManager: React.FC<SureClockManagerProps> = ({
  apiKey,
  api_key,
  workspaceId,
  workspace_id,
  apiUrl = "https://api.sureclock.karalasoft.com",
  theme = "dark",
  timezone: propTimezone,
  styles = {},
  className = "",
  initialTab = "kiosk",
  title = "SureClock Biometric Hub",
  showKioskTab = true,
  showSettingsTab = true,
  kioskProps = {},
  onAttendance,
  onEnrollment,
}) => {
  const effectiveApiKey = apiKey || api_key || "";
  const effectiveWorkspaceId = workspaceId || workspace_id || "";

  type ManagerTab = "kiosk" | "logs" | "employees" | "faces" | "analytics" | "settings";
  const validTabs: ManagerTab[] = ["kiosk", "logs", "employees", "faces", "analytics", "settings"];

  const getInitialTab = (): ManagerTab => {
    if (typeof window !== "undefined") {
      try {
        const params = new URLSearchParams(window.location.search);
        const t = params.get("tab")?.toLowerCase();
        if (t && validTabs.includes(t as ManagerTab)) {
          return t as ManagerTab;
        }
      } catch (_) {}
    }
    return initialTab;
  };

  const [activeTab, setActiveTab] = useState<ManagerTab>(getInitialTab);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [timezone, setTimezone] = useState<string>(propTimezone || DEFAULT_TIMEZONE);
  const [selectedEmpForFaces, setSelectedEmpForFaces] = useState<string>("");
  const [showEnrollModal, setShowEnrollModal] = useState<boolean>(false);
  const [enrollTargetEmpId, setEnrollTargetEmpId] = useState<string>("");

  const handleTabChange = (tab: ManagerTab) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set("tab", tab);
        window.history.replaceState({}, "", url.toString());
      } catch (_) {}
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPopState = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const t = params.get("tab")?.toLowerCase();
        if (t && validTabs.includes(t as ManagerTab)) {
          setActiveTab(t as ManagerTab);
        }
      } catch (_) {}
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (propTimezone) {
      setTimezone(propTimezone);
      return;
    }
    if (!effectiveApiKey || !effectiveWorkspaceId) return;
    fetchWorkspaceSettings(effectiveApiKey, effectiveWorkspaceId, apiUrl)
      .then((data) => {
        if (data.timezone) setTimezone(data.timezone);
      })
      .catch(() => {});
  }, [effectiveApiKey, effectiveWorkspaceId, apiUrl, propTimezone]);

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
    handleTabChange("faces");
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
            flexWrap: "wrap",
            gap: "2px",
          }}
        >
          {showKioskTab && (
            <button
              type="button"
              onClick={() => handleTabChange("kiosk")}
              style={{
                padding: "6px 14px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: activeTab === "kiosk" ? themeTokens.tabActive : "transparent",
                color: activeTab === "kiosk" ? "#ffffff" : themeTokens.textMuted,
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              📸 Kiosk
            </button>
          )}
          <button
            type="button"
            onClick={() => handleTabChange("logs")}
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: activeTab === "logs" ? themeTokens.tabActive : "transparent",
              color: activeTab === "logs" ? "#ffffff" : themeTokens.textMuted,
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            📋 Logs
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("employees")}
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
            onClick={() => handleTabChange("faces")}
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
            👤 Faces
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("analytics")}
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
            📊 Analytics
          </button>
          {showSettingsTab && (
            <button
              type="button"
              onClick={() => handleTabChange("settings")}
              style={{
                padding: "6px 14px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: activeTab === "settings" ? themeTokens.tabActive : "transparent",
                color: activeTab === "settings" ? "#ffffff" : themeTokens.textMuted,
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              ⚙️ Settings
            </button>
          )}
        </div>
      </div>

      {/* Tab Contents */}
      {activeTab === "kiosk" && showKioskTab && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", padding: "12px 0" }}>
          <div style={{ maxWidth: "480px", width: "100%", margin: "0 auto" }}>
            <FaceAttendanceKiosk
              apiKey={effectiveApiKey}
              workspaceId={effectiveWorkspaceId}
              apiUrl={apiUrl}
              theme={theme}
              timezone={timezone}
              buttonLabel="Verify Attendance"
              enableSound={true}
              mirror={true}
              onSuccess={(result) => {
                setRefreshKey((k) => k + 1);
                if (onAttendance) onAttendance(result);
              }}
              {...kioskProps}
            />
          </div>
        </div>
      )}

      {activeTab === "logs" && (
        <AttendanceLogs
          key={`logs-${refreshKey}-${timezone}`}
          apiKey={effectiveApiKey}
          workspaceId={effectiveWorkspaceId}
          apiUrl={apiUrl}
          theme={theme}
          timezone={timezone}
          autoRefresh={true}
        />
      )}

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
          key={`analytics-${refreshKey}-${timezone}`}
          apiKey={effectiveApiKey}
          workspaceId={effectiveWorkspaceId}
          apiUrl={apiUrl}
          theme={theme}
          timezone={timezone}
        />
      )}

      {activeTab === "settings" && showSettingsTab && (
        <SureClockSettings
          key={`settings-${refreshKey}`}
          apiKey={effectiveApiKey}
          workspaceId={effectiveWorkspaceId}
          apiUrl={apiUrl}
          theme={theme}
          timezone={timezone}
          onSave={(updated) => {
            if (updated?.timezone) {
              setTimezone(updated.timezone);
            }
            setRefreshKey((k) => k + 1);
          }}
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
              onSuccess={(result) => {
                if (onEnrollment) onEnrollment(result);
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
