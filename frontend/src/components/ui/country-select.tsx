import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Common countries with their codes and phone prefixes
const COUNTRIES = [
  { code: "BR", name: "Brasil", flag: "🇧🇷", prefix: "+55" },
  { code: "US", name: "Estados Unidos", flag: "🇺🇸", prefix: "+1" },
  { code: "AR", name: "Argentina", flag: "🇦🇷", prefix: "+54" },
  { code: "CL", name: "Chile", flag: "🇨🇱", prefix: "+56" },
  { code: "CO", name: "Colômbia", flag: "🇨🇴", prefix: "+57" },
  { code: "MX", name: "México", flag: "🇲🇽", prefix: "+52" },
  { code: "PT", name: "Portugal", flag: "🇵🇹", prefix: "+351" },
  { code: "ES", name: "Espanha", flag: "🇪🇸", prefix: "+34" },
  { code: "FR", name: "França", flag: "🇫🇷", prefix: "+33" },
  { code: "DE", name: "Alemanha", flag: "🇩🇪", prefix: "+49" },
  { code: "IT", name: "Itália", flag: "🇮🇹", prefix: "+39" },
  { code: "GB", name: "Reino Unido", flag: "🇬🇧", prefix: "+44" },
  { code: "CA", name: "Canadá", flag: "🇨🇦", prefix: "+1" },
  { code: "AU", name: "Austrália", flag: "🇦🇺", prefix: "+61" },
  { code: "JP", name: "Japão", flag: "🇯🇵", prefix: "+81" },
  { code: "CN", name: "China", flag: "🇨🇳", prefix: "+86" },
  { code: "IN", name: "Índia", flag: "🇮🇳", prefix: "+91" },
  { code: "RU", name: "Rússia", flag: "🇷🇺", prefix: "+7" },
  { code: "ZA", name: "África do Sul", flag: "🇿🇦", prefix: "+27" },
  { code: "UY", name: "Uruguai", flag: "🇺🇾", prefix: "+598" },
  { code: "PY", name: "Paraguai", flag: "🇵🇾", prefix: "+595" },
  { code: "BO", name: "Bolívia", flag: "🇧🇴", prefix: "+591" },
  { code: "PE", name: "Peru", flag: "🇵🇪", prefix: "+51" },
  { code: "EC", name: "Equador", flag: "🇪🇨", prefix: "+593" },
  { code: "VE", name: "Venezuela", flag: "🇻🇪", prefix: "+58" },
];

interface CountrySelectProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export function CountrySelect({ value, onValueChange, disabled }: CountrySelectProps) {
  const selectedCountry = COUNTRIES.find((c) => c.code === value) || COUNTRIES[0];

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className="w-[180px]">
        <SelectValue>
          <div className="flex items-center gap-2">
            <span>{selectedCountry.flag}</span>
            <span>{selectedCountry.prefix}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {COUNTRIES.map((country) => (
          <SelectItem key={country.code} value={country.code}>
            <div className="flex items-center gap-2">
              <span>{country.flag}</span>
              <span>{country.name}</span>
              <span className="text-muted-foreground ml-auto">{country.prefix}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function getCountryPrefix(countryCode: string): string {
  const country = COUNTRIES.find((c) => c.code === countryCode);
  return country?.prefix || "+55";
}
