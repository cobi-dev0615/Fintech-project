import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ScrollToTop from "@/components/ui/ScrollToTop";

// Public pages
import Index from "./pages/Index";
import Pricing from "./pages/Pricing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";

// App pages (Customer)
import AppLayout from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Connections from "./pages/Connections";
import Accounts from "./pages/Accounts";
import Cards from "./pages/Cards";
import Investments from "./pages/Investments";
import B3Portfolio from "./pages/B3Portfolio";
import Reports from "./pages/Reports";
import Goals from "./pages/Goals";
import Calculators from "./pages/Calculators";
import FIRECalculator from "./pages/calculators/FIRECalculator";
import CompoundInterest from "./pages/calculators/CompoundInterest";
import UsufructCalculator from "./pages/calculators/UsufructCalculator";
import ITCMDCalculator from "./pages/calculators/ITCMDCalculator";
import ProfitabilitySimulator from "./pages/calculators/ProfitabilitySimulator";

// Consultant pages
import ConsultantDashboard from "./pages/consultant/ConsultantDashboard";
import ClientsList from "./pages/consultant/ClientsList";
import ClientProfile from "./pages/consultant/ClientProfile";
import Pipeline from "./pages/consultant/Pipeline";
import Messages from "./pages/consultant/Messages";
import ProfessionalReports from "./pages/consultant/ProfessionalReports";
import PortfolioSimulator from "./pages/consultant/PortfolioSimulator";
import SendInvitations from "./pages/consultant/SendInvitations";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import UserManagement from "./pages/admin/UserManagement";
import Subscriptions from "./pages/admin/Subscriptions";
import IntegrationsMonitor from "./pages/admin/IntegrationsMonitor";
import DAMAProspecting from "./pages/admin/DAMAProspecting";
import FinancialReports from "./pages/admin/FinancialReports";
import Settings from "./pages/admin/Settings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Index />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/onboarding" element={<Onboarding />} />
          
          {/* App Routes (Customer) */}
          <Route path="/app" element={<AppLayout />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="connections" element={<Connections />} />
            <Route path="accounts" element={<Accounts />} />
            <Route path="cards" element={<Cards />} />
            <Route path="investments" element={<Investments />} />
            <Route path="investments/b3" element={<B3Portfolio />} />
            <Route path="reports" element={<Reports />} />
            <Route path="goals" element={<Goals />} />
            <Route path="calculators" element={<Calculators />} />
            <Route path="calculators/fire" element={<FIRECalculator />} />
            <Route path="calculators/compound" element={<CompoundInterest />} />
            <Route path="calculators/usufruct" element={<UsufructCalculator />} />
            <Route path="calculators/itcmd" element={<ITCMDCalculator />} />
            <Route path="calculators/profitability" element={<ProfitabilitySimulator />} />
            <Route path="more" element={<Dashboard />} />
          </Route>

          {/* Consultant Routes */}
          <Route path="/consultant" element={<AppLayout />}>
            <Route path="dashboard" element={<ConsultantDashboard />} />
            <Route path="clients" element={<ClientsList />} />
            <Route path="clients/:id" element={<ClientProfile />} />
            <Route path="pipeline" element={<Pipeline />} />
            <Route path="invitations" element={<SendInvitations />} />
            <Route path="messages" element={<Messages />} />
            <Route path="reports" element={<ProfessionalReports />} />
            <Route path="calculators" element={<Calculators />} />
            <Route path="calculators/fire" element={<FIRECalculator />} />
            <Route path="calculators/compound" element={<CompoundInterest />} />
            <Route path="calculators/usufruct" element={<UsufructCalculator />} />
            <Route path="calculators/itcmd" element={<ITCMDCalculator />} />
            <Route path="calculators/profitability" element={<ProfitabilitySimulator />} />
            <Route path="simulator" element={<PortfolioSimulator />} />
          </Route>

          {/* Admin Routes */}
          <Route path="/admin" element={<AppLayout />}>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="subscriptions" element={<Subscriptions />} />
            <Route path="integrations" element={<IntegrationsMonitor />} />
            <Route path="prospecting" element={<DAMAProspecting />} />
            <Route path="financial" element={<FinancialReports />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          
          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <ScrollToTop />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
