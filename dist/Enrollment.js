"use client";
import React, { useEffect, useRef, useState } from "react";
export const FaceEnrollment = ({ apiKey, api_key, workspaceId, workspace_id, employeeId, employee_id, apiUrl = "https://api.sureclock.karalasoft.com", onSuccess, onError, className = "", title = "Employee Biometric Enrollment", }) => {
    const effectiveApiKey = apiKey || api_key || "";
    const effectiveWorkspaceId = workspaceId || workspace_id || "";
    const [empIdInput, setEmpIdInput] = useState(employeeId || employee_id || "");
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [hasCamera, setHasCamera] = useState(false);
    const [capturedPhoto, setCapturedPhoto] = useState(null);
    const [loading, setLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");
    const [errorBanner, setErrorBanner] = useState(null);
    // Initialize camera stream
    useEffect(() => {
        let stream = null;
        async function startCamera() {
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 640 },
                        height: { ideal: 480 },
                        facingMode: "user",
                    },
                    audio: false,
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    setHasCamera(true);
                }
            }
            catch (err) {
                console.error("Camera access error:", err);
                setErrorBanner("Camera permission denied or camera not available.");
                if (onError)
                    onError("Camera permission denied or camera not available.");
            }
        }
        startCamera();
        return () => {
            if (stream) {
                stream.getTracks().forEach((track) => track.stop());
            }
        };
    }, [capturedPhoto]);
    // Capture & compress on canvas to ~40 KB
    const captureFrame = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas)
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
    const handleRetake = () => {
        setCapturedPhoto(null);
        setStatusMessage("");
        setErrorBanner(null);
    };
    const handleSubmitEnrollment = async () => {
        const targetEmpId = (employeeId || employee_id || empIdInput).trim();
        if (!effectiveApiKey) {
            setErrorBanner("Missing api_key prop (sk_live_... required).");
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
            setErrorBanner("Please take a photo before enrolling.");
            return;
        }
        setLoading(true);
        setStatusMessage("Vectorizing and securely enrolling face biometric...");
        setErrorBanner(null);
        try {
            const endpoint = `${apiUrl.replace(/\/$/, "")}/api/v1/register`;
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
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || `Server error (${response.status})`);
            }
            setStatusMessage(`✓ Biometric enrollment complete for ${targetEmpId}!`);
            if (onSuccess)
                onSuccess(data);
            setTimeout(() => {
                setCapturedPhoto(null);
                setStatusMessage("");
            }, 3000);
        }
        catch (err) {
            const errText = err.message || "Failed to register employee.";
            setErrorBanner(errText);
            setStatusMessage("");
            if (onError)
                onError(errText);
        }
        finally {
            setLoading(false);
        }
    };
    return (React.createElement("div", { className: `sureclock-enrollment-container ${className}`, style: {
            maxWidth: "460px",
            margin: "0 auto",
            padding: "20px",
            borderRadius: "16px",
            backgroundColor: "#0f172a",
            color: "#f8fafc",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
            fontFamily: "system-ui, -apple-system, sans-serif",
        } },
        React.createElement("div", { style: { textAlign: "center", marginBottom: "16px" } },
            React.createElement("h2", { style: { fontSize: "1.25rem", fontWeight: 700, margin: 0 } }, title),
            React.createElement("p", { style: { fontSize: "0.85rem", color: "#94a3b8", margin: "4px 0 0" } },
                "Workspace: ",
                React.createElement("code", { style: { color: "#38bdf8" } }, effectiveWorkspaceId || "Not set"))),
        !(employeeId || employee_id) && (React.createElement("div", { style: { marginBottom: "14px" } },
            React.createElement("label", { style: { display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "4px" } }, "Employee ID (from CRM / HR):"),
            React.createElement("input", { type: "text", value: empIdInput, onChange: (e) => setEmpIdInput(e.target.value), placeholder: "e.g. EMP_042", style: {
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    color: "#ffffff",
                    fontSize: "0.95rem",
                    boxSizing: "border-box",
                } }))),
        React.createElement("div", { style: {
                position: "relative",
                width: "100%",
                paddingTop: "100%",
                borderRadius: "12px",
                overflow: "hidden",
                backgroundColor: "#1e293b",
                border: "2px solid #334155",
            } },
            capturedPhoto ? (React.createElement("img", { src: capturedPhoto, alt: "Baseline Preview", style: {
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                } })) : (React.createElement("video", { ref: videoRef, autoPlay: true, playsInline: true, muted: true, style: {
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    transform: "scaleX(-1)",
                } })),
            !capturedPhoto && (React.createElement("div", { style: {
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "65%",
                    height: "65%",
                    border: "2px dashed #10b981",
                    borderRadius: "50%",
                    pointerEvents: "none",
                } }))),
        React.createElement("canvas", { ref: canvasRef, style: { display: "none" } }),
        statusMessage && (React.createElement("div", { style: {
                marginTop: "12px",
                padding: "8px 12px",
                borderRadius: "8px",
                backgroundColor: "#064e3b",
                fontSize: "0.85rem",
                color: "#6ee7b7",
                textAlign: "center",
            } }, statusMessage)),
        errorBanner && (React.createElement("div", { style: {
                marginTop: "12px",
                padding: "8px 12px",
                borderRadius: "8px",
                backgroundColor: "#7f1d1d",
                color: "#fca5a5",
                fontSize: "0.85rem",
                textAlign: "center",
            } }, errorBanner)),
        React.createElement("div", { style: { marginTop: "16px", display: "flex", gap: "10px" } }, capturedPhoto ? (React.createElement(React.Fragment, null,
            React.createElement("button", { onClick: handleRetake, disabled: loading, style: {
                    flex: 1,
                    padding: "12px",
                    borderRadius: "10px",
                    border: "1px solid #475569",
                    backgroundColor: "#1e293b",
                    color: "#f8fafc",
                    fontSize: "0.95rem",
                    cursor: loading ? "not-allowed" : "pointer",
                } }, "Retake"),
            React.createElement("button", { onClick: handleSubmitEnrollment, disabled: loading, style: {
                    flex: 2,
                    padding: "12px",
                    borderRadius: "10px",
                    border: "none",
                    backgroundColor: loading ? "#059669" : "#10b981",
                    color: "#ffffff",
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    cursor: loading ? "not-allowed" : "pointer",
                } }, loading ? "Enrolling..." : "Confirm & Save Biometrics"))) : (React.createElement("button", { onClick: captureFrame, disabled: !hasCamera, style: {
                width: "100%",
                padding: "12px",
                borderRadius: "10px",
                border: "none",
                backgroundColor: hasCamera ? "#10b981" : "#475569",
                color: "#ffffff",
                fontSize: "0.95rem",
                fontWeight: 600,
                cursor: hasCamera ? "pointer" : "not-allowed",
            } }, "Snap Baseline Photo")))));
};
export default FaceEnrollment;
