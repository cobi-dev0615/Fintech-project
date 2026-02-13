import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

/** Renders a country flag as an <img> from flagcdn.com (works on all platforms) */
function CountryFlag({ code, className }: { code: string; className?: string }) {
  return (
    <img
      src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
      srcSet={`https://flagcdn.com/w80/${code.toLowerCase()}.png 2x`}
      alt={code}
      className={cn("inline-block rounded-sm object-cover", className)}
      width={20}
      height={15}
      loading="lazy"
    />
  );
}

// Common countries with their codes and phone prefixes
export const COUNTRIES = [
  { code: "BR", prefix: "+55" },
  { code: "US", prefix: "+1" },
  { code: "AR", prefix: "+54" },
  { code: "CL", prefix: "+56" },
  { code: "CO", prefix: "+57" },
  { code: "MX", prefix: "+52" },
  { code: "PT", prefix: "+351" },
  { code: "ES", prefix: "+34" },
  { code: "FR", prefix: "+33" },
  { code: "DE", prefix: "+49" },
  { code: "IT", prefix: "+39" },
  { code: "GB", prefix: "+44" },
  { code: "CA", prefix: "+1" },
  { code: "AU", prefix: "+61" },
  { code: "JP", prefix: "+81" },
  { code: "CN", prefix: "+86" },
  { code: "IN", prefix: "+91" },
  { code: "RU", prefix: "+7" },
  { code: "ZA", prefix: "+27" },
  { code: "UY", prefix: "+598" },
  { code: "PY", prefix: "+595" },
  { code: "BO", prefix: "+591" },
  { code: "PE", prefix: "+51" },
  { code: "EC", prefix: "+593" },
  { code: "VE", prefix: "+58" },
];

interface CountrySelectProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export function CountrySelect({ value, onValueChange, disabled }: CountrySelectProps) {
  const [open, setOpen] = useState(false);
  const selectedCountry = COUNTRIES.find((c) => c.code === value) || COUNTRIES[0];
  const { t } = useTranslation(['settings', 'common']);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          className="flex h-10 w-[180px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          <div className="flex items-center gap-2">
            <CountryFlag code={selectedCountry.code} />
            <span>{selectedCountry.prefix}</span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0" align="start">
        <Command>
          <CommandInput placeholder={t('common:search')} />
          <CommandList>
            <CommandEmpty>{t('settings:countries.noResults', 'No country found')}</CommandEmpty>
            <CommandGroup>
              {COUNTRIES.map((country) => {
                const name = t(`settings:countries.${country.code}`);
                return (
                  <CommandItem
                    key={country.code}
                    value={`${name} ${country.prefix} ${country.code}`}
                    onSelect={() => {
                      onValueChange(country.code);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", value === country.code ? "opacity-100" : "opacity-0")} />
                    <CountryFlag code={country.code} className="mr-2" />
                    <span className="flex-1">{name}</span>
                    <span className="text-muted-foreground ml-auto">{country.prefix}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function getCountryPrefix(countryCode: string): string {
  const country = COUNTRIES.find((c) => c.code === countryCode);
  return country?.prefix || "+55";
}

export function getCountryByCode(code: string) {
  return COUNTRIES.find((c) => c.code === code) || COUNTRIES[0];
}

/** Compact inline country selector for use inside phone input fields */
interface PhoneCountrySelectProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export function PhoneCountrySelect({ value, onValueChange, disabled }: PhoneCountrySelectProps) {
  const [open, setOpen] = useState(false);
  const selectedCountry = COUNTRIES.find((c) => c.code === value) || COUNTRIES[0];
  const { t } = useTranslation(['settings', 'common']);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          className="h-full border-0 bg-transparent px-3 gap-1.5 rounded-none rounded-l-lg hover:bg-muted/30 transition-colors shrink-0 w-auto flex items-center cursor-pointer"
        >
          <CountryFlag code={selectedCountry.code} />
          <span className="text-xs text-muted-foreground font-medium">{selectedCountry.prefix}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0" align="start" sideOffset={8}>
        <Command>
          <CommandInput placeholder={t('common:search')} />
          <CommandList className="max-h-[240px]">
            <CommandEmpty>{t('settings:countries.noResults', 'No country found')}</CommandEmpty>
            <CommandGroup>
              {COUNTRIES.map((country) => {
                const name = t(`settings:countries.${country.code}`);
                return (
                  <CommandItem
                    key={country.code}
                    value={`${name} ${country.prefix} ${country.code}`}
                    onSelect={() => {
                      onValueChange(country.code);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4 shrink-0", value === country.code ? "opacity-100" : "opacity-0")} />
                    <CountryFlag code={country.code} className="mr-2" />
                    <span className="text-sm flex-1">{name}</span>
                    <span className="text-xs text-muted-foreground ml-1">{country.prefix}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
