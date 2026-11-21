"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { deleteEmployee } from "./api.js";
import { cropAlignedFace } from "./faceDetector.js";
const ANGLES = ["front", "left", "right"];
export const FaceEnrollment = ({ apiKey, api_key, workspaceId, workspace_id, employeeId, employee_id, employeeName, employee_name, apiUrl = "https://api.sureclock.karalasoft.com", theme = "dark", styles = {}, hideHeader = false, title = "Biometric Enrollment", className = "", enableSound = true, onSuccess, onError, onAngleComplete, }) => {
    const effectiveApiKey = apiKey || api_key || "";
    const effectiveWorkspaceId = workspaceId || workspace_id || "";
    // Form inputs
    const [empIdInput, setEmpIdInput] = useState(employeeId || employee_id || "");
    const [empNameInput, setEmpNameInput] = useState(employeeName || employee_name || "");
    // Flow phase: "form" -> "scanning" -> "complete"
    const [phase, setPhase] = useState("form");
    // Multi-angle progression: front -> left -> right
    const [currentAngleIdx, setCurrentAngleIdx] = useState(0);
    const currentAngle = ANGLES[currentAngleIdx];
    const [completedAngles, setCompletedAngles] = useState({
        front: false,
        left: false,
        right: false,
    });
    const [capturedThumbnails, setCapturedThumbnails] = useState({
        front: null,
        left: null,
        right: null,
    });
    const [capturedCloudinaryUrls, setCapturedCloudinaryUrls] = useState({
        front: null,
        left: null,
        right: null,
    });
    const capturedCloudinaryUrlsRef = useRef({
        front: null,
        left: null,
        right: null,
    });
    const [detectedAngle, setDetectedAngle] = useState("none");
    const [inputMode, setInputMode] = useState("camera");
    const [hasCamera, setHasCamera] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isStartingCamera, setIsStartingCamera] = useState(false);
    // Real-time quality & stability indicators
    const [qualityText, setQualityText] = useState("Align face inside guide");
    const [centeringProgress, setCenteringProgress] = useState(0); // 0 to 100
    const [isCentered, setIsCentered] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");
    const [errorBanner, setErrorBanner] = useState(null);
    const [duplicateConflict, setDuplicateConflict] = useState(null);
    const [flashScreen, setFlashScreen] = useState(false);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const fileInputRef = useRef(null);
    const streamRef = useRef(null);
    const prevFrameBuffer = useRef(null);
    const stabilityCounter = useRef(0);
    const isCapturingRef = useRef(false);
    // Sync prop changes
    useEffect(() => {
        if (employeeId || employee_id) {
            setEmpIdInput(employeeId || employee_id || "");
        }
    }, [employeeId, employee_id]);
    useEffect(() => {
        if (employeeName || employee_name) {
            setEmpNameInput(employeeName || employee_name || "");
        }
    }, [employeeName, employee_name]);
    // Harmonic chime player
    const playChime = useCallback((isFinal = false) => {
        if (!enableSound)
            return;
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx)
                return;
            const ctx = new AudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            const now = ctx.currentTime;
            if (isFinal) {
                osc.frequency.setValueAtTime(523.25, now); // C5
                osc.frequency.setValueAtTime(659.25, now + 0.12); // E5
                osc.frequency.setValueAtTime(783.99, now + 0.24); // G5
                osc.frequency.setValueAtTime(1046.5, now + 0.36); // C6
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.7);
            }
            else {
                osc.frequency.setValueAtTime(587.33, now); // D5
                osc.frequency.setValueAtTime(880.0, now + 0.1); // A5
                gain.gain.setValueAtTime(0.18, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.35);
            }
        }
        catch (_) { }
    }, [enableSound]);
    // Clean stop all camera tracks
    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setHasCamera(false);
    }, []);
    // Open camera explicitly when user clicks action button
    const startCamera = useCallback(async () => {
        const targetEmpId = empIdInput.trim();
        if (!targetEmpId) {
            setErrorBanner("Please enter an Employee ID to proceed.");
            return;
        }
        setErrorBanner(null);
        setDuplicateConflict(null);
        setIsStartingCamera(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: "user",
                },
                audio: false,
            });
            streamRef.current = stream;
            setHasCamera(true);
            setPhase("scanning");
            setCurrentAngleIdx(0);
            setCompletedAngles({ front: false, left: false, right: false });
            setCapturedThumbnails({ front: null, left: null, right: null });
            setCapturedCloudinaryUrls({ front: null, left: null, right: null });
            capturedCloudinaryUrlsRef.current = { front: null, left: null, right: null };
            stabilityCounter.current = 0;
            setCenteringProgress(0);
            setIsCentered(false);
            setStatusMessage("");
            // Attach stream after phase renders video element
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            }, 50);
        }
        catch (err) {
            setHasCamera(false);
            setErrorBanner(err?.message?.includes("Permission") || err?.name === "NotAllowedError"
                ? "Camera permission denied. Please allow camera access in your browser settings."
                : "Unable to connect to camera device. Please verify your webcam.");
        }
        finally {
            setIsStartingCamera(false);
        }
    }, [empIdInput]);
    // Clean up stream on unmount
    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, [stopCamera]);
    // Frame capture helper (crops to high-quality 320x320 eye-aligned face JPEG, eliminating clothing)
    const captureFrame = useCallback(async () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.videoWidth === 0)
            return null;
        const res = await cropAlignedFace(video, canvas, 320, 0.85);
        return res ? res.image_base64 : null;
    }, []);
    // Upload single angle photo to backend with anti-duplicate 409 handling
    const uploadAnglePhoto = useCallback(async (angle, photoBase64) => {
        const targetEmpId = empIdInput.trim();
        const targetEmpName = empNameInput.trim();
        if (!effectiveApiKey || !effectiveWorkspaceId || !targetEmpId) {
            setErrorBanner("API Key, Workspace ID, and Employee ID are required.");
            return false;
        }
        setIsProcessing(true);
        setStatusMessage(`Analyzing & registering ${angle.toUpperCase()} angle vector...`);
        try {
            const endpoint = `${apiUrl.replace(/\/$/, "")}/api/v1/faces/register`;
            const resp = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": effectiveApiKey,
                },
                body: JSON.stringify({
                    workspace_id: effectiveWorkspaceId,
                    employee_id: targetEmpId,
                    name: targetEmpName || undefined,
                    image_base64: photoBase64,
                    angle_label: angle,
                }),
            });
            const data = await resp.json();
            // 409 Conflict: Biometric face duplicate detected
            if (resp.status === 409 || data.status === "duplicate_detected") {
                // Defensive rollback: Ensure any partial vectors from earlier angles in this session are purged
                deleteEmployee(effectiveApiKey, effectiveWorkspaceId, targetEmpId, apiUrl).catch(() => { });
                const matchedId = data.matched_employee_id || "another employee";
                const conf = data.confidence ? Math.round(data.confidence * 100) : 75;
                const conflict = {
                    matchedEmployeeId: matchedId,
                    confidence: conf,
                    message: data.message || `This face is already enrolled under employee '${matchedId}' (${conf}% match).`,
                };
                setDuplicateConflict(conflict);
                setErrorBanner(conflict.message);
                setStatusMessage("");
                if (onError)
                    onError(conflict.message);
                return false;
            }
            if (!resp.ok) {
                throw new Error(data.message || `Enrollment failed (${resp.status})`);
            }
            if (data.image_url) {
                setCapturedCloudinaryUrls((prev) => ({ ...prev, [angle]: data.image_url }));
                capturedCloudinaryUrlsRef.current[angle] = data.image_url;
            }
            if (onAngleComplete) {
                onAngleComplete(angle, currentAngleIdx + 1, ANGLES.length);
            }
            return true;
        }
        catch (err) {
            const msg = err.message || `Failed to register ${angle} angle vector.`;
            setErrorBanner(msg);
            setStatusMessage("");
            if (onError)
                onError(msg);
            return false;
        }
        finally {
            setIsProcessing(false);
        }
    }, [empIdInput, empNameInput, effectiveApiKey, effectiveWorkspaceId, apiUrl, currentAngleIdx, onAngleComplete, onError]);
    // Automated capture & sequential progression
    const triggerAutoCapture = useCallback(async () => {
        if (isCapturingRef.current || isProcessing || phase !== "scanning" || duplicateConflict)
            return;
        const targetEmpId = empIdInput.trim();
        if (!targetEmpId) {
            setErrorBanner("Please specify an Employee ID before scanning.");
            return;
        }
        isCapturingRef.current = true;
        setFlashScreen(true);
        setTimeout(() => setFlashScreen(false), 180);
        const photo = await captureFrame();
        if (!photo) {
            isCapturingRef.current = false;
            return;
        }
        const angleToRegister = currentAngle;
        setCapturedThumbnails((prev) => ({ ...prev, [angleToRegister]: photo }));
        const success = await uploadAnglePhoto(angleToRegister, photo);
        if (success) {
            playChime(currentAngleIdx === ANGLES.length - 1);
            setCompletedAngles((prev) => ({ ...prev, [angleToRegister]: true }));
            if (currentAngleIdx < ANGLES.length - 1) {
                // Advance to next angle
                const nextIdx = currentAngleIdx + 1;
                setStatusMessage(`✓ ${angleToRegister.toUpperCase()} captured! Now turn head slightly to ${ANGLES[nextIdx].toUpperCase()}...`);
                stabilityCounter.current = 0;
                setCenteringProgress(0);
                setIsCentered(false);
                setTimeout(() => {
                    setCurrentAngleIdx(nextIdx);
                    isCapturingRef.current = false;
                }, 850);
            }
            else {
                // All angles complete!
                stopCamera();
                setPhase("complete");
                setStatusMessage("Enrollment complete! 128D multi-vector enrolled.");
                isCapturingRef.current = false;
                if (onSuccess) {
                    onSuccess({
                        status: "success",
                        employee_id: targetEmpId,
                        employee_name: empNameInput.trim() || undefined,
                        workspace_id: effectiveWorkspaceId,
                        message: "Enrolled all biometric angles successfully.",
                        angles_captured: ["front", "left", "right"],
                        image_urls: capturedCloudinaryUrlsRef.current,
                    });
                }
            }
        }
        else {
            isCapturingRef.current = false;
            stabilityCounter.current = 0;
            setCenteringProgress(0);
        }
    }, [
        isProcessing,
        phase,
        duplicateConflict,
        empIdInput,
        empNameInput,
        captureFrame,
        currentAngle,
        uploadAnglePhoto,
        playChime,
        currentAngleIdx,
        stopCamera,
        effectiveWorkspaceId,
        onSuccess,
    ]);
    // Real-time loop: Frame centering, lighting, head-angle pose & stability
    useEffect(() => {
        if (phase !== "scanning" || inputMode !== "camera" || isProcessing || !hasCamera || duplicateConflict)
            return;
        let animId;
        const canvas = document.createElement("canvas");
        canvas.width = 120;
        canvas.height = 120;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        const checkFrame = () => {
            const video = videoRef.current;
            if (video && video.readyState >= 2 && ctx && !isCapturingRef.current) {
                const size = Math.min(video.videoWidth, video.videoHeight);
                const startX = (video.videoWidth - size) / 2 + size * 0.2;
                const startY = (video.videoHeight - size) / 2 + size * 0.2;
                const roiSize = size * 0.6;
                ctx.drawImage(video, startX, startY, roiSize, roiSize, 0, 0, 120, 120);
                const imgData = ctx.getImageData(0, 0, 120, 120);
                const data = imgData.data;
                // 1. Luminance & Clarity check
                let sumLuma = 0;
                let highFreqDiff = 0;
                for (let i = 0; i < data.length; i += 4) {
                    const luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                    sumLuma += luma;
                    if (i > 4) {
                        highFreqDiff += Math.abs(luma - (0.299 * data[i - 4] + 0.587 * data[i - 3] + 0.114 * data[i - 2]));
                    }
                }
                const avgLuma = sumLuma / (data.length / 4);
                const avgClarity = highFreqDiff / (data.length / 4);
                // 2. Motion stability
                let motionDelta = 999;
                if (prevFrameBuffer.current && prevFrameBuffer.current.length === data.length) {
                    let diff = 0;
                    for (let i = 0; i < data.length; i += 16) {
                        diff += Math.abs(data[i] - prevFrameBuffer.current[i]);
                    }
                    motionDelta = diff / (data.length / 16);
                }
                prevFrameBuffer.current = new Uint8ClampedArray(data);
                // 3. Head Yaw Pose Detection
                let weightedXSum = 0;
                let totalWeight = 0;
                let leftLuma = 0;
                let rightLuma = 0;
                let leftPixels = 0;
                let rightPixels = 0;
                for (let y = 24; y < 96; y++) {
                    for (let x = 2; x < 118; x++) {
                        const idx = (y * 120 + x) * 4;
                        const luma = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
                        const prevLuma = 0.299 * data[idx - 4] + 0.587 * data[idx - 3] + 0.114 * data[idx - 2];
                        const nextLuma = 0.299 * data[idx + 4] + 0.587 * data[idx + 5] + 0.114 * data[idx + 6];
                        const edge = Math.abs(nextLuma - prevLuma);
                        if (edge > 4) {
                            weightedXSum += x * edge;
                            totalWeight += edge;
                        }
                        if (x < 60) {
                            leftLuma += luma;
                            leftPixels++;
                        }
                        else {
                            rightLuma += luma;
                            rightPixels++;
                        }
                    }
                }
                const featureCenterX = totalWeight > 0 ? weightedXSum / totalWeight : 60;
                const avgLeftLuma = leftPixels > 0 ? leftLuma / leftPixels : 1;
                const avgRightLuma = rightPixels > 0 ? rightLuma / rightPixels : 1;
                const lumaDiffRatio = (avgLeftLuma - avgRightLuma) / Math.max(10, (avgLeftLuma + avgRightLuma) / 2);
                const rawOffset = (featureCenterX - 60) / 30;
                const perceivedYaw = -(rawOffset * 0.7 - lumaDiffRatio * 0.3);
                let pose = "front";
                if (perceivedYaw < -0.06) {
                    pose = "left";
                }
                else if (perceivedYaw > 0.06) {
                    pose = "right";
                }
                else {
                    pose = "front";
                }
                setDetectedAngle(pose);
                // 4. Quality validation and angle match gating
                if (avgLuma < 30) {
                    setQualityText("Low light - Increase lighting");
                    setIsCentered(false);
                    stabilityCounter.current = 0;
                    setCenteringProgress(0);
                }
                else if (avgLuma > 245) {
                    setQualityText("Too bright - Avoid direct glare");
                    setIsCentered(false);
                    stabilityCounter.current = 0;
                    setCenteringProgress(0);
                }
                else if (avgClarity < 2.0) {
                    setQualityText("Focusing - Please hold steady");
                    setIsCentered(false);
                    stabilityCounter.current = 0;
                    setCenteringProgress(0);
                }
                else {
                    const angleMatched = pose === currentAngle;
                    if (!angleMatched) {
                        stabilityCounter.current = Math.max(0, stabilityCounter.current - 2);
                        setIsCentered(false);
                        if (currentAngle === "front") {
                            setQualityText("Face straight into camera");
                        }
                        else if (currentAngle === "left") {
                            setQualityText("Turn head slightly to your LEFT");
                        }
                        else {
                            setQualityText("Turn head slightly to your RIGHT");
                        }
                        const progress = Math.min(100, Math.round((stabilityCounter.current / 6) * 100));
                        setCenteringProgress(progress);
                    }
                    else {
                        if (motionDelta < 14.0) {
                            stabilityCounter.current = Math.min(8, stabilityCounter.current + 1);
                            setIsCentered(true);
                            setQualityText(`Pose verified: ${currentAngle.toUpperCase()} - Hold steady`);
                        }
                        else {
                            stabilityCounter.current = Math.max(0, stabilityCounter.current - 1);
                            setIsCentered(false);
                            setQualityText(`Hold still for ${currentAngle.toUpperCase()} capture...`);
                        }
                        const progress = Math.min(100, Math.round((stabilityCounter.current / 6) * 100));
                        setCenteringProgress(progress);
                        if (progress >= 100 && !isCapturingRef.current) {
                            triggerAutoCapture();
                        }
                    }
                }
            }
            animId = requestAnimationFrame(checkFrame);
        };
        animId = requestAnimationFrame(checkFrame);
        return () => cancelAnimationFrame(animId);
    }, [phase, inputMode, isProcessing, hasCamera, duplicateConflict, currentAngle, triggerAutoCapture]);
    // File upload fallback
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
                canvas.width = 320;
                canvas.height = 320;
                const ctx = canvas.getContext("2d");
                if (!ctx)
                    return;
                const size = Math.min(img.width, img.height);
                const startX = (img.width - size) / 2;
                const startY = (img.height - size) / 2;
                ctx.drawImage(img, startX, startY, size, size, 0, 0, 320, 320);
                const photo = canvas.toDataURL("image/jpeg", 0.85);
                setCapturedThumbnails((prev) => ({ ...prev, [currentAngle]: photo }));
                uploadAnglePhoto(currentAngle, photo).then((ok) => {
                    if (ok) {
                        setCompletedAngles((prev) => ({ ...prev, [currentAngle]: true }));
                        if (currentAngleIdx < ANGLES.length - 1) {
                            setCurrentAngleIdx((prev) => prev + 1);
                        }
                        else {
                            setPhase("complete");
                        }
                    }
                });
            };
            img.src = event.target?.result;
        };
        reader.readAsDataURL(file);
    };
    const isLight = theme === "light";
    const isTransparent = theme === "transparent";
    const themeTokens = {
        bg: isTransparent ? "transparent" : isLight ? "#ffffff" : "#080d1a",
        surface: isLight ? "#f8fafc" : "#0d1527",
        surfaceHover: isLight ? "#f1f5f9" : "#131e36",
        border: isLight ? "#e2e8f0" : "#1e293b",
        borderActive: isLight ? "#0284c7" : "#0ea5e9",
        textPrimary: isLight ? "#0f172a" : "#f8fafc",
        textMuted: isLight ? "#64748b" : "#94a3b8",
        viewfinderBg: isLight ? "#0f172a" : "#040711",
        accent: "#0ea5e9",
        success: "#10b981",
        warning: "#f59e0b",
        danger: "#ef4444",
    };
    const resetEnrollment = () => {
        stopCamera();
        setPhase("form");
        setEmpIdInput("");
        setEmpNameInput("");
        setCurrentAngleIdx(0);
        setCompletedAngles({ front: false, left: false, right: false });
        setCapturedThumbnails({ front: null, left: null, right: null });
        setCapturedCloudinaryUrls({ front: null, left: null, right: null });
        capturedCloudinaryUrlsRef.current = { front: null, left: null, right: null };
        setErrorBanner(null);
        setDuplicateConflict(null);
        setStatusMessage("");
        stabilityCounter.current = 0;
        setCenteringProgress(0);
    };
    return (React.createElement("div", { className: `sureclock-enrollment-root ${className}`, style: {
            maxWidth: "520px",
            width: "100%",
            margin: "0 auto",
            padding: "24px",
            borderRadius: "16px",
            backgroundColor: themeTokens.bg,
            color: themeTokens.textPrimary,
            border: `1px solid ${themeTokens.border}`,
            boxSizing: "border-box",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            ...styles.container,
        } },
        !hideHeader && (React.createElement("div", { style: {
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "20px",
                borderBottom: `1px solid ${themeTokens.border}`,
                paddingBottom: "14px",
                ...styles.header,
            } },
            React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "12px" } },
                React.createElement("div", { style: {
                        width: "38px",
                        height: "38px",
                        borderRadius: "10px",
                        backgroundColor: isLight ? "#e0f2fe" : "#0c2847",
                        border: `1px solid ${isLight ? "#bae6fd" : "#0284c7"}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#0ea5e9",
                    } },
                    React.createElement("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
                        React.createElement("path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }),
                        React.createElement("circle", { cx: "9", cy: "7", r: "4" }),
                        React.createElement("path", { d: "M22 11h-4" }),
                        React.createElement("path", { d: "M20 7l-2 4 2 4" }))),
                React.createElement("div", null,
                    React.createElement("h2", { style: { fontSize: "1.08rem", fontWeight: 700, margin: 0, color: themeTokens.textPrimary, letterSpacing: "-0.01em" } }, title),
                    React.createElement("p", { style: { fontSize: "0.76rem", color: themeTokens.textMuted, margin: "2px 0 0 0" } }, "Secure 128D Multi-Angle Biometric Registry"))),
            React.createElement("div", { style: {
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "4px 9px",
                    borderRadius: "20px",
                    backgroundColor: themeTokens.surface,
                    border: `1px solid ${themeTokens.border}`,
                    fontSize: "0.72rem",
                    fontFamily: "monospace",
                    color: "#38bdf8",
                } },
                React.createElement("span", { style: {
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        backgroundColor: phase === "scanning" ? "#10b981" : "#64748b",
                    } }),
                effectiveWorkspaceId || "Default"))),
        phase === "form" && (React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "16px" } },
            React.createElement("div", null,
                React.createElement("label", { style: {
                        display: "block",
                        fontSize: "0.74rem",
                        fontWeight: 600,
                        color: themeTokens.textMuted,
                        marginBottom: "6px",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                    } },
                    "Employee ID / Badge Code ",
                    React.createElement("span", { style: { color: themeTokens.danger } }, "*")),
                React.createElement("input", { type: "text", value: empIdInput, onChange: (e) => {
                        setEmpIdInput(e.target.value);
                        if (errorBanner)
                            setErrorBanner(null);
                    }, placeholder: "e.g. EMP_0412", autoFocus: true, style: {
                        width: "100%",
                        padding: "11px 14px",
                        borderRadius: "10px",
                        border: `1px solid ${themeTokens.border}`,
                        backgroundColor: themeTokens.surface,
                        color: themeTokens.textPrimary,
                        fontSize: "0.95rem",
                        fontFamily: "monospace",
                        boxSizing: "border-box",
                        outline: "none",
                        transition: "border-color 0.15s ease",
                    } })),
            React.createElement("div", null,
                React.createElement("label", { style: {
                        display: "block",
                        fontSize: "0.74rem",
                        fontWeight: 600,
                        color: themeTokens.textMuted,
                        marginBottom: "6px",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                    } }, "Employee Full Name"),
                React.createElement("input", { type: "text", value: empNameInput, onChange: (e) => setEmpNameInput(e.target.value), placeholder: "e.g. Alex Johnson", style: {
                        width: "100%",
                        padding: "11px 14px",
                        borderRadius: "10px",
                        border: `1px solid ${themeTokens.border}`,
                        backgroundColor: themeTokens.surface,
                        color: themeTokens.textPrimary,
                        fontSize: "0.95rem",
                        boxSizing: "border-box",
                        outline: "none",
                        transition: "border-color 0.15s ease",
                    } })),
            React.createElement("div", { style: {
                    padding: "14px 16px",
                    borderRadius: "10px",
                    backgroundColor: themeTokens.surface,
                    border: `1px solid ${themeTokens.border}`,
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                } },
                React.createElement("div", { style: { fontSize: "0.75rem", fontWeight: 700, color: themeTokens.textPrimary, textTransform: "uppercase", letterSpacing: "0.04em" } }, "Biometric Capture Guidelines"),
                React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "8px", fontSize: "0.78rem", color: themeTokens.textMuted } },
                    React.createElement("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "#10b981", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round" },
                        React.createElement("polyline", { points: "20 6 9 17 4 12" })),
                    React.createElement("span", null, "Ensure adequate frontal lighting without direct backlights")),
                React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "8px", fontSize: "0.78rem", color: themeTokens.textMuted } },
                    React.createElement("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "#10b981", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round" },
                        React.createElement("polyline", { points: "20 6 9 17 4 12" })),
                    React.createElement("span", null, "Keep a neutral facial expression and remove hats or sunglasses")),
                React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "8px", fontSize: "0.78rem", color: themeTokens.textMuted } },
                    React.createElement("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "#10b981", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round" },
                        React.createElement("polyline", { points: "20 6 9 17 4 12" })),
                    React.createElement("span", null, "System will guide 3 angles: Front, Left, and Right automatically"))),
            errorBanner && (React.createElement("div", { style: {
                    padding: "10px 14px",
                    borderRadius: "8px",
                    backgroundColor: isLight ? "#fef2f2" : "#450a0a",
                    color: isLight ? "#b91c1c" : "#fca5a5",
                    fontSize: "0.82rem",
                    border: `1px solid ${isLight ? "#fecaca" : "#7f1d1d"}`,
                } }, errorBanner)),
            React.createElement("button", { type: "button", onClick: startCamera, disabled: !empIdInput.trim() || isStartingCamera, style: {
                    marginTop: "4px",
                    padding: "13px 20px",
                    borderRadius: "10px",
                    border: "none",
                    backgroundColor: !empIdInput.trim() ? (isLight ? "#cbd5e1" : "#1e293b") : themeTokens.accent,
                    color: !empIdInput.trim() ? themeTokens.textMuted : "#ffffff",
                    fontSize: "0.92rem",
                    fontWeight: 600,
                    cursor: !empIdInput.trim() ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    transition: "background-color 0.2s ease",
                } },
                React.createElement("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
                    React.createElement("path", { d: "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" }),
                    React.createElement("circle", { cx: "12", cy: "13", r: "4" })),
                isStartingCamera ? "Activating Camera..." : "Open Camera & Start Biometrics"),
            React.createElement("div", { style: { textAlign: "center", marginTop: "2px" } },
                React.createElement("button", { type: "button", onClick: () => {
                        if (!empIdInput.trim()) {
                            setErrorBanner("Please enter an Employee ID first.");
                            return;
                        }
                        setInputMode("upload");
                        setPhase("scanning");
                    }, style: {
                        background: "transparent",
                        border: "none",
                        color: themeTokens.textMuted,
                        fontSize: "0.76rem",
                        cursor: "pointer",
                        textDecoration: "underline",
                    } }, "No camera? Upload photos manually")))),
        phase === "scanning" && (React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "14px" } },
            React.createElement("div", { style: {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    borderRadius: "10px",
                    backgroundColor: themeTokens.surface,
                    border: `1px solid ${themeTokens.border}`,
                } },
                React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" } },
                    React.createElement("div", { style: {
                            width: "28px",
                            height: "28px",
                            borderRadius: "50%",
                            backgroundColor: isLight ? "#e0f2fe" : "#0c2847",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#0ea5e9",
                            flexShrink: 0,
                        } },
                        React.createElement("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
                            React.createElement("path", { d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" }),
                            React.createElement("circle", { cx: "12", cy: "7", r: "4" }))),
                    React.createElement("div", { style: { overflow: "hidden" } },
                        React.createElement("div", { style: { fontSize: "0.84rem", fontWeight: 700, color: themeTokens.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, empNameInput ? empNameInput : empIdInput),
                        React.createElement("div", { style: { fontSize: "0.7rem", fontFamily: "monospace", color: themeTokens.textMuted } },
                            "ID: ",
                            empIdInput))),
                React.createElement("button", { type: "button", onClick: () => {
                        stopCamera();
                        setPhase("form");
                        setDuplicateConflict(null);
                        setErrorBanner(null);
                    }, style: {
                        padding: "6px 10px",
                        borderRadius: "6px",
                        border: `1px solid ${themeTokens.border}`,
                        backgroundColor: "transparent",
                        color: themeTokens.textMuted,
                        fontSize: "0.74rem",
                        cursor: "pointer",
                    } }, "Cancel")),
            React.createElement("div", { style: { display: "flex", gap: "8px" } }, ANGLES.map((angle, idx) => {
                const isDone = completedAngles[angle];
                const isCurrent = currentAngleIdx === idx;
                return (React.createElement("div", { key: angle, style: {
                        flex: 1,
                        padding: "8px 6px",
                        borderRadius: "8px",
                        border: `1px solid ${isDone ? themeTokens.success : isCurrent ? themeTokens.accent : themeTokens.border}`,
                        backgroundColor: isDone
                            ? isLight ? "#ecfdf5" : "rgba(16, 185, 129, 0.12)"
                            : isCurrent
                                ? isLight ? "#e0f2fe" : "rgba(14, 165, 233, 0.12)"
                                : "transparent",
                        textAlign: "center",
                        transition: "all 0.25s ease",
                    } },
                    React.createElement("div", { style: { fontSize: "0.68rem", fontWeight: 700, color: isDone ? themeTokens.success : isCurrent ? themeTokens.accent : themeTokens.textMuted, textTransform: "uppercase" } },
                        idx + 1,
                        ". ",
                        angle),
                    React.createElement("div", { style: { fontSize: "0.72rem", marginTop: "2px", fontWeight: 600, color: isDone ? themeTokens.success : isCurrent ? themeTokens.textPrimary : themeTokens.textMuted } }, isDone ? "Done" : isCurrent ? "Scanning" : "Pending")));
            })),
            duplicateConflict ? (React.createElement("div", { style: {
                    padding: "20px",
                    borderRadius: "12px",
                    backgroundColor: isLight ? "#fffbeb" : "#2d1a04",
                    border: "1px solid #f59e0b",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    textAlign: "center",
                } },
                React.createElement("div", { style: {
                        width: "48px",
                        height: "48px",
                        borderRadius: "50%",
                        backgroundColor: "rgba(245, 158, 11, 0.2)",
                        color: "#f59e0b",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto",
                    } },
                    React.createElement("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
                        React.createElement("circle", { cx: "12", cy: "12", r: "10" }),
                        React.createElement("line", { x1: "12", y1: "8", x2: "12", y2: "12" }),
                        React.createElement("line", { x1: "12", y1: "16", x2: "12.01", y2: "16" }))),
                React.createElement("div", null,
                    React.createElement("h4", { style: { margin: "0 0 6px 0", fontSize: "0.98rem", color: isLight ? "#92400e" : "#fef3c7", fontWeight: 700 } }, "Biometric Face Duplicate Detected"),
                    React.createElement("p", { style: { margin: 0, fontSize: "0.82rem", color: isLight ? "#b45309" : "#fde68a", lineHeight: 1.45 } },
                        "This face is already enrolled under employee ",
                        React.createElement("strong", { style: { fontFamily: "monospace" } }, duplicateConflict.matchedEmployeeId),
                        " with ",
                        React.createElement("strong", null,
                            duplicateConflict.confidence,
                            "% similarity"),
                        ". Duplicate biometric enrollments are prevented to ensure payroll integrity.")),
                React.createElement("div", { style: { display: "flex", gap: "8px", justifyContent: "center", marginTop: "4px" } },
                    React.createElement("button", { type: "button", onClick: () => {
                            setDuplicateConflict(null);
                            setErrorBanner(null);
                            stabilityCounter.current = 0;
                            setCenteringProgress(0);
                        }, style: {
                            padding: "9px 16px",
                            borderRadius: "8px",
                            border: "1px solid #f59e0b",
                            backgroundColor: "transparent",
                            color: isLight ? "#92400e" : "#fde68a",
                            fontSize: "0.82rem",
                            fontWeight: 600,
                            cursor: "pointer",
                        } }, "Re-try Scan"),
                    React.createElement("button", { type: "button", onClick: () => {
                            stopCamera();
                            setPhase("form");
                            setDuplicateConflict(null);
                            setErrorBanner(null);
                        }, style: {
                            padding: "9px 16px",
                            borderRadius: "8px",
                            border: "none",
                            backgroundColor: "#f59e0b",
                            color: "#080d1a",
                            fontSize: "0.82rem",
                            fontWeight: 700,
                            cursor: "pointer",
                        } }, "Change Employee ID")))) : (
            /* Live Viewfinder Frame */
            React.createElement("div", { style: {
                    position: "relative",
                    width: "100%",
                    paddingTop: "90%",
                    borderRadius: "14px",
                    overflow: "hidden",
                    backgroundColor: themeTokens.viewfinderBg,
                    border: `2px solid ${isCentered ? themeTokens.success : themeTokens.border}`,
                    boxSizing: "border-box",
                    transition: "border-color 0.25s ease",
                    ...styles.viewfinder,
                } }, inputMode === "camera" ? (React.createElement(React.Fragment, null,
                React.createElement("video", { ref: videoRef, autoPlay: true, playsInline: true, muted: true, style: {
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        transform: "scaleX(-1)",
                    } }),
                flashScreen && (React.createElement("div", { style: {
                        position: "absolute",
                        inset: 0,
                        backgroundColor: "#ffffff",
                        opacity: 0.85,
                        zIndex: 20,
                        transition: "opacity 0.18s ease-out",
                    } })),
                React.createElement("div", { style: {
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        width: "56%",
                        height: "76%",
                        borderRadius: "50%",
                        border: `2px dashed ${centeringProgress > 60 ? "#10b981" : "rgba(255, 255, 255, 0.6)"}`,
                        boxShadow: isCentered ? "0 0 24px rgba(16, 185, 129, 0.4)" : "none",
                        transition: "all 0.3s ease",
                        pointerEvents: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    } },
                    currentAngle === "left" && (React.createElement("div", { style: {
                            width: "48px",
                            height: "48px",
                            borderRadius: "50%",
                            backgroundColor: "rgba(14, 165, 233, 0.3)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#38bdf8",
                        } },
                        React.createElement("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round" },
                            React.createElement("line", { x1: "19", y1: "12", x2: "5", y2: "12" }),
                            React.createElement("polyline", { points: "12 19 5 12 12 5" })))),
                    currentAngle === "right" && (React.createElement("div", { style: {
                            width: "48px",
                            height: "48px",
                            borderRadius: "50%",
                            backgroundColor: "rgba(14, 165, 233, 0.3)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#38bdf8",
                        } },
                        React.createElement("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round" },
                            React.createElement("line", { x1: "5", y1: "12", x2: "19", y2: "12" }),
                            React.createElement("polyline", { points: "12 5 19 12 12 19" })))),
                    currentAngle === "front" && (React.createElement("div", { style: {
                            width: "48px",
                            height: "48px",
                            borderRadius: "50%",
                            backgroundColor: "rgba(16, 185, 129, 0.25)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#10b981",
                        } },
                        React.createElement("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
                            React.createElement("circle", { cx: "12", cy: "12", r: "10" }),
                            React.createElement("line", { x1: "22", y1: "12", x2: "18", y2: "12" }),
                            React.createElement("line", { x1: "6", y1: "12", x2: "2", y2: "12" }),
                            React.createElement("line", { x1: "12", y1: "6", x2: "12", y2: "2" }),
                            React.createElement("line", { x1: "12", y1: "22", x2: "12", y2: "18" }))))),
                React.createElement("div", { style: {
                        position: "absolute",
                        bottom: "12px",
                        left: "14px",
                        right: "14px",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        background: "rgba(8, 13, 26, 0.88)",
                        backdropFilter: "blur(8px)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        color: "#f8fafc",
                        fontSize: "0.78rem",
                        gap: "8px",
                    } },
                    React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "6px", overflow: "hidden" } },
                        React.createElement("span", { style: {
                                width: "8px",
                                height: "8px",
                                borderRadius: "50%",
                                backgroundColor: isCentered ? "#10b981" : "#0ea5e9",
                                boxShadow: isCentered ? "0 0 8px #10b981" : "none",
                                flexShrink: 0,
                            } }),
                        React.createElement("span", { style: { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, qualityText)),
                    React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 } },
                        React.createElement("span", { style: {
                                padding: "2px 6px",
                                borderRadius: "4px",
                                fontSize: "0.68rem",
                                fontWeight: 700,
                                textTransform: "uppercase",
                                backgroundColor: detectedAngle === currentAngle ? "rgba(16, 185, 129, 0.25)" : "rgba(239, 68, 68, 0.25)",
                                color: detectedAngle === currentAngle ? "#34d399" : "#fca5a5",
                                border: `1px solid ${detectedAngle === currentAngle ? "rgba(16, 185, 129, 0.5)" : "rgba(239, 68, 68, 0.5)"}`,
                            } }, detectedAngle === currentAngle ? `Verified: ${detectedAngle}` : `Pose: ${detectedAngle}`),
                        React.createElement("span", { style: { fontFamily: "monospace", color: "#38bdf8", fontWeight: 700, fontSize: "0.74rem" } }, centeringProgress >= 100 ? "LOCKED" : `${centeringProgress}%`))))) : (React.createElement("div", { onClick: () => fileInputRef.current?.click(), style: {
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    padding: "20px",
                    color: themeTokens.textMuted,
                } },
                React.createElement("svg", { width: "36", height: "36", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", style: { marginBottom: "8px" } },
                    React.createElement("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }),
                    React.createElement("polyline", { points: "17 8 12 3 7 8" }),
                    React.createElement("line", { x1: "12", y1: "3", x2: "12", y2: "15" })),
                React.createElement("span", { style: { fontSize: "0.85rem", fontWeight: 600, color: themeTokens.textPrimary } },
                    "Upload ",
                    currentAngle.toUpperCase(),
                    " Photo"))))),
            !duplicateConflict && inputMode === "camera" && (React.createElement("div", { style: { display: "flex", gap: "8px" } },
                React.createElement("button", { type: "button", onClick: triggerAutoCapture, disabled: isProcessing, style: {
                        flex: 1,
                        padding: "10px 16px",
                        borderRadius: "8px",
                        border: `1px solid ${themeTokens.border}`,
                        backgroundColor: themeTokens.surface,
                        color: themeTokens.textPrimary,
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        cursor: isProcessing ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                    } },
                    React.createElement("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
                        React.createElement("path", { d: "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" }),
                        React.createElement("circle", { cx: "12", cy: "13", r: "4" })),
                    isProcessing ? "Processing..." : `Manual Snap: ${currentAngle.toUpperCase()}`))),
            React.createElement("div", { style: { display: "flex", gap: "10px", marginTop: "2px" } }, ANGLES.map((angle) => {
                const thumb = capturedCloudinaryUrls[angle] || capturedThumbnails[angle];
                return (React.createElement("div", { key: angle, style: {
                        flex: 1,
                        aspectRatio: "1",
                        borderRadius: "8px",
                        border: `1px solid ${completedAngles[angle] ? themeTokens.success : themeTokens.border}`,
                        backgroundColor: themeTokens.surface,
                        overflow: "hidden",
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    } },
                    thumb ? (React.createElement("img", { src: thumb, alt: angle, style: { width: "100%", height: "100%", objectFit: "cover" } })) : (React.createElement("span", { style: { fontSize: "0.72rem", color: themeTokens.textMuted, textTransform: "capitalize" } }, angle)),
                    completedAngles[angle] && (React.createElement("div", { style: {
                            position: "absolute",
                            top: "4px",
                            right: "4px",
                            width: "18px",
                            height: "18px",
                            borderRadius: "50%",
                            backgroundColor: "#10b981",
                            color: "#ffffff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.65rem",
                            fontWeight: 700,
                        } }, "\u2713")),
                    capturedCloudinaryUrls[angle] && (React.createElement("div", { style: {
                            position: "absolute",
                            bottom: "2px",
                            left: "2px",
                            right: "2px",
                            backgroundColor: "rgba(0,0,0,0.75)",
                            color: "#38bdf8",
                            fontSize: "0.55rem",
                            textAlign: "center",
                            borderRadius: "2px",
                            fontWeight: 600,
                            letterSpacing: "0.02em",
                        } }, "Cloudinary"))));
            })),
            statusMessage && (React.createElement("div", { style: {
                    padding: "8px 12px",
                    borderRadius: "8px",
                    backgroundColor: isLight ? "#f0fdf4" : "rgba(16, 185, 129, 0.12)",
                    color: isLight ? "#15803d" : "#34d399",
                    border: `1px solid ${isLight ? "#bbf7d0" : "rgba(16, 185, 129, 0.25)"}`,
                    fontSize: "0.78rem",
                    textAlign: "center",
                } }, statusMessage)),
            errorBanner && !duplicateConflict && (React.createElement("div", { style: {
                    padding: "8px 12px",
                    borderRadius: "8px",
                    backgroundColor: isLight ? "#fef2f2" : "#450a0a",
                    color: isLight ? "#b91c1c" : "#fca5a5",
                    fontSize: "0.78rem",
                    textAlign: "center",
                    border: `1px solid ${isLight ? "#fecaca" : "#7f1d1d"}`,
                } }, errorBanner)))),
        phase === "complete" && (React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "16px", textAlign: "center" } },
            React.createElement("div", { style: {
                    padding: "24px 20px",
                    borderRadius: "14px",
                    backgroundColor: isLight ? "#ecfdf5" : "rgba(16, 185, 129, 0.12)",
                    border: "1px solid #10b981",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "10px",
                } },
                React.createElement("div", { style: {
                        width: "56px",
                        height: "56px",
                        borderRadius: "50%",
                        backgroundColor: isLight ? "#d1fae5" : "rgba(16, 185, 129, 0.25)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#10b981",
                    } },
                    React.createElement("svg", { width: "32", height: "32", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round" },
                        React.createElement("path", { d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" }),
                        React.createElement("polyline", { points: "9 12 11 14 15 10" }))),
                React.createElement("div", null,
                    React.createElement("h3", { style: { margin: "0 0 4px 0", fontSize: "1.1rem", color: isLight ? "#065f46" : "#34d399", fontWeight: 700 } }, "Biometric Enrollment Complete"),
                    React.createElement("p", { style: { margin: 0, fontSize: "0.82rem", color: isLight ? "#047857" : "#a7f3d0" } }, "128-dimensional multi-angle face vectors registered and secured.")),
                React.createElement("div", { style: {
                        width: "100%",
                        marginTop: "6px",
                        padding: "12px",
                        borderRadius: "10px",
                        backgroundColor: themeTokens.surface,
                        border: `1px solid ${themeTokens.border}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        textAlign: "left",
                    } },
                    React.createElement("div", null,
                        React.createElement("div", { style: { fontSize: "0.72rem", color: themeTokens.textMuted, textTransform: "uppercase", letterSpacing: "0.04em" } }, "Enrolled Profile"),
                        React.createElement("div", { style: { fontSize: "0.95rem", fontWeight: 700, color: themeTokens.textPrimary } }, empNameInput ? empNameInput : empIdInput),
                        React.createElement("div", { style: { fontSize: "0.75rem", fontFamily: "monospace", color: themeTokens.textMuted } },
                            "Badge ID: ",
                            empIdInput)),
                    React.createElement("div", { style: {
                            padding: "4px 8px",
                            borderRadius: "6px",
                            backgroundColor: "rgba(16, 185, 129, 0.15)",
                            color: "#10b981",
                            border: "1px solid rgba(16, 185, 129, 0.3)",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            fontFamily: "monospace",
                        } }, "128D ACTIVE")),
                React.createElement("div", { style: { width: "100%", display: "flex", gap: "8px", marginTop: "4px" } }, ANGLES.map((angle) => {
                    const thumb = capturedCloudinaryUrls[angle] || capturedThumbnails[angle];
                    return (React.createElement("div", { key: angle, style: {
                            flex: 1,
                            aspectRatio: "1",
                            borderRadius: "8px",
                            overflow: "hidden",
                            border: "1px solid #10b981",
                            backgroundColor: themeTokens.surface,
                            position: "relative",
                        } },
                        thumb && (React.createElement("img", { src: thumb, alt: angle, style: { width: "100%", height: "100%", objectFit: "cover" } })),
                        React.createElement("div", { style: {
                                position: "absolute",
                                bottom: 0,
                                left: 0,
                                right: 0,
                                padding: "2px 0",
                                backgroundColor: "rgba(0,0,0,0.7)",
                                color: "#ffffff",
                                fontSize: "0.62rem",
                                textTransform: "uppercase",
                                fontWeight: 600,
                            } }, angle)));
                }))),
            React.createElement("button", { type: "button", onClick: resetEnrollment, style: {
                    padding: "12px 20px",
                    borderRadius: "10px",
                    border: "none",
                    backgroundColor: themeTokens.accent,
                    color: "#ffffff",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                } },
                React.createElement("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round" },
                    React.createElement("line", { x1: "12", y1: "5", x2: "12", y2: "19" }),
                    React.createElement("line", { x1: "5", y1: "12", x2: "19", y2: "12" })),
                "Enroll Another Employee"))),
        React.createElement("input", { ref: fileInputRef, type: "file", accept: "image/*", onChange: handleFileUpload, style: { display: "none" } }),
        React.createElement("canvas", { ref: canvasRef, style: { display: "none" } })));
};
