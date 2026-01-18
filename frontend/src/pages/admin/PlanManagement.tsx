import { useState, useEffect } from "react";
import { CreditCard, Save, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ChartCard from "@/components/dashboard/ChartCard";
import { adminApi } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Plan {
  id?: string;
  code: string;
  name: string;
  price: number;
  features: string[];
  connectionLimit?: number | null;
  isActive?: boolean;
}

const PlanManagement = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [newFeature, setNewFeature] = useState("");

  // Load plans on mount
  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const settings = await adminApi.getSettings();
      setPlans(
        settings.plans.map((p) => ({
          id: p.id,
          code: p.code,
          name: p.name,
          price: p.priceCents / 100,
          features: p.features || [],
          connectionLimit: p.connectionLimit,
          isActive: p.isActive,
        }))
      );
    } catch (error: any) {
      console.error('Failed to fetch plans:', error);
      // Fallback to default plans if API fails
      setPlans([
        { id: "free", code: "free", name: "Gratuito", price: 0, features: [], connectionLimit: 1, isActive: true },
        { id: "basic", code: "basic", name: "Básico", price: 99.90, features: ["5 conexões"], connectionLimit: 5, isActive: true },
        { id: "pro", code: "pro", name: "Pro", price: 299.90, features: ["Conexões ilimitadas", "Relatórios avançados"], connectionLimit: null, isActive: true },
        { id: "enterprise", code: "enterprise", name: "Empresarial", price: 499.90, features: ["Tudo do Pro", "API", "Suporte dedicado"], connectionLimit: null, isActive: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleEditPlan = (plan: Plan) => {
    setEditingPlan({ ...plan });
    setIsPlanDialogOpen(true);
  };

  const handleAddPlan = () => {
    setEditingPlan({
      code: "",
      name: "",
      price: 0,
      features: [],
      connectionLimit: null,
      isActive: true,
    });
    setIsPlanDialogOpen(true);
  };

  const handleSavePlan = () => {
    if (!editingPlan) return;

    if (!editingPlan.code || !editingPlan.name) {
      alert("Código e nome são obrigatórios");
      return;
    }

    if (editingPlan.id) {
      setPlans(plans.map((p) => (p.id === editingPlan.id ? editingPlan : p)));
    } else {
      setPlans([...plans, { ...editingPlan, id: editingPlan.code }]);
    }
    setIsPlanDialogOpen(false);
    setEditingPlan(null);
    setNewFeature("");
  };

  const handleAddFeature = () => {
    if (!editingPlan || !newFeature.trim()) return;
    setEditingPlan({
      ...editingPlan,
      features: [...editingPlan.features, newFeature.trim()],
    });
    setNewFeature("");
  };

  const handleRemoveFeature = (index: number) => {
    if (!editingPlan) return;
    setEditingPlan({
      ...editingPlan,
      features: editingPlan.features.filter((_, i) => i !== index),
    });
  };

  const handleSavePlans = async () => {
    setSaving(true);
    try {
      await adminApi.updatePlans(
        plans.map((p) => ({
          code: p.code,
          name: p.name,
          priceCents: Math.round(p.price * 100),
          connectionLimit: p.connectionLimit || null,
          features: p.features,
          isActive: p.isActive ?? true,
        }))
      );
      alert("Planos salvos com sucesso!");
      // Refresh plans after save
      await fetchPlans();
    } catch (error: any) {
      console.error("Failed to save plans:", error);
      alert(error?.error || "Falha ao salvar planos");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Planos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie planos e preços de assinatura
          </p>
        </div>
        <Button onClick={handleSavePlans} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>

      {/* Plans List */}
      <ChartCard title={`${plans.length} Plano${plans.length !== 1 ? "s" : ""}`}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Carregando planos...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {plans.map((plan) => (
              <div
                key={plan.id || plan.code}
                className="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-foreground">{plan.name}</h3>
                      <span className="text-lg font-bold text-primary">
                        R$ {plan.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/mês
                      </span>
                      {plan.connectionLimit !== null && (
                        <span className="text-sm text-muted-foreground">
                          ({plan.connectionLimit} conexões)
                        </span>
                      )}
                      {plan.connectionLimit === null && (
                        <span className="text-sm text-muted-foreground">
                          (Ilimitado)
                        </span>
                      )}
                      {!plan.isActive && (
                        <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
                          Inativo
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {plan.features.map((feature, index) => (
                        <span
                          key={index}
                          className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground"
                        >
                          {feature}
                        </span>
                      ))}
                      {plan.features.length === 0 && (
                        <span className="text-xs text-muted-foreground italic">
                          Nenhuma feature definida
                        </span>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleEditPlan(plan)}>
                    Editar
                  </Button>
                </div>
              </div>
            ))}
            {plans.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum plano cadastrado
              </div>
            )}
            <Button variant="outline" className="w-full" onClick={handleAddPlan}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Novo Plano
            </Button>
          </div>
        )}
      </ChartCard>

      {/* Plan Edit Dialog */}
      <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPlan?.id ? "Editar Plano" : "Adicionar Novo Plano"}
            </DialogTitle>
            <DialogDescription>
              Configure os detalhes do plano
            </DialogDescription>
          </DialogHeader>

          {editingPlan && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="planCode">
                    Código * <span className="text-xs text-muted-foreground">(único, não pode ser alterado)</span>
                  </Label>
                  <Input
                    id="planCode"
                    value={editingPlan.code}
                    onChange={(e) =>
                      setEditingPlan({ ...editingPlan, code: e.target.value.toLowerCase().replace(/\s+/g, "-") })
                    }
                    disabled={!!editingPlan.id}
                    placeholder="ex: free, basic, pro"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="planName">Nome *</Label>
                  <Input
                    id="planName"
                    value={editingPlan.name}
                    onChange={(e) =>
                      setEditingPlan({ ...editingPlan, name: e.target.value })
                    }
                    placeholder="ex: Gratuito, Básico"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="planPrice">Preço (R$/mês) *</Label>
                  <Input
                    id="planPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingPlan.price}
                    onChange={(e) =>
                      setEditingPlan({
                        ...editingPlan,
                        price: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="connectionLimit">Limite de Conexões</Label>
                  <Input
                    id="connectionLimit"
                    type="number"
                    min="0"
                    value={editingPlan.connectionLimit || ""}
                    onChange={(e) =>
                      setEditingPlan({
                        ...editingPlan,
                        connectionLimit: e.target.value
                          ? parseInt(e.target.value)
                          : null,
                      })
                    }
                    placeholder="Deixe vazio para ilimitado"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Features do Plano</Label>
                <div className="space-y-2">
                  {editingPlan.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={feature}
                        onChange={(e) => {
                          const newFeatures = [...editingPlan.features];
                          newFeatures[index] = e.target.value;
                          setEditingPlan({ ...editingPlan, features: newFeatures });
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveFeature(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <Input
                      value={newFeature}
                      onChange={(e) => setNewFeature(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddFeature();
                        }
                      }}
                      placeholder="Adicionar nova feature"
                    />
                    <Button variant="outline" onClick={handleAddFeature}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="planActive"
                    checked={editingPlan.isActive ?? true}
                    onChange={(e) =>
                      setEditingPlan({ ...editingPlan, isActive: e.target.checked })
                    }
                    className="rounded"
                  />
                  <Label htmlFor="planActive">Plano ativo</Label>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsPlanDialogOpen(false);
                      setEditingPlan(null);
                      setNewFeature("");
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={handleSavePlan}>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlanManagement;

