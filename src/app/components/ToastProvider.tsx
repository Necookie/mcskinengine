"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toast: {
    success: (msg: string) => void;
    error: (msg: string) => void;
    info: (msg: string) => void;
  };
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 6);
    setToasts((prev) => [...prev, { id, type, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: useCallback((msg: string) => addToast("success", msg), [addToast]),
    error: useCallback((msg: string) => addToast("error", msg), [addToast]),
    info: useCallback((msg: string) => addToast("info", msg), [addToast]),
  };

  return (
    <ToastContext.Provider value={{ toast, removeToast }}>
      {children}
      <div className="voxel-toast-container" aria-live="polite">
        {toasts.map((item) => (
          <div key={item.id} className={`voxel-toast voxel-toast-${item.type}`}>
            <div className="voxel-toast-icon">
              {item.type === "success" && <CheckCircle2 size={13} />}
              {item.type === "error" && <AlertTriangle size={13} />}
              {item.type === "info" && <Info size={13} />}
            </div>
            <span className="voxel-toast-message">{item.message}</span>
            <button
              type="button"
              onClick={() => removeToast(item.id)}
              className="voxel-toast-close"
              aria-label="Dismiss toast notification"
            >
              <X size={11} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType["toast"] {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Graceful fallback for components outside provider
    return {
      success: (msg: string) => console.log("[Toast Success]", msg),
      error: (msg: string) => console.error("[Toast Error]", msg),
      info: (msg: string) => console.log("[Toast Info]", msg),
    };
  }
  return ctx.toast;
}
