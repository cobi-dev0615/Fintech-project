import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type CurrencyCode = "BRL" | "USD";

interface CurrencyContextType {
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
  formatCurrency: (value: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const CURRENCY_CONFIG: Record<CurrencyCode, { locale: string; currency: string }> = {
  BRL: { locale: "pt-BR", currency: "BRL" },
  USD: { locale: "en-US", currency: "USD" },
};

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    const stored = localStorage.getItem("userCurrency");
    return stored === "USD" || stored === "BRL" ? stored : "BRL";
  });

  const setCurrency = useCallback((code: CurrencyCode) => {
    setCurrencyState(code);
    localStorage.setItem("userCurrency", code);
  }, []);

  const formatCurrency = useCallback(
    (value: number) => {
      const config = CURRENCY_CONFIG[currency];
      return new Intl.NumberFormat(config.locale, {
        style: "currency",
        currency: config.currency,
      }).format(value);
    },
    [currency]
  );

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
};
