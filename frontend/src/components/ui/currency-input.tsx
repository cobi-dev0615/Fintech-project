import * as React from "react";
import { Input } from "@/components/ui/input";
import { formatCurrencyBR, parseCurrencyBR } from "@/lib/utils";
import { cn } from "@/lib/utils";

export interface CurrencyInputProps
  extends Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type"> {
  value: number | "";
  onChange: (value: number | "") => void;
  /** If true, display without "R$ " prefix (e.g. "15.000,00") */
  hidePrefix?: boolean;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, hidePrefix, className, ...props }, ref) => {
    const [focused, setFocused] = React.useState(false);
    const displayValue =
      value === "" || (typeof value === "number" && isNaN(value))
        ? ""
        : hidePrefix
          ? formatCurrencyBR(Number(value))
          : `R$ ${formatCurrencyBR(Number(value))}`;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const cleaned = raw.replace(/\s/g, "").replace(/R\$/gi, "").trim();
      if (cleaned === "" || cleaned === ",") {
        onChange("");
        return;
      }
      const num = parseCurrencyBR(raw);
      onChange(num);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(false);
      props.onBlur?.(e);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(true);
      props.onFocus?.(e);
    };

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        className={cn(className)}
        value={focused ? (value === "" ? "" : String(value)) : displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={props.placeholder ?? "0,00"}
        {...props}
      />
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
