import React, { useState } from "react";
import {
  FaceAttendanceKiosk,
  FaceEnrollment,
  SureClockManager,
} from "@karalasoft/face-attendance-kiosk";

export default function App() {
  const [activeTab, setActiveTab] = useState<"kiosk" | "enrollment" | "management">("management");
  const [apiUrl, setApiUrl] = useState("http://localhost:3000");
  const [apiKey, setApiKey] = useState("sk_live_demo_test_secret_key");
  const [workspaceId, setWorkspaceId] = useState("11111111-1111-1111-1111-111111111111");
  const [employeeId, setEmployeeId] = useState("EMP-1001");
  const [eventLogs, setEventLogs] = useState<Array<{ time: string; type: "success" | "error"; payload: any }>>([]);

  const addLog = (type: "success" | "error", payload: any) => {
    const time = new Date().toLocaleTimeString();
    setEventLogs((prev) => [{ time, type, payload }, ...prev.slice(0, 19)]);
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 20px", fontFamily: "sans-serif" }}>
      {/* Header */}
      <header style={{ marginBottom: "28px", borderBottom: "1px solid #1e293b", paddingBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 700, color: "#38bdf8" }}>
              SureClock Biometric SDK Preview
            </h1>
            <p style={{ margin: "6px 0 0", color: "#94a3b8", fontSize: "0.95rem" }}>
              Enterprise test harness for <code>@karalasoft/face-attendance-kiosk</code> v1.3.0
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              onClick={() => setActiveTab("management")}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "none",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: "pointer",
                backgroundColor: activeTab === "management" ? "#0284c7" : "#1e293b",
                color: activeTab === "management" ? "#ffffff" : "#94a3b8",
              }}
            >
              1. Biometric Hub & Analytics
            </button>
            <button
              onClick={() => setActiveTab("enrollment")}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "none",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: "pointer",
                backgroundColor: activeTab === "enrollment" ? "#0284c7" : "#1e293b",
                color: activeTab === "enrollment" ? "#ffffff" : "#94a3b8",
              }}
            >
              2. Auto Multi-Angle Enrollment
            </button>
            <button
              onClick={() => setActiveTab("kiosk")}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "none",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: "pointer",
                backgroundColor: activeTab === "kiosk" ? "#0284c7" : "#1e293b",
                color: activeTab === "kiosk" ? "#ffffff" : "#94a3b8",
              }}
            >
              3. Kiosk Verification
            </button>
          </div>
        </div>
      </header>

      {/* Main Grid: Component Viewport & Settings */}
      <div style={{ display: "grid", gridTemplateColumns: activeTab === "management" ? "1fr" : "1fr 340px", gap: "24px", alignItems: "start" }}>
        {/* Component Display */}
        <div
          style={{
            backgroundColor: "#0b0f19",
            borderRadius: "16px",
            border: "1px solid #1e293b",
            padding: "24px",
            minHeight: "560px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {activeTab === "management" && (
            <SureClockManager
              apiUrl={apiUrl}
              apiKey={apiKey}
              workspaceId={workspaceId}
              theme="dark"
            />
          )}

          {activeTab === "enrollment" && (
            <FaceEnrollment
              apiUrl={apiUrl}
              apiKey={apiKey}
              workspaceId={workspaceId}
              employeeId={employeeId}
              title="Employee Biometric Registration"
              onSuccess={(result) => addLog("success", result)}
              onError={(err) => addLog("error", err)}
            />
          )}

          {activeTab === "kiosk" && (
            <FaceAttendanceKiosk
              apiUrl={apiUrl}
              apiKey={apiKey}
              workspaceId={workspaceId}
              title="Showroom Face Attendance Kiosk"
              onSuccess={(result) => addLog("success", result)}
              onError={(err) => addLog("error", err)}
            />
          )}
        </div>

        {/* Sidebar Controls & Log when not in full management view */}
        {activeTab !== "management" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div
              style={{
                backgroundColor: "#111827",
                borderRadius: "12px",
                border: "1px solid #1f2937",
                padding: "16px",
              }}
            >
              <h3 style={{ margin: "0 0 14px", fontSize: "1rem", color: "#f8fafc" }}>SDK Props Configuration</h3>

              <label style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "4px" }}>
                Biometric Engine URL (apiUrl)
              </label>
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "8px 10px",
                  borderRadius: "6px",
                  backgroundColor: "#1e293b",
                  border: "1px solid #334155",
                  color: "#f8fafc",
                  fontSize: "0.85rem",
                  marginBottom: "12px",
                }}
              />

              <label style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "4px" }}>
                API Secret Key (apiKey)
              </label>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "8px 10px",
                  borderRadius: "6px",
                  backgroundColor: "#1e293b",
                  border: "1px solid #334155",
                  color: "#f8fafc",
                  fontSize: "0.85rem",
                  marginBottom: "12px",
                }}
              />

              <label style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "4px" }}>
                Workspace UUID (workspaceId)
              </label>
              <input
                type="text"
                value={workspaceId}
                onChange={(e) => setWorkspaceId(e.target.value)}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "8px 10px",
                  borderRadius: "6px",
                  backgroundColor: "#1e293b",
                  border: "1px solid #334155",
                  color: "#f8fafc",
                  fontSize: "0.85rem",
                  marginBottom: "12px",
                }}
              />

              {activeTab === "enrollment" && (
                <>
                  <label style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "4px" }}>
                    Employee ID (employeeId)
                  </label>
                  <input
                    type="text"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      backgroundColor: "#1e293b",
                      border: "1px solid #334155",
                      color: "#f8fafc",
                      fontSize: "0.85rem",
                      marginBottom: "12px",
                    }}
                  />
                </>
              )}
            </div>

            {/* Event Log Output */}
            <div
              style={{
                backgroundColor: "#111827",
                borderRadius: "12px",
                border: "1px solid #1f2937",
                padding: "16px",
                maxHeight: "300px",
                overflowY: "auto",
              }}
            >
              <h3 style={{ margin: "0 0 10px", fontSize: "0.95rem", color: "#f8fafc" }}>
                Callback Events ({eventLogs.length})
              </h3>
              {eventLogs.length === 0 ? (
                <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b" }}>
                  Waiting for SDK callbacks (onSuccess / onError)...
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {eventLogs.map((log, index) => (
                    <div
                      key={index}
                      style={{
                        padding: "8px",
                        borderRadius: "6px",
                        backgroundColor: log.type === "success" ? "#064e3b" : "#450a0a",
                        fontSize: "0.75rem",
                        borderLeft: `4px solid ${log.type === "success" ? "#10b981" : "#ef4444"}`,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                        <span style={{ fontWeight: 600, color: log.type === "success" ? "#34d399" : "#f87171" }}>
                          {log.type.toUpperCase()}
                        </span>
                        <span style={{ color: "#94a3b8" }}>{log.time}</span>
                      </div>
                      <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all", color: "#f1f5f9" }}>
                        {typeof log.payload === "string" ? log.payload : JSON.stringify(log.payload, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
