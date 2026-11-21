# @karalasoft/face-attendance-kiosk

Enterprise-grade, zero-overhead React & Next.js biometric attendance, multi-angle enrollment, and embedded management SDK for **SureClock**. Designed to drop seamlessly into any CRM, ERP, HR portal, or dedicated physical kiosk tablet—with **zero API calls required**, **built-in native modals**, and **no separate admin panel needed**.

---

## What's New in v1.5.0

1. **Automated Verification with Clock-Out Confirmation Flow**:
   * **Automated 1st Scan (Clock In)**: The first scan of the day automatically clocks the employee in (`punch_type: "IN"`) instantly with audio feedback and zero prompt friction.
   * **Guarded 2nd Scan (Clock Out Confirmation)**: If an active shift is detected today, the kiosk pauses scanning and presents a sleek dark-slate modal with a 10-second auto-dismiss countdown:
     - *"Hello EMP001! You have an active shift of 4h 12m. Confirm Clock-Out?"*
     - If the user confirms: records `punch_type: "OUT"`, calculates shift duration, and dispatches webhooks.
     - If the user cancels or walks away (10s timer expires): auto-dismisses and keeps the shift active.

2. **Zero Browser Dialogs (`window.confirm` & `alert` Elimination)**:
   * Replaced all native browser popups with customizable, responsive `<ConfirmModal />` and `<Toast />` notification primitives.

3. **Real-Time Attendance Logs Component (`<AttendanceLogs />`)**:
   * Official standalone component that streams punches in real time with auto-refresh (12s interval).
   * Features search by employee ID, direction filtering (`ALL` / `IN` / `OUT`), formatted timestamps, confidence scores, and color-coded status pills (`🟢 CLOCK IN` vs `🟠 CLOCK OUT`).
   * Embedded as Tab 2 in `<SureClockManager />`.

4. **Self-Contained & Plug-and-Play**:
   * Single drop-in component `<SureClockManager />` handles Kiosk, Logs, Employee Management, Biometric Faces, and Analytics charts with zero custom styling setup.

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

## Quickstart (Plug & Play)

### 1. Complete Biometric Hub (`<SureClockManager />`)

Drop this single component into any React / Next.js / Vite application to get the complete biometric attendance terminal, real-time logs, staff management, and analytics:

```tsx
'use client';

import { SureClockManager } from '@karalasoft/face-attendance-kiosk';

export default function AttendancePage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#080d1a', padding: '24px' }}>
      <SureClockManager
        apiKey={process.env.NEXT_PUBLIC_SURECLOCK_API_KEY}
        workspaceId="garirhat-kiosk"
        theme="dark"
        title="SureClock Biometric Hub"
      />
    </div>
  );
}
```

### 2. Dedicated Physical Kiosk Tablet (`<FaceAttendanceKiosk />`)

For mounted tablets, physical showroom kiosks, or factory entrance terminals:

```tsx
'use client';

import { FaceAttendanceKiosk } from '@karalasoft/face-attendance-kiosk';

export default function KioskTerminal() {
  return (
    <FaceAttendanceKiosk
      apiKey={process.env.NEXT_PUBLIC_SURECLOCK_PUBLISHABLE_KEY}
      workspaceId="garirhat-kiosk"
      autoScan={true}
      enableSound={true}
      mirror={true}
      title="Front Desk Biometric Kiosk"
      onSuccess={(result) => {
        console.log('Verified punch:', result.employee_id, result.punch_type);
      }}
    />
  );
}
```

### 3. Standalone Real-Time Logs (`<AttendanceLogs />`)

```tsx
'use client';

import { AttendanceLogs } from '@karalasoft/face-attendance-kiosk';

export default function LogsView() {
  return (
    <AttendanceLogs
      apiKey={process.env.NEXT_PUBLIC_SURECLOCK_SECRET_KEY}
      workspaceId="garirhat-kiosk"
      theme="dark"
      autoRefresh={true}
      limit={50}
    />
  );
}
```
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
