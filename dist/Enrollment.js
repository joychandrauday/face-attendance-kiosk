"use client";
import React, { useEffect, useRef, useState } from "react";
export const FaceEnrollment = ({ apiKey, api_key, workspaceId, workspace_id, employeeId, employee_id, apiUrl = "https://api.sureclock.karalasoft.com", theme = "dark", styles = {}, hideHeader = false, title = "Employee Biometric Enrollment", className = "", onSuccess, onError, }) => {
    const effectiveApiKey = apiKey || api_key || "";
    const effectiveWorkspaceId = workspaceId || workspace_id || "";
    const [empIdInput, setEmpIdInput] = useState(employeeId || employee_id || "");
    const [angleLabel, setAngleLabel] = useState("front");
    const [inputMode, setInputMode] = useState("camera");
    const [hasCamera, setHasCamera] = useState(false);
    const [capturedPhoto, setCapturedPhoto] = useState(null);
    const [loading, setLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");
    const [errorBanner, setErrorBanner] = useState(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const fileInputRef = useRef(null);
    const streamRef = useRef(null);
    // Sync prop changes
    useEffect(() => {
        if (employeeId || employee_id) {
            setEmpIdInput(employeeId || employee_id || "");
        }
    }, [employeeId, employee_id]);
    // Initialize camera stream
    useEffect(() => {
        if (inputMode !== "camera" || capturedPhoto)
            return;
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
            }
            catch (err) {
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
        if (!video || !canvas || video.videoWidth === 0)
            return;
        canvas.width = 224;
        canvas.height = 224;
        const ctx = canvas.getContext("2d");
        if (!ctx)
            return;
        const size = Math.min(video.videoWidth, video.videoHeight);
        const startX = (video.videoWidth - size) / 2;
        const startY = (video.videoHeight - size) / 2;
        ctx.drawImage(video, startX, startY, size, size, 0, 0, 224, 224);
        const compressed = canvas.toDataURL("image/jpeg", 0.7);
        setCapturedPhoto(compressed);
        setErrorBanner(null);
    };
    // Handle file upload
    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = canvasRef.current;
                if (!canvas)
                    return;
                canvas.width = 224;
                canvas.height = 224;
                const ctx = canvas.getContext("2d");
                if (!ctx)
                    return;
                const size = Math.min(img.width, img.height);
                const startX = (img.width - size) / 2;
                const startY = (img.height - size) / 2;
                ctx.drawImage(img, startX, startY, size, size, 0, 0, 224, 224);
                setCapturedPhoto(canvas.toDataURL("image/jpeg", 0.7));
                setErrorBanner(null);
            };
            img.src = event.target?.result;
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
            if (onSuccess)
                onSuccess(data);
            setTimeout(() => {
                setCapturedPhoto(null);
                setStatusMessage("");
            }, 3000);
        }
        catch (err) {
            const msg = err.message || "Failed to register employee vector.";
            setErrorBanner(msg);
            setStatusMessage("");
            if (onError)
                onError(msg);
        }
        finally {
            setLoading(false);
        }
    };
    const isLight = theme === "light";
    const isTransparent = theme === "transparent";
    const themeTokens = {
        bg: isTransparent ? "transparent" : isLight ? "#ffffff" : "#0f172a",
        border: isLight ? "#e2e8f0" : "#1e293b",
        textPrimary: isLight ? "#0f172a" : "#f8fafc",
        textMuted: isLight ? "#64748b" : "#94a3b8",
        viewfinderBg: isLight ? "#f1f5f9" : "#020617",
        selectorBg: isLight ? "#f8fafc" : "#080d1a",
        inputBg: isLight ? "#f8fafc" : "#080d1a",
    };
    return (React.createElement("div", { className: `sureclock-enrollment-root ${className}`, style: {
            maxWidth: "480px",
            width: "100%",
            margin: "0 auto",
            padding: "20px",
            borderRadius: "16px",
            backgroundColor: themeTokens.bg,
            color: themeTokens.textPrimary,
            border: `1px solid ${themeTokens.border}`,
            boxSizing: "border-box",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            ...styles.container,
        } },
        !hideHeader && (React.createElement("div", { style: { marginBottom: "14px", borderBottom: `1px solid ${themeTokens.border}`, paddingBottom: "10px" } },
            React.createElement("h2", { style: { fontSize: "1.15rem", fontWeight: 700, margin: 0, color: themeTokens.textPrimary } }, title),
            React.createElement("p", { style: { fontSize: "0.8rem", color: themeTokens.textMuted, margin: "2px 0 0 0" } },
                "Workspace: ",
                React.createElement("code", { style: { color: "#0ea5e9", fontFamily: "monospace" } }, effectiveWorkspaceId || "Default")))),
        !(employeeId || employee_id) && (React.createElement("div", { style: { marginBottom: "12px" } },
            React.createElement("label", { style: { display: "block", fontSize: "0.8rem", fontWeight: 600, color: themeTokens.textMuted, marginBottom: "4px" } }, "Employee ID / Code"),
            React.createElement("input", { type: "text", value: empIdInput, onChange: (e) => setEmpIdInput(e.target.value), placeholder: "e.g. EMP_0412", style: {
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: `1px solid ${themeTokens.border}`,
                    backgroundColor: themeTokens.inputBg,
                    color: themeTokens.textPrimary,
                    fontSize: "0.9rem",
                    fontFamily: "monospace",
                    boxSizing: "border-box",
                } }))),
        React.createElement("div", { style: { display: "flex", gap: "6px", marginBottom: "12px" } },
            React.createElement("button", { type: "button", onClick: () => { setInputMode("camera"); setCapturedPhoto(null); }, style: {
                    flex: 1,
                    padding: "6px",
                    borderRadius: "6px",
                    border: `1px solid ${inputMode === "camera" ? "#0284c7" : themeTokens.border}`,
                    background: inputMode === "camera" ? "#0284c7" : "transparent",
                    color: inputMode === "camera" ? "#fff" : themeTokens.textMuted,
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: "pointer",
                } }, "Live Camera"),
            React.createElement("button", { type: "button", onClick: () => { setInputMode("upload"); setCapturedPhoto(null); }, style: {
                    flex: 1,
                    padding: "6px",
                    borderRadius: "6px",
                    border: `1px solid ${inputMode === "upload" ? "#0284c7" : themeTokens.border}`,
                    background: inputMode === "upload" ? "#0284c7" : "transparent",
                    color: inputMode === "upload" ? "#fff" : themeTokens.textMuted,
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: "pointer",
                } }, "Upload Photo")),
        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" } },
            React.createElement("span", { style: { fontSize: "0.8rem", color: themeTokens.textMuted } }, "Angle:"),
            ["front", "left", "right"].map((a) => (React.createElement("button", { key: a, type: "button", onClick: () => setAngleLabel(a), style: {
                    padding: "3px 8px",
                    borderRadius: "4px",
                    border: `1px solid ${angleLabel === a ? "#0ea5e9" : themeTokens.border}`,
                    background: angleLabel === a ? "rgba(14, 165, 233, 0.2)" : "transparent",
                    color: angleLabel === a ? "#0ea5e9" : themeTokens.textMuted,
                    fontSize: "0.75rem",
                    textTransform: "capitalize",
                    cursor: "pointer",
                } }, a)))),
        React.createElement("div", { style: {
                position: "relative",
                width: "100%",
                paddingTop: "100%",
                borderRadius: "12px",
                overflow: "hidden",
                backgroundColor: themeTokens.viewfinderBg,
                border: `1px solid ${themeTokens.border}`,
            } }, inputMode === "camera" ? (capturedPhoto ? (React.createElement("img", { src: capturedPhoto, alt: "Enrolled capture", style: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" } })) : (React.createElement("video", { ref: videoRef, autoPlay: true, playsInline: true, muted: true, style: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" } }))) : capturedPhoto ? (React.createElement("img", { src: capturedPhoto, alt: "Uploaded capture", style: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" } })) : (React.createElement("div", { onClick: () => fileInputRef.current?.click(), style: {
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
            } },
            React.createElement("span", { style: { fontSize: "2rem", marginBottom: "8px" } }, "\uD83D\uDCC1"),
            React.createElement("span", { style: { fontSize: "0.85rem", fontWeight: 600 } }, "Click to select employee headshot"),
            React.createElement("span", { style: { fontSize: "0.75rem", marginTop: "4px" } }, "PNG, JPG or WebP")))),
        React.createElement("input", { ref: fileInputRef, type: "file", accept: "image/*", onChange: handleFileUpload, style: { display: "none" } }),
        React.createElement("canvas", { ref: canvasRef, style: { display: "none" } }),
        inputMode === "camera" && !capturedPhoto && (React.createElement("button", { type: "button", onClick: handleSnap, disabled: !hasCamera, style: {
                width: "100%",
                marginTop: "12px",
                padding: "10px",
                borderRadius: "8px",
                border: `1px solid ${themeTokens.border}`,
                background: "#1e293b",
                color: "#ffffff",
                fontWeight: 600,
                fontSize: "0.9rem",
                cursor: hasCamera ? "pointer" : "not-allowed",
            } }, "Capture Photo")),
        capturedPhoto && (React.createElement("div", { style: { display: "flex", gap: "8px", marginTop: "12px" } },
            React.createElement("button", { type: "button", onClick: () => setCapturedPhoto(null), style: {
                    flex: 1,
                    padding: "10px",
                    borderRadius: "8px",
                    border: `1px solid ${themeTokens.border}`,
                    background: "transparent",
                    color: themeTokens.textMuted,
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                } }, "Retake"),
            React.createElement("button", { type: "button", onClick: handleSubmit, disabled: loading, style: {
                    flex: 2,
                    padding: "10px",
                    borderRadius: "8px",
                    border: "none",
                    background: "#0284c7",
                    color: "#ffffff",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    cursor: loading ? "not-allowed" : "pointer",
                } }, loading ? "Registering..." : "Confirm & Save Vector"))),
        statusMessage && (React.createElement("div", { style: { marginTop: "10px", padding: "8px", borderRadius: "6px", backgroundColor: "#082f49", color: "#38bdf8", fontSize: "0.8rem", textAlign: "center" } }, statusMessage)),
        errorBanner && (React.createElement("div", { style: { marginTop: "10px", padding: "8px", borderRadius: "6px", backgroundColor: "#450a0a", color: "#fca5a5", fontSize: "0.8rem", textAlign: "center", border: "1px solid #7f1d1d" } }, errorBanner))));
};
