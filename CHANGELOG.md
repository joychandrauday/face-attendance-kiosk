# Changelog

All notable changes to this project will be documented in this file.

## [1.4.0] - 2026-11-21
### Added & Upgraded
- **MediaPipe BlazeFace Face Detection & Alignment (`faceDetector.ts`)**:
  - Tightly detects the face bounding box and extracts 6 facial landmarks directly on the client device (GPU/WASM in ~3ms).
  - **Eye-Level Rotation Alignment**: Computes head tilt angle and rotates canvas to level eyes horizontally, matching InsightFace canonical standards.
  - **Zero Clothing/Body Pollution**: Crops tightly from hair/brow to chin, completely excluding shoulders, neck, and clothing pixels.
  - **Biometric Reticle Fallback**: Automatic ergonomic upper-face reticle crop when detector is initializing or unsupported.
  - **Active Micro-Motion Liveness Guard**: Computes dual-frame pixel difference across successive captures to reject static paper/screen photos.
- **Biometric Oval Reticle**: Added sleek dashed oval face-positioning guide inside the kiosk viewfinder.
- **High-Quality Face Enrollment**: `<FaceEnrollment />` now uploads crisp $320 \times 320$ face-only portraits to Cloudinary for clean Admin Panel employee registries.
- **Exported Utilities**: Exported `cropAlignedFace`, `computeFrameMicroMotion`, `getFaceDetector`, and `FaceCropResult`.

## [1.3.1] - 2026-11-19
### Added
- **Automated Hands-Free Multi-Angle Biometric Enrollment (`<FaceEnrollment />`)**:
  - Sequential guided capture workflow: **Left ➔ Right ➔ Front** with zero manual button clicking required.
  - Interactive **3D Head Rotation Animation Guide**: Visual face guide smoothly rotates (`rotateY`) towards the required angle with directional arrows to guide the employee.
  - **Real-Time Quality & Centering Engine**:
    - High-frequency variance sharpness / clarity analysis.
    - Intelligent ambient luminance filter (prevents overexposed backlights or underexposed shadows).
    - Pixel-difference frame motion stability tracking with auto-countdown progress ring (0% ➔ 100%).
    - Automatic snapshot trigger and instant 128D vector extraction upon optimal centering and stability.
    - Automatic permission progression from Left to Right to Front.
- **Unified In-SDK Biometric Hub & Analytics (`<SureClockManager />` / `<Management />`)**:
  - Eliminates the need for a separate admin panel—embed full data management directly inside any CRM, ERP, or portal.
  - **Employee Administration**: Searchable staff registry, deletion with GDPR biometric purge, and 1-click modal for multi-angle biometric enrollment.
  - **Biometric Faces Repository**: Inspect 128D biometric vector registration across angles (Left, Right, Front) and trigger re-enrollment.
  - **Interactive Analytics Dashboard**:
    - High-level KPIs: Total enrolled staff, present today, active on-duty, total punches, and average recognition confidence %.
    - **Recharts Hourly Punch Volume Chart**: Visual distribution of attendance activity from 07:00 to 20:00.
    - **Live Biometric Audit Log Stream**: Real-time record of verification timestamps, IN/OUT direction badges, and match confidence scores.
- **Exported API Client**: Full typed TypeScript functions (`fetchEmployees`, `deleteEmployee`, `registerFaceAngle`, `fetchAttendanceStats`, `fetchAttendanceLogs`).

## [1.2.1] - 2026-11-19
### Changed & Upgraded
- Streamlined primary kiosk interaction to a single, high-trust **"Verify"** button (`buttonLabel="Verify"`), eliminating multi-button ambiguity for employees.
- Auto-smart punch toggle enabled by default (`showModeSelector` now defaults to `false`).
- Intelligent verification messaging:
  - **Clock In**: Displays a prominent Emerald badge `● CLOCK IN RECORDED`, welcome text `"Clock-in confirmed. Have a great shift!"`, and timestamps.
  - **Clock Out**: Displays a prominent Amber badge `● CLOCK OUT RECORDED`, completion text `"Clock-out logged. Shift completed."`, and a dedicated Shift Duration card (`{hours}h {minutes}m` in `font-mono tabular-nums`).
- Upgraded UI design to strict anti-slop B2B standards.

## [1.1.0] - 2026-11-19
### Added
- Multi-theme support: `theme="dark"`, `theme="light"`, and `theme="transparent"`.
- Granular CSS style overrides via the `styles` prop.
- Hands-free auto-scan mode (`autoScan={true}`).
- Multi-camera device enumeration and switcher dropdown.
- Audio verification chime with toggle prop (`enableSound={true|false}`).
- Horizontal camera mirroring toggle (`mirror={true|false}`).

## [1.0.1] - 2026-11-16
### Fixed
- Resolved import errors by adding `.js` extensions for ESM compatibility.
- Published package to npm under `@karalasoft/face-attendance-kiosk`.
