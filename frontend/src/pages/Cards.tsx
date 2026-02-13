import { useState, useEffect, useCallback } from "react";
import {
  CreditCard,
  RefreshCw,
  DollarSign,
  TrendingUp,
  Shield,
  MoreVertical,
  Copy,
  Star,
  MapPin,
  Plus,
  Cpu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ProfessionalKpiCard from "@/components/dashboard/ProfessionalKpiCard";
import { financeApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";

const Cards = () => {
  const { t } = useTranslation(["cards", "common"]);
  const { toast } = useToast();
  const { user } = useAuth();
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncingCardItemId, setSyncingCardItemId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

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

  const getMaskedNumber = (last4: string) =>
    `\u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 ${last4 || "****"}`;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await financeApi.getCards().catch(() => ({ cards: [] }));
      setCards(data.cards || []);
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
        description: err?.error || t("common:syncErrorDesc"),
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
        description: err?.error || t("cards:cardSyncErrorDesc"),
        variant: "destructive",
      });
    } finally {
      setSyncingCardItemId(null);
    }
  };

  const handleCopyNumber = (last4: string) => {
    navigator.clipboard.writeText(getMaskedNumber(last4));
    toast({
      title: t("cards:copySuccess"),
      variant: "success",
    });
  };

  // Computed values
  const totalBalance = cards.reduce((s, c) => s + parseFloat(c.balance || 0), 0);
  const activeCount = cards.filter((c) => isActive(c)).length;
  const averageBalance = cards.length > 0 ? totalBalance / cards.length : 0;
  const selectedCard = cards.find(
    (c) => (c.id || c.pluggy_card_id) === selectedCardId
  );

  return (
    <div className="w-full min-w-0 overflow-x-hidden space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 min-w-0">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground break-words">
            {t("cards:title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("cards:subtitle")}
          </p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncAll}
                disabled={syncing || loading}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`}
                />
                {syncing ? t("common:syncing") : t("cards:syncAll")}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t("cards:syncAllTooltip")}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

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
          {/* KPI Cards Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="kpi-card">
              <ProfessionalKpiCard
                title={t("cards:totalBalance")}
                value={`R$ ${totalBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                icon={DollarSign}
                accent="primary"
                showMenu
              />
            </div>
            <div className="kpi-card">
              <ProfessionalKpiCard
                title={t("cards:activeCards")}
                value={String(activeCount)}
                icon={CreditCard}
                accent="success"
                subtitle={t("cards:activeCount", {
                  count: activeCount,
                  total: cards.length,
                })}
                showMenu
              />
            </div>
            <div className="kpi-card">
              <ProfessionalKpiCard
                title={t("cards:averageBalance")}
                value={`R$ ${averageBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                icon={TrendingUp}
                accent="info"
                showMenu
              />
            </div>
            <div className="kpi-card">
              <ProfessionalKpiCard
                title={t("cards:securityStatus")}
                value={t("cards:protected")}
                icon={Shield}
                accent="success"
                subtitle={t("cards:allSecure")}
                showMenu
              />
            </div>
          </div>

          {/* Main Content: Card List + Card Details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left Column: Card List */}
            <div className="lg:col-span-2 space-y-4">
              <TooltipProvider>
                {cards.map((card: any) => {
                  const cardId = card.id || card.pluggy_card_id;
                  const isSelected = cardId === selectedCardId;
                  const cardActive = isActive(card);
                  const isSyncingThis = syncingCardItemId === card.item_id;
                  const balance = parseFloat(card.balance || 0);
                  const brandUpper = (card.brand || "VISA").toUpperCase();

                  return (
                    <div
                      key={cardId}
                      className={`rounded-xl overflow-hidden cursor-pointer transition-all duration-200 ${
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
                      {/* Visual Credit Card */}
                      <div className="credit-card-visual mx-4 mt-4">
                        {/* Top row: Chip + Brand */}
                        <div className="flex items-start justify-between mb-6">
                          <Cpu className="h-8 w-8 text-amber-300/80" />
                          <span className="text-sm font-bold tracking-widest opacity-90">
                            {brandUpper}
                          </span>
                        </div>

                        {/* Card Number */}
                        <div className="text-base sm:text-lg font-mono tracking-[0.2em] mb-6 opacity-95">
                          {getMaskedNumber(card.last4 || "****")}
                        </div>

                        {/* Bottom row: Holder + Expiry */}
                        <div className="flex items-end justify-between">
                          <div>
                            <p className="text-[10px] uppercase tracking-wider opacity-60 mb-0.5">
                              {t("cards:cardHolder")}
                            </p>
                            <p className="text-xs font-medium uppercase tracking-wide">
                              {holderName}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] uppercase tracking-wider opacity-60 mb-0.5">
                              {t("cards:expires")}
                            </p>
                            <p className="text-xs font-medium">
                              {getExpiry(card)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Card Info Below */}
                      <div className="p-4 space-y-3">
                        {/* Brand + Status + Menu */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {brandUpper}
                            </span>
                            <Badge
                              className={
                                cardActive
                                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                  : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                              }
                            >
                              {cardActive
                                ? t("cards:active")
                                : t("cards:locked")}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
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
                            <button
                              type="button"
                              className="text-muted-foreground/60 hover:text-muted-foreground p-1 transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground">
                              {t("cards:currentBalance")}
                            </p>
                            <p className="font-medium tabular-nums">
                              R${" "}
                              {balance.toLocaleString("pt-BR", {
                                minimumFractionDigits: 2,
                              })}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              {t("cards:cardNumber")}
                            </p>
                            <p className="font-medium tabular-nums text-xs">
                              {"\u2022\u2022\u2022\u2022"} {card.last4 || "****"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              {t("cards:expires")}
                            </p>
                            <p className="font-medium">{getExpiry(card)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              {t("cards:cardHolder")}
                            </p>
                            <p className="font-medium text-xs truncate">
                              {holderName}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </TooltipProvider>
            </div>

            {/* Right Column: Card Details Sidebar */}
            <div className="lg:col-span-1">
              <div className="chart-card sticky top-6">
                {selectedCard ? (
                  <div className="space-y-5">
                    {/* Header */}
                    <h3 className="text-base font-bold text-foreground">
                      {t("cards:cardDetails")}
                    </h3>

                    {/* Current Balance */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        {t("cards:currentBalance")}
                      </p>
                      <p className="text-2xl font-bold tabular-nums">
                        R${" "}
                        {parseFloat(selectedCard.balance || 0).toLocaleString(
                          "pt-BR",
                          { minimumFractionDigits: 2 }
                        )}
                      </p>
                    </div>

                    {/* Details */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {t("cards:cardType")}
                        </span>
                        <span className="font-medium">
                          {(selectedCard.brand || "Visa").toUpperCase()}{" "}
                          {t("cards:creditCard")}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {t("cards:cardHolder")}
                        </span>
                        <span className="font-medium">{holderName}</span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {t("cards:cardNumber")}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium font-mono text-xs">
                            {getMaskedNumber(selectedCard.last4 || "****")}
                          </span>
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() =>
                              handleCopyNumber(selectedCard.last4 || "****")
                            }
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {t("cards:expires")}
                        </span>
                        <span className="font-medium">
                          {getExpiry(selectedCard)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
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

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {t("cards:security")}
                        </span>
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                          <Shield className="h-3 w-3 mr-1" />
                          {t("cards:protected")}
                        </Badge>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-border" />

                    {/* Quick Actions */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-foreground">
                        {t("cards:quickActions")}
                      </h4>
                      <div className="space-y-2">
                        <Button
                          variant="outline"
                          className="w-full justify-start gap-2 text-sm"
                          size="sm"
                        >
                          <Star className="h-4 w-4" />
                          {t("cards:setAsDefault")}
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full justify-start gap-2 text-sm"
                          size="sm"
                        >
                          <MapPin className="h-4 w-4" />
                          {t("cards:updateBilling")}
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full justify-start gap-2 text-sm"
                          size="sm"
                        >
                          <Plus className="h-4 w-4" />
                          {t("cards:requestNewCard")}
                        </Button>
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
