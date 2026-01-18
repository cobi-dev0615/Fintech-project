import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Clock, RefreshCw, Trash2, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChartCard from "@/components/dashboard/ChartCard";
import { connectionsApi } from "@/lib/api";

interface Connection {
  id: string;
  name: string;
  type: "bank" | "b3";
  status: "connected" | "disconnected" | "error" | "expired" | "pending" | "needs_reauth" | "failed" | "revoked";
  lastSync?: string;
  accountsCount?: number;
}

const Connections = () => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConnections = async () => {
      try {
        setLoading(true);
        const data = await connectionsApi.getAll();
        const mappedConnections: Connection[] = data.connections.map((conn: any) => ({
          id: conn.id,
          name: conn.institution_name || conn.provider,
          type: conn.provider === "b3" ? "b3" : "bank",
          status: conn.status === "connected" ? "connected" :
                  conn.status === "pending" ? "pending" :
                  conn.status === "needs_reauth" ? "expired" :
                  conn.status === "failed" ? "error" :
                  conn.status === "revoked" ? "disconnected" : "disconnected",
          lastSync: conn.last_sync_at ? new Date(conn.last_sync_at).toLocaleString("pt-BR") : undefined,
        }));
        setConnections(mappedConnections);
        setError(null);
      } catch (err: any) {
        setError(err?.error || "Erro ao carregar conexões");
        console.error("Error fetching connections:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchConnections();
  }, []);

  const getStatusIcon = (status: Connection["status"]) => {
    switch (status) {
      case "connected":
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "error":
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "expired":
      case "needs_reauth":
        return <Clock className="h-4 w-4 text-warning" />;
      default:
        return <XCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusText = (status: Connection["status"]) => {
    switch (status) {
      case "connected":
        return "Conectado";
      case "error":
      case "failed":
        return "Erro";
      case "expired":
      case "needs_reauth":
        return "Expirado";
      case "pending":
        return "Pendente";
      default:
        return "Desconectado";
    }
  };

  const getStatusColor = (status: Connection["status"]) => {
    switch (status) {
      case "connected":
        return "border-success/30";
      case "error":
      case "failed":
        return "border-destructive/30";
      case "expired":
      case "needs_reauth":
        return "border-warning/30";
      default:
        return "border-border";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Conexões</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie suas conexões Open Finance e B3
          </p>
        </div>
        <Button className="w-full md:w-auto">
          <Link2 className="h-4 w-4 mr-2" />
          Nova Conexão
        </Button>
      </div>

      {/* Connections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {connections.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-muted-foreground">Nenhuma conexão encontrada</p>
          </div>
        ) : (
          connections.map((connection) => (
          <div
            key={connection.id}
            className={`chart-card border-l-2 ${getStatusColor(connection.status)}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-foreground">
                    {connection.name}
                  </h3>
                  {getStatusIcon(connection.status)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {connection.type === "bank" ? "Banco" : "Bolsa de Valores"}
                </p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Status:</span>
                <span className="text-foreground font-medium">
                  {getStatusText(connection.status)}
                </span>
              </div>
              {connection.lastSync && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Última sincronização:</span>
                  <span className="text-foreground">{connection.lastSync}</span>
                </div>
              )}
              {connection.accountsCount && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Contas:</span>
                  <span className="text-foreground">{connection.accountsCount}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {connection.status === "connected" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Sincronizar
                </Button>
              )}
              {connection.status === "expired" && (
                <Button size="sm" className="flex-1 text-xs">
                  Reautorizar
                </Button>
              )}
              {connection.status === "disconnected" && (
                <Button size="sm" className="flex-1 text-xs">
                  Conectar
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Connections;
