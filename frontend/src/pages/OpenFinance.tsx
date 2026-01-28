import { useState, useEffect } from "react";
import { CheckCircle2, RefreshCw, Link2, Building2, TrendingUp, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ChartCard from "@/components/dashboard/ChartCard";
import { connectionsApi } from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "@/components/ui/pagination";
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
import { useToast } from "@/hooks/use-toast";

interface Connection {
  id: string;
  name: string;
  type: "bank" | "b3";
  status: "connected" | "disconnected" | "error" | "expired" | "pending" | "needs_reauth" | "failed" | "revoked";
  lastSync?: string;
  institutionId?: string;
}

interface Institution {
  id: string;
  name: string;
  logo_url: string | null;
  enabled: boolean;
  provider: string;
}

const OpenFinance = () => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [filteredInstitutions, setFilteredInstitutions] = useState<Institution[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPageBanks, setCurrentPageBanks] = useState(1);
  const [currentPageBrokers, setCurrentPageBrokers] = useState(1);
  const itemsPerPage = 8;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [connectionToDelete, setConnectionToDelete] = useState<Connection | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [connectToken, setConnectToken] = useState<string | null>(null);
  const [showPluggyWidget, setShowPluggyWidget] = useState(false);
  const [selectedInstitutionForConnect, setSelectedInstitutionForConnect] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch connections
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
          institutionId: conn.institution_id,
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

  // Fetch institutions
  useEffect(() => {
    const fetchInstitutions = async () => {
      try {
        setLoading(true);
        const data = await connectionsApi.getInstitutions('open_finance');
        const fetchedInstitutions = data.institutions || [];
        setInstitutions(fetchedInstitutions);
        setFilteredInstitutions(fetchedInstitutions);
      } catch (err: any) {
        console.error('Error fetching institutions:', err);
        toast({
          title: "Erro",
          description: "Erro ao carregar instituições",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchInstitutions();
  }, [toast]);

  // Filter institutions based on search query
  useEffect(() => {
    let filtered = institutions;

    if (searchQuery) {
      filtered = filtered.filter(inst =>
        inst.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredInstitutions(filtered);
    setCurrentPageBanks(1); // Reset to first page when search changes
    setCurrentPageBrokers(1);
  }, [searchQuery, institutions]);

  // Check if institution is connected
  const isInstitutionConnected = (institutionId: string): boolean => {
    return connections.some(conn => 
      conn.institutionId === institutionId && 
      (conn.status === "connected" || conn.status === "pending")
    );
  };

  // Get connected institution IDs
  const connectedInstitutionIds = new Set(
    connections
      .filter(conn => conn.status === "connected" || conn.status === "pending")
      .map(conn => conn.institutionId)
      .filter((id): id is string => id !== undefined)
  );

  // Sort institutions: connected first, then by name
  const sortedInstitutions = [...filteredInstitutions].sort((a, b) => {
    const aConnected = connectedInstitutionIds.has(a.id);
    const bConnected = connectedInstitutionIds.has(b.id);
    
    if (aConnected && !bConnected) return -1;
    if (!aConnected && bConnected) return 1;
    return a.name.localeCompare(b.name);
  });

  // Group institutions by type (banks vs brokers)
  const banks = sortedInstitutions.filter(inst => 
    !inst.name.toLowerCase().includes('corretora') &&
    !inst.name.toLowerCase().includes('investimentos') &&
    !inst.name.toLowerCase().includes('broker')
  );
  
  const brokers = sortedInstitutions.filter(inst => 
    inst.name.toLowerCase().includes('corretora') ||
    inst.name.toLowerCase().includes('investimentos') ||
    inst.name.toLowerCase().includes('broker')
  );

  // Pagination calculations
  const getPaginatedItems = (items: Institution[], currentPage: number) => {
    const totalPages = Math.ceil(items.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return {
      paginated: items.slice(startIndex, endIndex),
      totalPages,
      startIndex,
      endIndex,
    };
  };

  const banksPagination = getPaginatedItems(banks, currentPageBanks);
  const brokersPagination = getPaginatedItems(brokers, currentPageBrokers);

  const handlePageChange = (page: number, type: "banks" | "brokers") => {
    if (type === "banks") {
      setCurrentPageBanks(page);
    } else {
      setCurrentPageBrokers(page);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleConnect = async (institutionId: string) => {
    try {
      setCreating(true);
      setSelectedInstitutionForConnect(institutionId);
      
      // Close any open dialogs first
      setIsDeleteDialogOpen(false);
      
      // Small delay to ensure React has finished DOM cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Get connect token from backend
      const tokenResponse = await connectionsApi.getConnectToken();
      const token = tokenResponse?.connectToken;

      // Validate token exists
      if (!token || typeof token !== 'string') {
        throw new Error('Failed to get connect token from server. Please try again.');
      }

      // Check if Pluggy Connect is available
      if (typeof window !== 'undefined' && (window as any).PluggyConnect) {
        let connectionSuccessful = false;
        
        setConnectToken(token);
        setShowPluggyWidget(true);
        
        // Initialize Pluggy Connect widget with error handling
        try {
          const pluggyConnect = new (window as any).PluggyConnect({
            connectToken: token,
            includeSandbox: false,
            onSuccess: async (itemData: { id: string; [key: string]: any }) => {
              try {
                connectionSuccessful = true;
                
                // Create connection in our database
                await connectionsApi.create({
                  itemId: itemData.id,
                  institutionId: institutionId,
                });

                toast({
                  title: "Sucesso",
                  description: "Conexão criada com sucesso! Sincronizando dados...",
                });

                // Refresh connections and institutions
                const [connectionsData, institutionsData] = await Promise.all([
                  connectionsApi.getAll(),
                  connectionsApi.getInstitutions('open_finance'),
                ]);
                
                const mappedConnections: Connection[] = connectionsData.connections.map((conn: any) => ({
                  id: conn.id,
                  name: conn.institution_name || conn.provider,
                  type: conn.provider === "b3" ? "b3" : "bank",
                  status: conn.status === "connected" ? "connected" :
                          conn.status === "pending" ? "pending" :
                          conn.status === "needs_reauth" ? "expired" :
                          conn.status === "failed" ? "error" :
                          conn.status === "revoked" ? "disconnected" : "disconnected",
                  lastSync: conn.last_sync_at ? new Date(conn.last_sync_at).toLocaleString("pt-BR") : undefined,
                  institutionId: conn.institution_id,
                }));
                setConnections(mappedConnections);
                setInstitutions(institutionsData.institutions || []);

                setShowPluggyWidget(false);
                setConnectToken(null);
                setSelectedInstitutionForConnect(null);
              } catch (err: any) {
                console.error('Error creating connection:', err);
                toast({
                  title: "Erro",
                  description: err?.error || "Erro ao salvar conexão",
                  variant: "destructive",
                });
              } finally {
                setCreating(false);
              }
            },
            onError: (error: any) => {
              console.error('Pluggy Connect error:', error);
              toast({
                title: "Erro",
                description: "Erro ao conectar com o banco. Tente novamente.",
                variant: "destructive",
              });
              setCreating(false);
              setShowPluggyWidget(false);
              setConnectToken(null);
              setSelectedInstitutionForConnect(null);
            },
            onClose: () => {
              setShowPluggyWidget(false);
              setConnectToken(null);
              setCreating(false);
              setSelectedInstitutionForConnect(null);
            },
          });

          // Initialize and open the widget
          pluggyConnect.init();
        } catch (widgetError: any) {
          console.error('Error initializing Pluggy widget:', widgetError);
          toast({
            title: "Erro",
            description: "Erro ao inicializar widget. Tente novamente.",
            variant: "destructive",
          });
          setCreating(false);
          setShowPluggyWidget(false);
          setConnectToken(null);
          setSelectedInstitutionForConnect(null);
        }
      } else {
        throw new Error('Pluggy Connect widget not loaded. Please refresh the page.');
      }
    } catch (err: any) {
      console.error('Error connecting:', err);
      const errorMessage = err?.error || err?.message || "Erro ao conectar";
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
      setCreating(false);
      setShowPluggyWidget(false);
      setConnectToken(null);
      setSelectedInstitutionForConnect(null);
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
        title: "Sucesso",
        description: "Conexão excluída com sucesso",
      });

      // Refresh connections and institutions
      const [connectionsData, institutionsData] = await Promise.all([
        connectionsApi.getAll(),
        connectionsApi.getInstitutions('open_finance'),
      ]);
      
      const mappedConnections: Connection[] = connectionsData.connections.map((conn: any) => ({
        id: conn.id,
        name: conn.institution_name || conn.provider,
        type: conn.provider === "b3" ? "b3" : "bank",
        status: conn.status === "connected" ? "connected" :
                conn.status === "pending" ? "pending" :
                conn.status === "needs_reauth" ? "expired" :
                conn.status === "failed" ? "error" :
                conn.status === "revoked" ? "disconnected" : "disconnected",
        lastSync: conn.last_sync_at ? new Date(conn.last_sync_at).toLocaleString("pt-BR") : undefined,
        institutionId: conn.institution_id,
      }));
      setConnections(mappedConnections);
      setInstitutions(institutionsData.institutions || []);

      setIsDeleteDialogOpen(false);
      setConnectionToDelete(null);
    } catch (err: any) {
      console.error('Error deleting connection:', err);
      toast({
        title: "Erro",
        description: err?.error || "Erro ao excluir conexão",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleSync = async (connectionId: string) => {
    try {
      await connectionsApi.sync(connectionId);
      toast({
        title: "Sucesso",
        description: "Conexão sincronizada com sucesso",
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
        institutionId: conn.institution_id,
      }));
      setConnections(mappedConnections);
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err?.error || "Erro ao sincronizar conexão",
        variant: "destructive",
      });
    }
  };

  if (loading && connections.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (error && connections.length === 0) {
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
          <h1 className="text-2xl font-bold text-foreground">Open Finance</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Conecte suas contas bancárias, cartões e investimentos
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar bancos e corretoras..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs for Banks and Brokers */}
      <Tabs defaultValue="banks" className="w-full">
        <TabsList>
          <TabsTrigger value="banks">Bancos</TabsTrigger>
          <TabsTrigger value="brokers">Corretoras</TabsTrigger>
        </TabsList>

        {/* Banks Tab */}
        <TabsContent value="banks" className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">Carregando bancos...</p>
            </div>
          ) : banks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchQuery ? "Nenhum banco encontrado" : "Nenhum banco disponível"}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {banksPagination.paginated.map((bank) => {
                const isConnected = isInstitutionConnected(bank.id);
                const connection = connections.find(conn => conn.institutionId === bank.id);
                
                return (
                  <ChartCard key={bank.id} className="relative overflow-hidden">
                    {/* Connection indicator */}
                    {isConnected && (
                      <div className="absolute top-2 right-2 z-10">
                        <div className="bg-success rounded-full p-1.5 shadow-lg">
                          <CheckCircle2 className="h-4 w-4 text-success-foreground" />
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col items-center text-center space-y-3 p-4">
                      {bank.logo_url ? (
                        <img 
                          src={bank.logo_url} 
                          alt={bank.name}
                          className="h-12 w-12 object-contain"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                          <Building2 className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      
                      <h3 className="font-semibold text-sm">{bank.name}</h3>
                      
                      {isConnected && connection && (
                        <div className="text-xs text-muted-foreground">
                          {connection.status === "connected" ? "Conectado" : "Pendente"}
                        </div>
                      )}
                      
                      <Button
                        size="sm"
                        variant={isConnected ? "outline" : "default"}
                        className="w-full"
                        onClick={() => isConnected ? handleSync(connection!.id) : handleConnect(bank.id)}
                        disabled={creating && selectedInstitutionForConnect === bank.id}
                      >
                        {isConnected ? (
                          <>
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Sincronizar
                          </>
                        ) : (
                          <>
                            <Link2 className="h-3 w-3 mr-1" />
                            Conectar
                          </>
                        )}
                      </Button>
                    </div>
                  </ChartCard>
                );
              })}
              </div>
              
              {/* Pagination for Banks */}
              {banks.length > itemsPerPage && (
                <div className="mt-6">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <Button
                          variant="ghost"
                          size="default"
                          onClick={() => handlePageChange(Math.max(1, currentPageBanks - 1), "banks")}
                          disabled={currentPageBanks === 1}
                          className="gap-1 pl-2.5"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          <span>Anterior</span>
                        </Button>
                      </PaginationItem>
                      
                      {Array.from({ length: banksPagination.totalPages }, (_, i) => i + 1).map((page) => {
                        if (
                          page === 1 ||
                          page === banksPagination.totalPages ||
                          (page >= currentPageBanks - 1 && page <= currentPageBanks + 1)
                        ) {
                          return (
                            <PaginationItem key={page}>
                              <Button
                                variant={page === currentPageBanks ? "outline" : "ghost"}
                                size="icon"
                                onClick={() => handlePageChange(page, "banks")}
                                className="h-9 w-9"
                              >
                                {page}
                              </Button>
                            </PaginationItem>
                          );
                        } else if (page === currentPageBanks - 2 || page === currentPageBanks + 2) {
                          return (
                            <PaginationItem key={page}>
                              <PaginationEllipsis />
                            </PaginationItem>
                          );
                        }
                        return null;
                      })}
                      
                      <PaginationItem>
                        <Button
                          variant="ghost"
                          size="default"
                          onClick={() => handlePageChange(Math.min(banksPagination.totalPages, currentPageBanks + 1), "banks")}
                          disabled={currentPageBanks === banksPagination.totalPages}
                          className="gap-1 pr-2.5"
                        >
                          <span>Próxima</span>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                  <div className="text-center text-sm text-muted-foreground mt-2">
                    Mostrando {banksPagination.startIndex + 1} - {Math.min(banksPagination.endIndex, banks.length)} de {banks.length} bancos
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* Brokers Tab */}
        <TabsContent value="brokers" className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">Carregando corretoras...</p>
            </div>
          ) : brokers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchQuery ? "Nenhuma corretora encontrada" : "Nenhuma corretora disponível"}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {brokersPagination.paginated.map((broker) => {
                const isConnected = isInstitutionConnected(broker.id);
                const connection = connections.find(conn => conn.institutionId === broker.id);
                
                return (
                  <ChartCard key={broker.id} className="relative overflow-hidden">
                    {/* Connection indicator */}
                    {isConnected && (
                      <div className="absolute top-2 right-2 z-10">
                        <div className="bg-success rounded-full p-1.5 shadow-lg">
                          <CheckCircle2 className="h-4 w-4 text-success-foreground" />
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col items-center text-center space-y-3 p-4">
                      {broker.logo_url ? (
                        <img 
                          src={broker.logo_url} 
                          alt={broker.name}
                          className="h-12 w-12 object-contain"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                          <TrendingUp className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      
                      <h3 className="font-semibold text-sm">{broker.name}</h3>
                      
                      {isConnected && connection && (
                        <div className="text-xs text-muted-foreground">
                          {connection.status === "connected" ? "Conectado" : "Pendente"}
                        </div>
                      )}
                      
                      <Button
                        size="sm"
                        variant={isConnected ? "outline" : "default"}
                        className="w-full"
                        onClick={() => isConnected ? handleSync(connection!.id) : handleConnect(broker.id)}
                        disabled={creating && selectedInstitutionForConnect === broker.id}
                      >
                        {isConnected ? (
                          <>
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Sincronizar
                          </>
                        ) : (
                          <>
                            <Link2 className="h-3 w-3 mr-1" />
                            Conectar
                          </>
                        )}
                      </Button>
                    </div>
                  </ChartCard>
                );
              })}
              </div>
              
              {/* Pagination for Brokers */}
              {brokers.length > itemsPerPage && (
                <div className="mt-6">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <Button
                          variant="ghost"
                          size="default"
                          onClick={() => handlePageChange(Math.max(1, currentPageBrokers - 1), "brokers")}
                          disabled={currentPageBrokers === 1}
                          className="gap-1 pl-2.5"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          <span>Anterior</span>
                        </Button>
                      </PaginationItem>
                      
                      {Array.from({ length: brokersPagination.totalPages }, (_, i) => i + 1).map((page) => {
                        if (
                          page === 1 ||
                          page === brokersPagination.totalPages ||
                          (page >= currentPageBrokers - 1 && page <= currentPageBrokers + 1)
                        ) {
                          return (
                            <PaginationItem key={page}>
                              <Button
                                variant={page === currentPageBrokers ? "outline" : "ghost"}
                                size="icon"
                                onClick={() => handlePageChange(page, "brokers")}
                                className="h-9 w-9"
                              >
                                {page}
                              </Button>
                            </PaginationItem>
                          );
                        } else if (page === currentPageBrokers - 2 || page === currentPageBrokers + 2) {
                          return (
                            <PaginationItem key={page}>
                              <PaginationEllipsis />
                            </PaginationItem>
                          );
                        }
                        return null;
                      })}
                      
                      <PaginationItem>
                        <Button
                          variant="ghost"
                          size="default"
                          onClick={() => handlePageChange(Math.min(brokersPagination.totalPages, currentPageBrokers + 1), "brokers")}
                          disabled={currentPageBrokers === brokersPagination.totalPages}
                          className="gap-1 pr-2.5"
                        >
                          <span>Próxima</span>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                  <div className="text-center text-sm text-muted-foreground mt-2">
                    Mostrando {brokersPagination.startIndex + 1} - {Math.min(brokersPagination.endIndex, brokers.length)} de {brokers.length} corretoras
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

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

export default OpenFinance;
