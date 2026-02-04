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

/** Format number as Brazilian currency (e.g. R$ 15.000,00) */
export function formatCurrencyBR(value: number): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Parse Brazilian currency string to number (accepts "R$ 15.000,00", "15000", "15.000,50", etc.) */
export function parseCurrencyBR(str: string): number {
  if (typeof str !== "string" || str.trim() === "") return 0;
  const cleaned = str
    .replace(/\s/g, "")
    .replace(/R\$/gi, "")
    .replace(/\./g, "")
    .replace(",", ".");
  return parseFloat(cleaned) || 0;
}
