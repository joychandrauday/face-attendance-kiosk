"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AttendanceLogRecord,
  AttendanceStatResult,
  EmployeeDailyHoursRecord,
  EnrolledEmployee,
  fetchAttendanceLogs,
  fetchAttendanceStats,
  fetchEmployeeDailyHours,
  fetchEmployees,
} from "./api.js";
import { KioskTheme } from "./types.js";
import {
  DEFAULT_TIMEZONE,
  format12HourTime,
  formatDate,
  formatHourlyLabel,
} from "./utils/time.js";
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
  timezone?: string;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  apiKey,
  workspaceId,
  apiUrl = "https://api.sureclock.karalasoft.com",
  theme = "dark",
  timezone = DEFAULT_TIMEZONE,
}) => {
  const [stats, setStats] = useState<AttendanceStatResult | null>(null);
  const [logs, setLogs] = useState<AttendanceLogRecord[]>([]);
  const [employees, setEmployees] = useState<EnrolledEmployee[]>([]);
  const [dailyHours, setDailyHours] = useState<EmployeeDailyHoursRecord[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState<string>("ALL");
  const [daysRange, setDaysRange] = useState<number>(14);
  const [loading, setLoading] = useState<boolean>(true);
  const [dailyLoading, setDailyLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isLight = theme === "light";
  const border = isLight ? "#e2e8f0" : "#1e293b";
  const surface = isLight ? "#ffffff" : "#0f172a";
  const cardBg = isLight ? "#f8fafc" : "#080d1a";
  const textPrimary = isLight ? "#0f172a" : "#f8fafc";
  const textMuted = isLight ? "#64748b" : "#94a3b8";
  const accent = "#0ea5e9";

  const loadBaseData = async () => {
    if (!apiKey || !workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const [statsData, logsData, empData] = await Promise.all([
        fetchAttendanceStats(apiKey, workspaceId, undefined, apiUrl).catch(() => null),
        fetchAttendanceLogs(apiKey, workspaceId, 25, apiUrl).catch(() => []),
        fetchEmployees(apiKey, workspaceId, apiUrl).catch(() => []),
      ]);
      setStats(statsData);
      setLogs(logsData || []);
      setEmployees(empData || []);
    } catch (err: any) {
      setError(err.message || "Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  const loadDailyHours = async () => {
    if (!apiKey || !workspaceId) return;
    setDailyLoading(true);
    try {
      const today = new Date();
      const past = new Date();
      past.setDate(today.getDate() - daysRange);
      const startDateStr = past.toISOString().split("T")[0];
      const endDateStr = today.toISOString().split("T")[0];

      const empFilter = selectedEmpId === "ALL" ? undefined : selectedEmpId;
      const data = await fetchEmployeeDailyHours(
        apiKey,
        workspaceId,
        empFilter,
        startDateStr,
        endDateStr,
        apiUrl
      );
      setDailyHours(data || []);
    } catch (err: any) {
      console.error("Failed to load daily hours:", err);
    } finally {
      setDailyLoading(false);
    }
  };

  useEffect(() => {
    loadBaseData();
  }, [apiKey, workspaceId, apiUrl]);

  useEffect(() => {
    loadDailyHours();
  }, [apiKey, workspaceId, apiUrl, selectedEmpId, daysRange]);

  // Transform hourly breakdown into chart-ready data in 12-hour format
  const hourlyChartData = useMemo(() => {
    if (!stats?.hourly_breakdown) {
      return Array.from({ length: 12 }, (_, i) => {
        const hour = `${(i + 8).toString().padStart(2, "0")}:00`;
        return {
          hour: formatHourlyLabel(hour),
          punches: 0,
        };
      });
    }

    const items = [];
    for (let h = 7; h <= 20; h++) {
      const key = h.toString().padStart(2, "0");
      items.push({
        hour: formatHourlyLabel(`${key}:00`),
        punches: Number(stats.hourly_breakdown[key] || 0),
      });
    }
    return items;
  }, [stats]);

  // Aggregate daily work hours data for chart
  const dailyChartData = useMemo(() => {
    // If specific employee selected, show their hours per day
    // If ALL selected, show total hours worked by all staff per day
    const dateMap = new Map<string, number>();

    // Sort chronologically ascending for the chart
    const sorted = [...dailyHours].sort((a, b) => a.date.localeCompare(b.date));
    for (const item of sorted) {
      const cur = dateMap.get(item.date) || 0;
      dateMap.set(item.date, Math.round((cur + item.total_hours) * 100) / 100);
    }

    return Array.from(dateMap.entries()).map(([dateStr, hours]) => ({
      date: formatDate(dateStr, timezone),
      hours,
    }));
  }, [dailyHours, timezone]);

  return (
    <div style={{ width: "100%", color: textPrimary, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      {/* KPI Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
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
            Today&apos;s Work Hours
          </div>
          <div style={{ fontSize: "1.4rem", fontWeight: 800, marginTop: "4px", color: "#06b6d4" }}>
            {stats ? `${stats.total_work_hours} hrs` : "-"}
          </div>
        </div>

        <div style={{ padding: "14px", borderRadius: "10px", backgroundColor: surface, border: `1px solid ${border}` }}>
          <div style={{ fontSize: "0.72rem", color: textMuted, textTransform: "uppercase", fontWeight: 600 }}>
            Avg Match Conf
          </div>
          <div style={{ fontSize: "1.4rem", fontWeight: 800, marginTop: "4px", color: "#10b981" }}>
            {stats ? `${(stats.average_confidence * 100).toFixed(1)}%` : "-"}
          </div>
        </div>
      </div>

      {/* CORE FEATURE: Employee Day-Wise Total Work Hours Section */}
      <div
        style={{
          borderRadius: "14px",
          backgroundColor: surface,
          border: `1px solid ${border}`,
          padding: "20px",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            marginBottom: "16px",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>
                ⏱️ Employee Day-Wise Work Hours
              </h3>
              <span
                style={{
                  fontSize: "0.7rem",
                  padding: "2px 8px",
                  borderRadius: "10px",
                  backgroundColor: "rgba(14, 165, 233, 0.12)",
                  color: "#0ea5e9",
                  border: "1px solid rgba(14, 165, 233, 0.25)",
                  fontWeight: 600,
                }}
              >
                12-Hour Clock
              </span>
            </div>
            <p style={{ margin: "3px 0 0 0", fontSize: "0.78rem", color: textMuted }}>
              Daily accumulated working time, shifts, and check-in/out timestamps in {timezone}
            </p>
          </div>

          {/* Interactive Filters: Employee Selector & Days Range */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {/* Employee Selector */}
            <select
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                border: `1px solid ${border}`,
                backgroundColor: cardBg,
                color: textPrimary,
                fontSize: "0.8rem",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="ALL">👥 All Employees ({employees.length})</option>
              {employees.map((emp) => {
                const displayName = emp.name ? `${emp.name} (${emp.employee_id})` : emp.employee_id;
                return (
                  <option key={emp.employee_id} value={emp.employee_id}>
                    {displayName}
                  </option>
                );
              })}
            </select>

            {/* Date Range Selector */}
            <div style={{ display: "flex", borderRadius: "8px", border: `1px solid ${border}`, overflow: "hidden" }}>
              {[
                { label: "7 Days", val: 7 },
                { label: "14 Days", val: 14 },
                { label: "30 Days", val: 30 },
              ].map((r) => (
                <button
                  key={r.val}
                  type="button"
                  onClick={() => setDaysRange(r.val)}
                  style={{
                    padding: "6px 10px",
                    border: "none",
                    backgroundColor: daysRange === r.val ? accent : "transparent",
                    color: daysRange === r.val ? "#ffffff" : textMuted,
                    fontSize: "0.75rem",
                    cursor: "pointer",
                    fontWeight: daysRange === r.val ? 600 : 400,
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={loadDailyHours}
              style={{
                padding: "6px 10px",
                borderRadius: "8px",
                border: `1px solid ${border}`,
                backgroundColor: "transparent",
                color: textMuted,
                fontSize: "0.75rem",
                cursor: "pointer",
              }}
            >
              ↻
            </button>
          </div>
        </div>

        {/* Visual Daily Work Hours Chart */}
        {dailyChartData.length > 0 && (
          <div style={{ width: "100%", height: 220, marginBottom: "20px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isLight ? "#e2e8f0" : "#1e293b"} />
                <XAxis dataKey="date" stroke={textMuted} fontSize={11} tickLine={false} />
                <YAxis stroke={textMuted} fontSize={11} tickLine={false} unit="h" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isLight ? "#ffffff" : "#0f172a",
                    borderColor: border,
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: textPrimary,
                  }}
                  formatter={(val: any) => [`${val} hours`, "Total Worked"]}
                />
                <Bar dataKey="hours" fill="#10b981" radius={[4, 4, 0, 0]} name="Hours Worked" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Detailed Day-Wise Breakdown Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.82rem" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${border}`, color: textMuted, backgroundColor: cardBg }}>
                <th style={{ padding: "10px 12px" }}>Date</th>
                <th style={{ padding: "10px 12px" }}>Employee</th>
                <th style={{ padding: "10px 12px" }}>First In (12h)</th>
                <th style={{ padding: "10px 12px" }}>Last Out (12h)</th>
                <th style={{ padding: "10px 12px" }}>Shifts</th>
                <th style={{ padding: "10px 12px" }}>Daily Total</th>
                <th style={{ padding: "10px 12px" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {dailyLoading ? (
                <tr>
                  <td colSpan={7} style={{ padding: "24px", textAlign: "center", color: textMuted }}>
                    Loading employee work hours breakdown...
                  </td>
                </tr>
              ) : dailyHours.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "24px", textAlign: "center", color: textMuted }}>
                    No work session records found for the selected {daysRange}-day period.
                  </td>
                </tr>
              ) : (
                dailyHours.map((row, i) => {
                  const empDisplay = row.employee_name || row.employee_id;
                  const isFullDay = row.total_hours >= 8.0;
                  return (
                    <tr
                      key={`${row.employee_id}-${row.date}-${i}`}
                      style={{ borderBottom: `1px solid ${border}` }}
                    >
                      <td style={{ padding: "10px 12px", fontWeight: 600 }}>
                        {formatDate(row.date, timezone)}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ fontWeight: 600 }}>{empDisplay}</div>
                        {row.employee_name && (
                          <div style={{ fontSize: "0.7rem", color: textMuted, fontFamily: "monospace" }}>
                            {row.employee_id}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "10px 12px", fontFamily: "monospace", color: "#10b981" }}>
                        {format12HourTime(row.first_clock_in, timezone, false)}
                      </td>
                      <td style={{ padding: "10px 12px", fontFamily: "monospace" }}>
                        {row.has_open_session ? (
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: "10px",
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              backgroundColor: "rgba(14, 165, 233, 0.15)",
                              color: "#38bdf8",
                            }}
                          >
                            ● On-Duty Now
                          </span>
                        ) : row.last_clock_out ? (
                          <span style={{ color: "#f59e0b" }}>
                            {format12HourTime(row.last_clock_out, timezone, false)}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td style={{ padding: "10px 12px", color: textMuted }}>
                        {row.sessions_count} {row.sessions_count === 1 ? "shift" : "shifts"}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span
                            style={{
                              fontWeight: 700,
                              fontFamily: "monospace",
                              color: isFullDay ? "#10b981" : row.has_open_session ? "#38bdf8" : textPrimary,
                            }}
                          >
                            {row.total_hours.toFixed(2)}h
                          </span>
                          <span style={{ fontSize: "0.7rem", color: textMuted }}>
                            ({row.total_minutes}m)
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        {row.has_open_session ? (
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: "10px",
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              backgroundColor: "rgba(14, 165, 233, 0.15)",
                              color: "#38bdf8",
                            }}
                          >
                            IN PROGRESS
                          </span>
                        ) : (
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: "10px",
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              backgroundColor: "rgba(16, 185, 129, 0.15)",
                              color: "#10b981",
                            }}
                          >
                            COMPLETED
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hourly Attendance Traffic Chart (12-Hour Labels) */}
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
              📊 Hourly Attendance Traffic (Punches / Hour in 12-Hour Format)
            </h3>
            <p style={{ margin: "2px 0 0 0", fontSize: "0.75rem", color: textMuted }}>
              Biometric check-in and check-out distribution throughout the business day
            </p>
          </div>
          <button
            type="button"
            onClick={loadBaseData}
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

        <div style={{ width: "100%", height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isLight ? "#e2e8f0" : "#1e293b"} />
              <XAxis dataKey="hour" stroke={textMuted} fontSize={11} tickLine={false} />
              <YAxis stroke={textMuted} fontSize={11} tickLine={false} allowDecimals={false} />
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

      {/* Live Recent Attendance Logs (12-Hour Timestamp) */}
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
            Recent Biometric Attendance Logs (12-Hour Standard)
          </h3>
          <p style={{ margin: "2px 0 0 0", fontSize: "0.75rem", color: textMuted }}>
            Live verification stream recorded in {timezone} timezone
          </p>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.82rem" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${border}`, color: textMuted }}>
                <th style={{ padding: "10px 12px" }}>Time (12h)</th>
                <th style={{ padding: "10px 12px" }}>Employee</th>
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
                        {format12HourTime(log.timestamp, timezone, true)}
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
