# @karalasoft/face-attendance-kiosk

Zero-overhead, client-side drop-in React/Next.js biometric components for SureClock.

## Components Included

1. **`<FaceAttendanceKiosk />`**: For showroom wall tablets / attendance check-in stations (uses Publishable Key `pk_live_...`).
2. **`<FaceEnrollment />`**: For HR admin dashboards to capture and enroll employee face biometrics (uses Secret Key `sk_live_...`).

---

## Installation

```bash
# Install directly from the public GitHub repository:
npm install joychandrauday/face-attendance-kiosk

# Or via npm package registry:
npm install @karalasoft/face-attendance-kiosk
```

---

## 1. Showroom Clock-In Kiosk (`<FaceAttendanceKiosk />`)

Drop this component on any showroom tablet or public kiosk. **It is safe to use in public browsers** because it accepts a Publishable Key (`pk_live_...`) restricted strictly to 1:N verification:

```tsx
'use client';

import { FaceAttendanceKiosk } from '@karalasoft/face-attendance-kiosk';

export default function ShowroomAttendancePage() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#020617' }}>
      <FaceAttendanceKiosk
        api_key="pk_live_YOUR_PUBLISHABLE_KEY"
        workspace_id="dealer_gulshan"
        onSuccess={(result) => {
          console.log(`Clock-in verified for ${result.employee_id} at ${result.timestamp}`);
        }}
        onError={(err) => {
          console.warn('Clock-in failed:', err);
        }}
      />
    </main>
  );
}
```

---

## 2. HR Employee Enrollment (`<FaceEnrollment />`)

Drop this component into your secure internal HR / Admin dashboard to register employee face biometrics:

```tsx
'use client';

import { FaceEnrollment } from '@karalasoft/face-attendance-kiosk';

export default function HREnrollmentPage() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#020617' }}>
      <FaceEnrollment
        api_key="sk_live_YOUR_SECRET_KEY"
        workspace_id="dealer_gulshan"
        employee_id="EMP_042" // Optional: if omitted, an input box is shown for HR
        onSuccess={(result) => {
          alert(`Employee ${result.employee_id} successfully enrolled!`);
        }}
      />
    </main>
  );
}
```

---

## Props Reference

### `<FaceAttendanceKiosk />`
| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `api_key` | `string` | **Required** | The publishable kiosk key (`pk_live_...`). |
| `workspace_id` | `string` | **Required** | The isolated showroom/workspace identifier (e.g. `dealer_gulshan`). |
| `apiUrl` | `string` | `https://api.sureclock.karalasoft.com` | Custom API endpoint for local dev (`http://localhost:3000`). |
| `title` | `string` | `"Showroom Biometric Kiosk"` | Header title above viewfinder. |
| `onSuccess` | `(res) => void` | `undefined` | Callback fired when match exceeds 90% threshold. |
| `onError` | `(err) => void` | `undefined` | Callback fired on recognition failure. |

### `<FaceEnrollment />`
| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `api_key` | `string` | **Required** | The secret platform key (`sk_live_...`). |
| `workspace_id` | `string` | **Required** | Target workspace for enrollment. |
| `employee_id` | `string` | `undefined` | Pre-bound employee ID (if omitted, shows an input field). |
| `apiUrl` | `string` | `https://api.sureclock.karalasoft.com` | Custom API endpoint. |
| `onSuccess` | `(res) => void` | `undefined` | Callback fired upon successful enrollment. |
| `onError` | `(err) => void` | `undefined` | Callback fired on failure. |
