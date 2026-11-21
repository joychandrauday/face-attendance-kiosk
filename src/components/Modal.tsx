"use client";

import React, { useEffect, useState } from "react";
import { KioskTheme } from "../types.js";

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
  countdownSeconds?: number;
  theme?: KioskTheme;
  loading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  danger = false,
  countdownSeconds,
  theme = "dark",
  loading = false,
}) => {
  const [remaining, setRemaining] = useState<number | undefined>(countdownSeconds);

  useEffect(() => {
    if (!isOpen) {
      setRemaining(countdownSeconds);
      return;
    }
    if (countdownSeconds == null || countdownSeconds <= 0) return;

    setRemaining(countdownSeconds);
    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev == null || prev <= 1) {
          clearInterval(interval);
          onCancel();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, countdownSeconds, onCancel]);

  if (!isOpen) return null;

  const isLight = theme === "light";
  const bg = isLight ? "#ffffff" : "#0f172a";
  const border = isLight ? "#e2e8f0" : "#1e293b";
  const textPrimary = isLight ? "#0f172a" : "#f8fafc";
  const textMuted = isLight ? "#64748b" : "#94a3b8";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.72)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
        padding: "16px",
        boxSizing: "border-box",
        animation: "sureclockFadeIn 0.15s ease-out",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onCancel();
      }}
    >
      <div
        style={{
          backgroundColor: bg,
          border: `1px solid ${border}`,
          borderRadius: "14px",
          width: "100%",
          maxWidth: "440px",
          padding: "24px",
          color: textPrimary,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.6)",
          boxSizing: "border-box",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
          <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, letterSpacing: "-0.01em" }}>
            {title}
          </h3>
          {remaining != null && remaining > 0 && (
            <span
              style={{
                fontSize: "0.72rem",
                padding: "2px 8px",
                borderRadius: "12px",
                backgroundColor: isLight ? "#f1f5f9" : "#1e293b",
                color: textMuted,
                fontFamily: "monospace",
              }}
            >
              Auto-dismiss: {remaining}s
            </span>
          )}
        </div>

        <div style={{ fontSize: "0.88rem", color: textMuted, lineHeight: 1.5, marginBottom: "22px" }}>
          {message}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: "9px 16px",
              borderRadius: "8px",
              border: `1px solid ${border}`,
              backgroundColor: "transparent",
              color: textMuted,
              fontSize: "0.84rem",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: "9px 18px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: danger ? "#ef4444" : "#0ea5e9",
              color: "#ffffff",
              fontSize: "0.84rem",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: danger
                ? "0 4px 12px rgba(239, 68, 68, 0.3)"
                : "0 4px 12px rgba(14, 165, 233, 0.3)",
              transition: "all 0.15s ease",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {loading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export interface ToastProps {
  message: string;
  type?: "success" | "error" | "info" | "warning";
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = "info", onClose }) => {
  const colors = {
    success: { bg: "#064e3b", border: "#10b981", text: "#6ee7b7" },
    error: { bg: "#450a0a", border: "#ef4444", text: "#fca5a5" },
    warning: { bg: "#451a03", border: "#f59e0b", text: "#fcd34d" },
    info: { bg: "#0c2847", border: "#0284c7", text: "#7dd3fc" },
  };

  const c = colors[type];

  return (
    <div
      style={{
        backgroundColor: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: "8px",
        padding: "10px 16px",
        color: c.text,
        fontSize: "0.84rem",
        fontWeight: 600,
        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <span>{message}</span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: c.text,
            cursor: "pointer",
            padding: 0,
            fontSize: "1rem",
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
};
