# @karalasoft/face-attendance-kiosk

Enterprise-grade, zero-overhead React & Next.js biometric attendance, multi-angle enrollment, and embedded management SDK for **SureClock**. Designed to drop seamlessly into any CRM, ERP, HR portal, or dedicated physical kiosk tablet—with **zero API calls required** and **no separate admin panel needed**.

---

## What's New in v1.3.5

1. **Complete All-In-One "Connect & Go" Solution (`<SureClockManager />`)**:
   * **Live Attendance Kiosk Tab**: `<SureClockManager />` now embeds the live attendance clock-in camera terminal directly as Tab 1. Drop one component into your application and immediately receive the **full enterprise solution**:
     - 📸 **Live Kiosk**: Touchless glance facial clock-in/out station with audio chime & HUD.
     - 👥 **Employee Directory**: Real-time staff list with search and 1-click biometric deletion.
     - 👤 **Biometric Faces**: Inspect multi-angle Cloudinary CDN photos and 128D mathematical vectors.
     - 📊 **Analytics & Charts**: Live work hours, confidence rate, hourly breakdown charts, and real-time punch logs.
     - ➕ **Multi-Angle Enrollment Modal**: 3-phase guided registration (Front ➔ Left ➔ Right).
   * **Zero User-Written API Calls**: All biometric inference, vector storage, downscaling, Cloudinary sync, and database queries are handled internally by the SDK.
   * **Raw APIs for Customization**: For teams building custom headless mobile apps or custom microservices, the raw REST endpoints and typed SDK functions (`api.fetchEmployees`, `api.deleteEmployee`, etc.) remain fully accessible.

2. **3-Phase Intentional Enrollment Flow (`<FaceEnrollment />`)**:
   * **No Premature Camera Mount**: Camera permissions and video hardware are **never** initialized on mount. The camera only turns on when the user inputs their details and explicitly clicks **"Open Camera & Begin Scan"**.
   * **Phase 1: Identity & Profile Details**: Clean form collecting `Employee ID` and `Full Name` with validation.
   * **Phase 2: Multi-Angle Scan Viewfinder**: Guided hands-free capture cycling through **Front ➔ Turn Left ➔ Turn Right** with 3D perspective animations, dynamic head turn indicator HUD, and real-time motion stability gating (`motionDelta < 14.0`).
   * **Phase 3: Biometric Certificate**: Celebratory completion screen presenting verified status, 128D mathematical token preview, captured angle badges, and 1-click "Enroll Next Employee" reset.

3. **1:N Anti-Duplicate Biometric Fraud Protection**:
   * **75% Cosine Similarity Floor**: Before enrolling any vector, the engine verifies the face against all existing employees in the workspace.
   * **Automatic Purge & Rollback**: If a match exceeding 75% similarity is found under another employee ID, the engine returns an HTTP 409 `DuplicateFaceError` conflict and automatically rolls back any partial angle registrations to prevent ghost employee fraud.

4. **Multi-Angle Cloudinary CDN Storage**:
   * Multi-angle high-resolution crops are stored in tenant-isolated Cloudinary paths (`sureclock/{workspace_id}/...`) for visual HR audit trails and compliance.

---

## Installation

```bash
# via npm (recommended):
npm install @karalasoft/face-attendance-kiosk

# via pnpm:
pnpm add @karalasoft/face-attendance-kiosk

# via yarn:
yarn add @karalasoft/face-attendance-kiosk
```

---

## Components Overview

### 1. Unified Biometric Hub & Analytics (`<SureClockManager />`)

Embed complete employee biometric management and real-time attendance analytics directly inside your portal without needing a separate admin panel:

```tsx
'use client';

import { SureClockManager } from '@karalasoft/face-attendance-kiosk';

export default function AdminPage() {
  return (
    <div style={{ minHeight: '100vh', padding: '40px 20px', background: '#080d1a' }}>
      <SureClockManager
        apiKey="sk_live_YOUR_SECRET_KEY"
        workspaceId="showroom-dhaka"
        theme="dark"
        initialTab="kiosk" // "kiosk" | "employees" | "faces" | "analytics"
      />
    </div>
  );
}
```

---

### 2. Multi-Angle Face Enrollment (`<FaceEnrollment />`)

Interactive 3-phase guided face enrollment. Zero camera permissions on mount—camera opens only after clicking "Open Camera & Begin Scan":

```tsx
'use client';

import { FaceEnrollment } from '@karalasoft/face-attendance-kiosk';

export default function EnrollmentPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#080d1a' }}>
      <FaceEnrollment
        apiKey="sk_live_YOUR_SECRET_KEY"
        workspaceId="showroom-dhaka"
        employeeId="EMP_0412"
        employeeName="John Doe"
        theme="dark"
        enableSound={true}
        onSuccess={(result) => {
          console.log(`Successfully enrolled all angles for ${result.employee_name} (${result.employee_id})!`);
        }}
        onError={(err) => {
          console.error('Enrollment error:', err);
        }}
      />
    </div>
  );
}
```

---

### 3. Face Attendance Kiosk (`<FaceAttendanceKiosk />`)

