import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ScrollToTop from "@/components/ui/ScrollToTop";
import ErrorBoundary from "@/components/ErrorBoundary";
import { WebSocketProvider } from "@/contexts/WebSocketContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import ThemeColorPicker from "@/components/ui/ThemeColorPicker";
import FeatureGate from "@/components/ui/FeatureGate";

// Critical components - load immediately
import AppLayout from "./components/layout/AppLayout";
// Landing page loaded eagerly to avoid dynamic import fetch failures (e.g. behind proxy/HTTPS)
import Index from "./pages/Index";
import Invitations from "./pages/Invitations";

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
const Security = lazy(() => import("./pages/Security"));
const About = lazy(() => import("./pages/About"));
const Blog = lazy(() => import("./pages/Blog"));
const Careers = lazy(() => import("./pages/Careers"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Cookies = lazy(() => import("./pages/Cookies"));
const Features = lazy(() => import("./pages/Features"));

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
const Calculators = lazy(() => import("./pages/Calculators"));
const CustomerSettings = lazy(() => import("./pages/Settings"));
const Notifications = lazy(() => import("./pages/Notifications"));
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
const FinancialReports = lazy(() => import("./pages/admin/FinancialReports"));
const Settings = lazy(() => import("./pages/admin/Settings"));
const PaymentHistory = lazy(() => import("./pages/admin/PaymentHistory"));
const LoginHistory = lazy(() => import("./pages/admin/LoginHistory"));
const AdminComments = lazy(() => import("./pages/admin/AdminComments"));
const CustomerFinanceDetail = lazy(() => import("./pages/admin/CustomerFinanceDetail"));
const Assets = lazy(() => import("./pages/Assets"));
const CustomerMessages = lazy(() => import("./pages/CustomerMessages"));

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
  <ThemeProvider>
  <CurrencyProvider>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <WebSocketProvider>
          <SubscriptionProvider>
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
            <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route path="/payment/failure" element={<PaymentFailure />} />
            <Route path="/payment/pending" element={<PaymentPending />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/auth/google" element={<GoogleAuthCallback />} />
            <Route path="/auth/google/callback" element={<GoogleAuthCallback />} />
            <Route path="/security" element={<Security />} />
            <Route path="/about" element={<About />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/careers" element={<Careers />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/cookies" element={<Cookies />} />
            <Route path="/features" element={<Features />} />
            
            {/* App Routes (Customer) */}
            <Route path="/app" element={<AppLayout />}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="connections" element={<Connections />} />
              <Route path="connections/open-finance" element={<OpenFinance />} />
              <Route path="connections/b3" element={<FeatureGate feature="b3"><B3 /></FeatureGate>} />
              <Route path="accounts" element={<Accounts />} />
              <Route path="transactions" element={<TransactionHistory />} />
              <Route path="cards" element={<Cards />} />
              <Route path="assets" element={<Assets />} />
              <Route path="investments" element={<Investments />} />
              <Route path="investments/b3" element={<FeatureGate feature="b3"><B3Portfolio /></FeatureGate>} />
              <Route path="reports" element={<FeatureGate feature="reports"><Reports /></FeatureGate>} />
              <Route path="reports/history" element={<FeatureGate feature="reports"><ReportHistory /></FeatureGate>} />
              <Route path="goals" element={<Goals />} />
              <Route path="calculators" element={<Calculators />} />
              <Route path="calculators/:type" element={<Calculators />} />
              <Route path="settings" element={<CustomerSettings />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="invitations" element={<Invitations />} />
              <Route path="messages" element={<FeatureGate feature="messages"><CustomerMessages /></FeatureGate>} />
              <Route path="plans" element={<PlanPurchase />} />
              <Route path="payment" element={<Payment />} />
              <Route path="more" element={<Dashboard />} />
            </Route>

            {/* Consultant Routes */}
            <Route path="/consultant" element={<AppLayout />}>
              <Route path="dashboard" element={<ConsultantDashboard />} />
              <Route path="clients" element={<FeatureGate feature="clients"><ClientsList /></FeatureGate>} />
              <Route path="clients/:id" element={<FeatureGate feature="clients"><ClientProfile /></FeatureGate>} />
              <Route path="pipeline" element={<FeatureGate feature="pipeline"><Pipeline /></FeatureGate>} />
              <Route path="invitations" element={<FeatureGate feature="invitations"><SendInvitations /></FeatureGate>} />
              <Route path="messages" element={<FeatureGate feature="messages"><Messages /></FeatureGate>} />
              <Route path="reports" element={<FeatureGate feature="reports"><ProfessionalReports /></FeatureGate>} />
              <Route path="calculators" element={<Calculators />} />
              <Route path="calculators/:type" element={<Calculators />} />
              <Route path="simulator" element={<FeatureGate feature="simulator"><PortfolioSimulator /></FeatureGate>} />
              <Route path="settings" element={<ConsultantSettings />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="plans" element={<PlanPurchase />} />
              <Route path="payment" element={<Payment />} />
            </Route>

            {/* Admin Routes */}
            <Route path="/admin" element={<AppLayout />}>
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="users/:id/finance" element={<CustomerFinanceDetail />} />
              <Route path="plans" element={<PlanManagement />} />
              <Route path="payments" element={<PaymentHistory />} />
              <Route path="login-history" element={<LoginHistory />} />
                <Route path="integrations" element={<IntegrationsMonitor />} />
                <Route path="prospecting" element={<DAMAProspecting />} />
              <Route path="financial" element={<FinancialReports />} />
              <Route path="comments" element={<AdminComments />} />
              <Route path="settings" element={<Settings />} />
              <Route path="notifications" element={<Notifications />} />
            </Route>
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </ErrorBoundary>
        <ScrollToTop />
          </SubscriptionProvider>
      </WebSocketProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </CurrencyProvider>
  <ThemeColorPicker />
  </ThemeProvider>
);

export default App;
