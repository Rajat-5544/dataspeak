"use client";

import { useState, useCallback } from "react";
import { Toast, ToastType } from "@/components/ui/toast";

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(
    (type: ToastType, title: string, description?: string, duration = 5000) => {
      const id = Math.random().toString(36).substring(7);
      const toast: Toast = {
        id,
        type,
        title,
        description,
        duration,
      };

      setToasts((prev) => [...prev, toast]);
      return id;
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const toast = {
    success: (title: string, description?: string) =>
      addToast("success", title, description),
    error: (title: string, description?: string) =>
      addToast("error", title, description),
    info: (title: string, description?: string) =>
      addToast("info", title, description),
    warning: (title: string, description?: string) =>
      addToast("warning", title, description),
  };

  return {
    toasts,
    toast,
    removeToast,
  };
}