Mountable kiosk terminal for daily clock-ins and clock-outs:

```tsx
'use client';

import { FaceAttendanceKiosk } from '@karalasoft/face-attendance-kiosk';

export default function KioskPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#080d1a' }}>
      <FaceAttendanceKiosk
        apiKey="pk_live_YOUR_PUBLISHABLE_KEY"
        workspaceId="showroom-dhaka"
        theme="dark"
        onSuccess={(result) => {
          console.log(`Verified ${result.employee_name || result.employee_id} (${result.punch_type})`);
        }}
        onError={(err) => {
          console.warn('Verification failed:', err);
        }}
      />
    </div>
  );
}
```

---

## Props Reference

### `<SureClockManager />` (alias `<Management />`)

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `apiKey` | `string` | **Required** | Secret key (`sk_live_...`) for full management or publishable key (`pk_live_...`) for kiosk. |
| `workspaceId` | `string` | **Required** | Target workspace tenant slug or UUID. |
| `initialTab` | `"kiosk" \| "employees" \| "faces" \| "analytics"` | `"kiosk"` | Initial active view. Defaults to the Live Kiosk. |
| `showKioskTab` | `boolean` | `true` | Whether to display the live attendance camera station tab. |
| `theme` | `"dark" \| "light" \| "transparent"` | `"dark"` | Visual styling preset. |
| `apiUrl` | `string` | `"https://api.sureclock.karalasoft.com"` | Biometric engine API origin. |
| `styles` | `KioskCustomStyles` | `{}` | Custom styling overrides for container and header. |
| `onAttendance` | `(result: AttendanceSuccessResult) => void` | `undefined` | Callback fired when an employee punches in/out via the embedded Kiosk. |
| `onEnrollment` | `(result: EnrollmentSuccessResult) => void` | `undefined` | Callback fired when a staff member completes multi-angle enrollment. |

---

### `<FaceEnrollment />`

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `apiKey` | `string` | **Required** | Secret key (`sk_live_...`). |
| `workspaceId` | `string` | **Required** | Workspace tenant slug or UUID. |
| `employeeId` | `string` | `undefined` | Pre-bound employee ID. If omitted, an ID input field is rendered in Phase 1. |
| `employeeName` / `employee_name` | `string` | `undefined` | Pre-bound employee full name. If omitted, a name input field is rendered in Phase 1. |
| `theme` | `"dark" \| "light" \| "transparent"` | `"dark"` | Theme preset (`"dark"`, `"light"`, `"transparent"`). |
| `enableSound` | `boolean` | `true` | Plays harmonic audio cues on successful angle capture. |
| `hideHeader` | `boolean` | `false` | Hides default top title bar. |
| `onSuccess` | `(result: EnrollmentSuccessResult) => void` | `undefined` | Callback fired when all 3 angles are registered. |
| `onError` | `(errorMessage: string) => void` | `undefined` | Callback fired on failure (e.g. 409 DuplicateFaceError). |
| `onAngleComplete` | `(angle: string, index: number, total: number) => void` | `undefined` | Callback fired as each angle succeeds. |

---

### `<FaceAttendanceKiosk />`

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `apiKey` | `string` | **Required** | Publishable key (`pk_live_...`). Safe for client-side kiosk terminals. |
| `workspaceId` | `string` | **Required** | Target workspace tenant slug or UUID. |
| `punchType` | `"AUTO" \| "IN" \| "OUT"` | `"AUTO"` | Default punch direction. |
| `showModeSelector` | `boolean` | `false` | Displays segmented Auto / In / Out selector. |
| `theme` | `"dark" \| "light" \| "transparent"` | `"dark"` | Obsidian dark, slate light, or transparent. |
| `enableSound` | `boolean` | `true` | Plays harmonic chime upon successful match. |
| `mirror` | `boolean` | `true` | Flips viewfinder horizontally for natural selfie orientation. |
| `autoScan` | `boolean` | `false` | Enables hands-free continuous presence verification. |
| `onSuccess` | `(result: AttendanceSuccessResult) => void` | `undefined` | Fired when biometric face vector matches an employee. |
| `onError` | `(errorMessage: string) => void` | `undefined` | Fired on recognition failure or timeout. |

---

## Programmatic API Client

The SDK also exports typed helper functions for custom integrations:

```tsx
import {
  fetchEmployees,
  deleteEmployee,
  fetchAttendanceStats,
  fetchAttendanceLogs,
} from '@karalasoft/face-attendance-kiosk';

// List enrolled employees (includes employee_name, angle_images, etc.)
const employees = await fetchEmployees(apiKey, workspaceId);

// Fetch real-time attendance statistics & hourly breakdown
const stats = await fetchAttendanceStats(apiKey, workspaceId);
console.log('Clocked in today:', stats.unique_clocked_in);
console.log('Hourly breakdown:', stats.hourly_breakdown);

// Fetch recent attendance logs
const logs = await fetchAttendanceLogs(apiKey, workspaceId, 50);
```

---

## License

MIT © KaralaSoft Team & SureClock Contributors
