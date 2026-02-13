import { useState, useEffect, useMemo } from "react";
import { Wallet, TrendingUp, PiggyBank, CreditCard, Target, UserCheck } from "lucide-react";
import ProfessionalKpiCard from "@/components/dashboard/ProfessionalKpiCard";
import NetWorthChart from "@/components/dashboard/NetWorthChart";
import { PlanInfoCard } from "@/components/dashboard/PlanInfoCard";
import { ConsultantInfoCard } from "@/components/dashboard/ConsultantInfoCard";
import { GoalCard } from "@/components/dashboard/GoalCard";
import { EmptyStateCard } from "@/components/dashboard/EmptyStateCard";
import { DraggableDashboard } from "@/components/dashboard/DraggableDashboard";
import type { DashboardCard } from "@/types/dashboard";
import { financeApi, subscriptionsApi, customerApi, goalsApi } from "@/lib/api";
import { useTranslation } from "react-i18next";
import { useCurrency } from "@/contexts/CurrencyContext";

const Dashboard = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const { formatCurrency } = useCurrency();
  const [openFinanceData, setOpenFinanceData] = useState<{
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
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);
  const [consultant, setConsultant] = useState<any>(null);
  const [goals, setGoals] = useState<any[]>([]);

  const fetchOpenFinanceData = async () => {
    try {
      const [
        accountsData,
        transactionsData,
        investmentsData,
        cardsData,
        subscriptionData,
        consultantsData,
        goalsData
      ] = await Promise.all([
        financeApi.getAccounts().catch(() => ({ accounts: [], grouped: [], total: 0 })),
        financeApi.getTransactions({ page: 1, limit: 10 }).catch(() => ({ transactions: [], pagination: { total: 0 } })),
        financeApi.getInvestments().catch(() => ({ investments: [], total: 0, breakdown: [] })),
        financeApi.getCards().catch(() => ({ cards: [] })),
        subscriptionsApi.getMySubscription().catch(() => ({ subscription: null })),
        customerApi.getConsultants().catch(() => ({ consultants: [] })),
        goalsApi.getAll().catch(() => ({ goals: [] })),
      ]);

      setOpenFinanceData({
        accounts: accountsData.accounts || [],
        groupedAccounts: accountsData.grouped || [],
        transactions: transactionsData.transactions || [],
        investments: investmentsData.investments || [],
        cards: cardsData.cards || [],
        totalBalance: accountsData.total || 0,
        totalInvestments: investmentsData.total || 0,
        totalTransactions: transactionsData.pagination?.total ?? 0,
      });

      setSubscription(subscriptionData.subscription);
      setConsultant(consultantsData.consultants?.find((c: any) => c.isPrimary) || consultantsData.consultants?.[0] || null);
      setGoals(goalsData.goals || []);
    } catch (err: any) {
      console.error("Error fetching open finance data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpenFinanceData();
  }, []);

  const cashBalance = openFinanceData.totalBalance;
  const investmentValue = openFinanceData.totalInvestments;

  // Calculate total card debt (using balance to match Assets page)
  const cardDebt = openFinanceData.cards.reduce((total: number, card: any) => {
    return total + parseFloat(card.balance || 0);
  }, 0);

  // Calculate net worth (subtracting debt to match Assets page)
  const netWorth = openFinanceData.totalBalance + openFinanceData.totalInvestments - cardDebt;

  // Define dashboard card configuration (must be before conditional returns)
  const dashboardCards = useMemo((): DashboardCard[] => {
    const cards: DashboardCard[] = [
      // Net Worth Card
      {
        id: 'net-worth',
        type: 'kpi',
        order: 0,
        component: (
          <ProfessionalKpiCard
            title={t('dashboard:netWorth')}
            value={formatCurrency(netWorth)}
            change=""
            changeType="neutral"
            icon={PiggyBank}
            accent="success"
            subtitle={t('common:total')}
          />
        ),
        span: {
          mobile: 1,
          tablet: 1,
          desktop: 1,
        },
      },
      // Available Card
      {
        id: 'available',
        type: 'kpi',
        order: 1,
        component: (
          <ProfessionalKpiCard
            title={t('dashboard:available')}
            value={formatCurrency(cashBalance)}
            change=""
            changeType="neutral"
            icon={Wallet}
            accent="primary"
            subtitle={t('dashboard:totalCash')}
          />
        ),
        span: {
          mobile: 1,
          tablet: 1,
          desktop: 1,
        },
      },
      // Invested Card
      {
        id: 'invested',
        type: 'kpi',
        order: 2,
        component: (
          <ProfessionalKpiCard
            title={t('dashboard:invested')}
            value={formatCurrency(investmentValue)}
            change=""
            changeType="neutral"
            icon={TrendingUp}
            accent="info"
            subtitle={t('dashboard:inPortfolio')}
          />
        ),
        span: {
          mobile: 1,
          tablet: 1,
          desktop: 1,
        },
      },
      // Card Debt
      {
        id: 'card-debt',
        type: 'kpi',
        order: 3,
        component: (
          <ProfessionalKpiCard
            title={t('dashboard:cardDebt')}
            value={formatCurrency(cardDebt)}
            change=""
            changeType="neutral"
            icon={CreditCard}
            accent="warning"
            subtitle={t('common:total')}
          />
        ),
        span: {
          mobile: 1,
          tablet: 1,
          desktop: 1,
        },
      },
    ];

    // Add plan info card (show empty state if no subscription)
    cards.push({
      id: 'plan-info',
      type: 'kpi',
      order: 10,
      component: subscription ? (
        <PlanInfoCard
          planName={subscription.plan.name}
          price={subscription.plan.priceCents}
          status={subscription.status}
          currentPeriodEnd={subscription.currentPeriodEnd}
        />
      ) : (
        <EmptyStateCard
          title={t('dashboard:currentPlan')}
          icon={CreditCard}
        />
      ),
      span: {
        mobile: 2,
        tablet: 2,
        desktop: 1,
      },
    });

    // Add consultant info card (show empty state if no consultant)
    cards.push({
      id: 'consultant-info',
      type: 'kpi',
      order: 11,
      component: consultant ? (
        <ConsultantInfoCard
          name={consultant.name}
          email={consultant.email}
          isPrimary={consultant.isPrimary || false}
        />
      ) : (
        <EmptyStateCard
          title={t('dashboard:yourConsultant')}
          icon={UserCheck}
        />
      ),
      span: {
        mobile: 2,
        tablet: 2,
        desktop: 1,
      },
    });

    // Add goal card (show empty state if no active goal)
    const activeGoal = goals.find((g: any) => g.deadline && new Date(g.deadline) > new Date());
    cards.push({
      id: 'goal-card',
      type: 'kpi',
      order: 12,
      component: activeGoal ? (
        <GoalCard
          name={activeGoal.name}
          target={activeGoal.target}
          current={activeGoal.current}
          deadline={activeGoal.deadline}
          category={activeGoal.category}
        />
      ) : (
        <EmptyStateCard
          title={t('dashboard:goal', { defaultValue: 'Goal' })}
          icon={Target}
        />
      ),
      span: {
        mobile: 2,
        tablet: 2,
        desktop: 2,
      },
    });

    // Add chart at the end (non-draggable, always at bottom)
    cards.push({
      id: 'net-worth-chart',
      type: 'chart',
      order: 999,
      component: <NetWorthChart />,
      span: {
        mobile: 2,
        tablet: 2,
        desktop: 4,
      },
      draggable: false,
    });

    return cards;
  }, [t, formatCurrency, netWorth, cashBalance, investmentValue, cardDebt, openFinanceData, subscription, consultant, goals]);

  // Show loading state
  if (loading) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Draggable Dashboard Cards */}
      <div className="flex-1 min-h-0 flex flex-col gap-6">
        <DraggableDashboard
          dashboardType="customer"
          defaultCards={dashboardCards}
        />
      </div>
    </div>
  );
};

export default Dashboard;
