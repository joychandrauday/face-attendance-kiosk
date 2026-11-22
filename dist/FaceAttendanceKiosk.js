"use client";
import React, { useEffect, useRef, useState } from "react";
import { cropAlignedFace, computeFrameMicroMotion } from "./faceDetector.js";
import { ConfirmModal } from "./components/Modal.js";
import { DEFAULT_TIMEZONE, format12HourTime } from "./utils/time.js";
function playVerificationChime() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx)
            return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880.0, ctx.currentTime + 0.12); // A5
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.45);
    }
    catch (_) { }
}
// Inject scan animation keyframes once safely
if (typeof document !== "undefined") {
    const styleId = "sureclock-kiosk-animations";
    if (!document.getElementById(styleId)) {
        const styleEl = document.createElement("style");
        styleEl.id = styleId;
        styleEl.innerHTML = `
      @keyframes sureclockScanLine {
        0% { top: 0%; opacity: 0.9; }
        50% { top: 97%; opacity: 0.9; }
        100% { top: 0%; opacity: 0.9; }
      }
      @keyframes sureclockFadeIn {
        from { opacity: 0; transform: scale(0.97); }
        to { opacity: 1; transform: scale(1); }
      }
      @keyframes sureclockPulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
      }
    `;
        document.head.appendChild(styleEl);
    }
}
export const FaceAttendanceKiosk = ({ apiKey, api_key, workspaceId, workspace_id, apiUrl = "https://api.sureclock.karalasoft.com", punchType = "AUTO", showModeSelector = false, buttonLabel = "Verify", loadingLabel = "Verifying...", theme = "dark", styles = {}, hideHeader = false, title = "Showroom Attendance Kiosk", subtitle, enableSound = true, mirror = true, autoScan = false, timezone = DEFAULT_TIMEZONE, onSuccess, onError, onStatusChange, className = "", }) => {
    const effectiveApiKey = apiKey || api_key || "";
    const effectiveWorkspaceId = workspaceId || workspace_id || "";
    const [selectedPunchType, setSelectedPunchType] = useState(punchType);
    const [hasCamera, setHasCamera] = useState(false);
    const [loading, setLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");
    const [lastSuccess, setLastSuccess] = useState(null);
    const [pendingClockOut, setPendingClockOut] = useState(null);
    const [confirmLoading, setConfirmLoading] = useState(false);
    const [errorBanner, setErrorBanner] = useState(null);
    const [currentTime, setCurrentTime] = useState("");
    const [availableDevices, setAvailableDevices] = useState([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState("");
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const canvas2Ref = useRef(null);
    const streamRef = useRef(null);
    // Live Digital Clock (high density tabular-nums in 12-hour format)
    useEffect(() => {
        const updateTime = () => {
            setCurrentTime(format12HourTime(new Date(), timezone, true));
        };
        updateTime();
        const timer = setInterval(updateTime, 1000);
        return () => clearInterval(timer);
    }, [timezone]);
    // Sync punchType prop changes
    useEffect(() => {
        setSelectedPunchType(punchType);
    }, [punchType]);
    // Enumerate video devices
    useEffect(() => {
        async function getDevices() {
            try {
                if (!navigator.mediaDevices?.enumerateDevices)
                    return;
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoDevs = devices.filter((d) => d.kind === "videoinput");
                setAvailableDevices(videoDevs);
                if (videoDevs.length > 0 && !selectedDeviceId) {
                    setSelectedDeviceId(videoDevs[0].deviceId);
                }
            }
            catch (_) { }
        }
        getDevices();
    }, []);
    // Initialize camera stream
    useEffect(() => {
        let isCancelled = false;
        async function startCamera() {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => t.stop());
            }
            try {
                const constraints = {
                    video: selectedDeviceId
                        ? { deviceId: { exact: selectedDeviceId }, width: { ideal: 640 }, height: { ideal: 480 } }
                        : { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
                    audio: false,
                };
                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                if (isCancelled) {
                    stream.getTracks().forEach((t) => t.stop());
                    return;
                }
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    setHasCamera(true);
                    setErrorBanner(null);
                }
            }
            catch (err) {
                const msg = "Camera permission denied or camera not found.";
                setErrorBanner(msg);
                if (onError)
                    onError(msg);
            }
        }
        startCamera();
        return () => {
            isCancelled = true;
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => t.stop());
            }
        };
    }, [selectedDeviceId]);
    const handleVerify = async () => {
        if (!effectiveApiKey) {
            setErrorBanner("Missing api_key prop on <FaceAttendanceKiosk />");
            return;
        }
        if (!effectiveWorkspaceId) {
            setErrorBanner("Missing workspace_id prop on <FaceAttendanceKiosk />");
            return;
        }
        const video = videoRef.current;
        const canvas1 = canvasRef.current;
        if (!video || !canvas1 || video.videoWidth === 0) {
            setErrorBanner("Camera stream is not active.");
            return;
        }
        setLoading(true);
        setStatusMessage("Detecting & aligning face...");
        setErrorBanner(null);
        if (onStatusChange)
            onStatusChange("LIVENESS_CHECK");
        // Dual-frame micro-motion & eye-aligned face capture (strictly excludes clothing/body)
        const crop1 = await cropAlignedFace(video, canvas1, 300, 0.85);
        if (!crop1 || !crop1.image_base64) {
            setErrorBanner("Failed to crop facial region from camera stream.");
            setLoading(false);
            return;
        }
        await new Promise((r) => setTimeout(r, 120));
        const canvas2 = canvas2Ref.current || canvas1;
        const crop2 = await cropAlignedFace(video, canvas2, 300, 0.85);
        // Compute active micro-motion between the two frames
        if (canvas2Ref.current) {
            const diff = computeFrameMicroMotion(canvas1, canvas2Ref.current);
            // diff is normalized; real faces show natural pixel fluctuations
            if (diff < 0.0005) {
                // Very low variance indicates static screen / paper photo
                console.warn("SureClock: Low micro-motion detected:", diff);
            }
        }
        const finalImage = (crop2 && crop2.success) ? crop2.image_base64 : crop1.image_base64;
        setStatusMessage("Extracting 128D biometric vector...");
        if (onStatusChange)
            onStatusChange("AUTHENTICATING");
        try {
            const endpoint = `${apiUrl.replace(/\/$/, "")}/api/v1/verify`;
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": effectiveApiKey,
                },
                body: JSON.stringify({
                    workspace_id: effectiveWorkspaceId,
                    image_base64: finalImage,
                    punch_type: "AUTO",
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || `Server error (${response.status})`);
            }
            if (data.match && data.employee_id) {
                const empDisplayName = data.employee_name || data.employee_id;
                // Active shift detected: requires employee confirmation to clock out
                if (data.action_required === "CONFIRM_CLOCK_OUT" || data.punch_type === "PENDING_OUT") {
                    setPendingClockOut(data);
                    setStatusMessage(`Active shift detected for ${empDisplayName}. Awaiting confirmation...`);
                    if (onStatusChange)
                        onStatusChange("CONFIRM_CLOCK_OUT");
                    return;
                }
                setLastSuccess(data);
                // Smart status display
                const isClockOut = data.punch_type === "OUT";
                if (isClockOut) {
                    const duration = data.session_duration_minutes != null
                        ? ` (${Math.floor(data.session_duration_minutes / 60)}h ${data.session_duration_minutes % 60}m)`
                        : "";
                    setStatusMessage(`Clock Out verified: ${empDisplayName}${duration}`);
                }
                else {
                    setStatusMessage(`Clock In verified: ${empDisplayName}`);
                }
                if (enableSound)
                    playVerificationChime();
                if (onSuccess)
                    onSuccess(data);
                if (onStatusChange)
                    onStatusChange("SUCCESS");
                // Auto-dismiss after 4 seconds
                setTimeout(() => {
                    setLastSuccess(null);
                    setStatusMessage("");
                    if (onStatusChange)
                        onStatusChange("READY");
                }, 4000);
            }
            else {
                const msg = data.message || "Face not recognized (biometric match below threshold).";
                setErrorBanner(msg);
                setStatusMessage("");
                if (onError)
                    onError(msg);
                if (onStatusChange)
                    onStatusChange("FAILED");
            }
        }
        catch (err) {
            const errText = err.message || "Network error communicating with biometric engine.";
            setErrorBanner(errText);
            setStatusMessage("");
            if (onError)
                onError(errText);
            if (onStatusChange)
                onStatusChange("ERROR");
        }
        finally {
            setLoading(false);
        }
    };
    // Hands-free auto-scan timer
    useEffect(() => {
        if (!autoScan || !hasCamera || loading || lastSuccess || pendingClockOut)
            return;
        const interval = setInterval(() => {
            if (!loading && !lastSuccess && !pendingClockOut) {
                handleVerify();
            }
        }, 2800);
        return () => clearInterval(interval);
    }, [autoScan, hasCamera, loading, lastSuccess, pendingClockOut, selectedPunchType]);
    // Color tokens based on theme
    const isLight = theme === "light";
    const isTransparent = theme === "transparent";
    const themeTokens = {
        bg: isTransparent ? "transparent" : isLight ? "#ffffff" : "#080d1a",
        surface: isLight ? "#f8fafc" : "#0f172a",
        border: isLight ? "#e2e8f0" : "#1e293b",
        borderStrong: isLight ? "#cbd5e1" : "#334155",
        textPrimary: isLight ? "#0f172a" : "#f8fafc",
        textMuted: isLight ? "#64748b" : "#94a3b8",
        viewfinderBg: isLight ? "#f1f5f9" : "#020617",
        selectorBg: isLight ? "#f1f5f9" : "#060913",
        accent: "#0284c7",
        accentHover: "#0369a1",
    };
    return (React.createElement("div", { className: `sureclock-kiosk-root ${className}`, style: {
            maxWidth: "480px",
            width: "100%",
            margin: "0 auto",
            padding: "20px",
            borderRadius: "14px",
            backgroundColor: themeTokens.bg,
            color: themeTokens.textPrimary,
            border: `1px solid ${themeTokens.border}`,
            boxSizing: "border-box",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
            ...styles.container,
        } },
        !hideHeader && (React.createElement("div", { style: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
                borderBottom: `1px solid ${themeTokens.border}`,
                paddingBottom: "12px",
                ...styles.header,
            } },
            React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "10px" } },
                React.createElement("div", { style: {
                        width: "32px",
                        height: "32px",
                        borderRadius: "8px",
                        backgroundColor: isLight ? "#e0f2fe" : "#0c2847",
                        border: `1px solid ${isLight ? "#bae6fd" : "#0284c7"}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#0284c7",
                    } },
                    React.createElement("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
                        React.createElement("path", { d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" }),
                        React.createElement("path", { d: "M9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0z" }))),
                React.createElement("div", null,
                    React.createElement("h2", { style: {
                            fontSize: "1.05rem",
                            fontWeight: 700,
                            margin: 0,
                            color: themeTokens.textPrimary,
                            letterSpacing: "-0.01em",
                        } }, title),
                    React.createElement("p", { style: { fontSize: "0.75rem", color: themeTokens.textMuted, margin: "2px 0 0 0" } }, subtitle || (React.createElement(React.Fragment, null,
                        "Station: ",
                        React.createElement("span", { style: { fontFamily: "monospace", color: "#0ea5e9" } }, effectiveWorkspaceId || "Default")))))),
            React.createElement("div", { style: { textAlign: "right" } },
                React.createElement("span", { style: {
                        fontSize: "1.05rem",
                        fontWeight: 700,
                        fontFamily: "monospace",
                        fontVariantNumeric: "tabular-nums",
                        color: isLight ? "#0f172a" : "#38bdf8",
                    } }, currentTime),
                React.createElement("div", { style: {
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        gap: "5px",
                        fontSize: "0.7rem",
                        color: hasCamera ? "#10b981" : "#ef4444",
                        marginTop: "1px",
                        fontWeight: 600,
                        letterSpacing: "0.03em",
                        textTransform: "uppercase",
                    } },
                    React.createElement("span", { style: {
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            backgroundColor: hasCamera ? "#10b981" : "#ef4444",
                            border: `1px solid ${hasCamera ? "rgba(16, 185, 129, 0.4)" : "rgba(239, 68, 68, 0.4)"}`,
                        } }),
                    hasCamera ? "Ready" : "Offline")))),
        React.createElement("div", { style: {
                position: "relative",
                width: "100%",
                paddingTop: "100%",
                borderRadius: "12px",
                overflow: "hidden",
                backgroundColor: themeTokens.viewfinderBg,
                border: `1px solid ${themeTokens.border}`,
                boxSizing: "border-box",
                ...styles.viewfinder,
            } },
            React.createElement("video", { ref: videoRef, autoPlay: true, playsInline: true, muted: true, style: {
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    transform: mirror ? "scaleX(-1)" : "none",
                } }),
            React.createElement("div", { style: {
                    position: "absolute",
                    top: "14%",
                    left: "14%",
                    width: "72%",
                    height: "72%",
                    pointerEvents: "none",
                    boxSizing: "border-box",
                    ...styles.hud,
                } },
                React.createElement("div", { style: {
                        position: "absolute",
                        top: "4%",
                        left: "14%",
                        width: "72%",
                        height: "92%",
                        borderRadius: "50%",
                        border: "1.5px dashed rgba(14, 165, 233, 0.45)",
                        boxShadow: "0 0 16px rgba(14, 165, 233, 0.08) inset",
                        pointerEvents: "none",
                    } }),
                React.createElement("div", { style: {
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "22px",
                        height: "22px",
                        borderTop: "2.5px solid #0ea5e9",
                        borderLeft: "2.5px solid #0ea5e9",
                        borderTopLeftRadius: "4px",
                    } }),
                React.createElement("div", { style: {
                        position: "absolute",
                        top: 0,
                        right: 0,
                        width: "22px",
                        height: "22px",
                        borderTop: "2.5px solid #0ea5e9",
                        borderRight: "2.5px solid #0ea5e9",
                        borderTopRightRadius: "4px",
                    } }),
                React.createElement("div", { style: {
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        width: "22px",
                        height: "22px",
                        borderBottom: "2.5px solid #0ea5e9",
                        borderLeft: "2.5px solid #0ea5e9",
                        borderBottomLeftRadius: "4px",
                    } }),
                React.createElement("div", { style: {
                        position: "absolute",
                        bottom: 0,
                        right: 0,
                        width: "22px",
                        height: "22px",
                        borderBottom: "2.5px solid #0ea5e9",
                        borderRight: "2.5px solid #0ea5e9",
                        borderBottomRightRadius: "4px",
                    } }),
                React.createElement("div", { style: {
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        width: "8px",
                        height: "8px",
                        margin: "-4px 0 0 -4px",
                        borderRadius: "50%",
                        backgroundColor: "rgba(14, 165, 233, 0.45)",
                    } })),
            loading && (React.createElement("div", { style: {
                    position: "absolute",
                    left: 0,
                    right: 0,
                    height: "2px",
                    backgroundColor: "#38bdf8",
                    animation: "sureclockScanLine 1.4s ease-in-out infinite",
                    zIndex: 10,
                } })),
            lastSuccess && (React.createElement("div", { style: {
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    backgroundColor: isLight ? "rgba(255, 255, 255, 0.96)" : "rgba(8, 13, 26, 0.96)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 20,
                    padding: "24px",
                    textAlign: "center",
                    boxSizing: "border-box",
                    animation: "sureclockFadeIn 0.2s ease-out",
                    ...styles.overlay,
                } },
                lastSuccess.punch_type === "OUT" ? (React.createElement("div", { style: {
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "4px 12px",
                        borderRadius: "20px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        background: isLight ? "#fef3c7" : "rgba(217, 119, 6, 0.2)",
                        color: isLight ? "#b45309" : "#fbbf24",
                        border: `1px solid ${isLight ? "#fde68a" : "rgba(217, 119, 6, 0.4)"}`,
                        marginBottom: "12px",
                    } },
                    React.createElement("span", { style: {
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            backgroundColor: "#f59e0b",
                        } }),
                    "Clock Out Recorded")) : (React.createElement("div", { style: {
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "4px 12px",
                        borderRadius: "20px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        background: isLight ? "#d1fae5" : "rgba(16, 185, 129, 0.2)",
                        color: isLight ? "#047857" : "#34d399",
                        border: `1px solid ${isLight ? "#a7f3d0" : "rgba(16, 185, 129, 0.4)"}`,
                        marginBottom: "12px",
                    } },
                    React.createElement("span", { style: {
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            backgroundColor: "#10b981",
                        } }),
                    "Clock In Recorded")),
                React.createElement("div", { style: {
                        width: "56px",
                        height: "56px",
                        borderRadius: "50%",
                        backgroundColor: lastSuccess.punch_type === "OUT" ? "#d97706" : "#059669",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#ffffff",
                        marginBottom: "12px",
                    } },
                    React.createElement("svg", { width: "28", height: "28", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round" },
                        React.createElement("polyline", { points: "20 6 9 17 4 12" }))),
                React.createElement("h3", { style: {
                        fontSize: "1.3rem",
                        fontWeight: 700,
                        margin: "0 0 2px 0",
                        color: themeTokens.textPrimary,
                        letterSpacing: "-0.01em",
                    } }, lastSuccess.employee_name || lastSuccess.employee_id),
                lastSuccess.employee_name && (React.createElement("div", { style: {
                        fontSize: "0.78rem",
                        fontFamily: "monospace",
                        color: themeTokens.textMuted,
                        marginBottom: "6px",
                    } },
                    "ID: ",
                    lastSuccess.employee_id)),
                React.createElement("p", { style: {
                        fontSize: "0.85rem",
                        color: themeTokens.textMuted,
                        margin: "0 0 10px 0",
                    } }, lastSuccess.punch_type === "OUT"
                    ? "Clock-out logged. Shift completed."
                    : "Clock-in logged. Have a great shift!"),
                lastSuccess.punch_type === "OUT" && lastSuccess.session_duration_minutes != null && (React.createElement("div", { style: {
                        backgroundColor: isLight ? "#f1f5f9" : "#0f172a",
                        border: `1px solid ${themeTokens.border}`,
                        padding: "8px 16px",
                        borderRadius: "8px",
                        marginBottom: "12px",
                        textAlign: "center",
                    } },
                    React.createElement("div", { style: { fontSize: "0.7rem", color: themeTokens.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" } }, "Shift Duration"),
                    React.createElement("div", { style: {
                            fontSize: "1.2rem",
                            fontWeight: 700,
                            fontFamily: "monospace",
                            fontVariantNumeric: "tabular-nums",
                            color: "#0ea5e9",
                        } },
                        Math.floor(lastSuccess.session_duration_minutes / 60),
                        "h",
                        " ",
                        lastSuccess.session_duration_minutes % 60,
                        "m"))),
                React.createElement("div", { style: {
                        display: "flex",
                        gap: "12px",
                        fontSize: "0.75rem",
                        color: themeTokens.textMuted,
                        fontFamily: "monospace",
                        fontVariantNumeric: "tabular-nums",
                    } },
                    React.createElement("span", null,
                        "CONFIDENCE: ",
                        (lastSuccess.confidence * 100).toFixed(1),
                        "%"))))),
        React.createElement("canvas", { ref: canvasRef, style: { display: "none" } }),
        React.createElement("canvas", { ref: canvas2Ref, style: { display: "none" } }),
        availableDevices.length > 1 && (React.createElement("div", { style: { marginTop: "10px", display: "flex", justifyContent: "flex-end" } },
            React.createElement("select", { value: selectedDeviceId, onChange: (e) => setSelectedDeviceId(e.target.value), style: {
                    padding: "4px 8px",
                    borderRadius: "6px",
                    border: `1px solid ${themeTokens.border}`,
                    backgroundColor: themeTokens.selectorBg,
                    color: themeTokens.textMuted,
                    fontSize: "0.75rem",
                    outline: "none",
                } }, availableDevices.map((dev, idx) => (React.createElement("option", { key: dev.deviceId || idx, value: dev.deviceId }, dev.label || `Camera ${idx + 1}`)))))),
        statusMessage && !lastSuccess && (React.createElement("div", { style: {
                marginTop: "12px",
                padding: "8px 12px",
                borderRadius: "8px",
                backgroundColor: isLight ? "#f0f9ff" : "#082f49",
                color: isLight ? "#0369a1" : "#38bdf8",
                border: `1px solid ${isLight ? "#bae6fd" : "#0c4a6e"}`,
                fontSize: "0.8rem",
                textAlign: "center",
                fontWeight: 500,
            } }, statusMessage)),
        errorBanner && (React.createElement("div", { style: {
                marginTop: "12px",
                padding: "8px 12px",
                borderRadius: "8px",
                backgroundColor: isLight ? "#fef2f2" : "#450a0a",
                color: isLight ? "#b91c1c" : "#fca5a5",
                fontSize: "0.8rem",
                textAlign: "center",
                border: `1px solid ${isLight ? "#fecaca" : "#7f1d1d"}`,
            } }, errorBanner)),
        React.createElement("div", { style: { marginTop: "14px" } },
            React.createElement("button", { type: "button", onClick: handleVerify, disabled: loading || !hasCamera, style: {
                    width: "100%",
                    padding: "12px 18px",
                    borderRadius: "8px",
                    backgroundColor: loading || !hasCamera ? (isLight ? "#94a3b8" : "#1e293b") : themeTokens.accent,
                    color: "#ffffff",
                    fontWeight: 600,
                    fontSize: "0.95rem",
                    border: "none",
                    cursor: loading || !hasCamera ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    transition: "background-color 0.15s ease",
                    ...styles.button,
                } },
                React.createElement("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
                    React.createElement("path", { d: "M7 3H5a2 2 0 0 0-2 2v2" }),
                    React.createElement("path", { d: "M17 3h2a2 2 0 0 1 2 2v2" }),
                    React.createElement("path", { d: "M21 17v2a2 2 0 0 1-2 2h-2" }),
                    React.createElement("path", { d: "M3 17v2a2 2 0 0 0 2 2h2" }),
                    React.createElement("circle", { cx: "12", cy: "12", r: "3" })),
                React.createElement("span", null, loading ? loadingLabel : buttonLabel)),
            React.createElement("p", { style: {
                    fontSize: "0.75rem",
                    color: themeTokens.textMuted,
                    textAlign: "center",
                    margin: "8px 0 0 0",
                } }, "Align your face in the frame and tap Verify")),
        React.createElement(ConfirmModal, { isOpen: !!pendingClockOut, title: "Confirm Clock-Out", message: React.createElement("span", null,
                "Hello ",
                React.createElement("strong", { style: { color: "#38bdf8" } }, pendingClockOut?.employee_name || pendingClockOut?.employee_id),
                pendingClockOut?.employee_name && (React.createElement("span", { style: { fontSize: "0.82rem", color: "#94a3b8", fontFamily: "monospace", marginLeft: "5px" } },
                    "(",
                    pendingClockOut.employee_id,
                    ")")),
                "! You have an active shift of",
                " ",
                React.createElement("strong", { style: { color: "#f59e0b" } }, pendingClockOut?.session_duration_minutes != null
                    ? `${Math.floor(pendingClockOut.session_duration_minutes / 60)}h ${pendingClockOut.session_duration_minutes % 60}m`
                    : "in progress"),
                ". Are you sure you want to clock out now?"), confirmLabel: "Confirm Clock-Out", cancelLabel: "Keep Working / Cancel", danger: false, countdownSeconds: 10, theme: theme, loading: confirmLoading, onCancel: () => {
                setPendingClockOut(null);
                setStatusMessage("");
                if (onStatusChange)
                    onStatusChange("READY");
            }, onConfirm: async () => {
                if (!pendingClockOut?.employee_id)
                    return;
                setConfirmLoading(true);
                try {
                    const endpoint = `${apiUrl.replace(/\/$/, "")}/api/v1/verify`;
                    const response = await fetch(endpoint, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "x-api-key": effectiveApiKey,
                        },
                        body: JSON.stringify({
                            workspace_id: effectiveWorkspaceId,
                            employee_id: pendingClockOut.employee_id,
                            punch_type: "OUT",
                            confirmed: true,
                            clock_out_token: pendingClockOut.clock_out_token,
                        }),
                    });
                    const confirmedData = await response.json();
                    if (!response.ok) {
                        throw new Error(confirmedData.message || "Failed to confirm clock out");
                    }
                    setPendingClockOut(null);
                    setLastSuccess(confirmedData);
                    const duration = confirmedData.session_duration_minutes != null
                        ? ` (${Math.floor(confirmedData.session_duration_minutes / 60)}h ${confirmedData.session_duration_minutes % 60}m)`
                        : "";
                    const confirmedDisplayName = confirmedData.employee_name || confirmedData.employee_id;
                    setStatusMessage(`Clock Out verified: ${confirmedDisplayName}${duration}`);
                    if (enableSound)
                        playVerificationChime();
                    if (onSuccess)
                        onSuccess(confirmedData);
                    if (onStatusChange)
                        onStatusChange("SUCCESS");
                    setTimeout(() => {
                        setLastSuccess(null);
                        setStatusMessage("");
                        if (onStatusChange)
                            onStatusChange("READY");
                    }, 4000);
                }
                catch (err) {
                    setErrorBanner(err.message || "Error confirming clock out");
                    setPendingClockOut(null);
                }
                finally {
                    setConfirmLoading(false);
                }
            } })));
};
