# Changelog

All notable changes to this project will be documented in this file.

## [1.2.1] - 2026-11-19
### Changed & Upgraded
- Streamlined primary kiosk interaction to a single, high-trust **"Verify"** button (`buttonLabel="Verify"`), eliminating multi-button ambiguity for employees.
- Auto-smart punch toggle enabled by default (`showModeSelector` now defaults to `false`).
- Intelligent verification messaging:
  - **Clock In**: Displays a prominent Emerald badge `● CLOCK IN RECORDED`, welcome text `"Clock-in confirmed. Have a great shift!"`, and timestamps.
  - **Clock Out**: Displays a prominent Amber badge `● CLOCK OUT RECORDED`, completion text `"Clock-out logged. Shift completed."`, and a dedicated Shift Duration card (`{hours}h {minutes}m` in `font-mono tabular-nums`).
- Upgraded UI design to strict anti-slop B2B standards:
  - Obsidian surface styling (`#080D1A`, `#0F172A`) with crisp 1px borders (`#1E293B`).
  - Native inline SVG icons (Biometric Shield, Reticle, Checkmark, Camera, Upload) with zero external icon dependencies.
  - Smooth biometric scan line animation during authentication.
  - Polished `<FaceEnrollment />` component with sleek B2B file picker and angle tags.

## [1.1.0] - 2026-11-19
### Added
- Multi-theme support: `theme="dark"`, `theme="light"`, and `theme="transparent"` for seamless embedding into external CRMs.
- Granular CSS style overrides via the `styles` prop (`container`, `header`, `viewfinder`, `button`, `hud`, `overlay`).
- Live digital time clock (`font-mono tabular-nums`) on the terminal header.
- Punch direction controls with segmented mode selector (`showModeSelector`): Auto Smart-Toggle, Clock In Only, and Clock Out Only.
- Shift duration calculation and display on successful clock-out (`session_duration_minutes`).
- Hands-free auto-scan mode (`autoScan={true}`) for walk-up attendance kiosks.
- Multi-camera device enumeration and switcher dropdown.
- Audio verification chime with toggle prop (`enableSound={true|false}`).
- Horizontal camera mirroring toggle (`mirror={true|false}`).
- File upload support in `<FaceEnrollment />` alongside live camera snapshot.
- Multi-angle facial embedding tag selector (`front`, `left`, `right`).
- Enhanced presentation attack detection (dual-frame temporal micro-motion verification).

## [1.0.2] - 2026-11-18
### Added
- Added `CHANGELOG.md` to package files.
- Updated `package.json` "files" field to include `CHANGELOG.md`.

## [1.0.1] - 2026-11-16
### Fixed
- Resolved import errors by adding `.js` extensions for ESM compatibility.
- Updated README with npm and GitHub install instructions.
- Published package to npm under `@karalasoft/face-attendance-kiosk`.

## [0.0.0-stage] - 2026-11-14
### Initial placeholder version (not intended for public use).
