"use client";
import React, { useEffect, useRef, useState } from "react";
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
export const FaceAttendanceKiosk = ({ apiKey, api_key, workspaceId, workspace_id, apiUrl = "https://api.sureclock.karalasoft.com", punchType = "AUTO", showModeSelector = true, theme = "dark", styles = {}, hideHeader = false, title = "Showroom Attendance Kiosk", subtitle, enableSound = true, mirror = true, autoScan = false, onSuccess, onError, onStatusChange, className = "", }) => {
    const effectiveApiKey = apiKey || api_key || "";
    const effectiveWorkspaceId = workspaceId || workspace_id || "";
    const [selectedPunchType, setSelectedPunchType] = useState(punchType);
    const [hasCamera, setHasCamera] = useState(false);
    const [loading, setLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");
    const [lastSuccess, setLastSuccess] = useState(null);
    const [errorBanner, setErrorBanner] = useState(null);
    const [currentTime, setCurrentTime] = useState("");
    const [availableDevices, setAvailableDevices] = useState([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState("");
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    // Live Digital Clock (high density tabular-nums)
    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            setCurrentTime(now.toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
            }));
        };
        updateTime();
        const timer = setInterval(updateTime, 1000);
        return () => clearInterval(timer);
    }, []);
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
                console.error("Camera access error:", err);
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
    // Capture canvas image (~40 KB JPEG)
    const captureFrame = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.videoWidth === 0)
            return null;
        canvas.width = 224;
        canvas.height = 224;
        const ctx = canvas.getContext("2d");
        if (!ctx)
            return null;
        const size = Math.min(video.videoWidth, video.videoHeight);
        const startX = (video.videoWidth - size) / 2;
        const startY = (video.videoHeight - size) / 2;
        ctx.drawImage(video, startX, startY, size, size, 0, 0, 224, 224);
        return canvas.toDataURL("image/jpeg", 0.65);
    };
    const handleVerify = async () => {
        if (!effectiveApiKey) {
            setErrorBanner("Missing api_key prop on <FaceAttendanceKiosk />");
            return;
        }
        if (!effectiveWorkspaceId) {
            setErrorBanner("Missing workspace_id prop on <FaceAttendanceKiosk />");
            return;
        }
        setLoading(true);
        setStatusMessage("Verifying active liveness...");
        setErrorBanner(null);
        if (onStatusChange)
            onStatusChange("LIVENESS_CHECK");
        // Dual-frame micro-motion verification
        const frame1 = captureFrame();
        if (!frame1) {
            setErrorBanner("Failed to capture frame from camera stream.");
            setLoading(false);
            return;
        }
        await new Promise((r) => setTimeout(r, 120));
        const frame2 = captureFrame();
        const finalImage = frame2 || frame1;
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
                    punch_type: selectedPunchType,
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || `Server error (${response.status})`);
            }
            if (data.match && data.employee_id) {
                setLastSuccess(data);
                const actionLabel = data.punch_type === "OUT" ? "Clock-Out" : "Clock-In";
                setStatusMessage(`${actionLabel} verified: ${data.employee_id}`);
                if (enableSound)
                    playVerificationChime();
                if (onSuccess)
                    onSuccess(data);
                if (onStatusChange)
                    onStatusChange("SUCCESS");
                // Reset for next employee
                setTimeout(() => {
                    setLastSuccess(null);
                    setStatusMessage("");
                    if (onStatusChange)
                        onStatusChange("READY");
                }, 3500);
            }
            else {
                const msg = data.message || "Face not recognized (>90% threshold required).";
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
        if (!autoScan || !hasCamera || loading || lastSuccess)
            return;
        const interval = setInterval(() => {
            if (!loading && !lastSuccess) {
                handleVerify();
            }
        }, 2500);
        return () => clearInterval(interval);
    }, [autoScan, hasCamera, loading, lastSuccess, selectedPunchType]);
    // Color tokens based on theme
    const isLight = theme === "light";
    const isTransparent = theme === "transparent";
    const themeTokens = {
        bg: isTransparent ? "transparent" : isLight ? "#ffffff" : "#0f172a",
        border: isLight ? "#e2e8f0" : "#1e293b",
        textPrimary: isLight ? "#0f172a" : "#f8fafc",
        textMuted: isLight ? "#64748b" : "#94a3b8",
        viewfinderBg: isLight ? "#f1f5f9" : "#020617",
        selectorBg: isLight ? "#f8fafc" : "#080d1a",
        shadow: isTransparent
            ? "none"
            : isLight
                ? "0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04)"
                : "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
    };
    return (React.createElement("div", { className: `sureclock-kiosk-root ${className}`, style: {
            maxWidth: "480px",
            width: "100%",
            margin: "0 auto",
            padding: "20px",
            borderRadius: "16px",
            backgroundColor: themeTokens.bg,
            color: themeTokens.textPrimary,
            border: `1px solid ${themeTokens.border}`,
            boxShadow: themeTokens.shadow,
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
            boxSizing: "border-box",
            ...styles.container,
        } },
        !hideHeader && (React.createElement("div", { style: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "16px",
                borderBottom: `1px solid ${themeTokens.border}`,
                paddingBottom: "12px",
                ...styles.header,
            } },
            React.createElement("div", null,
                React.createElement("h2", { style: {
                        fontSize: "1.15rem",
                        fontWeight: 700,
                        margin: 0,
                        color: themeTokens.textPrimary,
                        letterSpacing: "-0.02em",
                    } }, title),
                React.createElement("p", { style: { fontSize: "0.8rem", color: themeTokens.textMuted, margin: "2px 0 0 0" } }, subtitle || (React.createElement(React.Fragment, null,
                    "Station: ",
                    React.createElement("code", { style: { color: "#0ea5e9", fontFamily: "monospace" } }, effectiveWorkspaceId || "Default"))))),
            React.createElement("div", { style: { textAlign: "right" } },
                React.createElement("span", { style: {
                        fontSize: "1.1rem",
                        fontWeight: 700,
                        fontFamily: "monospace",
                        fontVariantNumeric: "tabular-nums",
                        color: "#0ea5e9",
                    } }, currentTime),
                React.createElement("div", { style: {
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        gap: "5px",
                        fontSize: "0.75rem",
                        color: hasCamera ? "#10b981" : "#ef4444",
                        marginTop: "2px",
                    } },
                    React.createElement("span", { style: {
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            backgroundColor: hasCamera ? "#10b981" : "#ef4444",
                        } }),
                    hasCamera ? "Ready" : "No Camera")))),
        showModeSelector && (React.createElement("div", { style: {
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "4px",
                padding: "4px",
                borderRadius: "10px",
                backgroundColor: themeTokens.selectorBg,
                border: `1px solid ${themeTokens.border}`,
                marginBottom: "14px",
            } },
            React.createElement("button", { type: "button", onClick: () => setSelectedPunchType("AUTO"), style: {
                    padding: "6px 8px",
                    borderRadius: "6px",
                    border: "none",
                    background: selectedPunchType === "AUTO" ? "#0284c7" : "transparent",
                    color: selectedPunchType === "AUTO" ? "#ffffff" : themeTokens.textMuted,
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                } }, "Auto Mode"),
            React.createElement("button", { type: "button", onClick: () => setSelectedPunchType("IN"), style: {
                    padding: "6px 8px",
                    borderRadius: "6px",
                    border: "none",
                    background: selectedPunchType === "IN" ? "#059669" : "transparent",
                    color: selectedPunchType === "IN" ? "#ffffff" : themeTokens.textMuted,
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                } }, "Clock In"),
            React.createElement("button", { type: "button", onClick: () => setSelectedPunchType("OUT"), style: {
                    padding: "6px 8px",
                    borderRadius: "6px",
                    border: "none",
                    background: selectedPunchType === "OUT" ? "#d97706" : "transparent",
                    color: selectedPunchType === "OUT" ? "#ffffff" : themeTokens.textMuted,
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                } }, "Clock Out"))),
        React.createElement("div", { style: {
                position: "relative",
                width: "100%",
                paddingTop: "100%",
                borderRadius: "12px",
                overflow: "hidden",
                backgroundColor: themeTokens.viewfinderBg,
                border: `1px solid ${themeTokens.border}`,
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
                    top: "16%",
                    left: "16%",
                    width: "68%",
                    height: "68%",
                    pointerEvents: "none",
                    ...styles.hud,
                } },
                React.createElement("div", { style: { position: "absolute", top: 0, left: 0, width: "24px", height: "24px", borderTop: "2px solid #0ea5e9", borderLeft: "2px solid #0ea5e9" } }),
                React.createElement("div", { style: { position: "absolute", top: 0, right: 0, width: "24px", height: "24px", borderTop: "2px solid #0ea5e9", borderRight: "2px solid #0ea5e9" } }),
                React.createElement("div", { style: { position: "absolute", bottom: 0, left: 0, width: "24px", height: "24px", borderBottom: "2px solid #0ea5e9", borderLeft: "2px solid #0ea5e9" } }),
                React.createElement("div", { style: { position: "absolute", bottom: 0, right: 0, width: "24px", height: "24px", borderBottom: "2px solid #0ea5e9", borderRight: "2px solid #0ea5e9" } }),
                React.createElement("div", { style: { position: "absolute", top: "50%", left: "50%", width: "8px", height: "8px", margin: "-4px 0 0 -4px", borderRadius: "50%", backgroundColor: "rgba(14, 165, 233, 0.4)" } })),
            loading && (React.createElement("div", { style: {
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "3px",
                    backgroundColor: "#0ea5e9",
                    boxShadow: "0 0 10px #0ea5e9",
                    animation: "kioskSweep 1.2s infinite ease-in-out",
                } })),
            lastSuccess && (React.createElement("div", { style: {
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    backgroundColor: isLight ? "rgba(255, 255, 255, 0.95)" : "rgba(8, 13, 26, 0.95)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 20,
                    padding: "20px",
                    textAlign: "center",
                    boxSizing: "border-box",
                    ...styles.overlay,
                } },
                React.createElement("div", { style: {
                        width: "56px",
                        height: "56px",
                        borderRadius: "50%",
                        backgroundColor: lastSuccess.punch_type === "OUT" ? "#d97706" : "#059669",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "26px",
                        color: "#ffffff",
                        marginBottom: "12px",
                    } }, "\u2713"),
                React.createElement("span", { style: {
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        background: lastSuccess.punch_type === "OUT" ? "#78350f" : "#064e3b",
                        color: lastSuccess.punch_type === "OUT" ? "#fbbf24" : "#34d399",
                        marginBottom: "6px",
                    } }, lastSuccess.punch_type === "OUT" ? "Clock-Out Verified" : "Clock-In Verified"),
                React.createElement("h3", { style: {
                        fontSize: "1.25rem",
                        fontWeight: 700,
                        margin: "0 0 4px 0",
                        color: themeTokens.textPrimary,
                    } }, lastSuccess.employee_id),
                lastSuccess.session_duration_minutes != null && (React.createElement("p", { style: {
                        fontSize: "0.85rem",
                        color: "#0ea5e9",
                        margin: "4px 0",
                        fontFamily: "monospace",
                        fontWeight: 600,
                    } },
                    "Shift Duration: ",
                    Math.floor(lastSuccess.session_duration_minutes / 60),
                    "h",
                    " ",
                    lastSuccess.session_duration_minutes % 60,
                    "m")),
                React.createElement("span", { style: {
                        fontSize: "0.75rem",
                        color: themeTokens.textMuted,
                        fontFamily: "monospace",
                        marginTop: "4px",
                    } },
                    "Confidence: ",
                    (lastSuccess.confidence * 100).toFixed(1),
                    "%")))),
        React.createElement("canvas", { ref: canvasRef, style: { display: "none" } }),
        availableDevices.length > 1 && (React.createElement("div", { style: { marginTop: "10px", display: "flex", justifyContent: "flex-end" } },
            React.createElement("select", { value: selectedDeviceId, onChange: (e) => setSelectedDeviceId(e.target.value), style: {
                    padding: "4px 8px",
                    borderRadius: "6px",
                    border: `1px solid ${themeTokens.border}`,
                    backgroundColor: themeTokens.selectorBg,
                    color: themeTokens.textMuted,
                    fontSize: "0.75rem",
                } }, availableDevices.map((dev, idx) => (React.createElement("option", { key: dev.deviceId || idx, value: dev.deviceId }, dev.label || `Camera ${idx + 1}`)))))),
        statusMessage && (React.createElement("div", { style: {
                marginTop: "12px",
                padding: "8px 12px",
                borderRadius: "8px",
                backgroundColor: isLight ? "#f0f9ff" : "#082f49",
                color: isLight ? "#0369a1" : "#38bdf8",
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
                    padding: "12px 16px",
                    borderRadius: "8px",
                    backgroundColor: loading
                        ? "#0369a1"
                        : selectedPunchType === "OUT"
                            ? "#d97706"
                            : selectedPunchType === "IN"
                                ? "#059669"
                                : "#0284c7",
                    color: "#ffffff",
                    fontWeight: 600,
                    fontSize: "0.95rem",
                    border: "none",
                    cursor: loading || !hasCamera ? "not-allowed" : "pointer",
                    transition: "all 0.15s ease",
                    ...styles.button,
                } }, loading
                ? "Authenticating Vector..."
                : selectedPunchType === "OUT"
                    ? "Tap to Clock Out"
                    : selectedPunchType === "IN"
                        ? "Tap to Clock In"
                        : "Verify Biometric Attendance"))));
};
