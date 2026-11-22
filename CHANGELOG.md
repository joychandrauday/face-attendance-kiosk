# Changelog

All notable changes to this project will be documented in this file.

## [1.7.4] - 2026-11-23
### Added & Improved
- **Enriched Attendance Logs (Date, Time, Working Hours, Shift Status)**:
  - Added full Date and 12-Hour Time columns to both the dedicated Logs view (`AttendanceLogs.tsx`) and the Analytics audit table (`AnalyticsDashboard.tsx`).
  - Added live Working Hours and visual Shift Status indicators (`● ON-DUTY`, `✓ COMPLETED`, `⚠️ AUTO-CLOSED`) linked directly to underlying work sessions.
- **Timezone-Aware Analytics Queries**:
  - Implemented `formatISODateInTimezone` using `Intl.DateTimeFormat` with workspace timezones, preventing UTC `.toISOString().split("T")[0]` from cutting off early morning dates (e.g. Nov 23 in Asia/Dhaka).
  - Ensured today's day-wise work hours, live punches, and hourly traffic reflect current calendar dates in the workspace timezone.
- **URL Query Tab Persistence (`?tab=...`)**:
  - Synchronized `SureClockManager` tabs with browser URL query parameter `?tab=analytics`, `?tab=logs`, `?tab=kiosk`, etc.
  - Page reloads now persist the active tab without resetting to default.
  - Added `popstate` browser navigation support.
### Added & Improved
- **Pure Auto-Verification (Zero Friction)**: Removed manual "Clock In" and "Clock Out" toggle buttons from the kiosk UI. Verification now operates in 100% smart AUTO mode with a single Verify action.
- **Session-Driven Shift State Machine**:
  - First scan automatically logs Clock In with audio chime and instant checkmark.
  - Second scan detects active shift and presents a guarded 10-second countdown Clock-Out confirmation modal with HMAC security token verification.
- **Enhanced Analytics Breakdown**:
  - Added dedicated Biometric Confidence column to the day-wise breakdown table with color-coded confidence percentage badges.
  - Formatted Working Hours to human-readable hours and minutes (e.g. `8h 15m (8.25 hrs)`).
  - Enhanced Shift Status display with distinct visual badges: `● ON-DUTY / IN PROGRESS`, `✓ COMPLETED`, `⚠️ AUTO-CLOSED`.
  - Fixed confidence score display in recent attendance audit logs (`confidence` and `confidence_score` reconciliation).

## [1.7.1] - 2026-11-22
### Added & Improved
- **Signed Clock-Out Security**: Added HMAC-SHA256 `clock_out_token` handling during clock-out confirmation dispatch.
- **Frontend HUD Deslop**: Removed zero-offset colored blur/glow halos from camera viewfinder and enrollment reticles, enforcing crisp 1px borders and high-contrast status indicators.
- **Timezone Resilience**: Enhanced 12-hour formatting and workspace timezone-aware log sync.

## [1.7.0] - 2026-11-21
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
