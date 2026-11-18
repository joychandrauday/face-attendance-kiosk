# @karalasoft/face-attendance-kiosk

Enterprise-grade, zero-overhead React & Next.js biometric attendance SDK for **SureClock**. Designed to drop seamlessly into any CRM, ERP, HR portal, or dedicated physical kiosk tablet.

---

## Key Features

1. **Dual-Mode Attendance (`<FaceAttendanceKiosk />`)**:
   * **Smart Auto-Toggle**: Automatically recognizes whether an employee is clocking in or clocking out.
   * **Explicit Controls**: Switch between `Auto`, `Clock In`, or `Clock Out` modes with a single click.
   * **Hands-Free Auto-Scan (`autoScan`)**: Continuously verifies employees as they approach the terminal.
   * **Shift Duration Display**: Instantly calculates and displays shift duration upon clock-out.
   * **Acoustic Feedback**: Pleasant harmonic verification chime (can be silenced with `enableSound={false}`).

2. **Universal CRM / ERP Theming**:
   * **Theme Presets**: `"dark"` (Obsidian), `"light"` (Slate / White), or `"transparent"` (embeds seamlessly into any parent card or modal).
   * **Granular CSS Overrides (`styles`)**: Direct control over `container`, `header`, `viewfinder`, `button`, and `hud`.
   * **Header Toggle (`hideHeader`)**: Suppress the built-in header to render your CRM's bespoke navigation.

3. **Biometric Face Enrollment (`<FaceEnrollment />`)**:
   * Supports live webcam capture **and** drag-and-drop file upload (PNG, JPG, WebP).
   * Multi-angle capture support (`front`, `left`, `right`).

4. **Built-in Presentation Attack Detection (Liveness)**:
   * Client-side temporal micro-motion verification before payload transmission.

---

## Installation

```bash
# via npm:
npm install @karalasoft/face-attendance-kiosk

# via pnpm:
pnpm add @karalasoft/face-attendance-kiosk

# via yarn:
yarn add @karalasoft/face-attendance-kiosk
```

---

## Quickstart

### 1. Attendance Terminal (Kiosk / CRM View)

```tsx
'use client';

import { FaceAttendanceKiosk } from '@karalasoft/face-attendance-kiosk';

export default function AttendancePage() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#080d1a' }}>
      <FaceAttendanceKiosk
        apiKey="pk_live_YOUR_PUBLISHABLE_KEY"
        workspaceId="your-workspace-slug"
        theme="dark"
        showModeSelector={true}
        enableSound={true}
        onSuccess={(result) => {
          console.log(`Verified ${result.employee_id} (${result.punch_type})`);
          if (result.session_duration_minutes) {
            console.log(`Shift duration: ${result.session_duration_minutes} mins`);
          }
        }}
        onError={(err) => {
          console.warn('Authentication failed:', err);
        }}
      />
    </div>
  );
}
```

### 2. Seamless Light-Themed CRM Embed

```tsx
<FaceAttendanceKiosk
  apiKey="pk_live_..."
  workspaceId="showroom-dhaka"
  theme="light"
  hideHeader={true}
  styles={{
    container: { border: 'none', boxShadow: 'none', maxWidth: '100%' },
  }}
  onSuccess={(result) => handleCrmCheckIn(result)}
/>
```

### 3. Employee Biometric Enrollment (HR Portal)

```tsx
'use client';

import { FaceEnrollment } from '@karalasoft/face-attendance-kiosk';

export default function EnrollmentModal({ employeeId }: { employeeId: string }) {
  return (
    <FaceEnrollment
      apiKey="sk_live_YOUR_SECRET_KEY"
      workspaceId="showroom-dhaka"
      employeeId={employeeId}
      theme="dark"
      onSuccess={(res) => alert(`Enrolled: ${res.employee_id}`)}
      onError={(err) => alert(`Error: ${err}`)}
    />
  );
}
```

---

## Props Reference

### `<FaceAttendanceKiosk />`

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `apiKey` | `string` | **Required** | Publishable key (`pk_live_...`). Safe for client-side use. |
| `workspaceId` | `string` | **Required** | Target workspace tenant slug. |
| `punchType` | `"AUTO" \| "IN" \| "OUT"` | `"AUTO"` | Default punch direction. |
| `showModeSelector` | `boolean` | `true` | Displays segmented Auto / In / Out selector buttons. |
| `theme` | `"dark" \| "light" \| "transparent"` | `"dark"` | Visual styling preset. |
| `styles` | `KioskCustomStyles` | `{}` | Granular style overrides for `container`, `header`, `viewfinder`, etc. |
| `hideHeader` | `boolean` | `false` | Hides the default top bar (useful when embedding in custom CRM headers). |
| `title` | `string` | `"Showroom Attendance Kiosk"` | Title displayed in the header. |
| `enableSound` | `boolean` | `true` | Plays harmonic chime upon successful match. |
| `mirror` | `boolean` | `true` | Flips viewfinder horizontally for natural selfie orientation. |
| `autoScan` | `boolean` | `false` | Enables hands-free continuous presence verification. |
| `apiUrl` | `string` | `"https://api.sureclock.karalasoft.com"` | Custom API base URL. |
| `onSuccess` | `(result: AttendanceSuccessResult) => void` | `undefined` | Callback fired on biometric verification success. |
| `onError` | `(errorMessage: string) => void` | `undefined` | Callback fired on recognition failure or network error. |
| `onStatusChange` | `(status: string) => void` | `undefined` | Callback on state transitions (`LIVENESS_CHECK`, `AUTHENTICATING`, etc.). |

### `<FaceEnrollment />`

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `apiKey` | `string` | **Required** | Secret key (`sk_live_...`). Used by HR / admin portals. |
| `workspaceId` | `string` | **Required** | Workspace tenant slug. |
| `employeeId` | `string` | `undefined` | Pre-bound employee code. If omitted, input field is rendered. |
| `theme` | `"dark" \| "light" \| "transparent"` | `"dark"` | Visual preset. |
| `hideHeader` | `boolean` | `false` | Hides the default header. |
| `styles` | `KioskCustomStyles` | `{}` | Custom styling overrides. |
| `onSuccess` | `(result: EnrollmentSuccessResult) => void` | `undefined` | Fired when face vector is saved. |
| `onError` | `(errorMessage: string) => void` | `undefined` | Fired on enrollment failure. |

---

## License

MIT © KaralaSoft Team & SureClock Contributors
