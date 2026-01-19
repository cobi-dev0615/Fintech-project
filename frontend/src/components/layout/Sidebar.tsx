import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Link2,
  Wallet,
  CreditCard,
  TrendingUp,
  FileText,
  Target,
  Calculator,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Users,
  GitBranch,
  Shield,
  CreditCard as SubscriptionIcon,
  Activity,
  Search,
  MessageSquare,
  DollarSign,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

interface SidebarProps {
  collapsed?: boolean;
  onCollapse?: () => void;
}

interface NavItem {
  icon: any;
  label: string;
  href: string;
  enabled?: boolean; // Whether this menu item is enabled/active
}

// Customer navigation items - only Dashboard enabled by default
const customerNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/app/dashboard", enabled: true },
  { icon: Link2, label: "Conexões", href: "/app/connections", enabled: false },
  { icon: Wallet, label: "Contas", href: "/app/accounts", enabled: false },
  { icon: CreditCard, label: "Cartões", href: "/app/cards", enabled: false },
  { icon: TrendingUp, label: "Investimentos", href: "/app/investments", enabled: false },
  { icon: FileText, label: "Relatórios", href: "/app/reports", enabled: false },
  { icon: Target, label: "Metas", href: "/app/goals", enabled: false },
  { icon: Calculator, label: "Calculadoras", href: "/app/calculators", enabled: false },
];

// Consultant navigation items - all enabled
const consultantNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/consultant/dashboard", enabled: true },
  { icon: Users, label: "Clientes", href: "/consultant/clients", enabled: true },
  { icon: GitBranch, label: "Pipeline", href: "/consultant/pipeline", enabled: true },
  { icon: UserPlus, label: "Enviar Convites", href: "/consultant/invitations", enabled: true },
  { icon: MessageSquare, label: "Mensagens", href: "/consultant/messages", enabled: true },
  { icon: FileText, label: "Relatórios", href: "/consultant/reports", enabled: true },
  { icon: Calculator, label: "Calculadoras", href: "/consultant/calculators", enabled: true },
  { icon: TrendingUp, label: "Simulador", href: "/consultant/simulator", enabled: true },
];

// Admin navigation items - all enabled
const adminNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/admin/dashboard", enabled: true },
  { icon: Shield, label: "Usuários", href: "/admin/users", enabled: true },
  { icon: SubscriptionIcon, label: "Assinaturas", href: "/admin/subscriptions", enabled: true },
  { icon: CreditCard, label: "Planos", href: "/admin/plans", enabled: true },
  { icon: DollarSign, label: "Financeiro", href: "/admin/financial", enabled: false },
  { icon: Activity, label: "Integrações", href: "/admin/integrations", enabled: false },
  { icon: Search, label: "Prospecção", href: "/admin/prospecting", enabled: false },
  { icon: Settings, label: "Configurações", href: "/admin/settings", enabled: false },
];

const Sidebar = ({ collapsed = false, onCollapse }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Get navigation items based on user role
  const getNavItems = () => {
    if (!user) return customerNavItems; // Default to customer if user not loaded
    
    switch (user.role) {
      case 'consultant':
        return consultantNavItems;
      case 'admin':
        return adminNavItems;
      default:
        return customerNavItems;
    }
  };

  // Get dashboard path based on user role
  const getDashboardPath = () => {
    if (!user) return '/app/dashboard';
    
    switch (user.role) {
      case 'consultant':
        return '/consultant/dashboard';
      case 'admin':
        return '/admin/dashboard';
      default:
        return '/app/dashboard';
    }
  };

  // Get settings path based on user role
  const getSettingsPath = () => {
    if (!user) return '/app/settings';
    
    switch (user.role) {
      case 'consultant':
        return '/consultant/settings';
      case 'admin':
        return '/admin/settings';
      default:
        return '/app/settings';
    }
  };

  const navItems = getNavItems();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col h-screen bg-sidebar text-sidebar-foreground transition-all duration-300 sticky top-0 border-r border-sidebar-border",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-border">
        {!collapsed && (
          <Link to={getDashboardPath()} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">F</span>
            </div>
            <span className="font-semibold text-lg text-foreground">zurT</span>
          </Link>
        )}
        {collapsed && (
          <Link to={getDashboardPath()} className="mx-auto">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">F</span>
            </div>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onCollapse}
          className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
          <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          const isEnabled = item.enabled !== false; // Default to true if not specified
          
          // Render disabled items differently
          if (!isEnabled) {
            return (
              <div
                key={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-not-allowed opacity-50"
                )}
                title="Funcionalidade em breve"
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary border border-sidebar-primary/30"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5 flex-shrink-0", isActive && "text-sidebar-primary")} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border space-y-1">
        {/* Only show settings in footer if it's not already in main navigation */}
        {!navItems.some(item => item.href === getSettingsPath()) && (
          <Link
            to={getSettingsPath()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            <Settings className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>Configurações</span>}
          </Link>
        )}
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
