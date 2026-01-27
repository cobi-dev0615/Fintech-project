import { useState, useEffect } from "react";
import { CreditCard, Lock, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { publicApi, subscriptionsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface Plan {
  id: string;
  code: string;
  name: string;
  priceCents: number;
}

interface PaymentFormData {
  billingName: string;
  billingEmail: string;
  billingPhone: string;
  billingDocument: string;
  billingZipCode: string;
  billingAddress: string;
  billingCity: string;
  billingState: string;
}

const Payment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [formData, setFormData] = useState<PaymentFormData>({
    billingName: user?.full_name || '',
    billingEmail: user?.email || '',
    billingPhone: '',
    billingDocument: '',
    billingZipCode: '',
    billingAddress: '',
    billingCity: '',
    billingState: '',
  });

  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');

  useEffect(() => {
    const planId = location.state?.planId || new URLSearchParams(location.search).get('planId');
    const billing = location.state?.billingPeriod || 'monthly';
    setBillingPeriod(billing);
    
    if (!planId) {
      toast({
        title: "Erro",
        description: "Plano não selecionado. Redirecionando...",
        variant: "destructive",
      });
      setTimeout(() => {
        const basePath = location.pathname.startsWith('/consultant') ? '/consultant' : '/app';
        navigate(`${basePath}/plans`);
      }, 2000);
      return;
    }

    fetchPlan(planId, billing);
  }, [location]);

  const fetchPlan = async (planId: string, billing: 'monthly' | 'annual' = 'monthly') => {
    try {
      setLoading(true);
      const userRole = user?.role || (location.pathname.startsWith('/consultant') ? 'consultant' : 'customer');
      const response = await publicApi.getPlans(userRole as 'customer' | 'consultant', billing);
      const foundPlan = response.plans.find(p => p.id === planId);
      
      if (!foundPlan) {
        toast({
          title: "Erro",
          description: "Plano não encontrado",
          variant: "destructive",
        });
        const basePath = location.pathname.startsWith('/consultant') ? '/consultant' : '/app';
        navigate(`${basePath}/plans`);
        return;
      }

      setPlan({
        id: foundPlan.id,
        code: foundPlan.code,
        name: foundPlan.name,
        priceCents: foundPlan.priceCents,
      });
    } catch (error: any) {
      console.error('Failed to fetch plan:', error);
      toast({
        title: "Erro",
        description: error?.error || 'Falha ao carregar plano',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const match = cleaned.match(/.{1,4}/g);
    return match ? match.join(' ') : cleaned;
  };

  const formatExpiryDate = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
    }
    return cleaned;
  };

  const formatDocument = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 11) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else {
      return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
  };

  const formatZipCode = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    return cleaned.replace(/(\d{5})(\d{3})/, '$1-$2');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!plan) return;

    // Validate billing information (card validation removed - Mercado Pago handles payment method)

    try {
      setProcessing(true);

      // Create subscription with Mercado Pago
      const response = await subscriptionsApi.createSubscription(plan.id, {
        paymentMethod: 'mercadopago',
        billing: {
          name: formData.billingName,
          email: formData.billingEmail,
          phone: formData.billingPhone,
          document: formData.billingDocument.replace(/\D/g, ''),
          zipCode: formData.billingZipCode.replace(/\D/g, ''),
          address: formData.billingAddress,
          city: formData.billingCity,
          state: formData.billingState,
        },
      }, billingPeriod);

      // If Mercado Pago checkout URL is provided, redirect to it
      if (response.payment?.checkoutUrl) {
        toast({
          title: "Redirecionando...",
          description: "Você será redirecionado para o Mercado Pago para finalizar o pagamento.",
          variant: "default",
        });
        
        // Redirect to Mercado Pago checkout
        window.location.href = response.payment.checkoutUrl;
        return;
      }

      // If no checkout URL (free plan or error), show success
      toast({
        title: "Sucesso!",
        description: `Plano ${response.subscription.plan.name} ativado com sucesso!`,
        variant: "default",
      });

      setTimeout(() => {
        const basePath = location.pathname.startsWith('/consultant') ? '/consultant' : '/app';
        navigate(`${basePath}/dashboard`);
      }, 1500);
    } catch (error: any) {
      console.error('Failed to process payment:', error);
      toast({
        title: "Erro",
        description: error?.error || 'Falha ao processar pagamento',
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const formatPrice = (cents: number) => {
    if (cents === 0) return 'Grátis';
    const reais = cents / 100;
    return `R$ ${reais.toFixed(2).replace('.', ',')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Plano não encontrado</CardTitle>
            <CardDescription>O plano selecionado não foi encontrado.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to={location.pathname.startsWith('/consultant') ? '/consultant/plans' : '/app/plans'}>
                Voltar para Planos
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const basePath = location.pathname.startsWith('/consultant') ? '/consultant' : '/app';

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Button
        variant="ghost"
        onClick={() => navigate(`${basePath}/plans`)}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Payment Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Informações de Pagamento - Mercado Pago
              </CardTitle>
              <CardDescription>
                Você será redirecionado para o Mercado Pago para finalizar o pagamento de forma segura
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Payment Method */}
                <div className="space-y-2">
                  <Label>Método de Pagamento</Label>
                  <div className="flex items-center gap-2 p-4 border rounded-lg bg-muted/50">
                    <Lock className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-semibold">Mercado Pago</p>
                      <p className="text-sm text-muted-foreground">Pagamento seguro - Cartão, PIX, Boleto e mais</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Você será redirecionado para o Mercado Pago onde poderá escolher a forma de pagamento desejada.
                  </p>
                </div>

                <Separator />

                {/* Billing Information */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Dados de Cobrança</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="billingName">Nome Completo *</Label>
                    <Input
                      id="billingName"
                      value={formData.billingName}
                      onChange={(e) => setFormData({ ...formData, billingName: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="billingEmail">E-mail *</Label>
                      <Input
                        id="billingEmail"
                        type="email"
                        value={formData.billingEmail}
                        onChange={(e) => setFormData({ ...formData, billingEmail: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="billingPhone">Telefone *</Label>
                      <Input
                        id="billingPhone"
                        placeholder="(00) 00000-0000"
                        value={formData.billingPhone}
                        onChange={(e) => {
                          const cleaned = e.target.value.replace(/\D/g, '');
                          const formatted = cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
                          setFormData({ ...formData, billingPhone: formatted });
                        }}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="billingDocument">CPF/CNPJ *</Label>
                    <Input
                      id="billingDocument"
                      placeholder="000.000.000-00"
                      value={formData.billingDocument}
                      onChange={(e) => {
                        const formatted = formatDocument(e.target.value);
                        setFormData({ ...formData, billingDocument: formatted });
                      }}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="billingZipCode">CEP *</Label>
                    <Input
                      id="billingZipCode"
                      placeholder="00000-000"
                      maxLength={9}
                      value={formData.billingZipCode}
                      onChange={(e) => {
                        const formatted = formatZipCode(e.target.value);
                        setFormData({ ...formData, billingZipCode: formatted });
                      }}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="billingAddress">Endereço *</Label>
                    <Input
                      id="billingAddress"
                      placeholder="Rua, número, complemento"
                      value={formData.billingAddress}
                      onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="billingCity">Cidade *</Label>
                      <Input
                        id="billingCity"
                        value={formData.billingCity}
                        onChange={(e) => setFormData({ ...formData, billingCity: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="billingState">Estado *</Label>
                      <Input
                        id="billingState"
                        placeholder="SP"
                        maxLength={2}
                        value={formData.billingState}
                        onChange={(e) => setFormData({ ...formData, billingState: e.target.value.toUpperCase() })}
                        required
                      />
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={processing}
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processando pagamento...
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      Finalizar Pagamento
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Resumo do Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Plano</p>
                <p className="font-semibold">{plan.name}</p>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(plan.priceCents)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Taxa</span>
                  <span>R$ 0,00</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{formatPrice(plan.priceCents)}</span>
                </div>
              </div>

              <div className="pt-4 space-y-2 text-xs text-muted-foreground">
                <div className="flex items-start gap-2">
                  <Lock className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <p>Seus dados estão protegidos com criptografia SSL</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <p>Cancelamento a qualquer momento</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Payment;
