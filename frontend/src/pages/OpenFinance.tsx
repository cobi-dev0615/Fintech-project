import { useState, useEffect, useRef } from "react";
import { Link2, RefreshCw, Building2, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChartCard from "@/components/dashboard/ChartCard";
import { connectionsApi, financeApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Connection {
  id: string;
  name: string;
  type: "bank" | "b3";
  status: "connected" | "disconnected" | "error" | "expired" | "pending" | "needs_reauth" | "failed" | "revoked";
  lastSync?: string;
  institutionId?: string;
}

const OpenFinance = () => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();
  const fetchingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchConnections = async () => {
    if (fetchingRef.current) return;
    if (abortControllerRef.current) abortControllerRef.current.abort();
    fetchingRef.current = true;
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      setLoading(true);
      const connectionsData = await connectionsApi.getAll();
      if (abortController.signal.aborted) return;

      const mapped: Connection[] = connectionsData.connections.map((conn: any) => ({
        id: conn.id,
        name: conn.institution_name || conn.provider || "Instituição",
        type: conn.provider === "b3" ? "b3" : "bank",
        status:
          conn.status === "connected"
            ? "connected"
            : conn.status === "pending"
              ? "pending"
              : conn.status === "needs_reauth"
                ? "expired"
                : conn.status === "failed"
                  ? "error"
                  : conn.status === "revoked"
                    ? "disconnected"
                    : "disconnected",
        lastSync: conn.last_sync_at ? new Date(conn.last_sync_at).toLocaleString("pt-BR") : undefined,
        institutionId: conn.institution_id,
      }));
      setConnections(mapped);
      setError(null);
    } catch (err: any) {
      if (abortController.signal.aborted) return;
      setError(err?.error || "Erro ao carregar conexões");
      console.error("Error fetching connections:", err);
    } finally {
      if (!abortController.signal.aborted) setLoading(false);
      fetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchConnections();
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      fetchingRef.current = false;
    };
  }, []);

  const handlePluggyConnection = async () => {
    try {
      setCreating(true);
      const tokenResponse = await connectionsApi.getConnectToken();
      const token = tokenResponse?.connectToken;
      if (!token || typeof token !== "string") {
        throw new Error("Token de conexão inválido.");
      }

      if (typeof window !== "undefined" && (window as any).PluggyConnect) {
        const pluggyConnect = new (window as any).PluggyConnect({
          connectToken: token,
          includeSandbox: false,
          onSuccess: async (itemData: any) => {
            try {
              let itemId: string | null =
                itemData?.id ?? itemData?.itemId ?? itemData?.item?.id ?? itemData?.item?.itemId ?? (typeof itemData === "string" ? itemData : null);
              if (!itemId) throw new Error("Item ID não recebido da Pluggy.");
              await connectionsApi.create({ itemId });
              toast({ title: "Sucesso", description: "Conexão criada com sucesso. Dados sendo sincronizados..." });
              await fetchConnections();
            } catch (err: any) {
              toast({ title: "Erro", description: err?.error || "Erro ao salvar conexão", variant: "destructive" });
            } finally {
              setCreating(false);
            }
          },
          onError: () => {
            toast({ title: "Erro", description: "Erro ao conectar. Tente novamente.", variant: "destructive" });
            setCreating(false);
          },
          onClose: () => setCreating(false),
        });
        pluggyConnect.init();
      } else {
        throw new Error("Widget Pluggy não carregado. Atualize a página.");
      }
    } catch (err: any) {
      const msg = err?.error || err?.message || "Erro ao conectar";
      toast({ title: "Erro", description: msg, variant: "destructive" });
      setCreating(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setCreating(true);
      await financeApi.sync();
      toast({ title: "Sucesso", description: "Dados sincronizados com sucesso." });
      await fetchConnections();
    } catch (err: any) {
      toast({ title: "Erro", description: err?.error || "Erro ao sincronizar.", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const statusLabel: Record<string, string> = {
    connected: "Conectado",
    pending: "Pendente",
    expired: "Expirado",
    error: "Erro",
    disconnected: "Desconectado",
    failed: "Falha",
    revoked: "Revogado",
  };

  if (loading && connections.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (error && connections.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Open Finance</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Conecte bancos e corretoras para sincronizar contas e transações
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={creating}>
            <RefreshCw className={`h-4 w-4 mr-2 ${creating ? "animate-spin" : ""}`} />
            {creating ? "Sincronizando…" : "Atualizar"}
          </Button>
          <Button onClick={handlePluggyConnection} disabled={creating} size="default">
            <Link2 className="h-4 w-4 mr-2" />
            {creating ? "Conectando…" : "Conectar"}
          </Button>
        </div>
      </div>

      <ChartCard title="Bancos e corretoras conectados">
        {connections.length === 0 ? (
          <div className="text-center py-10">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">Nenhuma instituição conectada</p>
            <Button onClick={handlePluggyConnection} disabled={creating}>
              <Link2 className="h-4 w-4 mr-2" />
              Conectar
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {connections.map((conn) => (
              <li key={conn.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{conn.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {conn.type === "b3" ? "Corretora" : "Banco"}
                      {conn.lastSync && ` • Última sync: ${conn.lastSync}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {conn.status === "connected" && (
                    <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                      <CheckCircle2 className="h-4 w-4" />
                      Conectado
                    </span>
                  )}
                  {conn.status === "pending" && (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                      <Clock className="h-4 w-4" />
                      Pendente
                    </span>
                  )}
                  {(conn.status === "expired" || conn.status === "error" || conn.status === "failed") && (
                    <span className="inline-flex items-center gap-1 text-xs text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      {statusLabel[conn.status] || conn.status}
                    </span>
                  )}
                  {(conn.status === "disconnected" || conn.status === "revoked") && (
                    <span className="text-xs text-muted-foreground">{statusLabel[conn.status] || conn.status}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </ChartCard>
    </div>
  );
};

export default OpenFinance;
