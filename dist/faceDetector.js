import { FilesetResolver, FaceDetector } from "@mediapipe/tasks-vision";
let detectorInstance = null;
let initPromise = null;
/**
 * Lazily initialize MediaPipe FaceDetector singleton.
 * Uses BlazeFace short-range model via WebAssembly / WebGL.
 */
export async function getFaceDetector() {
    if (detectorInstance)
        return detectorInstance;
    if (initPromise)
        return initPromise;
    initPromise = (async () => {
        try {
            const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm");
            detectorInstance = await FaceDetector.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
                    delegate: "GPU",
                },
                runningMode: "IMAGE",
            });
            return detectorInstance;
        }
        catch (err) {
            console.warn("SureClock: MediaPipe FaceDetector GPU init failed, trying CPU delegate...", err);
            try {
                const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm");
                detectorInstance = await FaceDetector.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
                        delegate: "CPU",
                    },
                    runningMode: "IMAGE",
                });
                return detectorInstance;
            }
            catch (e) {
                console.warn("SureClock: MediaPipe FaceDetector initialization failed, using biometric oval fallback.", e);
                return null;
            }
        }
    })();
    return initPromise;
}
/**
 * Crops strictly the face region from a video element, aligning the eyes horizontally
 * and completely excluding neck, shoulders, and clothing pixels.
 *
 * @param video HTMLVideoElement with live camera stream
 * @param outputCanvas Canvas to draw the aligned face crop onto
 * @param outputSize Dimension (width & height) of output square crop (default: 300px)
 * @param jpegQuality JPEG compression quality (0.0 - 1.0, default: 0.85)
 */
export async function cropAlignedFace(video, outputCanvas, outputSize = 300, jpegQuality = 0.85) {
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
        return null;
    }
    const ctx = outputCanvas.getContext("2d", { willReadFrequently: true });
    if (!ctx)
        return null;
    outputCanvas.width = outputSize;
    outputCanvas.height = outputSize;
    const detector = await getFaceDetector();
    if (detector) {
        try {
            const result = detector.detect(video);
            if (result.detections && result.detections.length > 0) {
                // Pick primary face with highest confidence
                let primaryDetection = result.detections[0];
                for (const det of result.detections) {
                    const score = det.categories?.[0]?.score || 0;
                    const bestScore = primaryDetection.categories?.[0]?.score || 0;
                    if (score > bestScore) {
                        primaryDetection = det;
                    }
                }
                const bbox = primaryDetection.boundingBox;
                const keypoints = primaryDetection.keypoints;
                if (bbox) {
                    const vW = video.videoWidth;
                    const vH = video.videoHeight;
                    // Eye-level rotation alignment
                    let angle = 0;
                    if (keypoints && keypoints.length >= 2) {
                        // keypoints[0]: Right Eye, keypoints[1]: Left Eye
                        const rEye = keypoints[0];
                        const lEye = keypoints[1];
                        const rx = rEye.x * vW;
                        const ry = rEye.y * vH;
                        const lx = lEye.x * vW;
                        const ly = lEye.y * vH;
                        const dy = ly - ry;
                        const dx = lx - rx;
                        angle = Math.atan2(dy, dx);
                    }
                    // Canonical ArcFace/InsightFace style framing:
                    // Expand bounding box with 20% margin to capture full brow & chin,
                    // but strictly stop before neck/torso/clothing.
                    const padFactor = 0.20;
                    const pW = bbox.width * (1 + padFactor * 2);
                    const pH = bbox.height * (1 + padFactor * 2);
                    // Center of the detected face
                    const centerX = bbox.originX + bbox.width / 2;
                    const centerY = bbox.originY + bbox.height / 2;
                    ctx.save();
                    ctx.clearRect(0, 0, outputSize, outputSize);
                    // Translate to center of output canvas and rotate counter-angle to straighten face
                    ctx.translate(outputSize / 2, outputSize / 2);
                    ctx.rotate(-angle);
                    // Safe source bounds clamping to prevent IndexSizeError on iOS Safari / WebKit
                    const rawSx = centerX - pW / 2;
                    const rawSy = centerY - pH / 2;
                    const sx = Math.max(0, Math.min(vW - 10, rawSx));
                    const sy = Math.max(0, Math.min(vH - 10, rawSy));
                    const sw = Math.max(10, Math.min(vW - sx, pW));
                    const sh = Math.max(10, Math.min(vH - sy, pH));
                    // Draw the face crop tightly centered
                    ctx.drawImage(video, sx, sy, sw, sh, -outputSize / 2, -outputSize / 2, outputSize, outputSize);
                    ctx.restore();
                    const faceBase64 = outputCanvas.toDataURL("image/jpeg", jpegQuality);
                    return {
                        success: true,
                        isDetected: true,
                        isFallback: false,
                        image_base64: faceBase64,
                        confidence: primaryDetection.categories?.[0]?.score || 1.0,
                        boundingBox: bbox,
                    };
                }
            }
        }
        catch (err) {
            console.warn("SureClock: Detection error during frame processing, falling back to biometric reticle crop:", err);
        }
    }
    // --- Ergonomic Biometric Reticle Fallback ---
    // When detector is unavailable or initializing, perform focused facial crop
    // centered horizontally and framing y in [12%, 72%] to eliminate clothing & body pixels.
    const vW = video.videoWidth;
    const vH = video.videoHeight;
    // Use a portrait/square face reticle centered on upper frame
    const faceBoxSize = Math.min(vW * 0.65, vH * 0.65);
    const startX = (vW - faceBoxSize) / 2;
    const startY = Math.max(0, (vH - faceBoxSize) / 2 - (vH * 0.08)); // Shift upward towards face
    ctx.clearRect(0, 0, outputSize, outputSize);
    ctx.drawImage(video, startX, startY, faceBoxSize, faceBoxSize, 0, 0, outputSize, outputSize);
    const fallbackBase64 = outputCanvas.toDataURL("image/jpeg", jpegQuality);
    return {
        success: true,
        isDetected: false,
        isFallback: true,
        image_base64: fallbackBase64,
    };
}
/**
 * Compute micro-motion difference between two successive frame canvases (for active liveness).
 * Returns normalized difference ratio (0.0 to 1.0).
 */
export function computeFrameMicroMotion(canvasA, canvasB) {
    const ctxA = canvasA.getContext("2d", { willReadFrequently: true });
    const ctxB = canvasB.getContext("2d", { willReadFrequently: true });
    if (!ctxA || !ctxB)
        return 0.05;
    const w = Math.min(canvasA.width, canvasB.width);
    const h = Math.min(canvasA.height, canvasB.height);
    if (w === 0 || h === 0)
        return 0.05;
    // Sample down to 64x64 for ultra-fast difference computation
    const sampleW = 64;
    const sampleH = 64;
    const imgDataA = ctxA.getImageData(0, 0, w, h);
    const imgDataB = ctxB.getImageData(0, 0, w, h);
    let totalDiff = 0;
    const step = Math.max(1, Math.floor(imgDataA.data.length / (sampleW * sampleH * 4)));
    let samples = 0;
    for (let i = 0; i < imgDataA.data.length; i += step * 4) {
        const rDiff = Math.abs(imgDataA.data[i] - imgDataB.data[i]);
        const gDiff = Math.abs(imgDataA.data[i + 1] - imgDataB.data[i + 1]);
        const bDiff = Math.abs(imgDataA.data[i + 2] - imgDataB.data[i + 2]);
        totalDiff += (rDiff + gDiff + bDiff) / (3 * 255);
        samples++;
    }
    return samples > 0 ? totalDiff / samples : 0.05;
}
