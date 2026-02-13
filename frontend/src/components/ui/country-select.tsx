import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

// Common countries with their codes, flags, and phone prefixes
export const COUNTRIES = [
  { code: "BR", flag: "\u{1F1E7}\u{1F1F7}", prefix: "+55" },
  { code: "US", flag: "\u{1F1FA}\u{1F1F8}", prefix: "+1" },
  { code: "AR", flag: "\u{1F1E6}\u{1F1F7}", prefix: "+54" },
  { code: "CL", flag: "\u{1F1E8}\u{1F1F1}", prefix: "+56" },
  { code: "CO", flag: "\u{1F1E8}\u{1F1F4}", prefix: "+57" },
  { code: "MX", flag: "\u{1F1F2}\u{1F1FD}", prefix: "+52" },
  { code: "PT", flag: "\u{1F1F5}\u{1F1F9}", prefix: "+351" },
  { code: "ES", flag: "\u{1F1EA}\u{1F1F8}", prefix: "+34" },
  { code: "FR", flag: "\u{1F1EB}\u{1F1F7}", prefix: "+33" },
  { code: "DE", flag: "\u{1F1E9}\u{1F1EA}", prefix: "+49" },
  { code: "IT", flag: "\u{1F1EE}\u{1F1F9}", prefix: "+39" },
  { code: "GB", flag: "\u{1F1EC}\u{1F1E7}", prefix: "+44" },
  { code: "CA", flag: "\u{1F1E8}\u{1F1E6}", prefix: "+1" },
  { code: "AU", flag: "\u{1F1E6}\u{1F1FA}", prefix: "+61" },
  { code: "JP", flag: "\u{1F1EF}\u{1F1F5}", prefix: "+81" },
  { code: "CN", flag: "\u{1F1E8}\u{1F1F3}", prefix: "+86" },
  { code: "IN", flag: "\u{1F1EE}\u{1F1F3}", prefix: "+91" },
  { code: "RU", flag: "\u{1F1F7}\u{1F1FA}", prefix: "+7" },
  { code: "ZA", flag: "\u{1F1FF}\u{1F1E6}", prefix: "+27" },
  { code: "UY", flag: "\u{1F1FA}\u{1F1FE}", prefix: "+598" },
  { code: "PY", flag: "\u{1F1F5}\u{1F1FE}", prefix: "+595" },
  { code: "BO", flag: "\u{1F1E7}\u{1F1F4}", prefix: "+591" },
  { code: "PE", flag: "\u{1F1F5}\u{1F1EA}", prefix: "+51" },
  { code: "EC", flag: "\u{1F1EA}\u{1F1E8}", prefix: "+593" },
  { code: "VE", flag: "\u{1F1FB}\u{1F1EA}", prefix: "+58" },
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
            <span>{selectedCountry.flag}</span>
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
                    <span className="mr-2">{country.flag}</span>
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
          className="h-full border-0 bg-transparent px-3 gap-1 rounded-none rounded-l-lg hover:bg-muted/30 transition-colors shrink-0 w-auto flex items-center cursor-pointer"
        >
          <span className="text-base leading-none">{selectedCountry.flag}</span>
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
                    <span className="text-base leading-none mr-2">{country.flag}</span>
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
