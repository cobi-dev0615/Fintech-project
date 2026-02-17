import { useState, useRef, useEffect } from "react";
import { Palette, Check } from "lucide-react";
import { useTheme, COLOR_THEMES } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

const COLOR_LABEL_KEYS: Record<string, string> = {
  blue: "colorBlue",
  green: "colorGreen",
  purple: "colorPurple",
  amber: "colorAmber",
};

const ThemeColorPicker = () => {
  const { colorTheme, setColorTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { t } = useTranslation("common");

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Panel */}
      {open && (
        <div
          ref={panelRef}
          className="absolute bottom-12 right-0 bg-card border border-border rounded-lg px-3 py-2.5 shadow-xl animate-fade-in"
          style={{ backdropFilter: "blur(12px)" }}
        >
          <p className="text-xs font-semibold text-foreground mb-2">{t("themeColor")}</p>
          <div className="flex gap-1.5 mb-1.5">
            {COLOR_THEMES.map((theme) => (
              <button
                key={theme.value}
                onClick={() => setColorTheme(theme.value)}
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 border-2",
                  colorTheme === theme.value
                    ? "border-foreground scale-110"
                    : "border-transparent hover:scale-105 hover:border-foreground/30"
                )}
                style={{ backgroundColor: theme.swatch }}
                title={t(COLOR_LABEL_KEYS[theme.value])}
              >
                {colorTheme === theme.value && (
                  <Check className="h-3 w-3 text-white drop-shadow-md" />
                )}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground text-center">
            {t(COLOR_LABEL_KEYS[colorTheme])}
          </p>
        </div>
      )}

      {/* Floating Button */}
      <button
        ref={buttonRef}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center shadow-lg transition-all duration-200",
          "bg-card border border-border hover:scale-110 hover:shadow-xl"
        )}
        title={t("themeColor")}
      >
        <Palette className="h-4 w-4 text-primary" />
      </button>
    </div>
  );
};

export default ThemeColorPicker;
