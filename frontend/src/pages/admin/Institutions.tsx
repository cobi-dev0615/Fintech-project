import { useState, useEffect } from "react";
import { Building2, TrendingUp, Search, X, Check, Save, Plus, LayoutGrid, Table as TableIcon, ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ChartCard from "@/components/dashboard/ChartCard";
import { adminApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Institution {
  id: string;
  provider: string;
  external_id: string | null;
  name: string;
  logo_url: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

const Institutions = () => {
  const [activeTab, setActiveTab] = useState<"individual" | "legal" | "brokers">("individual");
  const [viewMode, setViewMode] = useState<"table" | "card">("card");
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [filteredInstitutions, setFilteredInstitutions] = useState<Institution[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changes, setChanges] = useState<Record<string, boolean>>({});
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingInstitution, setEditingInstitution] = useState<Institution | null>(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [newInstitution, setNewInstitution] = useState({
    name: "",
    provider: "open_finance" as "open_finance" | "b3",
    external_id: "",
    enabled: true,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchInstitutions();
  }, []);

  useEffect(() => {
    filterInstitutions();
    setCurrentPage(1); // Reset to first page when filters change
  }, [searchQuery, institutions, activeTab]);

  const fetchInstitutions = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getInstitutions('open_finance');
      setInstitutions(data.institutions || []);
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

  const filterInstitutions = () => {
    let filtered = institutions;

    // Filter by type based on external_id or name
    if (activeTab === "individual") {
      // Individual banks (Pessoa física)
      filtered = filtered.filter(inst => 
        inst.external_id?.startsWith('individual_') ||
        (!inst.external_id?.startsWith('legal_') && 
         !inst.external_id?.startsWith('broker_') &&
         !inst.name.toLowerCase().includes('corretora') &&
         !inst.name.toLowerCase().includes('investimentos') &&
         !inst.name.toLowerCase().includes('empresas'))
      );
    } else if (activeTab === "legal") {
      // Legal entity banks (Pessoa jurídica)
      filtered = filtered.filter(inst => 
        inst.external_id?.startsWith('legal_') ||
        inst.name.toLowerCase().includes('empresas')
      );
    } else {
      // Brokers (Corretoras)
      filtered = filtered.filter(inst => 
        inst.external_id?.startsWith('broker_') ||
        inst.name.toLowerCase().includes('corretora') ||
        inst.name.toLowerCase().includes('investimentos')
      );
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(inst =>
        inst.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredInstitutions(filtered);
  };

  const toggleInstitution = (id: string, currentEnabled: boolean) => {
    setChanges(prev => ({
      ...prev,
      [id]: !currentEnabled,
    }));
  };

  const saveChanges = async () => {
    try {
      setSaving(true);
      const updates = Object.entries(changes).map(([id, enabled]) => ({
        id,
        enabled,
      }));

      await adminApi.bulkUpdateInstitutions(updates);

      // Update local state
      setInstitutions(prev => prev.map(inst => 
        changes[inst.id] !== undefined 
          ? { ...inst, enabled: changes[inst.id] }
          : inst
      ));

      setChanges({});
      toast({
        title: "Sucesso",
        description: "Alterações salvas com sucesso",
      });
    } catch (err: any) {
      console.error('Error saving changes:', err);
      toast({
        title: "Erro",
        description: "Erro ao salvar alterações",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateInstitution = async () => {
    try {
      if (!newInstitution.name.trim()) {
        toast({
          title: "Erro",
          description: "O nome da instituição é obrigatório",
          variant: "destructive",
        });
        return;
      }

      setCreating(true);
      await adminApi.createInstitution({
        name: newInstitution.name.trim(),
        provider: newInstitution.provider,
        external_id: newInstitution.external_id.trim() || undefined,
        enabled: newInstitution.enabled,
      });

      toast({
        title: "Sucesso",
        description: "Instituição criada com sucesso",
      });

      // Reset form
      setNewInstitution({
        name: "",
        provider: "open_finance",
        external_id: "",
        enabled: true,
      });
      setIsCreateDialogOpen(false);

      // Refresh institutions list
      await fetchInstitutions();
    } catch (err: any) {
      console.error('Error creating institution:', err);
      toast({
        title: "Erro",
        description: err?.error || "Erro ao criar instituição",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleEditClick = (institution: Institution) => {
    setEditingInstitution(institution);
    setIsEditDialogOpen(true);
  };

  const handleUpdateInstitution = async () => {
    if (!editingInstitution) return;

    try {
      if (!editingInstitution.name.trim()) {
        toast({
          title: "Erro",
          description: "O nome da instituição é obrigatório",
          variant: "destructive",
        });
        return;
      }

      setUpdating(true);
      await adminApi.updateInstitution(editingInstitution.id, {
        name: editingInstitution.name.trim(),
      });

      toast({
        title: "Sucesso",
        description: "Instituição atualizada com sucesso",
      });

      setIsEditDialogOpen(false);
      setEditingInstitution(null);

      // Refresh institutions list
      await fetchInstitutions();
    } catch (err: any) {
      console.error('Error updating institution:', err);
      toast({
        title: "Erro",
        description: err?.error || "Erro ao atualizar instituição",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const hasChanges = Object.keys(changes).length > 0;

  // Pagination calculations
  const totalPages = Math.ceil(filteredInstitutions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedInstitutions = filteredInstitutions.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Instituições</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie a lista de bancos e corretoras disponíveis
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsCreateDialogOpen(true)} variant="default">
            <Plus className="h-4 w-4 mr-2" />
            Criar Instituição
          </Button>
          {hasChanges && (
            <Button onClick={saveChanges} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Salvando..." : "Salvar Alterações"}
            </Button>
          )}
        </div>
      </div>

      {/* Search and View Toggle */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar instituições..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 border rounded-md p-1">
          <Button
            variant={viewMode === "card" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("card")}
            className="h-8"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("table")}
            className="h-8"
          >
            <TableIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "individual" | "legal" | "brokers")}>
        <TabsList>
          <TabsTrigger value="individual">
            <Building2 className="h-4 w-4 mr-2" />
            Pessoa Física ({institutions.filter(inst => 
              inst.external_id?.startsWith('individual_') ||
              (!inst.external_id?.startsWith('legal_') && 
               !inst.external_id?.startsWith('broker_') &&
               !inst.name.toLowerCase().includes('corretora') &&
               !inst.name.toLowerCase().includes('investimentos') &&
               !inst.name.toLowerCase().includes('empresas'))
            ).length})
          </TabsTrigger>
          <TabsTrigger value="legal">
            <Building2 className="h-4 w-4 mr-2" />
            Pessoa Jurídica ({institutions.filter(inst => 
              inst.external_id?.startsWith('legal_') ||
              inst.name.toLowerCase().includes('empresas')
            ).length})
          </TabsTrigger>
          <TabsTrigger value="brokers">
            <TrendingUp className="h-4 w-4 mr-2" />
            Corretoras ({institutions.filter(inst => 
              inst.external_id?.startsWith('broker_') ||
              inst.name.toLowerCase().includes('corretora') ||
              inst.name.toLowerCase().includes('investimentos')
            ).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">Carregando...</p>
            </div>
          ) : filteredInstitutions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchQuery ? "Nenhuma instituição encontrada" : "Nenhuma instituição disponível nesta categoria"}
              </p>
            </div>
          ) : viewMode === "table" ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Provedor</TableHead>
                    <TableHead>ID Externo</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedInstitutions.map((institution) => {
                    const enabled = changes[institution.id] !== undefined 
                      ? changes[institution.id] 
                      : institution.enabled;
                    const hasChange = changes[institution.id] !== undefined;

                    return (
                      <TableRow 
                        key={institution.id}
                        className={cn(!enabled && "opacity-60")}
                      >
                        <TableCell>
                          {institution.logo_url ? (
                            <img 
                              src={institution.logo_url} 
                              alt={institution.name}
                              className="h-8 w-8 object-contain"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                              {activeTab === "brokers" ? (
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{institution.name}</span>
                            {hasChange && (
                              <span className="text-xs text-warning">Alteração pendente</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground capitalize">
                            {institution.provider === "open_finance" ? "Open Finance" : "B3"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground font-mono">
                            {institution.external_id || "-"}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {enabled ? (
                            <div className="inline-flex items-center gap-1 text-success">
                              <Check className="h-4 w-4" />
                              <span className="text-sm">Habilitado</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 text-destructive">
                              <X className="h-4 w-4" />
                              <span className="text-sm">Desabilitado</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex gap-2 justify-center">
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => handleEditClick(institution)}
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant={enabled ? "destructive" : "default"}
                              onClick={() => toggleInstitution(institution.id, enabled)}
                              title={enabled ? "Desabilitar" : "Habilitar"}
                            >
                              {enabled ? (
                                <X className="h-4 w-4" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {paginatedInstitutions.map((institution) => {
                const enabled = changes[institution.id] !== undefined 
                  ? changes[institution.id] 
                  : institution.enabled;
                const hasChange = changes[institution.id] !== undefined;

                return (
                  <ChartCard 
                    key={institution.id} 
                    className={cn(
                      "relative overflow-hidden transition-opacity",
                      !enabled && "opacity-50"
                    )}
                  >
                    {/* Enabled/Disabled indicator */}
                    <div className="absolute top-2 right-2 z-10">
                      {enabled ? (
                        <div className="bg-success rounded-full p-1.5 shadow-lg">
                          <Check className="h-4 w-4 text-success-foreground" />
                        </div>
                      ) : (
                        <div className="bg-muted rounded-full p-1.5 shadow-lg border-2 border-destructive">
                          <X className="h-4 w-4 text-destructive" />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-center text-center space-y-3 p-4">
                      {institution.logo_url ? (
                        <img 
                          src={institution.logo_url} 
                          alt={institution.name}
                          className="h-12 w-12 object-contain"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                          {activeTab === "brokers" ? (
                            <TrendingUp className="h-6 w-6 text-muted-foreground" />
                          ) : (
                            <Building2 className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                      )}
                      
                      <h3 className="font-semibold text-sm line-clamp-2">{institution.name}</h3>
                      
                      {hasChange && (
                        <div className="text-xs text-warning">
                          Alteração pendente
                        </div>
                      )}
                      
                      <div className="flex gap-2 w-full justify-center">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleEditClick(institution)}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant={enabled ? "destructive" : "default"}
                          onClick={() => toggleInstitution(institution.id, enabled)}
                          title={enabled ? "Desabilitar" : "Habilitar"}
                        >
                          {enabled ? (
                            <X className="h-4 w-4" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </ChartCard>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {filteredInstitutions.length > itemsPerPage && (
            <div className="mt-6">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <Button
                      variant="ghost"
                      size="default"
                      onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="gap-1 pl-2.5"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span>Anterior</span>
                    </Button>
                  </PaginationItem>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // Show first page, last page, current page, and pages around current
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <PaginationItem key={page}>
                          <Button
                            variant={page === currentPage ? "outline" : "ghost"}
                            size="icon"
                            onClick={() => handlePageChange(page)}
                            className="h-9 w-9"
                          >
                            {page}
                          </Button>
                        </PaginationItem>
                      );
                    } else if (
                      page === currentPage - 2 ||
                      page === currentPage + 2
                    ) {
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
                      onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="gap-1 pr-2.5"
                    >
                      <span>Próxima</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
              <div className="text-center text-sm text-muted-foreground mt-2">
                Mostrando {startIndex + 1} - {Math.min(endIndex, filteredInstitutions.length)} de {filteredInstitutions.length} instituições
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Institution Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Criar Nova Instituição</DialogTitle>
            <DialogDescription>
              Adicione uma nova instituição financeira ao sistema
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                placeholder="Ex: Banco Exemplo"
                value={newInstitution.name}
                onChange={(e) =>
                  setNewInstitution({ ...newInstitution, name: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="provider">Provedor *</Label>
              <Select
                value={newInstitution.provider}
                onValueChange={(value: "open_finance" | "b3") =>
                  setNewInstitution({ ...newInstitution, provider: value })
                }
              >
                <SelectTrigger id="provider">
                  <SelectValue placeholder="Selecione o provedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open_finance">Open Finance</SelectItem>
                  <SelectItem value="b3">B3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="external_id">ID Externo</Label>
              <Input
                id="external_id"
                placeholder="ID externo (opcional)"
                value={newInstitution.external_id}
                onChange={(e) =>
                  setNewInstitution({ ...newInstitution, external_id: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                ID único do provedor externo (ex: Pluggy institution ID)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="enabled"
                checked={newInstitution.enabled}
                onChange={(e) =>
                  setNewInstitution({ ...newInstitution, enabled: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="enabled" className="cursor-pointer">
                Habilitado por padrão
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              disabled={creating}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreateInstitution} disabled={creating}>
              {creating ? "Criando..." : "Criar Instituição"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Institution Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Instituição</DialogTitle>
            <DialogDescription>
              Atualize as informações da instituição
            </DialogDescription>
          </DialogHeader>
          {editingInstitution && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Nome *</Label>
                <Input
                  id="edit-name"
                  placeholder="Ex: Banco Exemplo"
                  value={editingInstitution.name}
                  onChange={(e) =>
                    setEditingInstitution({ ...editingInstitution, name: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-provider">Provedor</Label>
                <Input
                  id="edit-provider"
                  value={editingInstitution.provider === "open_finance" ? "Open Finance" : "B3"}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  O provedor não pode ser alterado
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-external_id">ID Externo</Label>
                <Input
                  id="edit-external_id"
                  placeholder="ID externo (opcional)"
                  value={editingInstitution.external_id || ""}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  O ID externo não pode ser alterado
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setEditingInstitution(null);
              }}
              disabled={updating}
            >
              Cancelar
            </Button>
            <Button onClick={handleUpdateInstitution} disabled={updating}>
              {updating ? "Atualizando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Institutions;
