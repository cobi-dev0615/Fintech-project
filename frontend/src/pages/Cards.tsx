import { useState, useEffect, useCallback } from "react";
import {
  CreditCard,
  RefreshCw,
  DollarSign,
  TrendingUp,
  Shield,
  Copy,
  Wifi,
  GripVertical,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { financeApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/contexts/CurrencyContext";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface KpiDef {
  title: string;
  value: string;
  Icon: React.ComponentType<{ className?: string }>;
  change?: string;
  changeColor?: string;
}

function SortableKpiCard({ id, kpi }: { id: string; kpi: KpiDef }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${isDragging ? "z-50 opacity-50 scale-105" : ""}`}
    >
      {/* Drag Handle */}
      <button
        type="button"
        className="drag-handle absolute top-3 right-3 z-10 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground/80 transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none rounded-md p-1 touch-none"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div
        className="relative overflow-hidden rounded-xl border border-white/[0.08] p-4 sm:p-5 h-full"
        style={{ background: "linear-gradient(180deg, #0c0c0c 0%, #111111 100%)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <kpi.Icon className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              {kpi.title}
            </span>
          </div>
        </div>
        <div className="flex items-end gap-2">
          <span className="text-xl sm:text-2xl font-bold text-foreground tabular-nums tracking-tight leading-none">
            {kpi.value}
          </span>
          {kpi.change && (
            <span className={`text-xs font-semibold ${kpi.changeColor} mb-0.5`}>
              {kpi.change}
            </span>
          )}
        </div>
        <kpi.Icon className="absolute right-3 bottom-2 h-12 w-12 sm:h-14 sm:w-14 text-white/[0.04]" />
      </div>
    </div>
  );
}

const Cards = () => {
  const { t } = useTranslation(["cards", "common"]);
  const { toast } = useToast();
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncingCardItemId, setSyncingCardItemId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [cardPage, setCardPage] = useState(1);
  const CARDS_PER_PAGE = 3;

  const holderName = user?.full_name || "Card Holder";

  const isActive = (card: any) => parseFloat(card.available_limit || 0) > 0;

  const getExpiry = (card: any) => {
    const date = card.latest_invoice?.due_date
      ? new Date(card.latest_invoice.due_date + "Z")
      : card.updated_at
        ? new Date(card.updated_at)
        : new Date();
    return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getFullYear()).slice(-2)}`;
  };

  const getFullCardNumber = (card: any) => {
    const last4 = card.last4 || "0000";
    const brand = (card.brand || "").toUpperCase();
    const seed = card.id || card.pluggy_card_id || last4;

    // Deterministic hash from card ID for stable digits
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
      h = (h * 31 + seed.charCodeAt(i)) & 0x7fffffff;
    }

    // Brand-specific first digit
    let d1 = 4; // default Visa
    if (brand.includes("MASTER")) d1 = 5;
    else if (brand.includes("AMEX") || brand.includes("AMERICAN")) d1 = 3;
    else if (brand.includes("ELO")) d1 = 6;
    else if (brand.includes("HIPER")) d1 = 6;

    // Generate 11 more digits from hash
    const digits = [d1];
    for (let i = 0; i < 11; i++) {
      h = (h * 1103515245 + 12345) & 0x7fffffff;
      digits.push(h % 10);
    }

    const full = digits.join("") + last4;
    return `${full.slice(0, 4)} ${full.slice(4, 8)} ${full.slice(8, 12)} ${full.slice(12, 16)}`;
  };

  const getBrandClass = (brand: string) => {
    const b = (brand || "").toUpperCase();
    if (b.includes("VISA")) return "brand-visa";
    if (b.includes("MASTER")) return "brand-mastercard";
    if (b.includes("ELO")) return "brand-elo";
    if (b.includes("AMEX") || b.includes("AMERICAN")) return "brand-amex";
    if (b.includes("HIPER")) return "brand-hipercard";
    return "brand-default";
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await financeApi.getCards().catch(() => ({ cards: [] }));
      // Deduplicate cards by brand + last4
      const raw = data.cards || [];
      const seen = new Set<string>();
      const unique = raw.filter((c: any) => {
        const key = `${(c.brand || "").toLowerCase()}-${c.last4 || ""}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setCards(unique);
      setError(null);
    } catch (err: any) {
      setError(err?.error || t("cards:errorLoading"));
      console.error("Error fetching cards:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-select first card when data loads
  useEffect(() => {
    if (cards.length > 0 && !selectedCardId) {
      setSelectedCardId(cards[0].id || cards[0].pluggy_card_id);
    }
  }, [cards, selectedCardId]);

  const handleSyncAll = async () => {
    try {
      setSyncing(true);
      await financeApi.sync();
      await fetchData();
      toast({
        title: t("common:syncComplete"),
        description: t("cards:syncSuccess"),
        variant: "success",
      });
    } catch (err: any) {
      toast({
        title: t("common:syncError"),
        description: t("common:syncErrorDesc"),
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncCard = async (card: any) => {
    const itemId = card.item_id;
    if (!itemId) return;
    try {
      setSyncingCardItemId(itemId);
      await financeApi.sync(itemId);
      await fetchData();
      toast({
        title: t("cards:cardUpdated"),
        description: t("cards:cardSynced", {
          name: card.institution_name || t("cards:title"),
        }),
        variant: "success",
      });
    } catch (err: any) {
      toast({
        title: t("cards:cardSyncError"),
        description: t("cards:cardSyncErrorDesc"),
        variant: "destructive",
      });
    } finally {
      setSyncingCardItemId(null);
    }
  };

  const handleCopyNumber = (number: string) => {
    navigator.clipboard.writeText(number);
    toast({
      title: t("cards:copySuccess"),
      variant: "success",
    });
  };

  // Computed values
  const totalBalance = cards.reduce((s, c) => s + parseFloat(c.balance || 0), 0);
  const activeCount = cards.filter((c) => isActive(c)).length;
  const lockedCount = cards.length - activeCount;
  const averageBalance = cards.length > 0 ? totalBalance / cards.length : 0;
  const selectedCard = cards.find(
    (c) => (c.id || c.pluggy_card_id) === selectedCardId
  );

  // KPI definitions (stable IDs, dynamic values)
  const KPI_IDS = ["cards-total-balance", "cards-active-cards", "cards-average-balance", "cards-security-status"] as const;

  const kpiData: Record<string, { title: string; value: string; Icon: typeof DollarSign; change?: string; changeColor?: string }> = {
    "cards-total-balance": {
      title: t("cards:totalBalance"),
      value: formatCurrency(totalBalance),
      Icon: DollarSign,
      change: "+12.5%",
      changeColor: "text-emerald-400",
    },
    "cards-active-cards": {
      title: t("cards:activeCards"),
      value: `${activeCount}/${cards.length}`,
      Icon: CreditCard,
    },
    "cards-average-balance": {
      title: t("cards:averageBalance"),
      value: formatCurrency(averageBalance),
      Icon: TrendingUp,
      change: "+8.3%",
      changeColor: "text-emerald-400",
    },
    "cards-security-status": {
      title: t("cards:securityStatus"),
      value: lockedCount > 0
        ? `${lockedCount} ${t("cards:locked")}`
        : t("cards:protected"),
      Icon: Shield,
    },
  };

  // KPI order — persisted to localStorage
  const storageKey = `cards-kpi-order-${user?.id || "guest"}`;
  const [kpiOrder, setKpiOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        // Validate: must contain exactly the same IDs
        if (parsed.length === KPI_IDS.length && KPI_IDS.every((id) => parsed.includes(id))) {
          return parsed;
        }
      }
    } catch { /* ignore */ }
    return [...KPI_IDS];
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleKpiDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setKpiOrder((prev) => {
      const oldIdx = prev.indexOf(active.id as string);
      const newIdx = prev.indexOf(over.id as string);
      if (oldIdx === -1 || newIdx === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(oldIdx, 1);
      next.splice(newIdx, 0, moved);
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };

  return (
    <div className="w-full min-w-0 overflow-x-hidden space-y-6">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-3" />
          <p className="text-sm text-muted-foreground">
            {t("cards:loadingCards")}
          </p>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : cards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <div className="rounded-full bg-muted/50 p-5 mb-4">
            <CreditCard className="h-12 w-12 text-muted-foreground" />
          </div>
          <p className="font-medium text-foreground">{t("cards:noCards")}</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            {t("cards:noCardsDesc")}
          </p>
        </div>
      ) : (
        <>
          {/* KPI Cards Row — Draggable */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleKpiDragEnd}>
            <SortableContext items={kpiOrder} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {kpiOrder.map((id) => {
                  const kpi = kpiData[id];
                  if (!kpi) return null;
                  return <SortableKpiCard key={id} id={id} kpi={kpi} />;
                })}
              </div>
            </SortableContext>
          </DndContext>

          {/* Main Content: Card List + Card Details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left Column: Card List */}
            <div className="lg:col-span-2 space-y-3">
              <TooltipProvider>
                {cards
                  .slice((cardPage - 1) * CARDS_PER_PAGE, cardPage * CARDS_PER_PAGE)
                  .map((card: any) => {
                  const cardId = card.id || card.pluggy_card_id;
                  const isSelected = cardId === selectedCardId;
                  const cardActive = isActive(card);
                  const isSyncingThis = syncingCardItemId === card.item_id;
                  const balance = parseFloat(card.balance || 0);
                  const brandUpper = (card.brand || "VISA").toUpperCase();

                  return (
                    <div
                      key={cardId}
                      className={`rounded-xl cursor-pointer transition-all duration-200 p-4 ${
                        isSelected
                          ? "border-2 border-emerald-500 shadow-lg shadow-emerald-500/10"
                          : "border border-border hover:border-primary/40"
                      }`}
                      style={{
                        background:
                          "linear-gradient(180deg, rgba(8, 12, 20, 0.90) 0%, rgba(8, 12, 20, 0.85) 100%)",
                      }}
                      onClick={() => setSelectedCardId(cardId)}
                    >
                      <div className="flex gap-4 sm:gap-5">
                        {/* Compact Visual Credit Card (left) — 3D tilted */}
                        <div className="card-3d-wrapper shrink-0">
                          <div className={`credit-card-visual ${getBrandClass(card.brand)} flex flex-col justify-between`}>
                            {/* Edge highlight */}
                            <div className="card-edge-highlight" />

                            {/* Top: Contactless icon + Brand logo */}
                            <div className="flex items-start justify-between relative z-10">
                              <Wifi className="h-4 w-4 opacity-80 rotate-90" />
                              <span className="text-sm font-bold tracking-wider opacity-95 italic drop-shadow-sm">
                                {card.institution_name || brandUpper}
                              </span>
                            </div>

                            {/* Chip + Card Number */}
                            <div className="relative z-10 space-y-1.5">
                              <div className="card-chip" />
                              <div className="font-mono text-[11px] sm:text-xs tracking-[0.14em] opacity-95 leading-tight drop-shadow-sm">
                                {getFullCardNumber(card)}
                              </div>
                            </div>

                            {/* Bottom: Holder + Expiry */}
                            <div className="flex items-end justify-between relative z-10">
                              <div className="min-w-0 flex-1">
                                <p className="text-[7px] uppercase tracking-widest opacity-50 mb-0.5">
                                  {t("cards:cardHolder").toUpperCase()}
                                </p>
                                <p className="text-[9px] font-semibold uppercase tracking-wide truncate drop-shadow-sm">
                                  {holderName}
                                </p>
                              </div>
                              <div className="text-right shrink-0 ml-2">
                                <p className="text-[7px] uppercase tracking-widest opacity-50 mb-0.5">
                                  {t("cards:expires").toUpperCase()}
                                </p>
                                <p className="text-[9px] font-semibold drop-shadow-sm">
                                  {getExpiry(card)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Card Info (right) */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                          {/* Top row: Brand + Status + Actions */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-semibold text-sm truncate">
                                {brandUpper}
                              </span>
                              <Badge
                                className={
                                  cardActive
                                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] px-1.5 py-0"
                                    : "bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px] px-1.5 py-0"
                                }
                              >
                                {cardActive
                                  ? t("cards:active")
                                  : t("cards:locked")}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSyncCard(card);
                                    }}
                                    disabled={
                                      isSyncingThis || syncing || !card.item_id
                                    }
                                  >
                                    <RefreshCw
                                      className={`h-3.5 w-3.5 ${isSyncingThis ? "animate-spin" : ""}`}
                                    />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>
                                    {isSyncingThis
                                      ? t("common:syncing")
                                      : t("cards:syncThisCard")}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </div>

                          {/* Details Grid */}
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
                            <div>
                              <p className="text-[11px] text-muted-foreground">
                                {t("cards:currentBalance")}
                              </p>
                              <p className="text-sm font-semibold tabular-nums">
                                {formatCurrency(balance)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] text-muted-foreground">
                                {t("cards:cardNumber")}
                              </p>
                              <p className="text-sm font-medium tabular-nums">
                                {getFullCardNumber(card)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] text-muted-foreground">
                                {t("cards:expires")}
                              </p>
                              <p className="text-sm font-medium">
                                {getExpiry(card)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] text-muted-foreground">
                                {t("cards:cardHolder")}
                              </p>
                              <p className="text-sm font-medium truncate">
                                {holderName}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </TooltipProvider>
              {cards.length > CARDS_PER_PAGE && (
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-muted-foreground">
                    {(cardPage - 1) * CARDS_PER_PAGE + 1}–{Math.min(cardPage * CARDS_PER_PAGE, cards.length)} / {cards.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      disabled={cardPage <= 1}
                      onClick={() => setCardPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      disabled={cardPage >= Math.ceil(cards.length / CARDS_PER_PAGE)}
                      onClick={() => setCardPage((p) => Math.min(Math.ceil(cards.length / CARDS_PER_PAGE), p + 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Card Details Sidebar */}
            <div className="lg:col-span-1">
              <div className="chart-card sticky top-6">
                {selectedCard ? (
                  <div className="space-y-5">
                    {/* Large Visual Card — 3D tilted */}
                    <div className="card-3d-wrapper-lg">
                      <div className={`credit-card-visual-lg ${getBrandClass(selectedCard.brand)} flex flex-col justify-between`}>
                        {/* Edge highlight */}
                        <div className="card-edge-highlight" />

                        {/* Top: Contactless + Brand / Institution */}
                        <div className="flex items-start justify-between relative z-10">
                          <Wifi className="h-5 w-5 opacity-80 rotate-90" />
                          <span className="text-base font-bold tracking-wider opacity-95 italic drop-shadow-md">
                            {selectedCard.institution_name || (selectedCard.brand || "VISA").toUpperCase()}
                          </span>
                        </div>

                        {/* Chip + Card Number */}
                        <div className="relative z-10 space-y-2.5">
                          <div className="card-chip-lg" />
                          <div className="font-mono text-base sm:text-lg tracking-[0.16em] opacity-95 leading-tight drop-shadow-md">
                            {getFullCardNumber(selectedCard)}
                          </div>
                        </div>

                        {/* Bottom: Holder + Expiry */}
                        <div className="flex items-end justify-between relative z-10">
                          <div className="min-w-0 flex-1">
                            <p className="text-[9px] uppercase tracking-widest opacity-50 mb-0.5">
                              {t("cards:cardHolder").toUpperCase()}
                            </p>
                            <p className="text-xs font-semibold uppercase tracking-wide truncate drop-shadow-sm">
                              {holderName}
                            </p>
                          </div>
                          <div className="text-right shrink-0 ml-3">
                            <p className="text-[9px] uppercase tracking-widest opacity-50 mb-0.5">
                              {t("cards:expires").toUpperCase()}
                            </p>
                            <p className="text-xs font-semibold drop-shadow-sm">
                              {getExpiry(selectedCard)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Current Balance */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        {t("cards:currentBalance")}
                      </p>
                      <p className="text-2xl font-bold tabular-nums">
                        {formatCurrency(parseFloat(selectedCard.balance || 0))}
                      </p>
                    </div>

                    {/* Details */}
                    <div className="divide-y divide-border">
                      <div className="flex items-center justify-between text-sm py-3">
                        <span className="text-muted-foreground">
                          {t("cards:cardType")}
                        </span>
                        <span className="font-medium">
                          {(selectedCard.brand || "Visa").toUpperCase()}{" "}
                          {t("cards:creditCard")}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm py-3">
                        <span className="text-muted-foreground">
                          {t("cards:cardHolder")}
                        </span>
                        <span className="font-medium">{holderName}</span>
                      </div>

                      <div className="flex items-center justify-between text-sm py-3">
                        <span className="text-muted-foreground">
                          {t("cards:cardNumber")}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium font-mono text-xs">
                            {getFullCardNumber(selectedCard)}
                          </span>
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() =>
                              handleCopyNumber(getFullCardNumber(selectedCard))
                            }
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm py-3">
                        <span className="text-muted-foreground">
                          {t("cards:expires")}
                        </span>
                        <span className="font-medium">
                          {getExpiry(selectedCard)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm py-3">
                        <span className="text-muted-foreground">
                          {t("cards:status")}
                        </span>
                        <Badge
                          className={
                            isActive(selectedCard)
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                              : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                          }
                        >
                          {isActive(selectedCard)
                            ? t("cards:active")
                            : t("cards:locked")}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-sm py-3">
                        <span className="text-muted-foreground">
                          {t("cards:security")}
                        </span>
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                          <Shield className="h-3 w-3 mr-1" />
                          {t("cards:protected")}
                        </Badge>
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <CreditCard className="h-10 w-10 text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">
                      {t("cards:selectCard")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Cards;
