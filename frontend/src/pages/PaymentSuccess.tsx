import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    // Clear stored plan info after successful payment
    localStorage.removeItem('lastSelectedPlanId');
    localStorage.removeItem('lastBillingPeriod');
    
    // Show success message
    toast({
      title: "Pagamento Aprovado!",
      description: "Seu pagamento foi processado com sucesso.",
      variant: "default",
    });
  }, [toast]);

  const handleGoToDashboard = () => {
    const basePath = location.pathname.startsWith('/consultant') ? '/consultant' : '/app';
    navigate(`${basePath}/dashboard`);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
          <CardTitle className="text-2xl">Pagamento Aprovado!</CardTitle>
          <CardDescription>
            Seu pagamento foi processado com sucesso. Sua assinatura está ativa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-4 text-sm">
            <p className="text-muted-foreground">
              Você receberá um e-mail de confirmação em breve. Obrigado pela sua compra!
            </p>
          </div>
          <Button onClick={handleGoToDashboard} className="w-full">
            Ir para o Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
