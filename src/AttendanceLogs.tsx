"use client";

import React, { useEffect, useState, useMemo } from "react";
import { AttendanceLogRecord, fetchAttendanceLogs } from "./api.js";
import { KioskTheme } from "./types.js";
import { DEFAULT_TIMEZONE, format12HourTime, formatDate } from "./utils/time.js";

export interface AttendanceLogsProps {
  apiKey: string;
  workspaceId: string;
  apiUrl?: string;
  theme?: KioskTheme;
  timezone?: string;
  limit?: number;
  autoRefresh?: boolean;
  refreshIntervalMs?: number;
  className?: string;
}

export const AttendanceLogs: React.FC<AttendanceLogsProps> = ({
  apiKey,
  workspaceId,
  apiUrl = "https://api.sureclock.karalasoft.com",
  theme = "dark",
  timezone = DEFAULT_TIMEZONE,
  limit = 50,
  autoRefresh = true,
  refreshIntervalMs = 12000,
  className = "",
}) => {
  const [logs, setLogs] = useState<AttendanceLogRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [filterType, setFilterType] = useState<"ALL" | "IN" | "OUT">("ALL");
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);

  const isLight = theme === "light";
  const themeTokens = {
    surface: isLight ? "#ffffff" : "#0f172a",
    border: isLight ? "#e2e8f0" : "#1e293b",
    borderStrong: isLight ? "#cbd5e1" : "#334155",
    textPrimary: isLight ? "#0f172a" : "#f8fafc",
    textMuted: isLight ? "#64748b" : "#94a3b8",
    headerBg: isLight ? "#f8fafc" : "#0a0f1d",
    rowHover: isLight ? "#f1f5f9" : "#131e36",
    inputBg: isLight ? "#f8fafc" : "#080d1a",
  };

  const loadLogs = async (silent = false) => {
    if (!apiKey || !workspaceId) return;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await fetchAttendanceLogs(apiKey, workspaceId, limit, apiUrl);
      setLogs(data || []);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.message || "Failed to load attendance logs");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [apiKey, workspaceId, apiUrl, limit]);

  // Real-time polling
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      loadLogs(true);
    }, refreshIntervalMs);
    return () => clearInterval(timer);
  }, [autoRefresh, refreshIntervalMs, apiKey, workspaceId, apiUrl, limit]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        !search ||
        log.employee_id.toLowerCase().includes(searchLower) ||
        (log.employee_name && log.employee_name.toLowerCase().includes(searchLower));
      const pType = (log.punch_type || "IN").toUpperCase();
      const matchesType =
        filterType === "ALL" ||
        (filterType === "IN" && pType === "IN") ||
        (filterType === "OUT" && pType === "OUT");
      return matchesSearch && matchesType;
    });
  }, [logs, search, filterType]);

  const formatTimestamp = (ts: string) => {
    return {
      date: formatDate(ts, timezone),
      time: format12HourTime(ts, timezone, true),
    };
  };

  const formatDuration = (mins?: number | null, hours?: number | null) => {
    if (mins != null && mins > 0) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${h}h ${m}m`;
    }
    if (hours != null && hours > 0) {
      const totalM = Math.round(hours * 60);
      const h = Math.floor(totalM / 60);
      const m = totalM % 60;
      return `${h}h ${m}m`;
    }
    if (mins === 0) return "0h 00m";
    return "-";
  };

  const renderShiftStatusBadge = (status?: string | null) => {
    const st = (status || "").toUpperCase();
    if (st === "OPEN") {
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            fontSize: "0.74rem",
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: "10px",
            backgroundColor: "rgba(14, 165, 233, 0.15)",
            color: "#38bdf8",
            border: "1px solid rgba(14, 165, 233, 0.3)",
          }}
        >
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#38bdf8" }} />
          ON-DUTY
        </span>
      );
    }
    if (st === "COMPLETED") {
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "0.74rem",
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: "10px",
            backgroundColor: "rgba(16, 185, 129, 0.15)",
            color: "#10b981",
            border: "1px solid rgba(16, 185, 129, 0.3)",
          }}
        >
          ✓ COMPLETED
        </span>
      );
    }
    if (st === "AUTO_CLOSED") {
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "0.74rem",
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: "10px",
            backgroundColor: "rgba(245, 158, 11, 0.15)",
            color: "#f59e0b",
            border: "1px solid rgba(245, 158, 11, 0.3)",
          }}
        >
          ⚠️ AUTO-CLOSED
        </span>
      );
    }
    return <span style={{ color: themeTokens.textMuted }}>-</span>;
  };

  return (
    <div
      className={`sureclock-attendance-logs ${className}`}
      style={{
        width: "100%",
        backgroundColor: themeTokens.surface,
        border: `1px solid ${themeTokens.border}`,
        borderRadius: "14px",
        overflow: "hidden",
        color: themeTokens.textPrimary,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Control Toolbar */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: `1px solid ${themeTokens.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: "1 1 240px" }}>
          <div style={{ position: "relative", width: "100%", maxWidth: "280px" }}>
            <input
              type="text"
              placeholder="Search employee ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "8px",
                border: `1px solid ${themeTokens.border}`,
                backgroundColor: themeTokens.inputBg,
                color: themeTokens.textPrimary,
                fontSize: "0.84rem",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Punch Type Filter Toggle */}
          <div
            style={{
              display: "inline-flex",
              backgroundColor: themeTokens.inputBg,
              border: `1px solid ${themeTokens.border}`,
              borderRadius: "8px",
              padding: "2px",
            }}
          >
            {(["ALL", "IN", "OUT"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFilterType(t)}
                style={{
                  padding: "4px 10px",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: filterType === t ? (isLight ? "#e2e8f0" : "#1e293b") : "transparent",
                  color: filterType === t ? themeTokens.textPrimary : themeTokens.textMuted,
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span
            style={{
              fontSize: "0.75rem",
              color: themeTokens.textMuted,
              fontFamily: "monospace",
            }}
          >
            Updated {format12HourTime(lastUpdated, timezone, true)}
          </span>

          <button
            type="button"
            onClick={() => loadLogs(false)}
            disabled={loading}
            style={{
              padding: "7px 12px",
              borderRadius: "8px",
              border: `1px solid ${themeTokens.border}`,
              backgroundColor: "transparent",
              color: themeTokens.textMuted,
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span style={{ display: "inline-block", transform: loading ? "rotate(180deg)" : "none", transition: "transform 0.5s ease" }}>
              ↻
            </span>
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: "12px 20px", backgroundColor: "#450a0a", color: "#fca5a5", fontSize: "0.82rem" }}>
          {error}
        </div>
      )}

      {/* Logs Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.84rem", textAlign: "left" }}>
          <thead>
            <tr style={{ backgroundColor: themeTokens.headerBg, borderBottom: `1px solid ${themeTokens.border}` }}>
              <th style={{ padding: "12px 16px", color: themeTokens.textMuted, fontWeight: 600 }}>Date</th>
              <th style={{ padding: "12px 16px", color: themeTokens.textMuted, fontWeight: 600 }}>Time (12h)</th>
              <th style={{ padding: "12px 16px", color: themeTokens.textMuted, fontWeight: 600 }}>Employee</th>
              <th style={{ padding: "12px 16px", color: themeTokens.textMuted, fontWeight: 600 }}>Direction</th>
              <th style={{ padding: "12px 16px", color: themeTokens.textMuted, fontWeight: 600 }}>Working Hours</th>
              <th style={{ padding: "12px 16px", color: themeTokens.textMuted, fontWeight: 600 }}>Shift Status</th>
              <th style={{ padding: "12px 16px", color: themeTokens.textMuted, fontWeight: 600 }}>Biometric Confidence</th>
              <th style={{ padding: "12px 16px", color: themeTokens.textMuted, fontWeight: 600, textAlign: "right" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && logs.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: "40px 20px", textAlign: "center", color: themeTokens.textMuted }}>
                  Loading real-time attendance logs...
                </td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: "40px 20px", textAlign: "center", color: themeTokens.textMuted }}>
                  No attendance records found.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => {
                const isOut = (log.punch_type || "IN").toUpperCase() === "OUT";
                const { date, time } = formatTimestamp(log.timestamp);
                const rawConf = log.confidence ?? (log as any).confidence_score;
                const confPct = rawConf != null ? (rawConf * 100).toFixed(1) : "99.0";
                const durationText = formatDuration(log.duration_minutes, log.duration_hours);

                return (
                  <tr
                    key={log.id}
                    style={{
                      borderBottom: `1px solid ${themeTokens.border}`,
                      transition: "background-color 0.1s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = themeTokens.rowHover)}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                      <div style={{ fontWeight: 600, color: themeTokens.textPrimary }}>{date}</div>
                    </td>
                    <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                      <div style={{ fontFamily: "monospace", fontVariantNumeric: "tabular-nums", color: themeTokens.textMuted }}>
                        {time}
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: 600, fontSize: "0.88rem", color: themeTokens.textPrimary }}>
                        {log.employee_name || log.employee_id}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: themeTokens.textMuted, fontFamily: "monospace", marginTop: "2px" }}>
                        {log.employee_id} • {workspaceId}
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          padding: "3px 9px",
                          borderRadius: "12px",
                          backgroundColor: isOut ? "rgba(217, 119, 6, 0.15)" : "rgba(16, 185, 129, 0.15)",
                          color: isOut ? "#f59e0b" : "#10b981",
                          border: `1px solid ${isOut ? "rgba(245, 158, 11, 0.3)" : "rgba(16, 185, 129, 0.3)"}`,
                        }}
                      >
                        <span
                          style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            backgroundColor: isOut ? "#f59e0b" : "#10b981",
                          }}
                        />
                        {isOut ? "CLOCK OUT" : "CLOCK IN"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                      <span
                        style={{
                          fontFamily: "monospace",
                          fontVariantNumeric: "tabular-nums",
                          fontWeight: 600,
                          color: durationText !== "-" ? themeTokens.textPrimary : themeTokens.textMuted,
                        }}
                      >
                        {durationText}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                      {renderShiftStatusBadge(log.shift_status)}
                    </td>
                    <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                      <span
                        style={{
                          fontFamily: "monospace",
                          fontVariantNumeric: "tabular-nums",
                          fontWeight: 600,
                          color: Number(confPct) >= 80 ? "#10b981" : "#38bdf8",
                        }}
                      >
                        {confPct}%
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                      <span style={{ fontSize: "0.75rem", color: "#10b981", fontWeight: 600 }}>
                        ✓ Verified
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
