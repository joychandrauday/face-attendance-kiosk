"use client";
import React, { useEffect, useRef, useState } from "react";
function playSuccessChime() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext)
            return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
    }
    catch (_) { }
}
export const FaceAttendanceKiosk = ({ apiKey, api_key, workspaceId, workspace_id, apiUrl = "https://api.sureclock.karalasoft.com", onSuccess, onError, className = "", title = "Showroom Biometric Kiosk", }) => {
    const effectiveApiKey = apiKey || api_key || "";
    const effectiveWorkspaceId = workspaceId || workspace_id || "";
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [hasCamera, setHasCamera] = useState(false);
    const [loading, setLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");
    const [lastSuccess, setLastSuccess] = useState(null);
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
    }, []);
    // Client-side instant ~40-50 KB canvas compression
    const captureCompressedImage = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas)
            return null;
        // Fixed dimension to optimize inference payload size
        canvas.width = 224;
        canvas.height = 224;
        const ctx = canvas.getContext("2d");
        if (!ctx)
            return null;
        // Draw video frame cropped to square center
        const size = Math.min(video.videoWidth, video.videoHeight);
        const startX = (video.videoWidth - size) / 2;
        const startY = (video.videoHeight - size) / 2;
        ctx.drawImage(video, startX, startY, size, size, 0, 0, 224, 224);
        // Compress to JPEG with 0.65 quality (~35-45 KB payload)
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
        const compressedBase64 = captureCompressedImage();
        if (!compressedBase64) {
            setErrorBanner("Failed to capture image from video stream.");
            return;
        }
        setLoading(true);
        setStatusMessage("Verifying biometric face vector...");
        setErrorBanner(null);
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
                    image_base64: compressedBase64,
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || `Server error (${response.status})`);
            }
            if (data.match && data.employee_id) {
                setLastSuccess(data);
                setStatusMessage(`Match confirmed! Welcome, ${data.employee_id}`);
                playSuccessChime();
                if (onSuccess)
                    onSuccess(data);
                // Reset display after 3 seconds for the next person in line
                setTimeout(() => {
                    setLastSuccess(null);
                    setStatusMessage("");
                }, 3500);
            }
            else {
                const msg = data.message || "Face not recognized (>90% confidence required).";
                setErrorBanner(msg);
                setStatusMessage("");
                if (onError)
                    onError(msg);
            }
        }
        catch (err) {
            const errText = err.message || "Network error connecting to biometric server.";
            setErrorBanner(errText);
            setStatusMessage("");
            if (onError)
                onError(errText);
        }
        finally {
            setLoading(false);
        }
    };
    return (React.createElement("div", { className: `sureclock-kiosk-container ${className}`, style: {
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
        React.createElement("div", { style: {
                position: "relative",
                width: "100%",
                paddingTop: "100%",
                borderRadius: "12px",
                overflow: "hidden",
                backgroundColor: "#1e293b",
                border: "2px solid #334155",
            } },
            React.createElement("video", { ref: videoRef, autoPlay: true, playsInline: true, muted: true, style: {
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    transform: "scaleX(-1)", // Mirror effect
                } }),
            React.createElement("div", { style: {
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "65%",
                    height: "65%",
                    border: "2px dashed #38bdf8",
                    borderRadius: "50%",
                    pointerEvents: "none",
                    boxShadow: "0 0 15px rgba(56, 189, 248, 0.3)",
                } }),
            lastSuccess && (React.createElement("div", { style: {
                    position: "absolute",
                    inset: 0,
                    backgroundColor: "rgba(15, 23, 42, 0.88)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "20px",
                    textAlign: "center",
                } },
                React.createElement("div", { style: {
                        width: "64px",
                        height: "64px",
                        borderRadius: "50%",
                        backgroundColor: "#22c55e",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "32px",
                        marginBottom: "12px",
                    } }, "\u2713"),
                React.createElement("h3", { style: { fontSize: "1.2rem", color: "#4ade80", margin: "0 0 4px" } }, "Clock-In Successful"),
                React.createElement("p", { style: { fontSize: "1rem", fontWeight: 600, margin: "0 0 4px" } }, lastSuccess.employee_id),
                React.createElement("span", { style: { fontSize: "0.8rem", color: "#94a3b8" } },
                    "Confidence: ",
                    (lastSuccess.confidence * 100).toFixed(1),
                    "%")))),
        React.createElement("canvas", { ref: canvasRef, style: { display: "none" } }),
        statusMessage && (React.createElement("div", { style: {
                marginTop: "12px",
                padding: "8px 12px",
                borderRadius: "8px",
                backgroundColor: "#1e293b",
                fontSize: "0.85rem",
                color: "#38bdf8",
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
        React.createElement("button", { onClick: handleVerify, disabled: loading || !hasCamera, style: {
                marginTop: "16px",
                width: "100%",
                padding: "14px",
                borderRadius: "10px",
                border: "none",
                backgroundColor: loading ? "#64748b" : "#2563eb",
                color: "#ffffff",
                fontSize: "1rem",
                fontWeight: 600,
                cursor: loading || !hasCamera ? "not-allowed" : "pointer",
                transition: "background-color 0.2s",
            } }, loading ? "Analyzing Biometric Vector..." : "Clock In / Verify")));
};
export { FaceEnrollment } from "./Enrollment";
export default FaceAttendanceKiosk;
