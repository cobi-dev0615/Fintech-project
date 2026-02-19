import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Clock, RefreshCw, Trash2, Link2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import ChartCard from "@/components/dashboard/ChartCard";
import { connectionsApi } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface Connection {
  id: string;
  name: string;
  type: "bank" | "b3";
  status: "connected" | "disconnected" | "error" | "expired" | "pending" | "needs_reauth" | "failed" | "revoked";
  lastSync?: string;
  accountsCount?: number;
}

const Connections = () => {
  const { t } = useTranslation(['connections', 'common']);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<'open_finance' | 'b3' | ''>('');
  const [selectedInstitution, setSelectedInstitution] = useState<string>('');
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  const [creating, setCreating] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [connectionToDelete, setConnectionToDelete] = useState<Connection | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [connectToken, setConnectToken] = useState<string | null>(null);
  const [showPluggyWidget, setShowPluggyWidget] = useState(false);
  const { toast } = useToast();

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

  // Fetch institutions when provider changes
  useEffect(() => {
    const fetchInstitutions = async () => {
      if (!selectedProvider) {
        setInstitutions([]);
        setSelectedInstitution('');
        return;
      }

      try {
        setLoadingInstitutions(true);
        const data = await connectionsApi.getInstitutions(selectedProvider);
        setInstitutions(data.institutions || []);
        setSelectedInstitution('');
      } catch (err: any) {
        console.error('Error fetching institutions:', err);
        toast({
          title: t('common:error'),
          description: t('connections:toast.loadInstitutionsError'),
          variant: "destructive",
        });
      } finally {
        setLoadingInstitutions(false);
      }
    };

    fetchInstitutions();
  }, [selectedProvider, toast]);

  const handleCreateConnection = async () => {
    if (!selectedProvider) {
      toast({
        title: t('common:error'),
        description: t('connections:toast.selectProvider'),
        variant: "warning",
      });
      return;
    }

    // For Open Finance, use Pluggy Connect widget
    if (selectedProvider === 'open_finance') {
      try {
        setCreating(true);
        
        // Close the dialog first to avoid DOM conflicts
        setIsDialogOpen(false);
        
        // Small delay to ensure React has finished DOM cleanup
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Get connect token from backend
        const tokenResponse = await connectionsApi.getConnectToken();
        const token = tokenResponse.connectToken;

        // Check if Pluggy Connect is available
        if (typeof window !== 'undefined' && (window as any).PluggyConnect) {
          let connectionSuccessful = false;
          
          setConnectToken(token);
          setShowPluggyWidget(true);
          
          // Initialize Pluggy Connect widget with error handling
          try {
            const pluggyConnect = new (window as any).PluggyConnect({
              connectToken: token,
              includeSandbox: false, // Set to true for testing with sandbox institutions
              onSuccess: async (itemData: { id: string; [key: string]: any }) => {
                try {
                  connectionSuccessful = true;
                  
                  // Create connection in our database
                  await connectionsApi.create({
                    itemId: itemData.id,
                    institutionId: selectedInstitution || undefined,
                  });

                  toast({
                    title: t('common:success'),
                    description: t('connections:toast.connectionCreated'),
                  });

                  // Refresh connections list
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

                  // Reset form
                  setSelectedProvider('');
                  setSelectedInstitution('');
                  setShowPluggyWidget(false);
                  setConnectToken(null);
                } catch (err: any) {
                  console.error('Error creating connection:', err);
                  toast({
                    title: t('common:error'),
                    description: err?.error || t('connections:toast.connectionError'),
                    variant: "destructive",
                  });
                } finally {
                  setCreating(false);
                }
              },
              onError: (error: any) => {
                console.error('Pluggy Connect error:', error);
                toast({
                  title: t('common:error'),
                  description: t('connections:toast.connectError'),
                  variant: "destructive",
                });
                setCreating(false);
                setShowPluggyWidget(false);
                setConnectToken(null);
                // Reopen dialog on error so user can try again
                setTimeout(() => {
                  setIsDialogOpen(true);
                }, 200);
              },
              onClose: () => {
                setShowPluggyWidget(false);
                setConnectToken(null);
                setCreating(false);
                // Only reopen dialog if connection was not successful
                if (!connectionSuccessful) {
                  setTimeout(() => {
                    setIsDialogOpen(true);
                  }, 200);
                }
              },
            });

            // Initialize and open the widget
            pluggyConnect.init();
          } catch (widgetError: any) {
            console.error('Error initializing Pluggy widget:', widgetError);
            toast({
              title: t('common:error'),
              description: t('connections:toast.widgetInitError'),
              variant: "destructive",
            });
            setCreating(false);
            setShowPluggyWidget(false);
            setConnectToken(null);
            setTimeout(() => {
              setIsDialogOpen(true);
            }, 200);
          }
        } else {
          throw new Error('Pluggy Connect widget not loaded. Please refresh the page.');
        }
      } catch (err: any) {
        console.error('Error initializing Pluggy Connect:', err);
        toast({
          title: t('common:error'),
          description: err?.error || t('connections:toast.initConnectionError'),
          variant: "destructive",
        });
        setCreating(false);
      }
    } else {
      // For B3, use the old flow (if needed)
      toast({
        title: t('connections:b3.comingSoon'),
        description: t('connections:b3.comingSoonDesc'),
        variant: "default",
      });
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setSelectedProvider('');
      setSelectedInstitution('');
    }
  };

  const handleDeleteClick = (connection: Connection) => {
    setConnectionToDelete(connection);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConnection = async () => {
    if (!connectionToDelete) return;

    try {
      setDeleting(true);
      await connectionsApi.delete(connectionToDelete.id);

      toast({
        title: t('common:success'),
        description: t('connections:toast.deleteSuccess'),
      });

      // Refresh connections list
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

      setIsDeleteDialogOpen(false);
      setConnectionToDelete(null);
    } catch (err: any) {
      console.error('Error deleting connection:', err);
      toast({
        title: t('common:error'),
        description: err?.error || t('connections:toast.deleteError'),
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

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
        <Button 
          className="w-full md:w-auto"
          onClick={() => setIsDialogOpen(true)}
        >
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
                  onClick={async () => {
                    try {
                      await connectionsApi.sync(connection.id);
                      toast({
                        title: t('common:success'),
                        description: t('connections:toast.syncSuccess'),
                      });
                      // Refresh connections
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
                    } catch (err: any) {
                      toast({
                        title: t('common:error'),
                        description: err?.error || t('connections:toast.syncError'),
                        variant: "destructive",
                      });
                    }
                  }}
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
                onClick={() => handleDeleteClick(connection)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
          ))
        )}
      </div>

      {/* Create Connection Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Conexão</DialogTitle>
            <DialogDescription>
              Selecione o provedor e a instituição para criar uma nova conexão
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="provider">Provedor</Label>
              <Select
                value={selectedProvider}
                onValueChange={(value) => setSelectedProvider(value as 'open_finance' | 'b3')}
              >
                <SelectTrigger id="provider">
                  <SelectValue placeholder="Selecione um provedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open_finance">Open Finance</SelectItem>
                  <SelectItem value="b3">B3</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedProvider && (
              <div className="space-y-2">
                <Label htmlFor="institution">Instituição {loadingInstitutions && "(Carregando...)"}</Label>
                <Select
                  value={selectedInstitution}
                  onValueChange={setSelectedInstitution}
                  disabled={loadingInstitutions || institutions.length === 0}
                >
                  <SelectTrigger id="institution">
                    <SelectValue placeholder={
                      loadingInstitutions 
                        ? "Carregando instituições..." 
                        : institutions.length === 0 
                        ? "Nenhuma instituição disponível"
                        : "Selecione uma instituição (opcional)"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {institutions.map((inst) => (
                      <SelectItem key={inst.id} value={inst.id}>
                        {inst.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {institutions.length === 0 && !loadingInstitutions && (
                  <p className="text-xs text-muted-foreground">
                    Nenhuma instituição encontrada. Você pode criar a conexão sem selecionar uma instituição.
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleDialogOpenChange(false)}
              disabled={creating}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateConnection}
              disabled={creating || !selectedProvider}
            >
              {creating ? "Criando..." : "Criar Conexão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a conexão com <strong>{connectionToDelete?.name}</strong>?
              Esta ação não pode ser desfeita e todos os dados relacionados a esta conexão serão perdidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConnection}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Connections;
