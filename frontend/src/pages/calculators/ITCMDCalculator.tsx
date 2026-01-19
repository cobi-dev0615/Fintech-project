import { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { Coins, Calculator, Info, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ChartCard from "@/components/dashboard/ChartCard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const ITCMDCalculator = () => {
  const [propertyValue, setPropertyValue] = useState("");
  const [state, setState] = useState("SP");
  const [transactionType, setTransactionType] = useState<"inheritance" | "donation">("inheritance");
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();

  // ITCMD rates by state (simplified - rates vary by value brackets)
  const stateRates: Record<string, { inheritance: number; donation: number }> = {
    SP: { inheritance: 4, donation: 4 },
    RJ: { inheritance: 4, donation: 4 },
    MG: { inheritance: 4, donation: 4 },
    RS: { inheritance: 5, donation: 5 },
    PR: { inheritance: 4, donation: 4 },
    SC: { inheritance: 4, donation: 4 },
    BA: { inheritance: 4, donation: 4 },
    GO: { inheritance: 4, donation: 4 },
    PE: { inheritance: 4, donation: 4 },
    CE: { inheritance: 4, donation: 4 },
  };

  const calculate = () => {
    const value = parseFloat(propertyValue) || 0;

    if (value <= 0) {
      toast({
        title: "Erro",
        description: "Por favor, informe o valor do bem.",
        variant: "destructive",
      });
      return;
    }

    const rate = stateRates[state]?.[transactionType] || 4;
    const tax = (value * rate) / 100;

    setResults({
      propertyValue: value,
      state,
      transactionType,
      rate,
      tax,
    });
  };

  const location = useLocation();
  const isConsultantRoute = location.pathname.startsWith('/consultant');
  const backPath = isConsultantRoute ? '/consultant/calculators' : '/app/calculators';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to={backPath}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Calculadora ITCMD</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Calcule o Imposto de Transmissão Causa Mortis e Doação
            </p>
          </div>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          ITCMD (Imposto de Transmissão Causa Mortis e Doação) é um imposto estadual cobrado sobre
          heranças e doações. As alíquotas variam por estado e podem ter faixas de valor.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Parâmetros">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="value">Valor do Bem (R$)</Label>
              <Input
                id="value"
                type="number"
                placeholder="500000"
                value={propertyValue}
                onChange={(e) => setPropertyValue(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tipo de Transmissão</Label>
              <Select
                value={transactionType}
                onValueChange={(v: any) => setTransactionType(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inheritance">Causa Mortis (Herança)</SelectItem>
                  <SelectItem value="donation">Doação</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">Estado</Label>
              <Select value={state} onValueChange={setState}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(stateRates).map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={calculate} className="w-full" size="lg">
              <Calculator className="h-4 w-4 mr-2" />
              Calcular
            </Button>
          </div>
        </ChartCard>

        <ChartCard title="Resultados">
          {results ? (
            <div className="space-y-6">
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <div className="text-sm text-muted-foreground mb-1">Imposto ITCMD</div>
                <div className="text-3xl font-bold text-primary">
                  R$ {results.tax.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Alíquota: {results.rate}%
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted">
                <div className="text-xs text-muted-foreground">Valor do Bem</div>
                <div className="text-lg font-semibold">
                  R$ {results.propertyValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted">
                <div className="text-xs text-muted-foreground">Estado</div>
                <div className="text-lg font-semibold">{results.state}</div>
              </div>

              <div className="p-3 rounded-lg bg-muted">
                <div className="text-xs text-muted-foreground">Tipo</div>
                <div className="text-lg font-semibold">
                  {results.transactionType === "inheritance" ? "Herança" : "Doação"}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Coins className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Preencha os campos e clique em "Calcular" para ver os resultados</p>
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
};

export default ITCMDCalculator;

