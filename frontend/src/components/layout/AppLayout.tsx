import { useState, useEffect, Suspense, useCallback, useMemo } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { cn } from "@/lib/utils";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { useTranslation } from "react-i18next";

const SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour of inactivity

const isProtectedPath = (pathname: string) =>
  pathname.startsWith("/app") || pathname.startsWith("/consultant") || pathname.startsWith("/admin");

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="flex flex-col items-center gap-3">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
);

const AppLayout = () => {
  const { t } = useTranslation(['common', 'dashboard', 'layout']);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Get page title based on current route
  const pageTitle = useMemo(() => {
    const path = location.pathname;

    // Customer routes
    if (path.includes('/app/dashboard')) return t('dashboard:title');
    if (path.includes('/app/connections/open-finance')) return t('layout:sidebar.nav.openFinance');
    if (path.includes('/app/connections/b3')) return t('layout:sidebar.nav.b3');
    if (path.includes('/app/connections')) return t('layout:sidebar.nav.connections');
    if (path.includes('/app/accounts')) return t('layout:sidebar.nav.accounts');
    if (path.includes('/app/transactions')) return t('layout:sidebar.nav.transactions');
    if (path.includes('/app/cards')) return t('layout:sidebar.nav.cards');
    if (path.includes('/app/assets')) return t('layout:sidebar.nav.assets');
    if (path.includes('/app/investments/b3')) return 'B3 Portfolio';
    if (path.includes('/app/investments')) return t('layout:sidebar.nav.investments');
    if (path.includes('/app/reports/history')) return t('layout:sidebar.nav.history');
    if (path.includes('/app/reports')) return t('layout:sidebar.nav.reports');
    if (path.includes('/app/goals')) return t('layout:sidebar.nav.goals');
    if (path.includes('/app/calculators')) return t('layout:sidebar.nav.calculators');
    if (path.includes('/app/settings')) return 'Settings';
    if (path.includes('/app/notifications')) return t('layout:sidebar.nav.notifications');
    if (path.includes('/app/invitations')) return t('layout:sidebar.nav.invitations');
    if (path.includes('/app/messages')) return t('layout:sidebar.nav.messages');
    if (path.includes('/app/plans')) return t('layout:sidebar.nav.plans');
    if (path.includes('/app/payment')) return 'Payment';

    // Consultant routes
    if (path.includes('/consultant/dashboard')) return 'Dashboard';
    if (path.includes('/consultant/clients')) return t('layout:sidebar.nav.clients');
    if (path.includes('/consultant/pipeline')) return t('layout:sidebar.nav.pipeline');
    if (path.includes('/consultant/invitations')) return t('layout:sidebar.nav.sendInvitations');
    if (path.includes('/consultant/messages')) return t('layout:sidebar.nav.messages');
    if (path.includes('/consultant/reports')) return t('layout:sidebar.nav.reports');
    if (path.includes('/consultant/calculators')) return t('layout:sidebar.nav.calculators');
    if (path.includes('/consultant/simulator')) return t('layout:sidebar.nav.simulator');
    if (path.includes('/consultant/settings')) return 'Settings';
    if (path.includes('/consultant/notifications')) return t('layout:sidebar.nav.notifications');
    if (path.includes('/consultant/plans')) return t('layout:sidebar.nav.plans');

    // Admin routes
    if (path.includes('/admin/dashboard')) return 'Dashboard';
    if (path.includes('/admin/users')) return t('layout:sidebar.nav.users');
    if (path.includes('/admin/plans')) return t('layout:sidebar.nav.plans');
    if (path.includes('/admin/payments')) return t('layout:sidebar.nav.paymentHistory');
    if (path.includes('/admin/login-history')) return t('layout:sidebar.nav.loginHistory');
    if (path.includes('/admin/integrations')) return t('layout:sidebar.nav.integrations');
    if (path.includes('/admin/prospecting')) return t('layout:sidebar.nav.prospecting');
    if (path.includes('/admin/financial')) return t('layout:sidebar.nav.financial');
    if (path.includes('/admin/comments')) return t('layout:sidebar.nav.comments');
    if (path.includes('/admin/settings')) return 'Settings';
    if (path.includes('/admin/notifications')) return t('layout:sidebar.nav.notifications');

    return '';
  }, [location.pathname, t]);

  // Redirect to login when on a protected path with no session
  useEffect(() => {
    if (!isProtectedPath(location.pathname)) return;
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    if (!token || token.trim() === "") {
      navigate("/login", { replace: true });
    }
  }, [location.pathname, navigate]);

  // Session timeout: log out user after 1 hour of inactivity
  useSessionTimeout({
    enabled: !!user,
    timeoutMs: SESSION_TIMEOUT_MS,
    onTimeout: () => {
      window.dispatchEvent(new CustomEvent('auth:unauthorized', {
        detail: { message: t('sessionExpired') },
      }));
    },
  });

  // Hide search and show date/time on all authenticated pages (customer, consultant, admin)
  // All routes starting with /app, /consultant, or /admin are authenticated pages
  const isAuthenticatedPage = location.pathname.startsWith('/app') || 
                               location.pathname.startsWith('/consultant') || 
                               location.pathname.startsWith('/admin');
  
  // Hide search box on all authenticated pages
  const hideSearch = isAuthenticatedPage;
  
  // Check if it's a customer panel page
  const isCustomerPage = location.pathname.startsWith('/app');

  // Memoize callbacks to prevent Sidebar re-renders
  const handleCollapse = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  const handleMobileOpenChange = useCallback((open: boolean) => {
    setMobileSidebarOpen(open);
  }, []);

  const handleMenuClick = useCallback(() => {
    setMobileSidebarOpen(prev => !prev);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        collapsed={sidebarCollapsed}
        onCollapse={handleCollapse}
        mobileOpen={mobileSidebarOpen}
        onMobileOpenChange={handleMobileOpenChange}
      />
      
      <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
        <TopBar
          showMenuButton
          hideSearch={hideSearch}
          onMenuClick={handleMenuClick}
          title={pageTitle}
        />
        
        <main className={`flex-1 min-h-0 flex flex-col pt-6 pb-6 px-4 overflow-y-auto ${isCustomerPage ? 'lg:pt-6 lg:pb-6 lg:px-4 xl:pt-6 xl:pb-6 xl:px-4' : 'lg:pt-6 lg:pb-6 lg:px-6'}`}>
          <div className={cn(
            'min-w-0 w-full mx-auto flex-1 flex flex-col min-h-0',
            isCustomerPage ? 'max-w-[95%] xl:max-w-[90%] 2xl:max-w-8xl' : 'max-w-8xl'
          )}>
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
