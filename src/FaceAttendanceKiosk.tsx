"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  AttendanceSuccessResult,
  FaceAttendanceKioskProps,
  PunchDirection,
} from "./types.js";
import { cropAlignedFace, computeFrameMicroMotion } from "./faceDetector.js";
import { ConfirmModal } from "./components/Modal.js";
import { DEFAULT_TIMEZONE, format12HourTime } from "./utils/time.js";

function playVerificationChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
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
  } catch (_) {}
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

export const FaceAttendanceKiosk: React.FC<FaceAttendanceKioskProps> = ({
  apiKey,
  api_key,
  workspaceId,
  workspace_id,
  apiUrl = "https://api.sureclock.karalasoft.com",
  punchType = "AUTO",
  showModeSelector = false,
  buttonLabel = "Verify",
  loadingLabel = "Verifying...",
  theme = "dark",
  styles = {},
  hideHeader = false,
  title = "Showroom Attendance Kiosk",
  subtitle,
  enableSound = true,
  mirror = true,
  autoScan = false,
  timezone = DEFAULT_TIMEZONE,
  onSuccess,
  onError,
  onStatusChange,
  className = "",
}) => {
  const effectiveApiKey = apiKey || api_key || "";
  const effectiveWorkspaceId = workspaceId || workspace_id || "";

  const [selectedPunchType, setSelectedPunchType] = useState<PunchDirection>(punchType);
  const [hasCamera, setHasCamera] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [lastSuccess, setLastSuccess] = useState<AttendanceSuccessResult | null>(null);
  const [pendingClockOut, setPendingClockOut] = useState<AttendanceSuccessResult | null>(null);
  const [confirmLoading, setConfirmLoading] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvas2Ref = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
        if (!navigator.mediaDevices?.enumerateDevices) return;
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevs = devices.filter((d) => d.kind === "videoinput");
        setAvailableDevices(videoDevs);
        if (videoDevs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(videoDevs[0].deviceId);
        }
      } catch (_) {}
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
        const constraints: MediaStreamConstraints = {
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
      } catch (err: any) {
        const msg = "Camera permission denied or camera not found.";
        setErrorBanner(msg);
        if (onError) onError(msg);
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
    if (onStatusChange) onStatusChange("LIVENESS_CHECK");

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
    if (onStatusChange) onStatusChange("AUTHENTICATING");

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
        const empDisplayName = data.employee_name || data.employee_id;

        // Active shift detected: requires employee confirmation to clock out
        if (data.action_required === "CONFIRM_CLOCK_OUT" || data.punch_type === "PENDING_OUT") {
          setPendingClockOut(data);
          setStatusMessage(`Active shift detected for ${empDisplayName}. Awaiting confirmation...`);
          if (onStatusChange) onStatusChange("CONFIRM_CLOCK_OUT");
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
        } else {
          setStatusMessage(`Clock In verified: ${empDisplayName}`);
        }

        if (enableSound) playVerificationChime();
        if (onSuccess) onSuccess(data);
        if (onStatusChange) onStatusChange("SUCCESS");

        // Auto-dismiss after 4 seconds
        setTimeout(() => {
          setLastSuccess(null);
          setStatusMessage("");
          if (onStatusChange) onStatusChange("READY");
        }, 4000);
      } else {
        const msg = data.message || "Face not recognized (biometric match below threshold).";
        setErrorBanner(msg);
        setStatusMessage("");
        if (onError) onError(msg);
        if (onStatusChange) onStatusChange("FAILED");
      }
    } catch (err: any) {
      const errText = err.message || "Network error communicating with biometric engine.";
      setErrorBanner(errText);
      setStatusMessage("");
      if (onError) onError(errText);
      if (onStatusChange) onStatusChange("ERROR");
    } finally {
      setLoading(false);
    }
  };

  // Hands-free auto-scan timer
  useEffect(() => {
    if (!autoScan || !hasCamera || loading || lastSuccess || pendingClockOut) return;
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

  return (
    <div
      className={`sureclock-kiosk-root ${className}`}
      style={{
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
      }}
    >
      {/* Header Bar */}
      {!hideHeader && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
            borderBottom: `1px solid ${themeTokens.border}`,
            paddingBottom: "12px",
            ...styles.header,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* Biometric Shield Icon */}
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                backgroundColor: isLight ? "#e0f2fe" : "#0c2847",
                border: `1px solid ${isLight ? "#bae6fd" : "#0284c7"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0284c7",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0z" />
              </svg>
            </div>
            <div>
              <h2
                style={{
                  fontSize: "1.05rem",
                  fontWeight: 700,
                  margin: 0,
                  color: themeTokens.textPrimary,
                  letterSpacing: "-0.01em",
                }}
              >
                {title}
              </h2>
              <p style={{ fontSize: "0.75rem", color: themeTokens.textMuted, margin: "2px 0 0 0" }}>
                {subtitle || (
                  <>
                    Station: <span style={{ fontFamily: "monospace", color: "#0ea5e9" }}>{effectiveWorkspaceId || "Default"}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Digital Time & System Indicator */}
          <div style={{ textAlign: "right" }}>
            <span
              style={{
                fontSize: "1.05rem",
                fontWeight: 700,
                fontFamily: "monospace",
                fontVariantNumeric: "tabular-nums",
                color: isLight ? "#0f172a" : "#38bdf8",
              }}
            >
              {currentTime}
            </span>
            <div
              style={{
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
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  backgroundColor: hasCamera ? "#10b981" : "#ef4444",
                  boxShadow: hasCamera ? "0 0 6px #10b981" : "none",
                }}
              />
              {hasCamera ? "Ready" : "Offline"}
            </div>
          </div>
        </div>
      )}

      {/* Optional Mode Selector (Hidden by default for simplicity) */}
      {showModeSelector && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "4px",
            padding: "3px",
            borderRadius: "8px",
            backgroundColor: themeTokens.selectorBg,
            border: `1px solid ${themeTokens.border}`,
            marginBottom: "14px",
          }}
        >
          <button
            type="button"
            onClick={() => setSelectedPunchType("AUTO")}
            style={{
              padding: "6px 8px",
              borderRadius: "6px",
              border: "none",
              background: selectedPunchType === "AUTO" ? "#0284c7" : "transparent",
              color: selectedPunchType === "AUTO" ? "#ffffff" : themeTokens.textMuted,
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Auto
          </button>
          <button
            type="button"
            onClick={() => setSelectedPunchType("IN")}
            style={{
              padding: "6px 8px",
              borderRadius: "6px",
              border: "none",
              background: selectedPunchType === "IN" ? "#059669" : "transparent",
              color: selectedPunchType === "IN" ? "#ffffff" : themeTokens.textMuted,
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Clock In
          </button>
          <button
            type="button"
            onClick={() => setSelectedPunchType("OUT")}
            style={{
              padding: "6px 8px",
              borderRadius: "6px",
              border: "none",
              background: selectedPunchType === "OUT" ? "#d97706" : "transparent",
              color: selectedPunchType === "OUT" ? "#ffffff" : themeTokens.textMuted,
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Clock Out
          </button>
        </div>
      )}

      {/* Viewfinder Container */}
      <div
        style={{
          position: "relative",
          width: "100%",
          paddingTop: "100%",
          borderRadius: "12px",
          overflow: "hidden",
          backgroundColor: themeTokens.viewfinderBg,
          border: `1px solid ${themeTokens.border}`,
          boxSizing: "border-box",
          ...styles.viewfinder,
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: mirror ? "scaleX(-1)" : "none",
          }}
        />

        {/* Biometric HUD Reticle & Corner Brackets */}
        <div
          style={{
            position: "absolute",
            top: "14%",
            left: "14%",
            width: "72%",
            height: "72%",
            pointerEvents: "none",
            boxSizing: "border-box",
            ...styles.hud,
          }}
        >
          {/* Oval Face Guide (guides user to position face, eliminating clothing/torso) */}
          <div
            style={{
              position: "absolute",
              top: "4%",
              left: "14%",
              width: "72%",
              height: "92%",
              borderRadius: "50%",
              border: "1.5px dashed rgba(14, 165, 233, 0.45)",
              boxShadow: "0 0 16px rgba(14, 165, 233, 0.08) inset",
              pointerEvents: "none",
            }}
          />
          {/* Top-Left */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "22px",
              height: "22px",
              borderTop: "2.5px solid #0ea5e9",
              borderLeft: "2.5px solid #0ea5e9",
              borderTopLeftRadius: "4px",
            }}
          />
          {/* Top-Right */}
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: "22px",
              height: "22px",
              borderTop: "2.5px solid #0ea5e9",
              borderRight: "2.5px solid #0ea5e9",
              borderTopRightRadius: "4px",
            }}
          />
          {/* Bottom-Left */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              width: "22px",
              height: "22px",
              borderBottom: "2.5px solid #0ea5e9",
              borderLeft: "2.5px solid #0ea5e9",
              borderBottomLeftRadius: "4px",
            }}
          />
          {/* Bottom-Right */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: "22px",
              height: "22px",
              borderBottom: "2.5px solid #0ea5e9",
              borderRight: "2.5px solid #0ea5e9",
              borderBottomRightRadius: "4px",
            }}
          />

          {/* Center Target Dot */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: "8px",
              height: "8px",
              margin: "-4px 0 0 -4px",
              borderRadius: "50%",
              backgroundColor: "rgba(14, 165, 233, 0.45)",
            }}
          />
        </div>

        {/* Live Scan Sweep Bar */}
        {loading && (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              height: "2px",
              backgroundColor: "#38bdf8",
              boxShadow: "0 0 8px #0284c7",
              animation: "sureclockScanLine 1.4s ease-in-out infinite",
              zIndex: 10,
            }}
          />
        )}

        {/* Dynamic Verification Result Overlay */}
        {lastSuccess && (
          <div
            style={{
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
            }}
          >
            {/* Top Badge: Explicit Clock In vs Clock Out */}
            {lastSuccess.punch_type === "OUT" ? (
              <div
                style={{
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
                }}
              >
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    backgroundColor: "#f59e0b",
                  }}
                />
                Clock Out Recorded
              </div>
            ) : (
              <div
                style={{
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
                }}
              >
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    backgroundColor: "#10b981",
                  }}
                />
                Clock In Recorded
              </div>
            )}

            {/* Checkmark Icon Circle */}
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                backgroundColor: lastSuccess.punch_type === "OUT" ? "#d97706" : "#059669",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                marginBottom: "12px",
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            {/* Employee Name (Primary) & ID (Secondary) */}
            <h3
              style={{
                fontSize: "1.3rem",
                fontWeight: 700,
                margin: "0 0 2px 0",
                color: themeTokens.textPrimary,
                letterSpacing: "-0.01em",
              }}
            >
              {lastSuccess.employee_name || lastSuccess.employee_id}
            </h3>
            {lastSuccess.employee_name && (
              <div
                style={{
                  fontSize: "0.78rem",
                  fontFamily: "monospace",
                  color: themeTokens.textMuted,
                  marginBottom: "6px",
                }}
              >
                ID: {lastSuccess.employee_id}
              </div>
            )}

            {/* Contextual message */}
            <p
              style={{
                fontSize: "0.85rem",
                color: themeTokens.textMuted,
                margin: "0 0 10px 0",
              }}
            >
              {lastSuccess.punch_type === "OUT"
                ? "Clock-out logged. Shift completed."
                : "Clock-in logged. Have a great shift!"}
            </p>

            {/* Shift Duration Display (for Clock Out) */}
            {lastSuccess.punch_type === "OUT" && lastSuccess.session_duration_minutes != null && (
              <div
                style={{
                  backgroundColor: isLight ? "#f1f5f9" : "#0f172a",
                  border: `1px solid ${themeTokens.border}`,
                  padding: "8px 16px",
                  borderRadius: "8px",
                  marginBottom: "12px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "0.7rem", color: themeTokens.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Shift Duration
                </div>
                <div
                  style={{
                    fontSize: "1.2rem",
                    fontWeight: 700,
                    fontFamily: "monospace",
                    fontVariantNumeric: "tabular-nums",
                    color: "#0ea5e9",
                  }}
                >
                  {Math.floor(lastSuccess.session_duration_minutes / 60)}h{" "}
                  {lastSuccess.session_duration_minutes % 60}m
                </div>
              </div>
            )}

            {/* Monospace Metadata Row */}
            <div
              style={{
                display: "flex",
                gap: "12px",
                fontSize: "0.75rem",
                color: themeTokens.textMuted,
                fontFamily: "monospace",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <span>CONFIDENCE: {(lastSuccess.confidence * 100).toFixed(1)}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Hidden Canvases for eye-aligned face inference & active micro-motion */}
      <canvas ref={canvasRef} style={{ display: "none" }} />
      <canvas ref={canvas2Ref} style={{ display: "none" }} />

      {/* Optional Camera Switcher if > 1 video device */}
      {availableDevices.length > 1 && (
        <div style={{ marginTop: "10px", display: "flex", justifyContent: "flex-end" }}>
          <select
            value={selectedDeviceId}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            style={{
              padding: "4px 8px",
              borderRadius: "6px",
              border: `1px solid ${themeTokens.border}`,
              backgroundColor: themeTokens.selectorBg,
              color: themeTokens.textMuted,
              fontSize: "0.75rem",
              outline: "none",
            }}
          >
            {availableDevices.map((dev, idx) => (
              <option key={dev.deviceId || idx} value={dev.deviceId}>
                {dev.label || `Camera ${idx + 1}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Dynamic Status / Feedback Notification */}
      {statusMessage && !lastSuccess && (
        <div
          style={{
            marginTop: "12px",
            padding: "8px 12px",
            borderRadius: "8px",
            backgroundColor: isLight ? "#f0f9ff" : "#082f49",
            color: isLight ? "#0369a1" : "#38bdf8",
            border: `1px solid ${isLight ? "#bae6fd" : "#0c4a6e"}`,
            fontSize: "0.8rem",
            textAlign: "center",
            fontWeight: 500,
          }}
        >
          {statusMessage}
        </div>
      )}

      {/* Error Alert Banner */}
      {errorBanner && (
        <div
          style={{
            marginTop: "12px",
            padding: "8px 12px",
            borderRadius: "8px",
            backgroundColor: isLight ? "#fef2f2" : "#450a0a",
            color: isLight ? "#b91c1c" : "#fca5a5",
            fontSize: "0.8rem",
            textAlign: "center",
            border: `1px solid ${isLight ? "#fecaca" : "#7f1d1d"}`,
          }}
        >
          {errorBanner}
        </div>
      )}

      {/* Primary Action Button: "Verify" */}
      <div style={{ marginTop: "14px" }}>
        <button
          type="button"
          onClick={handleVerify}
          disabled={loading || !hasCamera}
          style={{
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
          }}
        >
          {/* Biometric Scan SVG Icon */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 3H5a2 2 0 0 0-2 2v2" />
            <path d="M17 3h2a2 2 0 0 1 2 2v2" />
            <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
            <path d="M3 17v2a2 2 0 0 0 2 2h2" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span>{loading ? loadingLabel : buttonLabel}</span>
        </button>

        <p
          style={{
            fontSize: "0.75rem",
            color: themeTokens.textMuted,
            textAlign: "center",
            margin: "8px 0 0 0",
          }}
        >
          Align your face in the frame and tap Verify
        </p>
      </div>

      {/* Clock-Out Confirmation Modal */}
      <ConfirmModal
        isOpen={!!pendingClockOut}
        title="Confirm Clock-Out"
        message={
          <span>
            Hello <strong style={{ color: "#38bdf8" }}>{pendingClockOut?.employee_name || pendingClockOut?.employee_id}</strong>
            {pendingClockOut?.employee_name && (
              <span style={{ fontSize: "0.82rem", color: "#94a3b8", fontFamily: "monospace", marginLeft: "5px" }}>
                ({pendingClockOut.employee_id})
              </span>
            )}! You have an active shift of{" "}
            <strong style={{ color: "#f59e0b" }}>
              {pendingClockOut?.session_duration_minutes != null
                ? `${Math.floor(pendingClockOut.session_duration_minutes / 60)}h ${pendingClockOut.session_duration_minutes % 60}m`
                : "in progress"}
            </strong>
            . Are you sure you want to clock out now?
          </span>
        }
        confirmLabel="Confirm Clock-Out"
        cancelLabel="Keep Working / Cancel"
        danger={false}
        countdownSeconds={10}
        theme={theme}
        loading={confirmLoading}
        onCancel={() => {
          setPendingClockOut(null);
          setStatusMessage("");
          if (onStatusChange) onStatusChange("READY");
        }}
        onConfirm={async () => {
          if (!pendingClockOut?.employee_id) return;
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
            if (enableSound) playVerificationChime();
            if (onSuccess) onSuccess(confirmedData);
            if (onStatusChange) onStatusChange("SUCCESS");

            setTimeout(() => {
              setLastSuccess(null);
              setStatusMessage("");
              if (onStatusChange) onStatusChange("READY");
            }, 4000);
          } catch (err: any) {
            setErrorBanner(err.message || "Error confirming clock out");
            setPendingClockOut(null);
          } finally {
            setConfirmLoading(false);
          }
        }}
      />
    </div>
  );
};
