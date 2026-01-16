import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Building2, TrendingUp, Check, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const steps = [
  { id: 1, label: "Conectar Contas" },
  { id: 2, label: "Revisar" },
  { id: 3, label: "Finalizar" },
];

const Onboarding = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [connectedBanks, setConnectedBanks] = useState<string[]>([]);
  const [connectedB3, setConnectedB3] = useState(false);

  const handleConnectBank = (bankId: string) => {
    if (connectedBanks.includes(bankId)) {
      setConnectedBanks(connectedBanks.filter((b) => b !== bankId));
    } else {
      setConnectedBanks([...connectedBanks, bankId]);
    }
  };

  const banks = [
    { id: "itau", name: "Itaú", logo: "🏦" },
    { id: "bradesco", name: "Bradesco", logo: "🏛️" },
    { id: "nubank", name: "Nubank", logo: "💜" },
    { id: "inter", name: "Inter", logo: "🍊" },
    { id: "santander", name: "Santander", logo: "🔴" },
    { id: "bb", name: "Banco do Brasil", logo: "💛" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-xl">
        <div className="container flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <span className="font-semibold text-lg text-foreground">
              zurT
            </span>
          </Link>
          <Button variant="ghost" asChild>
            <Link to="/app/dashboard">Pular por enquanto</Link>
          </Button>
        </div>
      </header>

      <main className="container max-w-3xl py-12">
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-4 mb-12">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                    currentStep > step.id
                      ? "bg-primary text-primary-foreground"
                      : currentStep === step.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground border border-border"
                  )}
                >
                  {currentStep > step.id ? <Check className="h-4 w-4" /> : step.id}
                </div>
                <span
                  className={cn(
                    "text-sm font-medium hidden sm:inline",
                    currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "w-12 h-0.5",
                    currentStep > step.id ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        {currentStep === 1 && (
          <div className="space-y-8 animate-fade-in">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-foreground mb-3">
                Conecte suas contas
              </h1>
              <p className="text-muted-foreground max-w-lg mx-auto">
                Vincule suas contas bancárias e investimentos para ter uma visão completa de suas finanças.
              </p>
            </div>

            {/* Open Finance Section */}
            <div className="bg-card rounded-lg p-6 border border-border">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-1">
                    Contas Bancárias (Open Finance)
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Conecte com segurança suas contas bancárias através da rede oficial Open Finance do Brasil.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {banks.map((bank) => (
                  <button
                    key={bank.id}
                    onClick={() => handleConnectBank(bank.id)}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-lg border transition-all bg-muted",
                      connectedBanks.includes(bank.id)
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <span className="text-2xl">{bank.logo}</span>
                    <span className="text-sm font-medium text-foreground">{bank.name}</span>
                    {connectedBanks.includes(bank.id) && (
                      <Check className="h-4 w-4 text-primary ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* B3 Section */}
            <div className="bg-card rounded-lg p-6 border border-border">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-1">
                    Investimentos (B3)
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Importe suas ações, FIIs e BDRs diretamente da bolsa de valores brasileira.
                  </p>
                </div>
              </div>

              <Button
                variant={connectedB3 ? "default" : "outline"}
                onClick={() => setConnectedB3(!connectedB3)}
                className="w-full"
              >
                {connectedB3 ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    B3 Conectada
                  </>
                ) : (
                  "Conectar à B3"
                )}
              </Button>
            </div>

            <div className="flex justify-between">
              <Button variant="ghost" asChild>
                <Link to="/app/dashboard">
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Voltar
                </Link>
              </Button>
              <Button onClick={() => setCurrentStep(2)}>
                Continuar
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-8 animate-fade-in">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-foreground mb-3">
                Revise suas conexões
              </h1>
              <p className="text-muted-foreground max-w-lg mx-auto">
                Aqui está um resumo do que você conectou.
              </p>
            </div>

            <div className="bg-card rounded-lg p-6 border border-border space-y-4">
              <h3 className="font-semibold text-foreground">Contas Conectadas</h3>
              
              {connectedBanks.length > 0 ? (
                <div className="space-y-2">
                  {connectedBanks.map((bankId) => {
                    const bank = banks.find((b) => b.id === bankId);
                    return (
                      <div key={bankId} className="flex items-center gap-3 p-3 rounded-lg bg-muted border border-border">
                        <span className="text-xl">{bank?.logo}</span>
                        <span className="text-sm font-medium text-foreground">{bank?.name}</span>
                        <Check className="h-4 w-4 text-primary ml-auto" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma conta bancária conectada ainda.</p>
              )}

              {connectedB3 && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted border border-border">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium text-foreground">Investimentos B3</span>
                  <Check className="h-4 w-4 text-primary ml-auto" />
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setCurrentStep(1)}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
              <Button onClick={() => setCurrentStep(3)}>
                Continuar
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-8 animate-fade-in text-center">
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto border border-primary/30">
              <Check className="h-10 w-10 text-primary" />
            </div>
            
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-3">
                Tudo pronto!
              </h1>
              <p className="text-muted-foreground max-w-lg mx-auto">
                Suas contas estão sendo sincronizadas. Isso pode levar alguns minutos. 
                Vá para o seu dashboard para começar a explorar.
              </p>
            </div>

            <Button asChild size="xl" variant="default">
              <Link to="/app/dashboard">
                Ir para o Dashboard
                <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Onboarding;
