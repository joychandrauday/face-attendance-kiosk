"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
const ANGLES = ["left", "right", "front"];
export const FaceEnrollment = ({ apiKey, api_key, workspaceId, workspace_id, employeeId, employee_id, apiUrl = "https://api.sureclock.karalasoft.com", theme = "dark", styles = {}, hideHeader = false, title = "Automated Biometric Enrollment", className = "", enableSound = true, onSuccess, onError, onAngleComplete, }) => {
    const effectiveApiKey = apiKey || api_key || "";
    const effectiveWorkspaceId = workspaceId || workspace_id || "";
    const [empIdInput, setEmpIdInput] = useState(employeeId || employee_id || "");
    // Multi-angle progression state: left -> right -> front
    const [currentAngleIdx, setCurrentAngleIdx] = useState(0);
    const currentAngle = ANGLES[currentAngleIdx];
    const [completedAngles, setCompletedAngles] = useState({
        left: false,
        right: false,
        front: false,
    });
    const [capturedThumbnails, setCapturedThumbnails] = useState({
        left: null,
        right: null,
        front: null,
    });
    const [capturedCloudinaryUrls, setCapturedCloudinaryUrls] = useState({
        left: null,
        right: null,
        front: null,
    });
    const capturedCloudinaryUrlsRef = useRef({
        left: null,
        right: null,
        front: null,
    });
    const [detectedAngle, setDetectedAngle] = useState("none");
    const [inputMode, setInputMode] = useState("camera");
    const [hasCamera, setHasCamera] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isAllComplete, setIsAllComplete] = useState(false);
    // Real-time centering, quality & stability indicators
    const [qualityText, setQualityText] = useState("Position face in guide");
    const [centeringProgress, setCenteringProgress] = useState(0); // 0 to 100
    const [isCentered, setIsCentered] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");
    const [errorBanner, setErrorBanner] = useState(null);
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
    // Initialize camera stream
    useEffect(() => {
        if (inputMode !== "camera" || isAllComplete)
            return;
        let isCancelled = false;
        async function startCamera() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 640 },
                        height: { ideal: 480 },
                        facingMode: "user",
                    },
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
                    setErrorBanner(null);
                }
            }
            catch (err) {
                setHasCamera(false);
                setErrorBanner("Camera permission denied or camera device unavailable.");
            }
        }
        startCamera();
        return () => {
            isCancelled = true;
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => t.stop());
            }
        };
    }, [inputMode, isAllComplete]);
    // Frame capture helper (crops to 320x320 JPEG)
    const captureFrame = useCallback(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.videoWidth === 0)
            return null;
        canvas.width = 320;
        canvas.height = 320;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx)
            return null;
        const size = Math.min(video.videoWidth, video.videoHeight);
        const startX = (video.videoWidth - size) / 2;
        const startY = (video.videoHeight - size) / 2;
        ctx.drawImage(video, startX, startY, size, size, 0, 0, 320, 320);
        return canvas.toDataURL("image/jpeg", 0.82);
    }, []);
    // Upload a single angle photo to backend
    const uploadAnglePhoto = useCallback(async (angle, photoBase64) => {
        const targetEmpId = empIdInput.trim();
        if (!effectiveApiKey || !effectiveWorkspaceId || !targetEmpId) {
            setErrorBanner("API Key, Workspace ID, and Employee ID are required.");
            return false;
        }
        setIsProcessing(true);
        setStatusMessage(`Analyzing & enrolling ${angle.toUpperCase()} angle vector...`);
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
                    image_base64: photoBase64,
                    angle_label: angle,
                }),
            });
            const data = await resp.json();
            if (!resp.ok) {
                throw new Error(data.message || `Enrollment failed (${resp.status})`);
            }
            if (data.image_url) {
                setCapturedCloudinaryUrls((prev) => ({ ...prev, [angle]: data.image_url }));
                capturedCloudinaryUrlsRef.current[angle] = data.image_url;
            }
            // Trigger angle complete callback
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
    }, [empIdInput, effectiveApiKey, effectiveWorkspaceId, apiUrl, currentAngleIdx, onAngleComplete, onError]);
    // Automated capture & sequential progression
    const triggerAutoCapture = useCallback(async () => {
        if (isCapturingRef.current || isProcessing || isAllComplete)
            return;
        const targetEmpId = empIdInput.trim();
        if (!targetEmpId) {
            setErrorBanner("Please specify an Employee ID before automated scanning.");
            return;
        }
        isCapturingRef.current = true;
        setFlashScreen(true);
        setTimeout(() => setFlashScreen(false), 200);
        const photo = captureFrame();
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
                // Permit to the next angle automatically
                const nextIdx = currentAngleIdx + 1;
                setStatusMessage(`✓ ${angleToRegister.toUpperCase()} captured! Now turn to ${ANGLES[nextIdx].toUpperCase()}...`);
                stabilityCounter.current = 0;
                setCenteringProgress(0);
                setIsCentered(false);
                setTimeout(() => {
                    setCurrentAngleIdx(nextIdx);
                    isCapturingRef.current = false;
                }, 1200);
            }
            else {
                // All angles complete!
                setIsAllComplete(true);
                setStatusMessage("🎉 All angles registered successfully! 128D multi-vector enrolled.");
                isCapturingRef.current = false;
                if (onSuccess) {
                    onSuccess({
                        status: "success",
                        employee_id: targetEmpId,
                        workspace_id: effectiveWorkspaceId,
                        message: "Enrolled all biometric angles successfully.",
                        angles_captured: ["left", "right", "front"],
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
        isAllComplete,
        empIdInput,
        captureFrame,
        currentAngle,
        uploadAnglePhoto,
        playChime,
        currentAngleIdx,
        effectiveWorkspaceId,
        onSuccess,
    ]);
    // Real-time loop: Frame centering, lighting, head-angle pose & stability analysis
    useEffect(() => {
        if (inputMode !== "camera" || isAllComplete || isProcessing || !hasCamera)
            return;
        let animId;
        const canvas = document.createElement("canvas");
        canvas.width = 120;
        canvas.height = 120;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        const checkFrame = () => {
            const video = videoRef.current;
            if (video && video.readyState >= 2 && ctx && !isCapturingRef.current) {
                // Sample center ROI
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
                // 2. Motion stability check against previous frame
                let motionDelta = 999;
                if (prevFrameBuffer.current && prevFrameBuffer.current.length === data.length) {
                    let diff = 0;
                    for (let i = 0; i < data.length; i += 16) {
                        diff += Math.abs(data[i] - prevFrameBuffer.current[i]);
                    }
                    motionDelta = diff / (data.length / 16);
                }
                prevFrameBuffer.current = new Uint8ClampedArray(data);
                // 3. Head Yaw Pose Detection (horizontal feature gradient & asymmetry)
                // Focus on vertical center 20% to 80%
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
                // Raw coordinates: video is mirrored with scaleX(-1) in UI.
                // When user turns head to THEIR LEFT:
                // features shift right in raw frame (featureCenterX > 60), right side is brighter (lumaDiffRatio < 0).
                // In UI space (what user perceives):
                const rawOffset = (featureCenterX - 60) / 30; // -1 to +1
                const perceivedYaw = -(rawOffset * 0.7 - lumaDiffRatio * 0.3);
                let pose = "front";
                if (perceivedYaw < -0.08) {
                    pose = "left";
                }
                else if (perceivedYaw > 0.08) {
                    pose = "right";
                }
                else {
                    pose = "front";
                }
                setDetectedAngle(pose);
                // 4. Validation logic with angle match gating
                if (avgLuma < 35) {
                    setQualityText("Too Dark - Increase lighting");
                    setIsCentered(false);
                    stabilityCounter.current = 0;
                    setCenteringProgress(0);
                }
                else if (avgLuma > 240) {
                    setQualityText("Too Bright - Avoid direct backlight");
                    setIsCentered(false);
                    stabilityCounter.current = 0;
                    setCenteringProgress(0);
                }
                else if (avgClarity < 2.5) {
                    setQualityText("Focusing... Please hold steady");
                    setIsCentered(false);
                    stabilityCounter.current = 0;
                    setCenteringProgress(0);
                }
                else {
                    // Check if detected pose matches current expected angle
                    const angleMatched = pose === currentAngle;
                    if (!angleMatched) {
                        // Wrong angle: strictly prevent capture and instruct user
                        stabilityCounter.current = Math.max(0, stabilityCounter.current - 2);
                        setIsCentered(false);
                        if (currentAngle === "left") {
                            setQualityText(pose === "front"
                                ? "Turn face to the LEFT ⬅️ (Facing front)"
                                : "Turn face to the LEFT ⬅️");
                        }
                        else if (currentAngle === "right") {
                            setQualityText(pose === "front"
                                ? "Turn face to the RIGHT ➡️ (Facing front)"
                                : "Turn face to the RIGHT ➡️");
                        }
                        else {
                            setQualityText("Look straight at the camera 🎯");
                        }
                        const progress = Math.min(100, Math.round((stabilityCounter.current / 7) * 100));
                        setCenteringProgress(progress);
                    }
                    else {
                        // Correct angle: check motion stability
                        if (motionDelta < 9.5) {
                            stabilityCounter.current = Math.min(10, stabilityCounter.current + 1);
                            setIsCentered(true);
                            setQualityText(`Pose Matched (${currentAngle.toUpperCase()})! Hold still...`);
                        }
                        else {
                            stabilityCounter.current = Math.max(0, stabilityCounter.current - 1);
                            setIsCentered(false);
                            setQualityText(`Hold still (${currentAngle.toUpperCase()} angle)...`);
                        }
                        const progress = Math.min(100, Math.round((stabilityCounter.current / 7) * 100));
                        setCenteringProgress(progress);
                        // Threshold reached: Automatic snapshot!
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
    }, [inputMode, isAllComplete, isProcessing, hasCamera, currentAngle, triggerAutoCapture]);
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
                canvas.width = 224;
                canvas.height = 224;
                const ctx = canvas.getContext("2d");
                if (!ctx)
                    return;
                const size = Math.min(img.width, img.height);
                const startX = (img.width - size) / 2;
                const startY = (img.height - size) / 2;
                ctx.drawImage(img, startX, startY, size, size, 0, 0, 224, 224);
                const photo = canvas.toDataURL("image/jpeg", 0.72);
                setCapturedThumbnails((prev) => ({ ...prev, [currentAngle]: photo }));
                uploadAnglePhoto(currentAngle, photo).then((ok) => {
                    if (ok) {
                        setCompletedAngles((prev) => ({ ...prev, [currentAngle]: true }));
                        if (currentAngleIdx < ANGLES.length - 1) {
                            setCurrentAngleIdx((prev) => prev + 1);
                        }
                        else {
                            setIsAllComplete(true);
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
        surface: isLight ? "#f8fafc" : "#0f172a",
        border: isLight ? "#e2e8f0" : "#1e293b",
        textPrimary: isLight ? "#0f172a" : "#f8fafc",
        textMuted: isLight ? "#64748b" : "#94a3b8",
        viewfinderBg: isLight ? "#f1f5f9" : "#020617",
        accent: "#0ea5e9",
        success: "#10b981",
    };
    // 3D rotation angles for instructional face animation
    const headRotationY = currentAngle === "left" ? -35 : currentAngle === "right" ? 35 : 0;
    return (React.createElement("div", { className: `sureclock-enrollment-root ${className}`, style: {
            maxWidth: "520px",
            width: "100%",
            margin: "0 auto",
            padding: "24px",
            borderRadius: "18px",
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
                marginBottom: "16px",
                borderBottom: `1px solid ${themeTokens.border}`,
                paddingBottom: "14px",
                ...styles.header,
            } },
            React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "12px" } },
                React.createElement("div", { style: {
                        width: "36px",
                        height: "36px",
                        borderRadius: "10px",
                        backgroundColor: isLight ? "#e0f2fe" : "#0c2847",
                        border: `1px solid ${isLight ? "#bae6fd" : "#0284c7"}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#0284c7",
                    } },
                    React.createElement("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
                        React.createElement("path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }),
                        React.createElement("circle", { cx: "9", cy: "7", r: "4" }),
                        React.createElement("path", { d: "M22 11h-4" }),
                        React.createElement("path", { d: "M20 7l-2 4 2 4" }))),
                React.createElement("div", null,
                    React.createElement("h2", { style: { fontSize: "1.1rem", fontWeight: 700, margin: 0, color: themeTokens.textPrimary } }, title),
                    React.createElement("p", { style: { fontSize: "0.78rem", color: themeTokens.textMuted, margin: "2px 0 0 0" } }, "Auto Multi-Angle (Left \u2192 Right \u2192 Front)"))),
            React.createElement("div", { style: {
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "4px 8px",
                    borderRadius: "20px",
                    backgroundColor: isLight ? "#f1f5f9" : "#131e36",
                    border: `1px solid ${themeTokens.border}`,
                    fontSize: "0.72rem",
                    fontFamily: "monospace",
                    color: "#38bdf8",
                } },
                React.createElement("span", { style: { width: "6px", height: "6px", borderRadius: "50%", backgroundColor: hasCamera ? "#10b981" : "#ef4444" } }),
                effectiveWorkspaceId || "Default"))),
        !(employeeId || employee_id) && (React.createElement("div", { style: { marginBottom: "16px" } },
            React.createElement("label", { style: { display: "block", fontSize: "0.75rem", fontWeight: 600, color: themeTokens.textMuted, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.04em" } }, "Employee ID / Badge Code"),
            React.createElement("input", { type: "text", value: empIdInput, onChange: (e) => setEmpIdInput(e.target.value), disabled: isAllComplete, placeholder: "e.g. EMP_0412", style: {
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    border: `1px solid ${themeTokens.border}`,
                    backgroundColor: themeTokens.surface,
                    color: themeTokens.textPrimary,
                    fontSize: "0.95rem",
                    fontFamily: "monospace",
                    boxSizing: "border-box",
                    outline: "none",
                } }))),
        React.createElement("div", { style: { display: "flex", gap: "8px", marginBottom: "16px" } }, ANGLES.map((angle, idx) => {
            const isDone = completedAngles[angle];
            const isCurrent = currentAngleIdx === idx && !isAllComplete;
            return (React.createElement("div", { key: angle, style: {
                    flex: 1,
                    padding: "8px 6px",
                    borderRadius: "8px",
                    border: `1px solid ${isDone ? "#10b981" : isCurrent ? "#0ea5e9" : themeTokens.border}`,
                    backgroundColor: isDone
                        ? isLight ? "#ecfdf5" : "rgba(16, 185, 129, 0.15)"
                        : isCurrent
                            ? isLight ? "#e0f2fe" : "rgba(14, 165, 233, 0.15)"
                            : "transparent",
                    textAlign: "center",
                    transition: "all 0.3s ease",
                } },
                React.createElement("div", { style: { fontSize: "0.68rem", fontWeight: 700, color: isDone ? "#10b981" : isCurrent ? "#0ea5e9" : themeTokens.textMuted, textTransform: "uppercase" } },
                    idx + 1,
                    ". ",
                    angle),
                React.createElement("div", { style: { fontSize: "0.75rem", marginTop: "2px", fontWeight: 600, color: isDone ? "#10b981" : isCurrent ? themeTokens.textPrimary : themeTokens.textMuted } }, isDone ? "✓ Done" : isCurrent ? "Scanning..." : "Pending")));
        })),
        !isAllComplete && (React.createElement("div", { style: {
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                marginBottom: "12px",
                borderRadius: "10px",
                backgroundColor: isLight ? "#f0f9ff" : "rgba(14, 165, 233, 0.1)",
                border: `1px solid ${isLight ? "#bae6fd" : "rgba(14, 165, 233, 0.3)"}`,
            } },
            React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "12px" } },
                React.createElement("div", { style: {
                        width: "44px",
                        height: "44px",
                        borderRadius: "50%",
                        background: isLight ? "#ffffff" : "#0c2847",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        perspective: "200px",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                    } },
                    React.createElement("div", { style: {
                            transform: `rotateY(${headRotationY}deg)`,
                            transition: "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
                            fontSize: "1.4rem",
                            userSelect: "none",
                        } }, "\uD83D\uDC64")),
                React.createElement("div", null,
                    React.createElement("div", { style: { fontSize: "0.86rem", fontWeight: 700, color: isLight ? "#0369a1" : "#38bdf8" } },
                        currentAngle === "left" && "Turn Head to the Left ⬅️",
                        currentAngle === "right" && "Turn Head to the Right ➡️",
                        currentAngle === "front" && "Look Straight Ahead 🎯"),
                    React.createElement("div", { style: { fontSize: "0.72rem", color: isLight ? "#0284c7" : "#94a3b8", marginTop: "2px" } }, qualityText))),
            React.createElement("div", { style: { textAlign: "right" } },
                React.createElement("div", { style: { fontSize: "0.95rem", fontWeight: 800, fontFamily: "monospace", color: centeringProgress >= 100 ? "#10b981" : "#0ea5e9" } },
                    centeringProgress,
                    "%"),
                React.createElement("div", { style: { fontSize: "0.68rem", color: themeTokens.textMuted } }, "Stability")))),
        React.createElement("div", { style: {
                position: "relative",
                width: "100%",
                paddingTop: "90%",
                borderRadius: "14px",
                overflow: "hidden",
                backgroundColor: themeTokens.viewfinderBg,
                border: `2px solid ${isCentered ? "#10b981" : themeTokens.border}`,
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
                    transition: "opacity 0.2s ease-out",
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
                currentAngle === "left" && (React.createElement("div", { style: { color: "#38bdf8", fontSize: "2rem", transform: "translateX(-20px)", opacity: 0.85 } }, "\u2B05")),
                currentAngle === "right" && (React.createElement("div", { style: { color: "#38bdf8", fontSize: "2rem", transform: "translateX(20px)", opacity: 0.85 } }, "\u27A1")),
                currentAngle === "front" && (React.createElement("div", { style: { color: "#10b981", fontSize: "1.6rem", opacity: 0.7 } }, "\uD83C\uDFAF"))),
            React.createElement("div", { style: {
                    position: "absolute",
                    bottom: "12px",
                    left: "14px",
                    right: "14px",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    background: "rgba(0, 0, 0, 0.75)",
                    backdropFilter: "blur(6px)",
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
                        } }, detectedAngle === currentAngle ? `✓ ${detectedAngle}` : `Pose: ${detectedAngle}`),
                    React.createElement("span", { style: { fontFamily: "monospace", color: "#38bdf8", fontWeight: 700, fontSize: "0.72rem" } }, centeringProgress >= 100 ? "CAPTURING" : `${centeringProgress}%`))))) : (React.createElement("div", { onClick: () => fileInputRef.current?.click(), style: {
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
            React.createElement("span", { style: { fontSize: "2rem", marginBottom: "8px" } }, "\uD83D\uDCC1"),
            React.createElement("span", { style: { fontSize: "0.85rem", fontWeight: 600, color: themeTokens.textPrimary } },
                "Upload ",
                currentAngle.toUpperCase(),
                " Photo")))),
        React.createElement("input", { ref: fileInputRef, type: "file", accept: "image/*", onChange: handleFileUpload, style: { display: "none" } }),
        React.createElement("canvas", { ref: canvasRef, style: { display: "none" } }),
        React.createElement("div", { style: { display: "flex", gap: "10px", marginTop: "14px" } }, ANGLES.map((angle) => {
            const thumb = capturedCloudinaryUrls[angle] || capturedThumbnails[angle];
            return (React.createElement("div", { key: angle, style: {
                    flex: 1,
                    aspectRatio: "1",
                    borderRadius: "10px",
                    border: `1px solid ${completedAngles[angle] ? "#10b981" : themeTokens.border}`,
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
                        width: "16px",
                        height: "16px",
                        borderRadius: "50%",
                        backgroundColor: "#10b981",
                        color: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.6rem",
                        fontWeight: 700,
                    } }, "\u2713")),
                capturedCloudinaryUrls[angle] && (React.createElement("div", { style: {
                        position: "absolute",
                        bottom: "2px",
                        left: "2px",
                        right: "2px",
                        backgroundColor: "rgba(0,0,0,0.6)",
                        color: "#38bdf8",
                        fontSize: "0.55rem",
                        textAlign: "center",
                        borderRadius: "2px",
                        fontWeight: 600,
                    } }, "Cloudinary"))));
        })),
        isAllComplete && (React.createElement("div", { style: {
                marginTop: "16px",
                padding: "16px",
                borderRadius: "12px",
                backgroundColor: isLight ? "#ecfdf5" : "rgba(16, 185, 129, 0.15)",
                border: "1px solid #10b981",
                textAlign: "center",
            } },
            React.createElement("div", { style: { fontSize: "1.5rem", marginBottom: "6px" } }, "\uD83C\uDF89"),
            React.createElement("h3", { style: { margin: "0 0 4px 0", fontSize: "1rem", color: isLight ? "#065f46" : "#34d399", fontWeight: 700 } }, "Enrollment Fully Complete"),
            React.createElement("p", { style: { margin: 0, fontSize: "0.8rem", color: isLight ? "#047857" : "#a7f3d0" } }, "All 3 angles (Left, Right, Front) enrolled with 128D mathematical vectors. Ready for instant attendance verification!"))),
        statusMessage && !isAllComplete && (React.createElement("div", { style: {
                marginTop: "12px",
                padding: "10px 14px",
                borderRadius: "8px",
                backgroundColor: isLight ? "#f0fdf4" : "rgba(16, 185, 129, 0.15)",
                color: isLight ? "#15803d" : "#34d399",
                border: `1px solid ${isLight ? "#bbf7d0" : "rgba(16, 185, 129, 0.3)"}`,
                fontSize: "0.82rem",
                textAlign: "center",
                fontWeight: 500,
            } }, statusMessage)),
        errorBanner && (React.createElement("div", { style: {
                marginTop: "12px",
                padding: "10px 14px",
                borderRadius: "8px",
                backgroundColor: isLight ? "#fef2f2" : "#450a0a",
                color: isLight ? "#b91c1c" : "#fca5a5",
                fontSize: "0.82rem",
                textAlign: "center",
                border: `1px solid ${isLight ? "#fecaca" : "#7f1d1d"}`,
            } }, errorBanner))));
};
