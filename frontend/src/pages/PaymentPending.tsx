import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const PaymentPending = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation(['payment', 'common']);

  useEffect(() => {
    // Show pending message
    toast({
      title: t('pending.toastTitle'),
      description: t('pending.toastDesc'),
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
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-warning/10">
            <Clock className="h-8 w-8 text-warning" />
          </div>
          <CardTitle className="text-2xl">{t('pending.title')}</CardTitle>
          <CardDescription>
            {t('pending.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-4 text-sm">
            <p className="text-muted-foreground">
              {t('pending.emailNotification')}
            </p>
          </div>
          <Button onClick={handleGoToDashboard} className="w-full">
            {t('pending.goToDashboard')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentPending;
