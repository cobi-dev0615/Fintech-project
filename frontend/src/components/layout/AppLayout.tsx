import { useState, useEffect, Suspense, useCallback } from "react";
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
  const { t } = useTranslation('common');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

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
    <div className="flex min-h-screen bg-gray-950">
      <Sidebar
        collapsed={sidebarCollapsed}
        onCollapse={handleCollapse}
        mobileOpen={mobileSidebarOpen}
        onMobileOpenChange={handleMobileOpenChange}
      />
      
      <div className="flex-1 flex flex-col min-h-0">
        <TopBar
          showMenuButton
          hideSearch={hideSearch}
          onMenuClick={handleMenuClick}
        />
        
        <main className={`flex-1 min-h-0 flex flex-col py-3 px-4 overflow-hidden ${isCustomerPage ? 'lg:py-3 lg:px-4 xl:py-4 xl:px-4' : 'lg:py-4 lg:px-6'}`}>
          <div className={cn(
            'min-w-0 w-full mx-auto flex-1 flex flex-col min-h-0 overflow-hidden',
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
