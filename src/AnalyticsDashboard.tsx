"use client";

import React, { useEffect, useState } from "react";
import {
  AttendanceLogRecord,
  AttendanceStatResult,
  fetchAttendanceLogs,
  fetchAttendanceStats,
} from "./api.js";
import { KioskTheme } from "./types.js";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface AnalyticsDashboardProps {
  apiKey: string;
  workspaceId: string;
  apiUrl?: string;
  theme?: KioskTheme;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  apiKey,
  workspaceId,
  apiUrl = "https://api.sureclock.karalasoft.com",
  theme = "dark",
}) => {
  const [stats, setStats] = useState<AttendanceStatResult | null>(null);
  const [logs, setLogs] = useState<AttendanceLogRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
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
      const [statsData, logsData] = await Promise.all([
        fetchAttendanceStats(apiKey, workspaceId, undefined, apiUrl).catch(() => null),
        fetchAttendanceLogs(apiKey, workspaceId, 25, apiUrl).catch(() => []),
      ]);
      setStats(statsData);
      setLogs(logsData || []);
    } catch (err: any) {
      setError(err.message || "Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [apiKey, workspaceId, apiUrl]);

  // Transform hourly breakdown into chart-ready data
  const chartData = React.useMemo(() => {
    if (!stats?.hourly_breakdown) {
      // Default 24 hours
      return Array.from({ length: 12 }, (_, i) => {
        const hour = `${(i + 8).toString().padStart(2, "0")}:00`;
        return { hour, punches: 0 };
      });
    }

    const items = [];
    for (let h = 7; h <= 20; h++) {
      const key = h.toString().padStart(2, "0");
      items.push({
        hour: `${key}:00`,
        punches: Number(stats.hourly_breakdown[key] || 0),
      });
    }
    return items;
  }, [stats]);

  return (
    <div style={{ width: "100%", color: textPrimary }}>
      {/* KPI Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        <div style={{ padding: "14px", borderRadius: "10px", backgroundColor: surface, border: `1px solid ${border}` }}>
          <div style={{ fontSize: "0.72rem", color: textMuted, textTransform: "uppercase", fontWeight: 600 }}>
            Total Enrolled
          </div>
          <div style={{ fontSize: "1.4rem", fontWeight: 800, marginTop: "4px", color: "#38bdf8" }}>
            {stats ? stats.total_enrolled_employees : "-"}
          </div>
        </div>

        <div style={{ padding: "14px", borderRadius: "10px", backgroundColor: surface, border: `1px solid ${border}` }}>
          <div style={{ fontSize: "0.72rem", color: textMuted, textTransform: "uppercase", fontWeight: 600 }}>
            Present Today
          </div>
          <div style={{ fontSize: "1.4rem", fontWeight: 800, marginTop: "4px", color: "#10b981" }}>
            {stats ? stats.unique_clocked_in : "-"}
          </div>
        </div>

        <div style={{ padding: "14px", borderRadius: "10px", backgroundColor: surface, border: `1px solid ${border}` }}>
          <div style={{ fontSize: "0.72rem", color: textMuted, textTransform: "uppercase", fontWeight: 600 }}>
            Active On-Duty
          </div>
          <div style={{ fontSize: "1.4rem", fontWeight: 800, marginTop: "4px", color: "#6366f1" }}>
            {stats ? stats.active_on_duty_count : "-"}
          </div>
        </div>

        <div style={{ padding: "14px", borderRadius: "10px", backgroundColor: surface, border: `1px solid ${border}` }}>
          <div style={{ fontSize: "0.72rem", color: textMuted, textTransform: "uppercase", fontWeight: 600 }}>
            Total Punches
          </div>
          <div style={{ fontSize: "1.4rem", fontWeight: 800, marginTop: "4px", color: "#f59e0b" }}>
            {stats ? stats.total_punches : "-"}
          </div>
        </div>

        <div style={{ padding: "14px", borderRadius: "10px", backgroundColor: surface, border: `1px solid ${border}` }}>
          <div style={{ fontSize: "0.72rem", color: textMuted, textTransform: "uppercase", fontWeight: 600 }}>
            Avg Confidence
          </div>
          <div style={{ fontSize: "1.4rem", fontWeight: 800, marginTop: "4px", color: "#10b981" }}>
            {stats ? `${(stats.average_confidence * 100).toFixed(1)}%` : "-"}
          </div>
        </div>
      </div>

      {/* Hourly Attendance Punch Activity Chart */}
      <div
        style={{
          padding: "20px",
          borderRadius: "14px",
          backgroundColor: surface,
          border: `1px solid ${border}`,
          marginBottom: "20px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
              Hourly Attendance Traffic (Punches / Hour)
            </h3>
            <p style={{ margin: "2px 0 0 0", fontSize: "0.75rem", color: textMuted }}>
              Biometric verification peak times throughout the workday
            </p>
          </div>
          <button
            type="button"
            onClick={loadData}
            style={{
              padding: "4px 10px",
              borderRadius: "6px",
              border: `1px solid ${border}`,
              background: "transparent",
              color: textMuted,
              fontSize: "0.75rem",
              cursor: "pointer",
            }}
          >
            ↻ Refresh
          </button>
        </div>

        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isLight ? "#e2e8f0" : "#1e293b"} />
              <XAxis dataKey="hour" stroke={textMuted} fontSize={12} tickLine={false} />
              <YAxis stroke={textMuted} fontSize={12} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: isLight ? "#ffffff" : "#0f172a",
                  borderColor: border,
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: textPrimary,
                }}
              />
              <Bar dataKey="punches" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="Punches" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Live Recent Attendance Logs */}
      <div
        style={{
          borderRadius: "14px",
          backgroundColor: surface,
          border: `1px solid ${border}`,
          padding: "20px",
        }}
      >
        <div style={{ marginBottom: "14px" }}>
          <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
            Recent Biometric Attendance Logs
          </h3>
          <p style={{ margin: "2px 0 0 0", fontSize: "0.75rem", color: textMuted }}>
            Live verification stream recorded by SureClock kiosks
          </p>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.82rem" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${border}`, color: textMuted }}>
                <th style={{ padding: "10px 12px" }}>Time</th>
                <th style={{ padding: "10px 12px" }}>Employee ID</th>
                <th style={{ padding: "10px 12px" }}>Direction</th>
                <th style={{ padding: "10px 12px" }}>Confidence</th>
                <th style={{ padding: "10px 12px" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: "24px", textAlign: "center", color: textMuted }}>
                    Loading attendance audit logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "24px", textAlign: "center", color: textMuted }}>
                    No recent verification logs recorded yet.
                  </td>
                </tr>
              ) : (
                logs.slice(0, 10).map((log, i) => {
                  const isOut = log.punch_type === "OUT";
                  return (
                    <tr key={log.id || i} style={{ borderBottom: `1px solid ${border}` }}>
                      <td style={{ padding: "10px 12px", fontFamily: "monospace", color: textMuted }}>
                        {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : "-"}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ fontWeight: 600 }}>{log.employee_name || log.employee_id}</div>
                        {log.employee_name && (
                          <div style={{ fontSize: "0.7rem", color: textMuted, fontFamily: "monospace" }}>
                            {log.employee_id}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: "10px",
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            backgroundColor: isOut ? "rgba(245, 158, 11, 0.15)" : "rgba(16, 185, 129, 0.15)",
                            color: isOut ? "#f59e0b" : "#10b981",
                          }}
                        >
                          {log.punch_type || "PUNCH"}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", fontFamily: "monospace" }}>
                        {log.confidence ? `${(log.confidence * 100).toFixed(1)}%` : "-"}
                      </td>
                      <td style={{ padding: "10px 12px", color: "#10b981" }}>
                        ✓ Verified
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
