import { useState, useEffect, useRef } from "react";
import { CheckCircle2, RefreshCw, Link2, Building2, TrendingUp, Search, ChevronLeft, ChevronRight, Trash2, Wallet, CreditCard, BarChart3, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ChartCard from "@/components/dashboard/ChartCard";
import ProfessionalKpiCard from "@/components/dashboard/ProfessionalKpiCard";
import { connectionsApi, financeApi } from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

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
  
  // State for dashboard data and tabs
  const [dashboardData, setDashboardData] = useState<{
    accounts: any[];
    groupedAccounts: any[];
    transactions: any[];
    investments: any[];
    cards: any[];
    totalBalance: number;
    totalInvestments: number;
    totalTransactions: number;
  }>({
    accounts: [],
    groupedAccounts: [],
    transactions: [],
    investments: [],
    cards: [],
    totalBalance: 0,
    totalInvestments: 0,
    totalTransactions: 0,
  });
  const [activeTab, setActiveTab] = useState("dashboard");
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [transactionsSearch, setTransactionsSearch] = useState("");
  const [transactionsLimit, setTransactionsLimit] = useState(20);
  const [transactionsPagination, setTransactionsPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  // Store the total separately to preserve it across page changes
  const [transactionsTotal, setTransactionsTotal] = useState(0);
  
  // Refs to prevent duplicate requests
  const fetchingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch connections and institutions together (single effect to prevent duplicates)
  useEffect(() => {
    // Prevent duplicate requests
    if (fetchingRef.current) {
      return;
    }

    // Abort any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    fetchingRef.current = true;
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch both in parallel
        const [connectionsData, institutionsData] = await Promise.all([
          connectionsApi.getAll(),
          connectionsApi.getInstitutions('open_finance'),
        ]);

        // Check if request was aborted
        if (abortController.signal.aborted) {
          return;
        }

        // Map connections
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

        const fetchedInstitutions = institutionsData.institutions || [];

        setConnections(mappedConnections);
        setInstitutions(fetchedInstitutions);
        setFilteredInstitutions(fetchedInstitutions);
        setError(null);
      } catch (err: any) {
        // Don't set error if request was aborted
        if (abortController.signal.aborted) {
          return;
        }
        
        setError(err?.error || "Erro ao carregar dados");
        console.error("Error fetching data:", err);
        
        // Only show toast for institutions error (connections error is shown via setError)
        if (err?.error?.includes('instituições') || err?.message?.includes('instituições')) {
          toast({
            title: "Erro",
            description: "Erro ao carregar instituições",
            variant: "destructive",
          });
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
        fetchingRef.current = false;
      }
    };

    fetchData();

    // Cleanup function
    return () => {
      abortController.abort();
      fetchingRef.current = false;
    };
  }, []); // Empty dependency array - only fetch once on mount

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

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      const [accountsData, transactionsData, investmentsData, cardsData] = await Promise.all([
        financeApi.getAccounts().catch(() => ({ accounts: [], grouped: [], total: 0 })),
        financeApi.getTransactions({ page: 1, limit: 10 }).catch(() => ({ transactions: [], pagination: { total: 0 } })),
        financeApi.getInvestments().catch(() => ({ investments: [], total: 0, breakdown: [] })),
        financeApi.getCards().catch(() => ({ cards: [] })),
      ]);

      setDashboardData({
        accounts: accountsData.accounts || [],
        groupedAccounts: accountsData.grouped || [],
        transactions: transactionsData.transactions || [],
        investments: investmentsData.investments || [],
        cards: cardsData.cards || [],
        totalBalance: accountsData.total || 0,
        totalInvestments: investmentsData.total || 0,
        totalTransactions: transactionsData.pagination?.total || 0,
      });
    } catch (err: any) {
      console.error("Error fetching dashboard data:", err);
    }
  };

  // Fetch transactions
  // Fetch transactions with pagination
  const fetchTransactions = async (page: number, search?: string, limit?: number) => {
    try {
      const itemsPerPage = limit || transactionsLimit;
      const data = await financeApi.getTransactions({
        page,
        limit: itemsPerPage,
        q: search,
      });
      setDashboardData(prev => ({
        ...prev,
        transactions: data.transactions || [],
      }));
      
      // Use backend total only (pagination.total or top-level total) so total reflects DB count
      const res = data as { transactions?: any[]; total?: number; pagination?: { page?: number; limit?: number; total?: number; totalPages?: number } };
      const rawTotal = res.pagination?.total ?? res.total;
      const totalNum = rawTotal != null ? Number(rawTotal) : NaN;

      if (!Number.isNaN(totalNum) && totalNum >= 0) {
        const total = totalNum;
        const limitVal = Number(res.pagination?.limit) || itemsPerPage;
        const totalPages = Math.max(1, Math.ceil(total / limitVal));
        setTransactionsTotal(total);
        setTransactionsPagination({
          page: Number(res.pagination?.page) ?? page,
          limit: limitVal,
          total,
          totalPages,
        });
      } else {
        setTransactionsPagination((prev) => ({
          page,
          limit: itemsPerPage,
          total: prev.total,
          totalPages: prev.totalPages || 1,
        }));
      }
    } catch (err: any) {
      console.error("Error fetching transactions:", err);
    }
  };

  // Fetch investments
  const fetchInvestments = async () => {
    try {
      const data = await financeApi.getInvestments();
      setDashboardData(prev => ({
        ...prev,
        investments: data.investments || [],
        totalInvestments: data.total || 0,
      }));
    } catch (err: any) {
      console.error("Error fetching investments:", err);
    }
  };

  // Fetch cards
  const fetchCards = async () => {
    try {
      const data = await financeApi.getCards();
      console.log('Cards data received:', data); // Debug log
      setDashboardData(prev => ({
        ...prev,
        cards: data.cards || [],
      }));
    } catch (err: any) {
      console.error("Error fetching cards:", err);
      // Set empty array on error to show "no cards" message
      setDashboardData(prev => ({
        ...prev,
        cards: [],
      }));
    }
  };

  // Effects for fetching data based on active tab
  useEffect(() => {
    if (activeTab === "dashboard") {
      fetchDashboardData();
    }
  }, [activeTab]);

  // Reset only page when limit or search changes; do not zero total so pagination stays valid
  useEffect(() => {
    setTransactionsPage(1);
  }, [transactionsLimit, transactionsSearch]);

  useEffect(() => {
    if (activeTab === "transactions") {
      fetchTransactions(transactionsPage, transactionsSearch, transactionsLimit);
    }
  }, [activeTab, transactionsPage, transactionsSearch, transactionsLimit]);

  useEffect(() => {
    if (activeTab === "investments") {
      fetchInvestments();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "cards") {
      fetchCards();
    }
  }, [activeTab]);

  // Helper function to refresh connections and institutions data
  const refreshData = async () => {
    try {
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
    } catch (err: any) {
      console.error('Error refreshing data:', err);
    }
  };

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

  // Workflow:
  // 1. User clicks "Pluggy Connection" button
  // 2. Backend creates a connectToken
  // 3. Frontend opens Pluggy Connect Widget
  // 4. User selects a bank (in widget)
  // 5. CPF is requested by widget
  // 6. User authenticates with the bank
  // 7. User approves Open Finance consent
  // 8. Pluggy creates an itemId
  // 9. Backend fetches data using itemId and identifies institution
  const handlePluggyConnection = async () => {
    try {
      setCreating(true);
      setSelectedInstitutionForConnect(null); // No specific institution - user will select in widget
      
      // Close any open dialogs first
      setIsDeleteDialogOpen(false);
      
      // Small delay to ensure React has finished DOM cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Step 2: Get connect token from backend
      let tokenResponse;
      try {
        tokenResponse = await connectionsApi.getConnectToken();
        console.log('Token response received:', tokenResponse);
      } catch (apiError: any) {
        console.error('API error getting connect token:', apiError);
        const errorMessage = apiError?.error || apiError?.message || apiError?.details?.message || 'Erro desconhecido';
        throw new Error(
          `Erro ao obter token de conexão: ${errorMessage}. Verifique se o servidor está configurado corretamente.`
        );
      }

      // Check if response is empty or invalid
      if (!tokenResponse || typeof tokenResponse !== 'object') {
        console.error('Invalid response structure:', tokenResponse);
        throw new Error(
          'Resposta inválida do servidor. Por favor, verifique os logs do servidor.'
        );
      }

      const token = tokenResponse?.connectToken;

      // Validate token exists
      if (!token || typeof token !== 'string') {
        console.error('Invalid token response:', tokenResponse);
        const errorDetails = tokenResponse?.error || tokenResponse?.message || tokenResponse?.details || 'Sem detalhes';
        throw new Error(
          `Token de conexão inválido recebido do servidor: ${JSON.stringify(errorDetails)}. Por favor, verifique os logs do servidor.`
        );
      }

      // Step 3: Open Pluggy Connect Widget
      if (typeof window !== 'undefined' && (window as any).PluggyConnect) {
        let connectionSuccessful = false;
        
        setConnectToken(token);
        setShowPluggyWidget(true);
        
        // Initialize Pluggy Connect widget
        // Steps 4-7 happen inside the widget:
        // 4. User selects a bank
        // 5. CPF is requested by widget
        // 6. User authenticates with the bank
        // 7. User approves Open Finance consent
        try {
          const pluggyConnect = new (window as any).PluggyConnect({
            connectToken: token,
            includeSandbox: false,
            onSuccess: async (itemData: any) => {
              try {
                connectionSuccessful = true;
                
                // Step 8: Pluggy created itemId after successful connection
                // Log the full response to debug structure
                console.log('Pluggy onSuccess callback - full itemData:', JSON.stringify(itemData, null, 2));
                
                // Try different possible field names for itemId
                let itemId: string | null = null;
                
                if (itemData?.id) {
                  itemId = itemData.id;
                } else if (itemData?.itemId) {
                  itemId = itemData.itemId;
                } else if (itemData?.item?.id) {
                  itemId = itemData.item.id;
                } else if (itemData?.item?.itemId) {
                  itemId = itemData.item.itemId;
                } else if (typeof itemData === 'string') {
                  // Sometimes the callback might just return the itemId as a string
                  itemId = itemData;
                }
                
                if (!itemId) {
                  console.error('Pluggy response structure:', {
                    itemData,
                    type: typeof itemData,
                    keys: itemData ? Object.keys(itemData) : null,
                    stringified: JSON.stringify(itemData)
                  });
                  throw new Error(`Item ID not received from Pluggy. Response structure: ${JSON.stringify(itemData)}`);
                }

                console.log('Pluggy connection successful, itemId:', itemId);
                
                // Step 9: Create connection in our database (backend will identify institution from itemId)
                // Backend automatically saves itemId and syncs balances/transactions
                // institutionId is optional - backend will fetch item details and match institution
                await connectionsApi.create({
                  itemId: itemId,
                  // institutionId is optional - backend identifies it from Pluggy item
                });

                toast({
                  title: "Sucesso",
                  description: "Conexão criada com sucesso! Dados sendo sincronizados...",
                });

                // Refresh connections and institutions
                await refreshData();

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
      
      // More detailed error message
      let userMessage = errorMessage;
      if (errorMessage.includes('token') || errorMessage.includes('Token')) {
        userMessage = 'Erro ao obter token de conexão. Verifique se o servidor está configurado corretamente.';
      } else if (errorMessage.includes('network') || errorMessage.includes('Network')) {
        userMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
      }
      
      toast({
        title: "Erro",
        description: userMessage,
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
      await refreshData();

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
      await refreshData();
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err?.error || "Erro ao sincronizar conexão",
        variant: "destructive",
      });
    }
  };

  const handleSyncAll = async () => {
    try {
      setCreating(true);
      await financeApi.sync();
      toast({
        title: "Sucesso",
        description: "Dados sincronizados com sucesso",
      });
      await fetchDashboardData();
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err?.error || "Erro ao sincronizar dados",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
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
        <div className="flex items-center gap-2">
          <Button
            onClick={handleSyncAll}
            disabled={creating}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${creating ? 'animate-spin' : ''}`} />
            {creating ? "Sincronizando..." : "Sincronizar"}
          </Button>
          <Button
            onClick={handlePluggyConnection}
            disabled={creating}
            size="lg"
            className="w-full md:w-auto"
          >
            <Link2 className="h-4 w-4 mr-2" />
            {creating ? "Conectando..." : "Conectar com Pluggy"}
          </Button>
        </div>
      </div>

      {/* Tabs for different views */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard">
            <LayoutDashboard className="h-4 w-4 mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="balances">
            <Wallet className="h-4 w-4 mr-2" />
            Saldos
          </TabsTrigger>
          <TabsTrigger value="transactions">
            <BarChart3 className="h-4 w-4 mr-2" />
            Transações
          </TabsTrigger>
          <TabsTrigger value="investments">
            <TrendingUp className="h-4 w-4 mr-2" />
            Investimentos
          </TabsTrigger>
          <TabsTrigger value="cards">
            <CreditCard className="h-4 w-4 mr-2" />
            Cartões
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="mt-6 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <ProfessionalKpiCard
              title="Patrimônio Total"
              value={`R$ ${(dashboardData.totalBalance + dashboardData.totalInvestments).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              change=""
              changeType="neutral"
              icon={Wallet}
              subtitle="Saldos + Investimentos"
            />
            <ProfessionalKpiCard
              title="Saldo Total"
              value={`R$ ${dashboardData.totalBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              change=""
              changeType="neutral"
              icon={Wallet}
              subtitle={`${dashboardData.accounts.length} conta(s)`}
            />
            <ProfessionalKpiCard
              title="Investimentos"
              value={`R$ ${dashboardData.totalInvestments.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              change=""
              changeType="neutral"
              icon={TrendingUp}
              subtitle={`${dashboardData.investments.length} ativo(s)`}
            />
            <ProfessionalKpiCard
              title="Transações"
              value={dashboardData.totalTransactions.toString()}
              change=""
              changeType="neutral"
              icon={BarChart3}
              subtitle="Total"
            />
          </div>

          {/* Balances by Institution */}
          {dashboardData.groupedAccounts.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Saldos por Instituição</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dashboardData.groupedAccounts.map((group: any, idx: number) => (
                  <ChartCard key={idx} className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      {group.institution_logo && (
                        <img src={group.institution_logo} alt={group.institution_name} className="h-8 w-8" />
                      )}
                      <div>
                        <h3 className="font-semibold">{group.institution_name}</h3>
                        <p className="text-xs text-muted-foreground">{group.accounts.length} conta(s)</p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold">
                      R$ {group.total.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </ChartCard>
                ))}
              </div>
            </div>
          )}

          {/* Recent Transactions */}
          {dashboardData.transactions.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Transações Recentes</h2>
              <ChartCard>
                <div className="space-y-2">
                  {dashboardData.transactions.slice(0, 5).map((tx: any) => (
                    <div key={tx.id || tx.pluggy_transaction_id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="font-medium">{tx.description || tx.merchant || "Transação"}</p>
                        <p className="text-sm text-muted-foreground">
                          {tx.date ? new Date(tx.date).toLocaleDateString("pt-BR") : "N/A"} • {tx.account_name || "Conta"}
                        </p>
                      </div>
                      <p className={`font-semibold ${parseFloat(tx.amount || 0) >= 0 ? "text-success" : ""}`}>
                        R$ {Math.abs(parseFloat(tx.amount || 0)).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  ))}
                </div>
              </ChartCard>
            </div>
          )}
        </TabsContent>

        {/* Balances Tab */}
        <TabsContent value="balances" className="mt-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-4">Contas Bancárias</h2>
            {dashboardData.groupedAccounts.length === 0 ? (
              <ChartCard>
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Nenhuma conta conectada</p>
                  <Button onClick={handlePluggyConnection} className="mt-4">
                    <Link2 className="h-4 w-4 mr-2" />
                    Conectar Banco
                  </Button>
                </div>
              </ChartCard>
            ) : (
              <div className="flex flex-wrap gap-4">
                {dashboardData.groupedAccounts.map((group: any, idx: number) => (
                  <ChartCard key={idx} className="p-4 flex-1 min-w-[300px] max-w-[500px]">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {group.institution_logo && (
                          <img src={group.institution_logo} alt={group.institution_name} className="h-10 w-10" />
                        )}
                        <div>
                          <h3 className="font-semibold">{group.institution_name}</h3>
                          <p className="text-sm text-muted-foreground">{group.accounts.length} conta(s)</p>
                        </div>
                      </div>
                      <p className="text-2xl font-bold">
                        R$ {group.total.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="space-y-2">
                      {group.accounts.map((acc: any) => (
                        <div key={acc.id} className="flex justify-between items-center p-2 rounded border">
                          <div>
                            <p className="font-medium">{acc.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{acc.type}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">
                              R$ {parseFloat(acc.current_balance || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            {acc.available_balance !== null && (
                              <p className="text-xs text-muted-foreground">
                                Disponível: R$ {parseFloat(acc.available_balance || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ChartCard>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="mt-6 space-y-6">
          <div>
            <div className="flex flex-col gap-4 mb-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Transações</h2>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar..."
                      value={transactionsSearch}
                      onChange={(e) => {
                        setTransactionsSearch(e.target.value);
                        setTransactionsPage(1);
                      }}
                      className="pl-9 w-64"
                    />
                  </div>
                  <Select
                    value={transactionsLimit.toString()}
                    onValueChange={(value) => {
                      setTransactionsLimit(parseInt(value));
                      setTransactionsPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Por página" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 por página</SelectItem>
                      <SelectItem value="20">20 por página</SelectItem>
                      <SelectItem value="50">50 por página</SelectItem>
                      <SelectItem value="100">100 por página</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {dashboardData.transactions.length > 0 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {(() => {
                      // Always use the stored total, which remains constant
                      const total = transactionsTotal > 0 ? transactionsTotal : transactionsPagination.total;
                      const limit = transactionsPagination.limit || transactionsLimit;
                      
                      if (total > 0) {
                        const start = ((transactionsPage - 1) * limit) + 1;
                        const end = Math.min(transactionsPage * limit, total);
                        return `Mostrando ${start} - ${end} de ${total} transações`;
                      } else {
                        return `Mostrando ${dashboardData.transactions.length} transação(ões)`;
                      }
                    })()}
                  </div>
                  {(() => {
                    // Always show pagination if there are transactions
                    if (dashboardData.transactions.length === 0) return null;
                    
                    const totalPages = transactionsPagination.totalPages || 1;
                    const currentPage = transactionsPage;
                    
                    return (
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              onClick={(e) => {
                                e.preventDefault();
                                if (transactionsPage > 1) {
                                  setTransactionsPage(transactionsPage - 1);
                                }
                              }}
                              className={cn(
                                transactionsPage === 1 && "pointer-events-none opacity-50"
                              )}
                              href="#"
                            />
                          </PaginationItem>
                          {(() => {
                            const pages: (number | 'ellipsis')[] = [];
                            
                            if (totalPages <= 7) {
                              // Show all pages if 7 or fewer
                              for (let i = 1; i <= totalPages; i++) {
                                pages.push(i);
                              }
                            } else {
                              // Always show first page
                              pages.push(1);
                              
                              if (currentPage <= 3) {
                                // Show 1, 2, 3, 4, ..., last
                                for (let i = 2; i <= 4; i++) {
                                  pages.push(i);
                                }
                                pages.push('ellipsis');
                                pages.push(totalPages);
                              } else if (currentPage >= totalPages - 2) {
                                // Show 1, ..., last-3, last-2, last-1, last
                                pages.push('ellipsis');
                                for (let i = totalPages - 3; i <= totalPages; i++) {
                                  pages.push(i);
                                }
                              } else {
                                // Show 1, ..., current-1, current, current+1, ..., last
                                pages.push('ellipsis');
                                for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                                  pages.push(i);
                                }
                                pages.push('ellipsis');
                                pages.push(totalPages);
                              }
                            }
                            
                            return pages.map((pageNum, index) => (
                              <PaginationItem key={index}>
                                {pageNum === 'ellipsis' ? (
                                  <PaginationEllipsis />
                                ) : (
                                  <PaginationLink
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setTransactionsPage(pageNum);
                                    }}
                                    isActive={pageNum === currentPage}
                                    href="#"
                                  >
                                    {pageNum}
                                  </PaginationLink>
                                )}
                              </PaginationItem>
                            ));
                          })()}
                          <PaginationItem>
                            <PaginationNext
                              onClick={(e) => {
                                e.preventDefault();
                                if (transactionsPage < totalPages) {
                                  setTransactionsPage(transactionsPage + 1);
                                }
                              }}
                              className={cn(
                                transactionsPage === totalPages && "pointer-events-none opacity-50"
                              )}
                              href="#"
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    );
                  })()}
                </div>
              )}
            </div>
            {dashboardData.transactions.length === 0 ? (
              <ChartCard>
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Nenhuma transação encontrada</p>
                </div>
              </ChartCard>
            ) : (
              <>
                <ChartCard>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dashboardData.transactions.map((tx: any) => (
                        <TableRow key={tx.id || tx.pluggy_transaction_id}>
                          <TableCell>
                            {tx.date ? new Date(tx.date).toLocaleDateString("pt-BR") : "N/A"}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{tx.description || tx.merchant || "Transação"}</p>
                              {tx.account_name && (
                                <p className="text-xs text-muted-foreground">{tx.account_name}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs px-2 py-1 rounded bg-muted">
                              {tx.category || "Outros"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <p className={`font-semibold ${parseFloat(tx.amount || 0) >= 0 ? "text-success" : ""}`}>
                              R$ {Math.abs(parseFloat(tx.amount || 0)).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ChartCard>
              </>
            )}
          </div>
        </TabsContent>

        {/* Investments Tab */}
        <TabsContent value="investments" className="mt-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-4">Investimentos</h2>
            {dashboardData.investments.length === 0 ? (
              <ChartCard>
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Nenhum investimento encontrado</p>
                </div>
              </ChartCard>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <ProfessionalKpiCard
                    title="Total Investido"
                    value={`R$ ${dashboardData.totalInvestments.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    change=""
                    changeType="neutral"
                    icon={TrendingUp}
                    subtitle={`${dashboardData.investments.length} ativo(s)`}
                  />
                </div>
                <ChartCard>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Quantidade</TableHead>
                        <TableHead className="text-right">Valor Atual</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dashboardData.investments.map((inv: any) => (
                        <TableRow key={inv.id || inv.pluggy_investment_id}>
                          <TableCell className="font-medium">{inv.name}</TableCell>
                          <TableCell>
                            <span className="text-xs px-2 py-1 rounded bg-muted capitalize">
                              {inv.type || "Outros"}
                            </span>
                          </TableCell>
                          <TableCell>
                            {inv.quantity ? parseFloat(inv.quantity).toLocaleString("pt-BR") : "-"}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            R$ {parseFloat(inv.current_value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ChartCard>
              </>
            )}
          </div>
        </TabsContent>

        {/* Credit Cards Tab */}
        <TabsContent value="cards" className="mt-6 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Cartões de Crédito</h2>
              <Button 
                onClick={handleSyncAll}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            </div>
            {dashboardData.cards.length === 0 ? (
              <ChartCard>
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">Nenhum cartão encontrado</p>
                  <Button onClick={handlePluggyConnection} variant="outline">
                    <Link2 className="h-4 w-4 mr-2" />
                    Conectar com Pluggy
                  </Button>
                </div>
              </ChartCard>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dashboardData.cards.map((card: any) => {
                  // Handle 'limit' field which is a reserved keyword in PostgreSQL
                  const limit = parseFloat(card.limit || card["limit"] || 0);
                  const availableLimit = parseFloat(card.available_limit || 0);
                  // Balance is the current invoice balance (amount used/owed)
                  const balance = parseFloat(card.balance || 0);
                  // Calculate used amount: limit - availableLimit, or use balance if available
                  const used = balance > 0 ? balance : (limit - availableLimit);
                  const usagePercent = limit > 0 ? (used / limit) * 100 : 0;
                  
                  // latest_invoice is a JSON object from PostgreSQL json_build_object
                  let latestInvoice = null;
                  if (card.latest_invoice) {
                    if (typeof card.latest_invoice === 'object' && !Array.isArray(card.latest_invoice)) {
                      latestInvoice = card.latest_invoice;
                    } else if (Array.isArray(card.latest_invoice) && card.latest_invoice.length > 0) {
                      latestInvoice = card.latest_invoice[0];
                    } else if (typeof card.latest_invoice === 'string') {
                      // If it's a JSON string, parse it
                      try {
                        latestInvoice = JSON.parse(card.latest_invoice);
                      } catch (e) {
                        console.warn('Failed to parse latest_invoice:', e);
                      }
                    }
                  }

                  return (
                    <ChartCard key={card.id || card.pluggy_card_id} className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          {card.institution_logo && (
                            <img src={card.institution_logo} alt={card.institution_name} className="h-8 w-8" />
                          )}
                          <div>
                            <h3 className="font-semibold">
                              {card.brand || "Cartão"} •••• {card.last4 || ""}
                            </h3>
                            {card.institution_name && (
                              <p className="text-xs text-muted-foreground">{card.institution_name}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Limite Total</span>
                            <span className="font-semibold">
                              R$ {limit.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Fatura Atual</span>
                            <span className="font-semibold">
                              R$ {balance.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Disponível</span>
                            <span className="font-semibold text-success">
                              R$ {availableLimit.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2 mt-2">
                            <div
                              className={`h-2 rounded-full ${usagePercent > 80 ? "bg-destructive" : usagePercent > 50 ? "bg-warning" : "bg-success"}`}
                              style={{ width: `${Math.min(usagePercent, 100)}%` }}
                            />
                          </div>
                        </div>
                        {latestInvoice && (
                          <div className="pt-3 border-t">
                            <p className="text-xs text-muted-foreground mb-1">Última Fatura</p>
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-semibold">
                                  R$ {parseFloat(latestInvoice.amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                                {latestInvoice.due_date && (
                                  <p className="text-xs text-muted-foreground">
                                    Vence: {new Date(latestInvoice.due_date).toLocaleDateString("pt-BR")}
                                  </p>
                                )}
                              </div>
                              {latestInvoice.status && (
                                <span className={`text-xs px-2 py-1 rounded ${
                                  latestInvoice.status === "paid" ? "bg-success/20 text-success" :
                                  latestInvoice.status === "open" ? "bg-warning/20 text-warning" :
                                  "bg-muted"
                                }`}>
                                  {latestInvoice.status === "paid" ? "Paga" :
                                   latestInvoice.status === "open" ? "Aberta" :
                                   latestInvoice.status}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </ChartCard>
                  );
                })}
              </div>
            )}
          </div>
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
