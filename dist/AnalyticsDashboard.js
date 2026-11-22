"use client";
import React, { useEffect, useMemo, useState } from "react";
import { fetchAttendanceLogs, fetchAttendanceStats, fetchEmployeeDailyHours, fetchEmployees, } from "./api.js";
import { DEFAULT_TIMEZONE, format12HourTime, formatDate, formatHourlyLabel, } from "./utils/time.js";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, } from "recharts";
export const AnalyticsDashboard = ({ apiKey, workspaceId, apiUrl = "https://api.sureclock.karalasoft.com", theme = "dark", timezone = DEFAULT_TIMEZONE, }) => {
    const [stats, setStats] = useState(null);
    const [logs, setLogs] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [dailyHours, setDailyHours] = useState([]);
    const [selectedEmpId, setSelectedEmpId] = useState("ALL");
    const [daysRange, setDaysRange] = useState(14);
    const [loading, setLoading] = useState(true);
    const [dailyLoading, setDailyLoading] = useState(false);
    const [error, setError] = useState(null);
    const isLight = theme === "light";
    const border = isLight ? "#e2e8f0" : "#1e293b";
    const surface = isLight ? "#ffffff" : "#0f172a";
    const cardBg = isLight ? "#f8fafc" : "#080d1a";
    const textPrimary = isLight ? "#0f172a" : "#f8fafc";
    const textMuted = isLight ? "#64748b" : "#94a3b8";
    const accent = "#0ea5e9";
    const loadBaseData = async () => {
        if (!apiKey || !workspaceId)
            return;
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
        }
        catch (err) {
            setError(err.message || "Failed to load analytics data");
        }
        finally {
            setLoading(false);
        }
    };
    const loadDailyHours = async () => {
        if (!apiKey || !workspaceId)
            return;
        setDailyLoading(true);
        try {
            const today = new Date();
            const past = new Date();
            past.setDate(today.getDate() - daysRange);
            const startDateStr = past.toISOString().split("T")[0];
            const endDateStr = today.toISOString().split("T")[0];
            const empFilter = selectedEmpId === "ALL" ? undefined : selectedEmpId;
            const data = await fetchEmployeeDailyHours(apiKey, workspaceId, empFilter, startDateStr, endDateStr, apiUrl);
            setDailyHours(data || []);
        }
        catch (err) {
            console.error("Failed to load daily hours:", err);
        }
        finally {
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
        const dateMap = new Map();
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
    return (React.createElement("div", { style: { width: "100%", color: textPrimary, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" } },
        React.createElement("div", { style: {
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: "12px",
                marginBottom: "20px",
            } },
            React.createElement("div", { style: { padding: "14px", borderRadius: "10px", backgroundColor: surface, border: `1px solid ${border}` } },
                React.createElement("div", { style: { fontSize: "0.72rem", color: textMuted, textTransform: "uppercase", fontWeight: 600 } }, "Total Enrolled"),
                React.createElement("div", { style: { fontSize: "1.4rem", fontWeight: 800, marginTop: "4px", color: "#38bdf8" } }, stats ? stats.total_enrolled_employees : "-")),
            React.createElement("div", { style: { padding: "14px", borderRadius: "10px", backgroundColor: surface, border: `1px solid ${border}` } },
                React.createElement("div", { style: { fontSize: "0.72rem", color: textMuted, textTransform: "uppercase", fontWeight: 600 } }, "Present Today"),
                React.createElement("div", { style: { fontSize: "1.4rem", fontWeight: 800, marginTop: "4px", color: "#10b981" } }, stats ? stats.unique_clocked_in : "-")),
            React.createElement("div", { style: { padding: "14px", borderRadius: "10px", backgroundColor: surface, border: `1px solid ${border}` } },
                React.createElement("div", { style: { fontSize: "0.72rem", color: textMuted, textTransform: "uppercase", fontWeight: 600 } }, "Active On-Duty"),
                React.createElement("div", { style: { fontSize: "1.4rem", fontWeight: 800, marginTop: "4px", color: "#6366f1" } }, stats ? stats.active_on_duty_count : "-")),
            React.createElement("div", { style: { padding: "14px", borderRadius: "10px", backgroundColor: surface, border: `1px solid ${border}` } },
                React.createElement("div", { style: { fontSize: "0.72rem", color: textMuted, textTransform: "uppercase", fontWeight: 600 } }, "Total Punches"),
                React.createElement("div", { style: { fontSize: "1.4rem", fontWeight: 800, marginTop: "4px", color: "#f59e0b" } }, stats ? stats.total_punches : "-")),
            React.createElement("div", { style: { padding: "14px", borderRadius: "10px", backgroundColor: surface, border: `1px solid ${border}` } },
                React.createElement("div", { style: { fontSize: "0.72rem", color: textMuted, textTransform: "uppercase", fontWeight: 600 } }, "Today's Work Hours"),
                React.createElement("div", { style: { fontSize: "1.4rem", fontWeight: 800, marginTop: "4px", color: "#06b6d4" } }, stats ? `${stats.total_work_hours} hrs` : "-")),
            React.createElement("div", { style: { padding: "14px", borderRadius: "10px", backgroundColor: surface, border: `1px solid ${border}` } },
                React.createElement("div", { style: { fontSize: "0.72rem", color: textMuted, textTransform: "uppercase", fontWeight: 600 } }, "Avg Match Conf"),
                React.createElement("div", { style: { fontSize: "1.4rem", fontWeight: 800, marginTop: "4px", color: "#10b981" } }, stats ? `${(stats.average_confidence * 100).toFixed(1)}%` : "-"))),
        React.createElement("div", { style: {
                borderRadius: "14px",
                backgroundColor: surface,
                border: `1px solid ${border}`,
                padding: "20px",
                marginBottom: "20px",
            } },
            React.createElement("div", { style: {
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "12px",
                    marginBottom: "16px",
                } },
                React.createElement("div", null,
                    React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "8px" } },
                        React.createElement("h3", { style: { margin: 0, fontSize: "1.05rem", fontWeight: 700 } }, "\u23F1\uFE0F Employee Day-Wise Work Hours"),
                        React.createElement("span", { style: {
                                fontSize: "0.7rem",
                                padding: "2px 8px",
                                borderRadius: "10px",
                                backgroundColor: "rgba(14, 165, 233, 0.12)",
                                color: "#0ea5e9",
                                border: "1px solid rgba(14, 165, 233, 0.25)",
                                fontWeight: 600,
                            } }, "12-Hour Clock")),
                    React.createElement("p", { style: { margin: "3px 0 0 0", fontSize: "0.78rem", color: textMuted } },
                        "Daily accumulated working time, shifts, and check-in/out timestamps in ",
                        timezone)),
                React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" } },
                    React.createElement("select", { value: selectedEmpId, onChange: (e) => setSelectedEmpId(e.target.value), style: {
                            padding: "6px 12px",
                            borderRadius: "8px",
                            border: `1px solid ${border}`,
                            backgroundColor: cardBg,
                            color: textPrimary,
                            fontSize: "0.8rem",
                            outline: "none",
                            cursor: "pointer",
                        } },
                        React.createElement("option", { value: "ALL" },
                            "\uD83D\uDC65 All Employees (",
                            employees.length,
                            ")"),
                        employees.map((emp) => {
                            const displayName = emp.name ? `${emp.name} (${emp.employee_id})` : emp.employee_id;
                            return (React.createElement("option", { key: emp.employee_id, value: emp.employee_id }, displayName));
                        })),
                    React.createElement("div", { style: { display: "flex", borderRadius: "8px", border: `1px solid ${border}`, overflow: "hidden" } }, [
                        { label: "7 Days", val: 7 },
                        { label: "14 Days", val: 14 },
                        { label: "30 Days", val: 30 },
                    ].map((r) => (React.createElement("button", { key: r.val, type: "button", onClick: () => setDaysRange(r.val), style: {
                            padding: "6px 10px",
                            border: "none",
                            backgroundColor: daysRange === r.val ? accent : "transparent",
                            color: daysRange === r.val ? "#ffffff" : textMuted,
                            fontSize: "0.75rem",
                            cursor: "pointer",
                            fontWeight: daysRange === r.val ? 600 : 400,
                        } }, r.label)))),
                    React.createElement("button", { type: "button", onClick: loadDailyHours, style: {
                            padding: "6px 10px",
                            borderRadius: "8px",
                            border: `1px solid ${border}`,
                            backgroundColor: "transparent",
                            color: textMuted,
                            fontSize: "0.75rem",
                            cursor: "pointer",
                        } }, "\u21BB"))),
            dailyChartData.length > 0 && (React.createElement("div", { style: { width: "100%", height: 220, marginBottom: "20px" } },
                React.createElement(ResponsiveContainer, { width: "100%", height: "100%" },
                    React.createElement(BarChart, { data: dailyChartData, margin: { top: 10, right: 10, left: -20, bottom: 0 } },
                        React.createElement(CartesianGrid, { strokeDasharray: "3 3", stroke: isLight ? "#e2e8f0" : "#1e293b" }),
                        React.createElement(XAxis, { dataKey: "date", stroke: textMuted, fontSize: 11, tickLine: false }),
                        React.createElement(YAxis, { stroke: textMuted, fontSize: 11, tickLine: false, unit: "h" }),
                        React.createElement(Tooltip, { contentStyle: {
                                backgroundColor: isLight ? "#ffffff" : "#0f172a",
                                borderColor: border,
                                borderRadius: "8px",
                                fontSize: "12px",
                                color: textPrimary,
                            }, formatter: (val) => [`${val} hours`, "Total Worked"] }),
                        React.createElement(Bar, { dataKey: "hours", fill: "#10b981", radius: [4, 4, 0, 0], name: "Hours Worked" }))))),
            React.createElement("div", { style: { overflowX: "auto" } },
                React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.82rem" } },
                    React.createElement("thead", null,
                        React.createElement("tr", { style: { borderBottom: `1px solid ${border}`, color: textMuted, backgroundColor: cardBg } },
                            React.createElement("th", { style: { padding: "10px 12px" } }, "Date"),
                            React.createElement("th", { style: { padding: "10px 12px" } }, "Employee"),
                            React.createElement("th", { style: { padding: "10px 12px" } }, "First In (12h)"),
                            React.createElement("th", { style: { padding: "10px 12px" } }, "Last Out (12h)"),
                            React.createElement("th", { style: { padding: "10px 12px" } }, "Shifts"),
                            React.createElement("th", { style: { padding: "10px 12px" } }, "Working Hours"),
                            React.createElement("th", { style: { padding: "10px 12px" } }, "Confidence"),
                            React.createElement("th", { style: { padding: "10px 12px" } }, "Shift Status"))),
                    React.createElement("tbody", null, dailyLoading ? (React.createElement("tr", null,
                        React.createElement("td", { colSpan: 8, style: { padding: "24px", textAlign: "center", color: textMuted } }, "Loading employee work hours breakdown..."))) : dailyHours.length === 0 ? (React.createElement("tr", null,
                        React.createElement("td", { colSpan: 8, style: { padding: "24px", textAlign: "center", color: textMuted } },
                            "No work session records found for the selected ",
                            daysRange,
                            "-day period."))) : (dailyHours.map((row, i) => {
                        const empDisplay = row.employee_name || row.employee_id;
                        const isFullDay = row.total_hours >= 8.0;
                        const isOnDuty = row.has_open_session || row.shift_status === "OPEN";
                        const isAutoClosed = row.shift_status === "AUTO_CLOSED";
                        return (React.createElement("tr", { key: `${row.employee_id}-${row.date}-${i}`, style: { borderBottom: `1px solid ${border}` } },
                            React.createElement("td", { style: { padding: "10px 12px", fontWeight: 600 } }, formatDate(row.date, timezone)),
                            React.createElement("td", { style: { padding: "10px 12px" } },
                                React.createElement("div", { style: { fontWeight: 600 } }, empDisplay),
                                row.employee_name && (React.createElement("div", { style: { fontSize: "0.7rem", color: textMuted, fontFamily: "monospace" } }, row.employee_id))),
                            React.createElement("td", { style: { padding: "10px 12px", fontFamily: "monospace", color: "#10b981" } }, format12HourTime(row.first_clock_in, timezone, false)),
                            React.createElement("td", { style: { padding: "10px 12px", fontFamily: "monospace" } }, isOnDuty ? (React.createElement("span", { style: {
                                    padding: "2px 8px",
                                    borderRadius: "10px",
                                    fontSize: "0.7rem",
                                    fontWeight: 700,
                                    backgroundColor: "rgba(14, 165, 233, 0.15)",
                                    color: "#38bdf8",
                                } }, "\u25CF On-Duty Now")) : row.last_clock_out ? (React.createElement("span", { style: { color: "#f59e0b" } }, format12HourTime(row.last_clock_out, timezone, false))) : ("-")),
                            React.createElement("td", { style: { padding: "10px 12px", color: textMuted } },
                                row.sessions_count,
                                " ",
                                row.sessions_count === 1 ? "shift" : "shifts"),
                            React.createElement("td", { style: { padding: "10px 12px" } },
                                React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "8px" } },
                                    React.createElement("span", { style: {
                                            fontWeight: 700,
                                            fontFamily: "monospace",
                                            color: isFullDay ? "#10b981" : isOnDuty ? "#38bdf8" : textPrimary,
                                        } },
                                        Math.floor(row.total_minutes / 60),
                                        "h ",
                                        row.total_minutes % 60,
                                        "m"),
                                    React.createElement("span", { style: { fontSize: "0.7rem", color: textMuted, fontFamily: "monospace" } },
                                        "(",
                                        row.total_hours.toFixed(2),
                                        " hrs)"))),
                            React.createElement("td", { style: { padding: "10px 12px", fontFamily: "monospace" } }, (() => {
                                const conf = row.average_confidence;
                                if (conf == null) {
                                    return React.createElement("span", { style: { color: textMuted } }, "-");
                                }
                                const pct = (conf * 100).toFixed(1);
                                const num = conf * 100;
                                const color = num >= 90 ? "#10b981" : num >= 75 ? "#38bdf8" : "#f59e0b";
                                return (React.createElement("span", { style: {
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "5px",
                                        padding: "2px 8px",
                                        borderRadius: "6px",
                                        backgroundColor: isLight ? "#f1f5f9" : "#0d1527",
                                        border: `1px solid ${border}`,
                                        fontWeight: 600,
                                        color,
                                    } },
                                    React.createElement("span", { style: {
                                            width: "6px",
                                            height: "6px",
                                            borderRadius: "50%",
                                            backgroundColor: color,
                                        } }),
                                    pct,
                                    "%"));
                            })()),
                            React.createElement("td", { style: { padding: "10px 12px" } }, isOnDuty ? (React.createElement("span", { style: {
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "5px",
                                    padding: "3px 10px",
                                    borderRadius: "10px",
                                    fontSize: "0.72rem",
                                    fontWeight: 700,
                                    backgroundColor: "rgba(14, 165, 233, 0.15)",
                                    color: "#38bdf8",
                                    border: "1px solid rgba(14, 165, 233, 0.3)",
                                } },
                                React.createElement("span", { style: {
                                        width: "6px",
                                        height: "6px",
                                        borderRadius: "50%",
                                        backgroundColor: "#38bdf8",
                                    } }),
                                "ON-DUTY")) : isAutoClosed ? (React.createElement("span", { style: {
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "5px",
                                    padding: "3px 10px",
                                    borderRadius: "10px",
                                    fontSize: "0.72rem",
                                    fontWeight: 700,
                                    backgroundColor: "rgba(245, 158, 11, 0.15)",
                                    color: "#f59e0b",
                                    border: "1px solid rgba(245, 158, 11, 0.3)",
                                } }, "AUTO-CLOSED")) : (React.createElement("span", { style: {
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "5px",
                                    padding: "3px 10px",
                                    borderRadius: "10px",
                                    fontSize: "0.72rem",
                                    fontWeight: 700,
                                    backgroundColor: "rgba(16, 185, 129, 0.15)",
                                    color: "#10b981",
                                    border: "1px solid rgba(16, 185, 129, 0.3)",
                                } }, "\u2713 COMPLETED")))));
                    })))))),
        React.createElement("div", { style: {
                padding: "20px",
                borderRadius: "14px",
                backgroundColor: surface,
                border: `1px solid ${border}`,
                marginBottom: "20px",
            } },
            React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" } },
                React.createElement("div", null,
                    React.createElement("h3", { style: { margin: 0, fontSize: "1rem", fontWeight: 700 } }, "\uD83D\uDCCA Hourly Attendance Traffic (Punches / Hour in 12-Hour Format)"),
                    React.createElement("p", { style: { margin: "2px 0 0 0", fontSize: "0.75rem", color: textMuted } }, "Biometric check-in and check-out distribution throughout the business day")),
                React.createElement("button", { type: "button", onClick: loadBaseData, style: {
                        padding: "4px 10px",
                        borderRadius: "6px",
                        border: `1px solid ${border}`,
                        background: "transparent",
                        color: textMuted,
                        fontSize: "0.75rem",
                        cursor: "pointer",
                    } }, "\u21BB Refresh")),
            React.createElement("div", { style: { width: "100%", height: 240 } },
                React.createElement(ResponsiveContainer, { width: "100%", height: "100%" },
                    React.createElement(BarChart, { data: hourlyChartData, margin: { top: 10, right: 10, left: -20, bottom: 0 } },
                        React.createElement(CartesianGrid, { strokeDasharray: "3 3", stroke: isLight ? "#e2e8f0" : "#1e293b" }),
                        React.createElement(XAxis, { dataKey: "hour", stroke: textMuted, fontSize: 11, tickLine: false }),
                        React.createElement(YAxis, { stroke: textMuted, fontSize: 11, tickLine: false, allowDecimals: false }),
                        React.createElement(Tooltip, { contentStyle: {
                                backgroundColor: isLight ? "#ffffff" : "#0f172a",
                                borderColor: border,
                                borderRadius: "8px",
                                fontSize: "12px",
                                color: textPrimary,
                            } }),
                        React.createElement(Bar, { dataKey: "punches", fill: "#0ea5e9", radius: [4, 4, 0, 0], name: "Punches" }))))),
        React.createElement("div", { style: {
                borderRadius: "14px",
                backgroundColor: surface,
                border: `1px solid ${border}`,
                padding: "20px",
            } },
            React.createElement("div", { style: { marginBottom: "14px" } },
                React.createElement("h3", { style: { margin: 0, fontSize: "1rem", fontWeight: 700 } }, "Recent Biometric Attendance Logs (12-Hour Standard)"),
                React.createElement("p", { style: { margin: "2px 0 0 0", fontSize: "0.75rem", color: textMuted } },
                    "Live verification stream recorded in ",
                    timezone,
                    " timezone")),
            React.createElement("div", { style: { overflowX: "auto" } },
                React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.82rem" } },
                    React.createElement("thead", null,
                        React.createElement("tr", { style: { borderBottom: `1px solid ${border}`, color: textMuted } },
                            React.createElement("th", { style: { padding: "10px 12px" } }, "Time (12h)"),
                            React.createElement("th", { style: { padding: "10px 12px" } }, "Employee"),
                            React.createElement("th", { style: { padding: "10px 12px" } }, "Direction"),
                            React.createElement("th", { style: { padding: "10px 12px" } }, "Confidence"),
                            React.createElement("th", { style: { padding: "10px 12px" } }, "Status"))),
                    React.createElement("tbody", null, loading ? (React.createElement("tr", null,
                        React.createElement("td", { colSpan: 5, style: { padding: "24px", textAlign: "center", color: textMuted } }, "Loading attendance audit logs..."))) : logs.length === 0 ? (React.createElement("tr", null,
                        React.createElement("td", { colSpan: 5, style: { padding: "24px", textAlign: "center", color: textMuted } }, "No recent verification logs recorded yet."))) : (logs.slice(0, 10).map((log, i) => {
                        const isOut = log.punch_type === "OUT";
                        return (React.createElement("tr", { key: log.id || i, style: { borderBottom: `1px solid ${border}` } },
                            React.createElement("td", { style: { padding: "10px 12px", fontFamily: "monospace", color: textMuted } }, format12HourTime(log.timestamp, timezone, true)),
                            React.createElement("td", { style: { padding: "10px 12px" } },
                                React.createElement("div", { style: { fontWeight: 600 } }, log.employee_name || log.employee_id),
                                log.employee_name && (React.createElement("div", { style: { fontSize: "0.7rem", color: textMuted, fontFamily: "monospace" } }, log.employee_id))),
                            React.createElement("td", { style: { padding: "10px 12px" } },
                                React.createElement("span", { style: {
                                        padding: "2px 8px",
                                        borderRadius: "10px",
                                        fontSize: "0.7rem",
                                        fontWeight: 700,
                                        backgroundColor: isOut ? "rgba(245, 158, 11, 0.15)" : "rgba(16, 185, 129, 0.15)",
                                        color: isOut ? "#f59e0b" : "#10b981",
                                    } }, log.punch_type || "PUNCH")),
                            React.createElement("td", { style: { padding: "10px 12px", fontFamily: "monospace" } }, (() => {
                                const confVal = log.confidence ?? log.confidence_score;
                                if (confVal == null)
                                    return React.createElement("span", { style: { color: textMuted } }, "-");
                                const pct = (confVal * 100).toFixed(1);
                                const num = confVal * 100;
                                const col = num >= 90 ? "#10b981" : num >= 75 ? "#38bdf8" : "#f59e0b";
                                return (React.createElement("span", { style: {
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "5px",
                                        color: col,
                                        fontWeight: 600,
                                    } },
                                    React.createElement("span", { style: {
                                            width: "6px",
                                            height: "6px",
                                            borderRadius: "50%",
                                            backgroundColor: col,
                                        } }),
                                    pct,
                                    "%"));
                            })()),
                            React.createElement("td", { style: { padding: "10px 12px", color: "#10b981" } }, "\u2713 Verified")));
                    }))))))));
};
