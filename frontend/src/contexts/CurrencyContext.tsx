import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";

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

// Cache key for localStorage
const RATE_CACHE_KEY = "exchangeRate_BRL_USD";
const RATE_CACHE_TTL = 1000 * 60 * 60; // 1 hour

function getCachedRate(): number | null {
  try {
    const raw = localStorage.getItem(RATE_CACHE_KEY);
    if (!raw) return null;
    const { rate, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp < RATE_CACHE_TTL) return rate;
  } catch {
    /* ignore */
  }
  return null;
}

function setCachedRate(rate: number) {
  localStorage.setItem(
    RATE_CACHE_KEY,
    JSON.stringify({ rate, timestamp: Date.now() })
  );
}

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    const stored = localStorage.getItem("userCurrency");
    return stored === "USD" || stored === "BRL" ? stored : "BRL";
  });

  // Exchange rate: 1 BRL = ? USD
  const [brlToUsd, setBrlToUsd] = useState<number>(() => getCachedRate() ?? 0.18);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const cached = getCachedRate();
    if (cached) {
      setBrlToUsd(cached);
      return;
    }

    // Fetch live rate from free API
    fetch("https://open.er-api.com/v6/latest/BRL")
      .then((res) => res.json())
      .then((data) => {
        const rate = data?.rates?.USD;
        if (typeof rate === "number" && rate > 0) {
          setBrlToUsd(rate);
          setCachedRate(rate);
        }
      })
      .catch(() => {
        // Keep fallback rate
      });
  }, []);

  const setCurrency = useCallback((code: CurrencyCode) => {
    setCurrencyState(code);
    localStorage.setItem("userCurrency", code);
  }, []);

  const formatCurrency = useCallback(
    (value: number) => {
      const config = CURRENCY_CONFIG[currency];
      // All data from the API is in BRL — convert when displaying as USD
      const converted = currency === "USD" ? value * brlToUsd : value;
      return new Intl.NumberFormat(config.locale, {
        style: "currency",
        currency: config.currency,
      }).format(converted);
    },
    [currency, brlToUsd]
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
