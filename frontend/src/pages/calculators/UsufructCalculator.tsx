import { useState } from "react";
import { Home, Calculator, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const UsufructCalculator = () => {
  const { t } = useTranslation(['calculators', 'common']);
  const [propertyValue, setPropertyValue] = useState<number | "">("");
  const [usufructAge, setUsufructAge] = useState("");
  const [usufructType, setUsufructType] = useState<"temporary" | "lifelong">("lifelong");
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();

  const calculate = () => {
    const value = typeof propertyValue === "number" ? propertyValue : 0;
    const age = parseFloat(usufructAge) || 0;

    if (value <= 0 || age <= 0) {
      toast({
        title: t('common:error'),
        description: t('calculators:usufruct.validationError'),
        variant: "destructive",
      });
      return;
    }

    let usufructPercentage = 0;
    let usufructValue = 0;
    let bareOwnershipValue = 0;

    if (usufructType === "lifelong") {
      // Tabela de usufruto vitalício (baseada na legislação brasileira)
      if (age <= 20) usufructPercentage = 32;
      else if (age <= 30) usufructPercentage = 31;
      else if (age <= 40) usufructPercentage = 30;
      else if (age <= 43) usufructPercentage = 29;
      else if (age <= 46) usufructPercentage = 28;
      else if (age <= 49) usufructPercentage = 27;
      else if (age <= 52) usufructPercentage = 26;
      else if (age <= 55) usufructPercentage = 25;
      else if (age <= 58) usufructPercentage = 24;
      else if (age <= 61) usufructPercentage = 23;
      else if (age <= 64) usufructPercentage = 22;
      else if (age <= 67) usufructPercentage = 21;
      else if (age <= 70) usufructPercentage = 20;
      else if (age <= 73) usufructPercentage = 19;
      else if (age <= 76) usufructPercentage = 18;
      else if (age <= 79) usufructPercentage = 17;
      else if (age <= 82) usufructPercentage = 16;
      else if (age <= 85) usufructPercentage = 15;
      else if (age <= 88) usufructPercentage = 14;
      else if (age <= 91) usufructPercentage = 13;
      else usufructPercentage = 12;
    } else {
      // Usufruto temporário - simplificado (2% ao ano, máximo 30%)
      const years = Math.min(age, 15);
      usufructPercentage = Math.min(years * 2, 30);
    }

    usufructValue = (value * usufructPercentage) / 100;
    bareOwnershipValue = value - usufructValue;

    setResults({
      propertyValue: value,
      usufructPercentage,
      usufructValue,
      bareOwnershipValue,
      usufructType,
    });
  };

  return (
    <div className="space-y-6 min-w-0">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Calculadora de Usufruto</h1>
        <p className="text-sm text-muted-foreground mt-0.5 sm:mt-1">
          Calcule o valor do usufruto e da nua propriedade em doações e heranças
        </p>
      </div>

      <Alert className="rounded-xl border border-primary/30 bg-primary/5">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          O usufruto é o direito de usar e gozar de um bem pertencente a outra pessoa. A nua propriedade
          é o direito de propriedade sem o direito de uso. Este cálculo segue a tabela do IBGE para usufruto vitalício.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={cn("rounded-xl border-2 border-blue-500/70 bg-card p-5 shadow-sm hover:shadow-md hover:shadow-blue-500/5 transition-shadow min-w-0")}>
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Parâmetros</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Valor do imóvel e tipo de usufruto</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="value">Valor do Imóvel (R$)</Label>
              <CurrencyInput id="value" value={propertyValue} onChange={setPropertyValue} placeholder="500.000,00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Tipo de Usufruto</Label>
              <Select value={usufructType} onValueChange={(v: any) => setUsufructType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lifelong">Vitalício</SelectItem>
                  <SelectItem value="temporary">Temporário</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="age">
                {usufructType === "lifelong" ? "Idade do Usufrutuário" : "Anos de Duração"}
              </Label>
              <Input
                id="age"
                type="number"
                placeholder={usufructType === "lifelong" ? "65" : "10"}
                value={usufructAge}
                onChange={(e) => setUsufructAge(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {usufructType === "lifelong" ? "Idade na data do cálculo" : "Duração em anos (máx. 30%)"}
              </p>
            </div>
            <Button onClick={calculate} className="w-full" size="lg">
              <Calculator className="h-4 w-4 mr-2" />
              Calcular
            </Button>
          </div>
        </div>

        <div className={cn("rounded-xl border-2 border-emerald-500/70 bg-card p-5 shadow-sm hover:shadow-md hover:shadow-emerald-500/5 transition-shadow min-h-[280px] flex flex-col min-w-0")}>
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
              <Home className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Resultados</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Usufruto e nua propriedade</p>
            </div>
          </div>
          {results ? (
            <div className="space-y-6">
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <div className="text-sm text-muted-foreground mb-1">Valor do Usufruto</div>
                <div className="text-3xl font-bold text-primary">
                  R$ {results.usufructValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  {results.usufructPercentage}% do valor do imóvel
                </div>
              </div>

              <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                <div className="text-sm text-muted-foreground mb-1">Nua Propriedade</div>
                <div className="text-3xl font-bold text-success">
                  R$ {results.bareOwnershipValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  {100 - results.usufructPercentage}% do valor do imóvel
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted">
                <div className="text-xs text-muted-foreground">Valor Total do Imóvel</div>
                <div className="text-lg font-semibold">
                  R$ {results.propertyValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center py-8 text-center rounded-lg border border-dashed border-border bg-muted/20 min-h-[140px]">
              <Home className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium text-foreground">Nenhum resultado ainda</p>
              <p className="text-xs text-muted-foreground mt-1">Preencha os parâmetros e clique em &quot;Calcular&quot;</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UsufructCalculator;

