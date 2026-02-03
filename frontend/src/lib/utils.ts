import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Use destructive (red) only for backend 400/500; use warning for other errors. */
export function getToastVariantForApiError(err: unknown): "destructive" | "warning" {
  const status = (err as { statusCode?: number; response?: { status?: number } })?.statusCode
    ?? (err as { response?: { status?: number } })?.response?.status;
  if (typeof status === "number" && (status === 400 || status >= 500)) return "destructive";
  return "warning";
}
