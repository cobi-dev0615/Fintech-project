import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ScrollToTop from "@/components/ui/ScrollToTop";
import ErrorBoundary from "@/components/ErrorBoundary";
import { WebSocketProvider } from "@/contexts/WebSocketContext";

// Critical components - load immediately
import AppLayout from "./components/layout/AppLayout";
// Landing page loaded eagerly to avoid dynamic import fetch failures (e.g. behind proxy/HTTPS)
import Index from "./pages/Index";

// Lazy load all pages for code splitting
// Public pages
const Pricing = lazy(() => import("./pages/Pricing"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const GoogleAuthCallback = lazy(() => import("./pages/GoogleAuthCallback"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentFailure = lazy(() => import("./pages/PaymentFailure"));
const PaymentPending = lazy(() => import("./pages/PaymentPending"));
const NotFound = lazy(() => import("./pages/NotFound"));

// App pages (Customer) - lazy loaded
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Connections = lazy(() => import("./pages/Connections"));
const OpenFinance = lazy(() => import("./pages/OpenFinance"));
const B3 = lazy(() => import("./pages/B3"));
const Accounts = lazy(() => import("./pages/Accounts"));
const Cards = lazy(() => import("./pages/Cards"));
const Investments = lazy(() => import("./pages/Investments"));
const B3Portfolio = lazy(() => import("./pages/B3Portfolio"));
const Reports = lazy(() => import("./pages/Reports"));
const ReportHistory = lazy(() => import("./pages/ReportHistory"));
const TransactionHistory = lazy(() => import("./pages/TransactionHistory"));
const Goals = lazy(() => import("./pages/Goals"));
const FIRECalculator = lazy(() => import("./pages/calculators/FIRECalculator"));
const CompoundInterest = lazy(() => import("./pages/calculators/CompoundInterest"));
const UsufructCalculator = lazy(() => import("./pages/calculators/UsufructCalculator"));
const ITCMDCalculator = lazy(() => import("./pages/calculators/ITCMDCalculator"));
const ProfitabilitySimulator = lazy(() => import("./pages/calculators/ProfitabilitySimulator"));
const CustomerSettings = lazy(() => import("./pages/Settings"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Invitations = lazy(() => import("./pages/Invitations"));
const PlanPurchase = lazy(() => import("./pages/PlanPurchase"));
const Payment = lazy(() => import("./pages/Payment"));

// Consultant pages - lazy loaded
const ConsultantDashboard = lazy(() => import("./pages/consultant/ConsultantDashboard"));
const ClientsList = lazy(() => import("./pages/consultant/ClientsList"));
const ClientProfile = lazy(() => import("./pages/consultant/ClientProfile"));
const Pipeline = lazy(() => import("./pages/consultant/Pipeline"));
const Messages = lazy(() => import("./pages/consultant/Messages"));
const ProfessionalReports = lazy(() => import("./pages/consultant/ProfessionalReports"));
const PortfolioSimulator = lazy(() => import("./pages/consultant/PortfolioSimulator"));
const SendInvitations = lazy(() => import("./pages/consultant/SendInvitations"));
const ConsultantSettings = lazy(() => import("./pages/consultant/Settings"));

// Admin pages - lazy loaded
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const UserManagement = lazy(() => import("./pages/admin/UserManagement"));
const PlanManagement = lazy(() => import("./pages/admin/PlanManagement"));
const IntegrationsMonitor = lazy(() => import("./pages/admin/IntegrationsMonitor"));
const DAMAProspecting = lazy(() => import("./pages/admin/DAMAProspecting"));
const Institutions = lazy(() => import("./pages/admin/Institutions"));
const FinancialReports = lazy(() => import("./pages/admin/FinancialReports"));
const Settings = lazy(() => import("./pages/admin/Settings"));
const PaymentHistory = lazy(() => import("./pages/admin/PaymentHistory"));
const LoginHistory = lazy(() => import("./pages/admin/LoginHistory"));
const AdminComments = lazy(() => import("./pages/admin/AdminComments"));
const Assets = lazy(() => import("./pages/Assets"));

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Disable refetch on window focus globally
      staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
      gcTime: 10 * 60 * 1000, // Keep unused data in cache for 10 minutes (formerly cacheTime)
      retry: (failureCount, error: any) => {
        // Don't retry on 401 errors
        if (error?.statusCode === 401 || error?.code === 'FST_JWT_NO_AUTHORIZATION_IN_HEADER') {
          return false;
        }
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <WebSocketProvider>
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
            <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/payment/success" element={<Suspense fallback={<PageLoader />}><PaymentSuccess /></Suspense>} />
            <Route path="/payment/failure" element={<Suspense fallback={<PageLoader />}><PaymentFailure /></Suspense>} />
            <Route path="/payment/pending" element={<Suspense fallback={<PageLoader />}><PaymentPending /></Suspense>} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/auth/google" element={<GoogleAuthCallback />} />
            <Route path="/auth/google/callback" element={<GoogleAuthCallback />} />
            
            {/* App Routes (Customer) */}
            <Route path="/app" element={<AppLayout />}>
              <Route path="dashboard" element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
              <Route path="connections" element={<Suspense fallback={<PageLoader />}><Connections /></Suspense>} />
              <Route path="connections/open-finance" element={<Suspense fallback={<PageLoader />}><OpenFinance /></Suspense>} />
              <Route path="connections/b3" element={<Suspense fallback={<PageLoader />}><B3 /></Suspense>} />
              <Route path="accounts" element={<Suspense fallback={<PageLoader />}><Accounts /></Suspense>} />
              <Route path="transactions" element={<Suspense fallback={<PageLoader />}><TransactionHistory /></Suspense>} />
              <Route path="cards" element={<Suspense fallback={<PageLoader />}><Cards /></Suspense>} />
              <Route path="assets" element={<Suspense fallback={<PageLoader />}><Assets /></Suspense>} />
              <Route path="investments" element={<Suspense fallback={<PageLoader />}><Investments /></Suspense>} />
              <Route path="investments/b3" element={<Suspense fallback={<PageLoader />}><B3Portfolio /></Suspense>} />
              <Route path="reports" element={<Suspense fallback={<PageLoader />}><Reports /></Suspense>} />
              <Route path="reports/history" element={<Suspense fallback={<PageLoader />}><ReportHistory /></Suspense>} />
              <Route path="goals" element={<Suspense fallback={<PageLoader />}><Goals /></Suspense>} />
              <Route path="calculators" element={<Navigate to="calculators/fire" replace />} />
              <Route path="calculators/fire" element={<Suspense fallback={<PageLoader />}><FIRECalculator /></Suspense>} />
              <Route path="calculators/compound" element={<Suspense fallback={<PageLoader />}><CompoundInterest /></Suspense>} />
              <Route path="calculators/usufruct" element={<Suspense fallback={<PageLoader />}><UsufructCalculator /></Suspense>} />
              <Route path="calculators/itcmd" element={<Suspense fallback={<PageLoader />}><ITCMDCalculator /></Suspense>} />
              <Route path="calculators/profitability" element={<Suspense fallback={<PageLoader />}><ProfitabilitySimulator /></Suspense>} />
              <Route path="settings" element={<Suspense fallback={<PageLoader />}><CustomerSettings /></Suspense>} />
              <Route path="notifications" element={<Suspense fallback={<PageLoader />}><Notifications /></Suspense>} />
              <Route path="invitations" element={<Suspense fallback={<PageLoader />}><Invitations /></Suspense>} />
              <Route path="plans" element={<Suspense fallback={<PageLoader />}><PlanPurchase /></Suspense>} />
              <Route path="payment" element={<Suspense fallback={<PageLoader />}><Payment /></Suspense>} />
              <Route path="more" element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
            </Route>

            {/* Consultant Routes */}
            <Route path="/consultant" element={<AppLayout />}>
              <Route path="dashboard" element={<Suspense fallback={<PageLoader />}><ConsultantDashboard /></Suspense>} />
              <Route path="clients" element={<Suspense fallback={<PageLoader />}><ClientsList /></Suspense>} />
              <Route path="clients/:id" element={<Suspense fallback={<PageLoader />}><ClientProfile /></Suspense>} />
              <Route path="assets" element={<Suspense fallback={<PageLoader />}><Assets /></Suspense>} />
              <Route path="pipeline" element={<Suspense fallback={<PageLoader />}><Pipeline /></Suspense>} />
              <Route path="invitations" element={<Suspense fallback={<PageLoader />}><SendInvitations /></Suspense>} />
              <Route path="messages" element={<Suspense fallback={<PageLoader />}><Messages /></Suspense>} />
              <Route path="reports" element={<Suspense fallback={<PageLoader />}><ProfessionalReports /></Suspense>} />
              <Route path="calculators" element={<Navigate to="calculators/fire" replace />} />
              <Route path="calculators/fire" element={<Suspense fallback={<PageLoader />}><FIRECalculator /></Suspense>} />
              <Route path="calculators/compound" element={<Suspense fallback={<PageLoader />}><CompoundInterest /></Suspense>} />
              <Route path="calculators/usufruct" element={<Suspense fallback={<PageLoader />}><UsufructCalculator /></Suspense>} />
              <Route path="calculators/itcmd" element={<Suspense fallback={<PageLoader />}><ITCMDCalculator /></Suspense>} />
              <Route path="calculators/profitability" element={<Suspense fallback={<PageLoader />}><ProfitabilitySimulator /></Suspense>} />
              <Route path="simulator" element={<Suspense fallback={<PageLoader />}><PortfolioSimulator /></Suspense>} />
              <Route path="settings" element={<Suspense fallback={<PageLoader />}><ConsultantSettings /></Suspense>} />
              <Route path="notifications" element={<Suspense fallback={<PageLoader />}><Notifications /></Suspense>} />
              <Route path="plans" element={<Suspense fallback={<PageLoader />}><PlanPurchase /></Suspense>} />
              <Route path="payment" element={<Suspense fallback={<PageLoader />}><Payment /></Suspense>} />
            </Route>

            {/* Admin Routes */}
            <Route path="/admin" element={<AppLayout />}>
              <Route path="dashboard" element={<Suspense fallback={<PageLoader />}><AdminDashboard /></Suspense>} />
              <Route path="users" element={<Suspense fallback={<PageLoader />}><UserManagement /></Suspense>} />
              <Route path="plans" element={<Suspense fallback={<PageLoader />}><PlanManagement /></Suspense>} />
              <Route path="payments" element={<Suspense fallback={<PageLoader />}><PaymentHistory /></Suspense>} />
              <Route path="login-history" element={<Suspense fallback={<PageLoader />}><LoginHistory /></Suspense>} />
                <Route path="integrations" element={<Suspense fallback={<PageLoader />}><IntegrationsMonitor /></Suspense>} />
                <Route path="prospecting" element={<Suspense fallback={<PageLoader />}><DAMAProspecting /></Suspense>} />
                <Route path="institutions" element={<Suspense fallback={<PageLoader />}><Institutions /></Suspense>} />
              <Route path="financial" element={<Suspense fallback={<PageLoader />}><FinancialReports /></Suspense>} />
              <Route path="comments" element={<Suspense fallback={<PageLoader />}><AdminComments /></Suspense>} />
              <Route path="settings" element={<Suspense fallback={<PageLoader />}><Settings /></Suspense>} />
              <Route path="notifications" element={<Suspense fallback={<PageLoader />}><Notifications /></Suspense>} />
            </Route>
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </ErrorBoundary>
        <ScrollToTop />
      </WebSocketProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
