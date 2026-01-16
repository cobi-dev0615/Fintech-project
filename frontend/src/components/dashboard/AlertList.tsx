import { useState } from "react";
import { ChevronDown, ChevronUp, AlertTriangle, Info, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Alert {
  id: string;
  type: "warning" | "info" | "success" | "error";
  title: string;
  message: string;
  timestamp?: string;
  expandable?: boolean;
  details?: string;
}

interface AlertListProps {
  alerts: Alert[];
  title?: string;
  maxHeight?: string;
}

const AlertList = ({ alerts, title = "Alertas", maxHeight = "600px" }: AlertListProps) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getIcon = (type: Alert["type"]) => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case "error":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-success" />;
      case "info":
        return <Info className="h-4 w-4 text-info" />;
    }
  };

  const getBorderColor = (type: Alert["type"]) => {
    switch (type) {
      case "warning":
        return "border-warning/30";
      case "error":
        return "border-destructive/30";
      case "success":
        return "border-success/30";
      case "info":
        return "border-info/30";
      default:
        return "border-border";
    }
  };

  if (alerts.length === 0) {
    return (
      <div className="chart-card">
        <h3 className="text-sm font-semibold text-foreground mb-4">{title}</h3>
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">Nenhum alerta no momento</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-card">
      <h3 className="text-sm font-semibold text-foreground mb-4">{title}</h3>
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={cn(
              "alert-card border-l-2",
              getBorderColor(alert.type)
            )}
          >
            <div
              className={cn(
                "flex items-start gap-3",
                alert.expandable && "cursor-pointer"
              )}
              onClick={() => alert.expandable && toggleExpand(alert.id)}
            >
              <div className="mt-0.5 flex-shrink-0">{getIcon(alert.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-foreground">
                      {alert.title}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {alert.message}
                    </p>
                    {alert.timestamp && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {alert.timestamp}
                      </p>
                    )}
                    {alert.expandable && alert.details && expanded[alert.id] && (
                      <div className="mt-2 pt-2 border-t border-border">
                        <p className="text-xs text-muted-foreground">
                          {alert.details}
                        </p>
                      </div>
                    )}
                  </div>
                  {alert.expandable && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(alert.id);
                      }}
                      className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {expanded[alert.id] ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AlertList;
