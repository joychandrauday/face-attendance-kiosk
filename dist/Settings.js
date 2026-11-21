"use client";
import React, { useEffect, useState } from "react";
import { checkEngineHealth, fetchWorkspaceSettings, updateWorkspaceSettings, } from "./api.js";
import { Toast } from "./components/Modal.js";
export const SureClockSettings = ({ apiKey, api_key, workspaceId, workspace_id, publishableKey, secretKey, apiUrl = "https://api.sureclock.karalasoft.com", theme = "dark", styles = {}, className = "", onSave, }) => {
    const effectiveApiKey = apiKey || api_key || "";
    const effectiveWorkspaceId = workspaceId || workspace_id || "";
    const effectivePubKey = publishableKey || (effectiveApiKey.startsWith("pk_") ? effectiveApiKey : "");
    const effectiveSecKey = secretKey || (effectiveApiKey.startsWith("sk_") ? effectiveApiKey : "");
    const [workspaceName, setWorkspaceName] = useState("");
    const [threshold, setThreshold] = useState(0.68);
    const [audioChime, setAudioChime] = useState(true);
    const [shiftGuard, setShiftGuard] = useState(true);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showSecKey, setShowSecKey] = useState(false);
    const [showPubKey, setShowPubKey] = useState(false);
    const [copiedKey, setCopiedKey] = useState(null);
    const [healthStatus, setHealthStatus] = useState({ tested: false, ok: false, latencyMs: 0, message: "" });
    const [testingHealth, setTestingHealth] = useState(false);
    const [toast, setToast] = useState(null);
    const isLight = theme === "light";
    const themeTokens = {
        surface: isLight ? "#ffffff" : "#0f172a",
        border: isLight ? "#e2e8f0" : "#1e293b",
        borderStrong: isLight ? "#cbd5e1" : "#334155",
        textPrimary: isLight ? "#0f172a" : "#f8fafc",
        textMuted: isLight ? "#64748b" : "#94a3b8",
        inputBg: isLight ? "#f8fafc" : "#080d1a",
        cardBg: isLight ? "#f1f5f9" : "#0a101f",
        accent: "#0ea5e9",
    };
    useEffect(() => {
        if (!effectiveApiKey || !effectiveWorkspaceId)
            return;
        const loadSettings = async () => {
            setLoading(true);
            try {
                const data = await fetchWorkspaceSettings(effectiveApiKey, effectiveWorkspaceId, apiUrl);
                if (data.name)
                    setWorkspaceName(data.name);
                if (typeof data.similarity_threshold === "number")
                    setThreshold(data.similarity_threshold);
            }
            catch (_) {
                // Fallback to defaults if workspace endpoint is newly provisioned
            }
            finally {
                setLoading(false);
            }
        };
        loadSettings();
    }, [effectiveApiKey, effectiveWorkspaceId, apiUrl]);
    const handleCopy = (text, label) => {
        if (!text)
            return;
        navigator.clipboard.writeText(text);
        setCopiedKey(label);
        setTimeout(() => setCopiedKey(null), 2000);
    };
    const handlePingHealth = async () => {
        setTestingHealth(true);
        try {
            const res = await checkEngineHealth(apiUrl);
            setHealthStatus({ tested: true, ok: res.ok, latencyMs: res.latencyMs, message: res.message });
        }
        catch (err) {
            setHealthStatus({ tested: true, ok: false, latencyMs: 0, message: err.message || "Failed" });
        }
        finally {
            setTestingHealth(false);
        }
    };
    const handleSave = async () => {
        setSaving(true);
        try {
            if (effectiveApiKey && effectiveWorkspaceId) {
                await updateWorkspaceSettings(effectiveApiKey, effectiveWorkspaceId, {
                    name: workspaceName.trim() || undefined,
                    similarity_threshold: threshold,
                }, apiUrl);
            }
            if (onSave) {
                onSave({
                    name: workspaceName,
                    similarity_threshold: threshold,
                    audioChime,
                    shiftGuard,
                });
            }
            setToast({ message: "Workspace settings updated successfully", type: "success" });
        }
        catch (err) {
            setToast({ message: err.message || "Failed to update settings", type: "error" });
        }
        finally {
            setSaving(false);
            setTimeout(() => setToast(null), 3000);
        }
    };
    const getSensitivityLabel = (val) => {
        if (val < 0.65)
            return { label: "Relaxed (Low lighting & outdoor)", color: "#f59e0b" };
        if (val > 0.72)
            return { label: "Strict (High security / Vault)", color: "#a855f7" };
        return { label: "Balanced (Recommended)", color: "#10b981" };
    };
    const sensitivity = getSensitivityLabel(threshold);
    return (React.createElement("div", { className: `sureclock-settings-container ${className}`, style: {
            width: "100%",
            color: themeTokens.textPrimary,
            boxSizing: "border-box",
            ...styles.container,
        } },
        toast && React.createElement(Toast, { message: toast.message, type: toast.type, onClose: () => setToast(null) }),
        React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "24px" } },
            React.createElement("div", { style: {
                    backgroundColor: themeTokens.surface,
                    border: `1px solid ${themeTokens.border}`,
                    borderRadius: "14px",
                    padding: "20px",
                } },
                React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" } },
                    React.createElement("div", null,
                        React.createElement("h3", { style: { margin: 0, fontSize: "1rem", fontWeight: 700 } }, "\uD83C\uDFE2 Workspace Profile"),
                        React.createElement("p", { style: { margin: "4px 0 0 0", fontSize: "0.78rem", color: themeTokens.textMuted } }, "Identifiers and branding for this biometric station cluster")),
                    React.createElement("span", { style: {
                            fontSize: "0.72rem",
                            fontFamily: "monospace",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            backgroundColor: themeTokens.cardBg,
                            border: `1px solid ${themeTokens.border}`,
                            color: "#38bdf8",
                        } },
                        "ID: ",
                        effectiveWorkspaceId || "default")),
                React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr", gap: "16px" } },
                    React.createElement("div", null,
                        React.createElement("label", { style: {
                                display: "block",
                                fontSize: "0.78rem",
                                fontWeight: 600,
                                color: themeTokens.textMuted,
                                marginBottom: "6px",
                            } }, "Workspace Display Name"),
                        React.createElement("input", { type: "text", value: workspaceName, onChange: (e) => setWorkspaceName(e.target.value), placeholder: "e.g. Flagship Reception / Dhaka Main Showroom", disabled: loading, style: {
                                width: "100%",
                                padding: "10px 14px",
                                borderRadius: "8px",
                                border: `1px solid ${themeTokens.border}`,
                                backgroundColor: themeTokens.inputBg,
                                color: themeTokens.textPrimary,
                                fontSize: "0.85rem",
                                boxSizing: "border-box",
                                outline: "none",
                            } })))),
            React.createElement("div", { style: {
                    backgroundColor: themeTokens.surface,
                    border: `1px solid ${themeTokens.border}`,
                    borderRadius: "14px",
                    padding: "20px",
                } },
                React.createElement("h3", { style: { margin: 0, fontSize: "1rem", fontWeight: 700 } }, "\uD83D\uDD11 API Keys & Credentials"),
                React.createElement("p", { style: { margin: "4px 0 16px 0", fontSize: "0.78rem", color: themeTokens.textMuted } }, "Segregated keys for public check-in kiosks vs privileged administration"),
                React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "14px" } },
                    React.createElement("div", { style: {
                            padding: "14px",
                            borderRadius: "10px",
                            backgroundColor: themeTokens.cardBg,
                            border: `1px solid ${themeTokens.border}`,
                        } },
                        React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" } },
                            React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "8px" } },
                                React.createElement("span", { style: { fontSize: "0.75rem", fontWeight: 700, color: "#10b981", textTransform: "uppercase" } }, "Publishable Key (pk_live_...)"),
                                React.createElement("span", { style: {
                                        fontSize: "0.68rem",
                                        padding: "1px 6px",
                                        borderRadius: "4px",
                                        backgroundColor: "rgba(16, 185, 129, 0.12)",
                                        color: "#10b981",
                                        border: "1px solid rgba(16, 185, 129, 0.25)",
                                    } }, "Safe for Kiosk Viewers")),
                            React.createElement("div", { style: { display: "flex", gap: "8px" } },
                                React.createElement("button", { type: "button", onClick: () => setShowPubKey(!showPubKey), style: {
                                        background: "none",
                                        border: "none",
                                        color: themeTokens.textMuted,
                                        cursor: "pointer",
                                        fontSize: "0.74rem",
                                    } }, showPubKey ? "Hide" : "Reveal"),
                                React.createElement("button", { type: "button", onClick: () => handleCopy(effectivePubKey, "pub"), style: {
                                        padding: "3px 8px",
                                        borderRadius: "6px",
                                        border: `1px solid ${themeTokens.border}`,
                                        backgroundColor: "transparent",
                                        color: copiedKey === "pub" ? "#10b981" : themeTokens.textPrimary,
                                        cursor: "pointer",
                                        fontSize: "0.74rem",
                                        fontWeight: 600,
                                    } }, copiedKey === "pub" ? "✓ Copied" : "Copy"))),
                        React.createElement("div", { style: {
                                fontFamily: "monospace",
                                fontSize: "0.82rem",
                                color: themeTokens.textPrimary,
                                wordBreak: "break-all",
                            } }, effectivePubKey
                            ? showPubKey
                                ? effectivePubKey
                                : `${effectivePubKey.slice(0, 12)}••••••••••••••••••••••••`
                            : "Not configured (provide publishableKey prop)")),
                    React.createElement("div", { style: {
                            padding: "14px",
                            borderRadius: "10px",
                            backgroundColor: themeTokens.cardBg,
                            border: `1px solid ${themeTokens.border}`,
                        } },
                        React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" } },
                            React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "8px" } },
                                React.createElement("span", { style: { fontSize: "0.75rem", fontWeight: 700, color: "#ef4444", textTransform: "uppercase" } }, "Secret Key (sk_live_...)"),
                                React.createElement("span", { style: {
                                        fontSize: "0.68rem",
                                        padding: "1px 6px",
                                        borderRadius: "4px",
                                        backgroundColor: "rgba(239, 68, 68, 0.12)",
                                        color: "#ef4444",
                                        border: "1px solid rgba(239, 68, 68, 0.25)",
                                    } }, "Keep Server-Side")),
                            React.createElement("div", { style: { display: "flex", gap: "8px" } },
                                React.createElement("button", { type: "button", onClick: () => setShowSecKey(!showSecKey), style: {
                                        background: "none",
                                        border: "none",
                                        color: themeTokens.textMuted,
                                        cursor: "pointer",
                                        fontSize: "0.74rem",
                                    } }, showSecKey ? "Hide" : "Reveal"),
                                React.createElement("button", { type: "button", onClick: () => handleCopy(effectiveSecKey, "sec"), style: {
                                        padding: "3px 8px",
                                        borderRadius: "6px",
                                        border: `1px solid ${themeTokens.border}`,
                                        backgroundColor: "transparent",
                                        color: copiedKey === "sec" ? "#10b981" : themeTokens.textPrimary,
                                        cursor: "pointer",
                                        fontSize: "0.74rem",
                                        fontWeight: 600,
                                    } }, copiedKey === "sec" ? "✓ Copied" : "Copy"))),
                        React.createElement("div", { style: {
                                fontFamily: "monospace",
                                fontSize: "0.82rem",
                                color: themeTokens.textPrimary,
                                wordBreak: "break-all",
                            } }, effectiveSecKey
                            ? showSecKey
                                ? effectiveSecKey
                                : `${effectiveSecKey.slice(0, 12)}••••••••••••••••••••••••`
                            : "Not configured (provide secretKey prop)")))),
            React.createElement("div", { style: {
                    backgroundColor: themeTokens.surface,
                    border: `1px solid ${themeTokens.border}`,
                    borderRadius: "14px",
                    padding: "20px",
                } },
                React.createElement("h3", { style: { margin: 0, fontSize: "1rem", fontWeight: 700 } }, "\uD83C\uDFAF Biometric Sensitivity & Verification Rules"),
                React.createElement("p", { style: { margin: "4px 0 16px 0", fontSize: "0.78rem", color: themeTokens.textMuted } }, "Calibrate cosine matching tolerances and shift automation policies"),
                React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "18px" } },
                    React.createElement("div", null,
                        React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" } },
                            React.createElement("div", null,
                                React.createElement("span", { style: { fontSize: "0.84rem", fontWeight: 600 } }, "Cosine Match Threshold"),
                                React.createElement("div", { style: { fontSize: "0.74rem", color: sensitivity.color, marginTop: "2px", fontWeight: 600 } }, sensitivity.label)),
                            React.createElement("span", { style: {
                                    fontFamily: "monospace",
                                    fontSize: "1.1rem",
                                    fontWeight: 700,
                                    color: themeTokens.accent,
                                    padding: "2px 8px",
                                    borderRadius: "6px",
                                    backgroundColor: themeTokens.cardBg,
                                    border: `1px solid ${themeTokens.border}`,
                                } },
                                (threshold * 100).toFixed(0),
                                "% (",
                                threshold.toFixed(2),
                                ")")),
                        React.createElement("input", { type: "range", min: "0.55", max: "0.88", step: "0.01", value: threshold, onChange: (e) => setThreshold(parseFloat(e.target.value)), style: {
                                width: "100%",
                                cursor: "pointer",
                                accentColor: themeTokens.accent,
                            } }),
                        React.createElement("div", { style: { display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: themeTokens.textMuted, marginTop: "4px" } },
                            React.createElement("span", null, "55% (Relaxed)"),
                            React.createElement("span", null, "68% (Standard Default)"),
                            React.createElement("span", null, "88% (High Strictness)"))),
                    React.createElement("div", { style: {
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "12px 14px",
                            borderRadius: "10px",
                            backgroundColor: themeTokens.cardBg,
                            border: `1px solid ${themeTokens.border}`,
                        } },
                        React.createElement("div", null,
                            React.createElement("div", { style: { fontSize: "0.84rem", fontWeight: 600 } }, "Guarded Clock-Out Confirmation"),
                            React.createElement("div", { style: { fontSize: "0.74rem", color: themeTokens.textMuted, marginTop: "2px" } }, "Presents 10s countdown modal on 2nd punch to prevent accidental clock-outs")),
                        React.createElement("label", { style: { display: "inline-flex", alignItems: "center", cursor: "pointer" } },
                            React.createElement("input", { type: "checkbox", checked: shiftGuard, onChange: (e) => setShiftGuard(e.target.checked), style: { width: "18px", height: "18px", accentColor: themeTokens.accent, cursor: "pointer" } }))),
                    React.createElement("div", { style: {
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "12px 14px",
                            borderRadius: "10px",
                            backgroundColor: themeTokens.cardBg,
                            border: `1px solid ${themeTokens.border}`,
                        } },
                        React.createElement("div", null,
                            React.createElement("div", { style: { fontSize: "0.84rem", fontWeight: 600 } }, "Harmonic Audio Feedback Chime"),
                            React.createElement("div", { style: { fontSize: "0.74rem", color: themeTokens.textMuted, marginTop: "2px" } }, "Plays affirmative sound chime upon successful attendance scan")),
                        React.createElement("label", { style: { display: "inline-flex", alignItems: "center", cursor: "pointer" } },
                            React.createElement("input", { type: "checkbox", checked: audioChime, onChange: (e) => setAudioChime(e.target.checked), style: { width: "18px", height: "18px", accentColor: themeTokens.accent, cursor: "pointer" } }))),
                    React.createElement("div", { style: {
                            padding: "10px 14px",
                            borderRadius: "8px",
                            backgroundColor: "rgba(14, 165, 233, 0.08)",
                            border: "1px solid rgba(14, 165, 233, 0.25)",
                            fontSize: "0.74rem",
                            color: themeTokens.textMuted,
                        } },
                        React.createElement("strong", { style: { color: "#38bdf8" } }, "Anti-Duplicate Biometrics:"),
                        " Active 1:N cross-check prevents the same face from registering under multiple employee IDs above 75% similarity."))),
            React.createElement("div", { style: {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "12px",
                    padding: "16px 20px",
                    backgroundColor: themeTokens.surface,
                    border: `1px solid ${themeTokens.border}`,
                    borderRadius: "14px",
                } },
                React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "10px" } },
                    React.createElement("button", { type: "button", onClick: handlePingHealth, disabled: testingHealth, style: {
                            padding: "8px 14px",
                            borderRadius: "8px",
                            border: `1px solid ${themeTokens.border}`,
                            backgroundColor: themeTokens.cardBg,
                            color: themeTokens.textPrimary,
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            cursor: testingHealth ? "not-allowed" : "pointer",
                        } }, testingHealth ? "Testing..." : "⚡ Ping Engine Health"),
                    healthStatus.tested && (React.createElement("span", { style: {
                            fontSize: "0.74rem",
                            fontFamily: "monospace",
                            fontWeight: 600,
                            color: healthStatus.ok ? "#10b981" : "#ef4444",
                        } }, healthStatus.ok ? `✓ ${healthStatus.latencyMs}ms (${healthStatus.message})` : `✗ ${healthStatus.message}`))),
                React.createElement("button", { type: "button", onClick: handleSave, disabled: saving, style: {
                        padding: "10px 22px",
                        borderRadius: "8px",
                        border: "none",
                        backgroundColor: themeTokens.accent,
                        color: "#ffffff",
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        cursor: saving ? "not-allowed" : "pointer",
                        boxShadow: "0 2px 8px rgba(14, 165, 233, 0.35)",
                    } }, saving ? "Saving Changes..." : "Save Settings")))));
};
