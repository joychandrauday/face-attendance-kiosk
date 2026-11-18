"use client";

import React, { useEffect, useRef, useState } from "react";
import { EnrollmentSuccessResult, FaceEnrollmentProps } from "./types.js";

export const FaceEnrollment: React.FC<FaceEnrollmentProps> = ({
  apiKey,
  api_key,
  workspaceId,
  workspace_id,
  employeeId,
  employee_id,
  apiUrl = "https://api.sureclock.karalasoft.com",
  theme = "dark",
  styles = {},
  hideHeader = false,
  title = "Employee Biometric Enrollment",
  className = "",
  onSuccess,
  onError,
}) => {
  const effectiveApiKey = apiKey || api_key || "";
  const effectiveWorkspaceId = workspaceId || workspace_id || "";
  const [empIdInput, setEmpIdInput] = useState<string>(employeeId || employee_id || "");
  const [angleLabel, setAngleLabel] = useState<string>("front");
  const [inputMode, setInputMode] = useState<"camera" | "upload">("camera");

  const [hasCamera, setHasCamera] = useState<boolean>(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Sync prop changes
  useEffect(() => {
    if (employeeId || employee_id) {
      setEmpIdInput(employeeId || employee_id || "");
    }
  }, [employeeId, employee_id]);

  // Initialize camera stream
  useEffect(() => {
    if (inputMode !== "camera" || capturedPhoto) return;

    let isCancelled = false;
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
          audio: false,
        });
        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setHasCamera(true);
        }
      } catch (err: any) {
        setHasCamera(false);
      }
    }

    startCamera();

    return () => {
      isCancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [inputMode, capturedPhoto]);

  // Capture canvas frame from video
  const handleSnap = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) return;

    canvas.width = 224;
    canvas.height = 224;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = Math.min(video.videoWidth, video.videoHeight);
    const startX = (video.videoWidth - size) / 2;
    const startY = (video.videoHeight - size) / 2;

    ctx.drawImage(video, startX, startY, size, size, 0, 0, 224, 224);
    const compressed = canvas.toDataURL("image/jpeg", 0.7);
    setCapturedPhoto(compressed);
    setErrorBanner(null);
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = 224;
        canvas.height = 224;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const size = Math.min(img.width, img.height);
        const startX = (img.width - size) / 2;
        const startY = (img.height - size) / 2;
        ctx.drawImage(img, startX, startY, size, size, 0, 0, 224, 224);
        setCapturedPhoto(canvas.toDataURL("image/jpeg", 0.7));
        setErrorBanner(null);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    const targetEmpId = empIdInput.trim();

    if (!effectiveApiKey) {
      setErrorBanner("Missing api_key prop (sk_live_... secret key required for enrollment).");
      return;
    }
    if (!effectiveWorkspaceId) {
      setErrorBanner("Missing workspace_id prop.");
      return;
    }
    if (!targetEmpId) {
      setErrorBanner("Please specify an Employee ID.");
      return;
    }
    if (!capturedPhoto) {
      setErrorBanner("Please take or upload a photo before enrolling.");
      return;
    }

    setLoading(true);
    setStatusMessage("Extracting 128D mathematical vector...");
    setErrorBanner(null);

    try {
      const endpoint = `${apiUrl.replace(/\/$/, "")}/api/v1/faces/register`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": effectiveApiKey,
        },
        body: JSON.stringify({
          workspace_id: effectiveWorkspaceId,
          employee_id: targetEmpId,
          image_base64: capturedPhoto,
          angle_label: angleLabel,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Server error (${response.status})`);
      }

      setStatusMessage(`Enrolled ${targetEmpId} successfully (${angleLabel} angle)!`);
      if (onSuccess) onSuccess(data);

      setTimeout(() => {
        setCapturedPhoto(null);
        setStatusMessage("");
      }, 3000);
    } catch (err: any) {
      const msg = err.message || "Failed to register employee vector.";
      setErrorBanner(msg);
      setStatusMessage("");
      if (onError) onError(msg);
    } finally {
      setLoading(false);
    }
  };

  const isLight = theme === "light";
  const isTransparent = theme === "transparent";

  const themeTokens = {
    bg: isTransparent ? "transparent" : isLight ? "#ffffff" : "#080d1a",
    surface: isLight ? "#f8fafc" : "#0f172a",
    border: isLight ? "#e2e8f0" : "#1e293b",
    textPrimary: isLight ? "#0f172a" : "#f8fafc",
    textMuted: isLight ? "#64748b" : "#94a3b8",
    viewfinderBg: isLight ? "#f1f5f9" : "#020617",
    selectorBg: isLight ? "#f1f5f9" : "#060913",
    inputBg: isLight ? "#f8fafc" : "#0f172a",
    accent: "#0284c7",
  };

  return (
    <div
      className={`sureclock-enrollment-root ${className}`}
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
      {!hideHeader && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px", borderBottom: `1px solid ${themeTokens.border}`, paddingBottom: "12px", ...styles.header }}>
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
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
          </div>
          <div>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0, color: themeTokens.textPrimary, letterSpacing: "-0.01em" }}>
              {title}
            </h2>
            <p style={{ fontSize: "0.75rem", color: themeTokens.textMuted, margin: "2px 0 0 0" }}>
              Workspace: <span style={{ fontFamily: "monospace", color: "#0ea5e9" }}>{effectiveWorkspaceId || "Default"}</span>
            </p>
          </div>
        </div>
      )}

      {/* Employee ID input if not fixed */}
      {!(employeeId || employee_id) && (
        <div style={{ marginBottom: "12px" }}>
          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: themeTokens.textMuted, marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Employee ID / Badge Code
          </label>
          <input
            type="text"
            value={empIdInput}
            onChange={(e) => setEmpIdInput(e.target.value)}
            placeholder="e.g. EMP_0412"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: "8px",
              border: `1px solid ${themeTokens.border}`,
              backgroundColor: themeTokens.inputBg,
              color: themeTokens.textPrimary,
              fontSize: "0.9rem",
              fontFamily: "monospace",
              boxSizing: "border-box",
              outline: "none",
            }}
          />
        </div>
      )}

      {/* Input Mode Selector: Camera vs File Upload */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
        <button
          type="button"
          onClick={() => { setInputMode("camera"); setCapturedPhoto(null); }}
          style={{
            flex: 1,
            padding: "8px",
            borderRadius: "6px",
            border: `1px solid ${inputMode === "camera" ? "#0284c7" : themeTokens.border}`,
            background: inputMode === "camera" ? (isLight ? "#e0f2fe" : "#0c2847") : "transparent",
            color: inputMode === "camera" ? (isLight ? "#0284c7" : "#38bdf8") : themeTokens.textMuted,
            fontSize: "0.8rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          Live Camera
        </button>
        <button
          type="button"
          onClick={() => { setInputMode("upload"); setCapturedPhoto(null); }}
          style={{
            flex: 1,
            padding: "8px",
            borderRadius: "6px",
            border: `1px solid ${inputMode === "upload" ? "#0284c7" : themeTokens.border}`,
            background: inputMode === "upload" ? (isLight ? "#e0f2fe" : "#0c2847") : "transparent",
            color: inputMode === "upload" ? (isLight ? "#0284c7" : "#38bdf8") : themeTokens.textMuted,
            fontSize: "0.8rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Upload Photo
        </button>
      </div>

      {/* Angle Selector */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
        <span style={{ fontSize: "0.75rem", color: themeTokens.textMuted, textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.04em" }}>Angle:</span>
        {["front", "left", "right"].map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => setAngleLabel(a)}
            style={{
              padding: "4px 10px",
              borderRadius: "4px",
              border: `1px solid ${angleLabel === a ? "#0284c7" : themeTokens.border}`,
              background: angleLabel === a ? (isLight ? "#e0f2fe" : "rgba(2, 132, 199, 0.2)") : "transparent",
              color: angleLabel === a ? "#0284c7" : themeTokens.textMuted,
              fontSize: "0.75rem",
              textTransform: "capitalize",
              fontWeight: angleLabel === a ? 700 : 500,
              cursor: "pointer",
            }}
          >
            {a}
          </button>
        ))}
      </div>

      {/* Visual Frame */}
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
        {inputMode === "camera" ? (
          capturedPhoto ? (
            <img
              src={capturedPhoto}
              alt="Enrolled capture"
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }}
            />
          )
        ) : capturedPhoto ? (
          <img
            src={capturedPhoto}
            alt="Uploaded capture"
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              padding: "20px",
              boxSizing: "border-box",
              color: themeTokens.textMuted,
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                backgroundColor: isLight ? "#e2e8f0" : "#1e293b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: themeTokens.textMuted,
                marginBottom: "12px",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: themeTokens.textPrimary }}>Select employee headshot</span>
            <span style={{ fontSize: "0.75rem", marginTop: "4px" }}>PNG, JPG or WebP (max 5MB)</span>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        style={{ display: "none" }}
      />
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Snap / Retake Controls */}
      {inputMode === "camera" && !capturedPhoto && (
        <button
          type="button"
          onClick={handleSnap}
          disabled={!hasCamera}
          style={{
            width: "100%",
            marginTop: "12px",
            padding: "12px",
            borderRadius: "8px",
            border: `1px solid ${themeTokens.border}`,
            background: isLight ? "#f1f5f9" : "#1e293b",
            color: themeTokens.textPrimary,
            fontWeight: 600,
            fontSize: "0.9rem",
            cursor: hasCamera ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            ...styles.button,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="4" />
          </svg>
          Capture Photo
        </button>
      )}

      {capturedPhoto && (
        <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
          <button
            type="button"
            onClick={() => setCapturedPhoto(null)}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "8px",
              border: `1px solid ${themeTokens.border}`,
              background: "transparent",
              color: themeTokens.textMuted,
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            Retake
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            style={{
              flex: 2,
              padding: "12px",
              borderRadius: "8px",
              border: "none",
              background: themeTokens.accent,
              color: "#ffffff",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              ...styles.button,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            {loading ? "Registering..." : "Confirm & Save Vector"}
          </button>
        </div>
      )}

      {statusMessage && (
        <div
          style={{
            marginTop: "10px",
            padding: "8px 12px",
            borderRadius: "8px",
            backgroundColor: isLight ? "#f0fdf4" : "#064e3b",
            color: isLight ? "#15803d" : "#34d399",
            border: `1px solid ${isLight ? "#bbf7d0" : "#059669"}`,
            fontSize: "0.8rem",
            textAlign: "center",
            fontWeight: 500,
          }}
        >
          {statusMessage}
        </div>
      )}

      {errorBanner && (
        <div
          style={{
            marginTop: "10px",
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
    </div>
  );
};
