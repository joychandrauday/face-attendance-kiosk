# @karalasoft/face-attendance-kiosk

Zero‑overhead, client‑side drop‑in React/Next.js biometric components for SureClock. The library works in any React‑based environment – plain JSX, TSX, or Next.js (including server‑components when appropriate).

---

## Components Included

1. **`<FaceAttendanceKiosk />`** – A ready‑to‑use attendance/check‑in UI.
2. **`<FaceEnrollment />`** – A component for enrolling employee face biometrics.

---

## Installation

```bash
# Install directly from the public GitHub repository:
npm install joychandrauday/face-attendance-kiosk

# Or via the npm package registry:
npm install @karalasoft/face-attendance-kiosk
```

---

## Usage (React / Next.js)

Both components are fully typed and can be used in JavaScript (`.jsx`) or TypeScript (`.tsx`) files. In Next.js, mark the file as a client component (`'use client'`).

### 1. Attendance / Check‑in Component

```tsx
'use client';

import { FaceAttendanceKiosk } from '@karalasoft/face-attendance-kiosk';

export default function AttendancePage() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#020617' }}>
      <FaceAttendanceKiosk
        api_key="pk_live_YOUR_PUBLISHABLE_KEY"
        workspace_id="your_workspace_id"
        onSuccess={(result) => {
          console.log(`Check‑in verified for ${result.employee_id} at ${result.timestamp}`);
        }}
        onError={(err) => {
          console.warn('Check‑in failed:', err);
        }}
      />
    </main>
  );
}
```

### 2. Employee Enrollment Component

```tsx
'use client';

import { FaceEnrollment } from '@karalasoft/face-attendance-kiosk';

export default function EnrollmentPage() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#020617' }}>
      <FaceEnrollment
        api_key="sk_live_YOUR_SECRET_KEY"
        workspace_id="your_workspace_id"
        employee_id="EMP_042" // optional – omit to let HR enter an ID
        onSuccess={(result) => {
          alert(`Employee ${result.employee_id} successfully enrolled!`);
        }}
        onError={(err) => {
          console.error('Enrollment error:', err);
        }}
      />
    </main>
  );
}
```

---

## Props Reference

### `<FaceAttendanceKiosk />`
| Prop | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `api_key` | `string` | **Yes** | Publishable key (`pk_live_...`). |
| `workspace_id` | `string` | **Yes** | Identifier for the workspace where attendance is recorded. |
| `apiUrl` | `string` | No | Custom API endpoint (default: `https://api.sureclock.karalasoft.com`). |
| `title` | `string` | No | Header title displayed above the viewfinder. |
| `onSuccess` | `(result) => void` | No | Called when a face match exceeds the success threshold. |
| `onError` | `(error) => void` | No | Called on recognition failure or network error. |

### `<FaceEnrollment />`
| Prop | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `api_key` | `string` | **Yes** | Secret platform key (`sk_live_...`). |
| `workspace_id` | `string` | **Yes** | Workspace where the biometric data will be stored. |
| `employee_id` | `string` | No | Pre‑bind an employee ID; omit to let the user input it. |
| `apiUrl` | `string` | No | Custom API endpoint (default: `https://api.sureclock.karalasoft.com`). |
| `onSuccess` | `(result) => void` | No | Called after successful enrollment. |
| `onError` | `(error) => void` | No | Called on enrollment failure.

---

## Notes
- The components are built as ES modules (`"type": "module"` in `package.json`). Ensure your bundler supports ESM.
- TypeScript definitions are included; you can import the types directly if needed.
- For server‑side rendering (SSR) scenarios, only render the components on the client side (`'use client'`).
