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

// App pages
import AppLayout from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Connections from "./pages/Connections";
import Accounts from "./pages/Accounts";
import Cards from "./pages/Cards";
import Investments from "./pages/Investments";

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
            <Route path="reports" element={<Dashboard />} />
            <Route path="goals" element={<Dashboard />} />
            <Route path="calculators" element={<Dashboard />} />
            <Route path="more" element={<Dashboard />} />
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
