"use client";
import React, { useEffect, useState, useMemo } from "react";
import { fetchAttendanceLogs } from "./api.js";
import { DEFAULT_TIMEZONE, format12HourTime, formatDate } from "./utils/time.js";
export const AttendanceLogs = ({ apiKey, workspaceId, apiUrl = "https://api.sureclock.karalasoft.com", theme = "dark", timezone = DEFAULT_TIMEZONE, limit = 50, autoRefresh = true, refreshIntervalMs = 12000, className = "", }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterType, setFilterType] = useState("ALL");
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [error, setError] = useState(null);
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
        if (!apiKey || !workspaceId)
            return;
        if (!silent)
            setLoading(true);
        setError(null);
        try {
            const data = await fetchAttendanceLogs(apiKey, workspaceId, limit, apiUrl);
            setLogs(data || []);
            setLastUpdated(new Date());
        }
        catch (err) {
            setError(err.message || "Failed to load attendance logs");
        }
        finally {
            if (!silent)
                setLoading(false);
        }
    };
    useEffect(() => {
        loadLogs();
    }, [apiKey, workspaceId, apiUrl, limit]);
    // Real-time polling
    useEffect(() => {
        if (!autoRefresh)
            return;
        const timer = setInterval(() => {
            loadLogs(true);
        }, refreshIntervalMs);
        return () => clearInterval(timer);
    }, [autoRefresh, refreshIntervalMs, apiKey, workspaceId, apiUrl, limit]);
    const filteredLogs = useMemo(() => {
        return logs.filter((log) => {
            const searchLower = search.toLowerCase();
            const matchesSearch = !search ||
                log.employee_id.toLowerCase().includes(searchLower) ||
                (log.employee_name && log.employee_name.toLowerCase().includes(searchLower));
            const pType = (log.punch_type || "IN").toUpperCase();
            const matchesType = filterType === "ALL" ||
                (filterType === "IN" && pType === "IN") ||
                (filterType === "OUT" && pType === "OUT");
            return matchesSearch && matchesType;
        });
    }, [logs, search, filterType]);
    const formatTimestamp = (ts) => {
        return {
            date: formatDate(ts, timezone),
            time: format12HourTime(ts, timezone, true),
        };
    };
    return (React.createElement("div", { className: `sureclock-attendance-logs ${className}`, style: {
            width: "100%",
            backgroundColor: themeTokens.surface,
            border: `1px solid ${themeTokens.border}`,
            borderRadius: "14px",
            overflow: "hidden",
            color: themeTokens.textPrimary,
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        } },
        React.createElement("div", { style: {
                padding: "16px 20px",
                borderBottom: `1px solid ${themeTokens.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "12px",
            } },
            React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "10px", flex: "1 1 240px" } },
                React.createElement("div", { style: { position: "relative", width: "100%", maxWidth: "280px" } },
                    React.createElement("input", { type: "text", placeholder: "Search employee ID...", value: search, onChange: (e) => setSearch(e.target.value), style: {
                            width: "100%",
                            padding: "8px 12px",
                            borderRadius: "8px",
                            border: `1px solid ${themeTokens.border}`,
                            backgroundColor: themeTokens.inputBg,
                            color: themeTokens.textPrimary,
                            fontSize: "0.84rem",
                            outline: "none",
                            boxSizing: "border-box",
                        } })),
                React.createElement("div", { style: {
                        display: "inline-flex",
                        backgroundColor: themeTokens.inputBg,
                        border: `1px solid ${themeTokens.border}`,
                        borderRadius: "8px",
                        padding: "2px",
                    } }, ["ALL", "IN", "OUT"].map((t) => (React.createElement("button", { key: t, type: "button", onClick: () => setFilterType(t), style: {
                        padding: "4px 10px",
                        borderRadius: "6px",
                        border: "none",
                        backgroundColor: filterType === t ? (isLight ? "#e2e8f0" : "#1e293b") : "transparent",
                        color: filterType === t ? themeTokens.textPrimary : themeTokens.textMuted,
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        cursor: "pointer",
                    } }, t))))),
            React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "12px" } },
                React.createElement("span", { style: {
                        fontSize: "0.75rem",
                        color: themeTokens.textMuted,
                        fontFamily: "monospace",
                    } },
                    "Updated ",
                    format12HourTime(lastUpdated, timezone, true)),
                React.createElement("button", { type: "button", onClick: () => loadLogs(false), disabled: loading, style: {
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
                    } },
                    React.createElement("span", { style: { display: "inline-block", transform: loading ? "rotate(180deg)" : "none", transition: "transform 0.5s ease" } }, "\u21BB"),
                    "Refresh"))),
        error && (React.createElement("div", { style: { padding: "12px 20px", backgroundColor: "#450a0a", color: "#fca5a5", fontSize: "0.82rem" } }, error)),
        React.createElement("div", { style: { overflowX: "auto" } },
            React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: "0.84rem", textAlign: "left" } },
                React.createElement("thead", null,
                    React.createElement("tr", { style: { backgroundColor: themeTokens.headerBg, borderBottom: `1px solid ${themeTokens.border}` } },
                        React.createElement("th", { style: { padding: "12px 20px", color: themeTokens.textMuted, fontWeight: 600, width: "35%" } }, "Employee"),
                        React.createElement("th", { style: { padding: "12px 16px", color: themeTokens.textMuted, fontWeight: 600, width: "20%" } }, "Direction"),
                        React.createElement("th", { style: { padding: "12px 16px", color: themeTokens.textMuted, fontWeight: 600, width: "25%" } }, "Timestamp"),
                        React.createElement("th", { style: { padding: "12px 20px", color: themeTokens.textMuted, fontWeight: 600, width: "20%", textAlign: "right" } }, "Biometric Confidence"))),
                React.createElement("tbody", null, loading && logs.length === 0 ? (React.createElement("tr", null,
                    React.createElement("td", { colSpan: 4, style: { padding: "40px 20px", textAlign: "center", color: themeTokens.textMuted } }, "Loading real-time attendance logs..."))) : filteredLogs.length === 0 ? (React.createElement("tr", null,
                    React.createElement("td", { colSpan: 4, style: { padding: "40px 20px", textAlign: "center", color: themeTokens.textMuted } }, "No attendance records found."))) : (filteredLogs.map((log) => {
                    const isOut = (log.punch_type || "IN").toUpperCase() === "OUT";
                    const { date, time } = formatTimestamp(log.timestamp);
                    const rawConf = log.confidence ?? log.confidence_score;
                    const confPct = rawConf != null ? (rawConf * 100).toFixed(1) : "99.0";
                    return (React.createElement("tr", { key: log.id, style: {
                            borderBottom: `1px solid ${themeTokens.border}`,
                            transition: "background-color 0.1s ease",
                        }, onMouseEnter: (e) => (e.currentTarget.style.backgroundColor = themeTokens.rowHover), onMouseLeave: (e) => (e.currentTarget.style.backgroundColor = "transparent") },
                        React.createElement("td", { style: { padding: "12px 20px" } },
                            React.createElement("div", { style: { fontWeight: 600, fontSize: "0.88rem", color: themeTokens.textPrimary } }, log.employee_name || log.employee_id),
                            React.createElement("div", { style: { fontSize: "0.72rem", color: themeTokens.textMuted, fontFamily: "monospace", marginTop: "2px" } },
                                log.employee_id,
                                " \u2022 ",
                                workspaceId)),
                        React.createElement("td", { style: { padding: "12px 16px" } },
                            React.createElement("span", { style: {
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
                                } },
                                React.createElement("span", { style: {
                                        width: "6px",
                                        height: "6px",
                                        borderRadius: "50%",
                                        backgroundColor: isOut ? "#f59e0b" : "#10b981",
                                    } }),
                                isOut ? "CLOCK OUT" : "CLOCK IN")),
                        React.createElement("td", { style: { padding: "12px 16px" } },
                            React.createElement("div", { style: { fontFamily: "monospace", fontVariantNumeric: "tabular-nums" } }, time),
                            React.createElement("div", { style: { fontSize: "0.72rem", color: themeTokens.textMuted } }, date)),
                        React.createElement("td", { style: { padding: "12px 20px", textAlign: "right" } },
                            React.createElement("span", { style: {
                                    fontFamily: "monospace",
                                    fontVariantNumeric: "tabular-nums",
                                    fontWeight: 600,
                                    color: Number(confPct) >= 80 ? "#10b981" : "#38bdf8",
                                } },
                                confPct,
                                "%"))));
                })))))));
};
