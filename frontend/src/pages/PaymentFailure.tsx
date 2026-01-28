import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { XCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const PaymentFailure = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Show error message
    const status = searchParams.get("status");
    const statusDetail = searchParams.get("status_detail");
    
    let errorMessage = "O pagamento não pôde ser processado.";
    if (statusDetail) {
      errorMessage = `Erro: ${statusDetail}`;
    } else if (status) {
      errorMessage = `Status: ${status}`;
    }

    toast({
      title: "Pagamento Falhou",
      description: errorMessage,
      variant: "destructive",
    });
  }, [toast, searchParams]);

  // Separate effect for countdown
  useEffect(() => {
    if (countdown <= 0) {
      // Defer navigation to avoid calling during render
      const timeoutId = setTimeout(() => {
        // Redirect to payment page
        const referrer = document.referrer;
        let basePath = '/app';
        
        if (referrer.includes('/consultant')) {
          basePath = '/consultant';
        } else if (referrer.includes('/app')) {
          basePath = '/app';
        }
        
        // Try to get planId from URL params or localStorage
        const preferenceId = searchParams.get("preference_id");
        const planId = searchParams.get("planId") || localStorage.getItem('lastSelectedPlanId');
        const billingPeriod = searchParams.get("billingPeriod") || localStorage.getItem('lastBillingPeriod') || 'monthly';
        
        if (planId) {
          // Redirect to payment page with planId
          navigate(`${basePath}/payment`, { 
            state: { 
              planId, 
              billingPeriod: billingPeriod as 'monthly' | 'annual' 
            } 
          });
        } else {
          // If no planId, redirect to plans page
          navigate(`${basePath}/plans`);
        }
      }, 0);
      
      return () => clearTimeout(timeoutId);
    }
  }, [countdown, navigate, searchParams]);

  // Separate effect for countdown timer
  useEffect(() => {
    if (countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  const handleRetryPayment = () => {
    // Redirect to payment page to try again
    // Try to determine base path from referrer or default to /app
    const referrer = document.referrer;
    let basePath = '/app';
    
    if (referrer.includes('/consultant')) {
      basePath = '/consultant';
    } else if (referrer.includes('/app')) {
      basePath = '/app';
    }
    
    // Try to get planId from URL params or localStorage
    const preferenceId = searchParams.get("preference_id");
    const planId = searchParams.get("planId") || localStorage.getItem('lastSelectedPlanId');
    const billingPeriod = searchParams.get("billingPeriod") || localStorage.getItem('lastBillingPeriod') || 'monthly';
    
    if (planId) {
      // Redirect to payment page with planId
      navigate(`${basePath}/payment`, { 
        state: { 
          planId, 
          billingPeriod: billingPeriod as 'monthly' | 'annual' 
        } 
      });
    } else {
      // If no planId, redirect to plans page
      navigate(`${basePath}/plans`);
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <XCircle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Pagamento Não Aprovado</CardTitle>
          <CardDescription>
            Não foi possível processar seu pagamento. Por favor, tente novamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-destructive/10 p-4 text-sm">
            <p className="text-destructive">
              {searchParams.get("status_detail") || 
               searchParams.get("status") || 
               "O pagamento foi recusado ou cancelado."}
            </p>
          </div>
          {countdown > 0 && (
            <div className="text-center text-sm text-muted-foreground">
              Redirecionando para a página de pagamento em {countdown} segundo{countdown !== 1 ? 's' : ''}...
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Button onClick={handleRetryPayment} className="w-full">
              Tentar Novamente Agora
            </Button>
            <Button onClick={handleGoBack} variant="outline" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentFailure;
