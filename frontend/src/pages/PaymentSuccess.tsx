import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { t } = useTranslation(['payment', 'common']);

  useEffect(() => {
    // Clear stored plan info after successful payment
    localStorage.removeItem('lastSelectedPlanId');
    localStorage.removeItem('lastBillingPeriod');

    // Show success message
    toast({
      title: t('approved.toastTitle'),
      description: t('approved.toastDesc'),
      variant: "default",
    });
  }, [toast, t]);

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
          <CardTitle className="text-2xl">{t('approved.title')}</CardTitle>
          <CardDescription>
            {t('approved.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-4 text-sm">
            <p className="text-muted-foreground">
              {t('approved.emailConfirmation')}
            </p>
          </div>
          <Button onClick={handleGoToDashboard} className="w-full">
            {t('approved.goToDashboard')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
