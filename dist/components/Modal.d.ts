import React from "react";
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
export declare const ConfirmModal: React.FC<ConfirmModalProps>;
export interface ToastProps {
    message: string;
    type?: "success" | "error" | "info" | "warning";
    onClose?: () => void;
}
export declare const Toast: React.FC<ToastProps>;
