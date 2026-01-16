import { AlertTriangle, CreditCard, TrendingDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

const alerts = [
  {
    id: 1,
    type: "warning",
    title: "Cartão vence em breve",
    message: "Fatura Nubank de R$ 2.882 vence em 3 dias",
    icon: CreditCard,
  },
  {
    id: 2,
    type: "info",
    title: "Gastos incomuns",
    message: "Gastos com compras 40% maiores que no mês passado",
    icon: TrendingDown,
  },
  {
    id: 3,
    type: "warning",
    title: "Alerta de saldo baixo",
    message: "Conta corrente abaixo do limite de R$ 500",
    icon: AlertTriangle,
  },
];

const AlertsCard = () => {
  return (
    <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-5 border border-gray-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Alertas</h3>
        <span className="text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 px-2 py-1 rounded-full">
          {alerts.length} novos
        </span>
      </div>
      
      <div className="space-y-3">
        {alerts.map((alert) => {
          const Icon = alert.icon;
          
          return (
            <div
              key={alert.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border",
                alert.type === "warning" ? "bg-yellow-500/5 border-yellow-500/20" : "bg-blue-500/5 border-blue-500/20"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                alert.type === "warning" ? "bg-yellow-500/10" : "bg-blue-500/10"
              )}>
                <Icon className={cn(
                  "h-4 w-4",
                  alert.type === "warning" ? "text-yellow-400" : "text-blue-400"
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{alert.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{alert.message}</p>
              </div>
              <button className="text-gray-500 hover:text-white transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AlertsCard;
