import { FaceDetector } from "@mediapipe/tasks-vision";
/**
 * Lazily initialize MediaPipe FaceDetector singleton.
 * Uses BlazeFace short-range model via WebAssembly / WebGL.
 */
export declare function getFaceDetector(): Promise<FaceDetector | null>;
export interface FaceCropResult {
    success: boolean;
    isDetected: boolean;
    isFallback: boolean;
    image_base64: string;
    confidence?: number;
    boundingBox?: {
        originX: number;
        originY: number;
        width: number;
        height: number;
    };
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
export declare function cropAlignedFace(video: HTMLVideoElement, outputCanvas: HTMLCanvasElement, outputSize?: number, jpegQuality?: number): Promise<FaceCropResult | null>;
/**
 * Compute micro-motion difference between two successive frame canvases (for active liveness).
 * Returns normalized difference ratio (0.0 to 1.0).
 */
export declare function computeFrameMicroMotion(canvasA: HTMLCanvasElement, canvasB: HTMLCanvasElement): number;
