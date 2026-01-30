import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Link2,
  Wallet,
  CreditCard,
  TrendingUp,
  FileText,
  FilePlus,
  History,
  Target,
  Calculator,
  Settings,
  ChevronLeft,
  ChevronRight,
  Users,
  GitBranch,
  Shield,
  Activity,
  Clock,
  Receipt,
  Search,
  MessageSquare,
  DollarSign,
  UserPlus,
  Bell,
  Package,
  Building2,
  ChevronDown,
  ChevronUp,
  Globe,
  BarChart2,
  Home,
  Coins,
  Percent,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { useIsMobile } from "@/hooks/use-mobile";

interface SidebarProps {
  collapsed?: boolean;
  onCollapse?: () => void;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

interface NavSubItem {
  label: string;
  href: string;
  enabled?: boolean;
  icon?: LucideIcon;
}

interface NavItem {
  icon: any;
  label: string;
  href?: string; // Optional if it has subitems
  enabled?: boolean; // Whether this menu item is enabled/active
  subItems?: NavSubItem[]; // Submenu items
}

// Customer navigation items - all enabled
const customerNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/app/dashboard", enabled: true },
  { icon: Bell, label: "Notificações", href: "/app/notifications", enabled: true },
  { icon: UserPlus, label: "Convites", href: "/app/invitations", enabled: true },
  { icon: Package, label: "Planos", href: "/app/plans", enabled: true },
  { icon: LayoutDashboard, label: "Ativos", href: "/app/assets", enabled: true },
  { 
    icon: Link2, 
    label: "Conexões", 
    enabled: true,
    subItems: [
      { label: "Open Finance", href: "/app/connections/open-finance", enabled: true, icon: Globe },
      { label: "B3", href: "/app/connections/b3", enabled: true, icon: BarChart2 },
    ]
  },
  { icon: Wallet, label: "Contas", href: "/app/accounts", enabled: true },
  { icon: Receipt, label: "Transações", href: "/app/transactions", enabled: true },
  { icon: CreditCard, label: "Cartões", href: "/app/cards", enabled: true },
  { icon: TrendingUp, label: "Investimentos", href: "/app/investments", enabled: true },
  {
    icon: FileText,
    label: "Relatórios",
    enabled: true,
    subItems: [
      { label: "Gerar Relatório", href: "/app/reports", enabled: true, icon: FilePlus },
      { label: "Histórico", href: "/app/reports/history", enabled: true, icon: History },
    ],
  },
  { icon: Target, label: "Metas", href: "/app/goals", enabled: true },
  {
    icon: Calculator,
    label: "Calculadoras",
    enabled: true,
    subItems: [
      { label: "FIRE", href: "/app/calculators/fire", enabled: true, icon: TrendingUp },
      { label: "Juros Compostos", href: "/app/calculators/compound", enabled: true, icon: Calculator },
      { label: "Usufruto", href: "/app/calculators/usufruct", enabled: true, icon: Home },
      { label: "ITCMD", href: "/app/calculators/itcmd", enabled: true, icon: Coins },
      { label: "Rentabilidade", href: "/app/calculators/profitability", enabled: true, icon: Percent },
    ],
  },
];

// Consultant navigation items - all enabled
const consultantNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/consultant/dashboard", enabled: true },
  { icon: Bell, label: "Notificações", href: "/consultant/notifications", enabled: true },
  { icon: LayoutDashboard, label: "Ativos", href: "/consultant/assets", enabled: true },
  { icon: Package, label: "Planos", href: "/consultant/plans", enabled: true },
  { icon: Users, label: "Clientes", href: "/consultant/clients", enabled: true },
  { icon: GitBranch, label: "Pipeline", href: "/consultant/pipeline", enabled: true },
  { icon: UserPlus, label: "Enviar Convites", href: "/consultant/invitations", enabled: true },
  { icon: MessageSquare, label: "Mensagens", href: "/consultant/messages", enabled: true },
  { icon: FileText, label: "Relatórios", href: "/consultant/reports", enabled: true },
  {
    icon: Calculator,
    label: "Calculadoras",
    enabled: true,
    subItems: [
      { label: "FIRE", href: "/consultant/calculators/fire", enabled: true, icon: TrendingUp },
      { label: "Juros Compostos", href: "/consultant/calculators/compound", enabled: true, icon: Calculator },
      { label: "Usufruto", href: "/consultant/calculators/usufruct", enabled: true, icon: Home },
      { label: "ITCMD", href: "/consultant/calculators/itcmd", enabled: true, icon: Coins },
      { label: "Rentabilidade", href: "/consultant/calculators/profitability", enabled: true, icon: Percent },
    ],
  },
  { icon: TrendingUp, label: "Simulador", href: "/consultant/simulator", enabled: true },
];

// Admin navigation items - all enabled
const adminNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/admin/dashboard", enabled: true },
  { icon: Bell, label: "Notificações", href: "/admin/notifications", enabled: true },
  { icon: Shield, label: "Usuários", href: "/admin/users", enabled: true },
  { icon: Wallet, label: "Carteiras dos Clientes", href: "/admin/wallets", enabled: true },
  { icon: Package, label: "Planos", href: "/admin/plans", enabled: true },
  { icon: DollarSign, label: "Financeiro", href: "/admin/financial", enabled: true },
  { icon: Activity, label: "Integrações", href: "/admin/integrations", enabled: true },
  { icon: Building2, label: "Instituições", href: "/admin/institutions", enabled: true },
  { icon: MessageSquare, label: "Comentários", href: "/admin/comments", enabled: true },
  { icon: Search, label: "Prospecção", href: "/admin/prospecting", enabled: true },
  { icon: Receipt, label: "Histórico de Pagamentos", href: "/admin/payments", enabled: true },
  { icon: Clock, label: "Histórico de Login", href: "/admin/login-history", enabled: true },
];

const Sidebar = ({ collapsed = false, onCollapse, mobileOpen = false, onMobileOpenChange }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();

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

  const navItems = getNavItems();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Check if a path matches any subitem
  const isSubItemActive = (subItems?: NavSubItem[]): boolean => {
    if (!subItems) return false;
    return subItems.some(subItem => location.pathname === subItem.href);
  };

  // Toggle expanded state for items with submenus
  const toggleExpanded = (label: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  // Auto-expand items with active subitems
  useEffect(() => {
    navItems.forEach(item => {
      if (item.subItems && isSubItemActive(item.subItems)) {
        setExpandedItems(prev => new Set(prev).add(item.label));
      }
    });
  }, [location.pathname, navItems]);

  // Shared navigation content component
  const NavigationContent = ({ showLabels = true, onLinkClick }: { showLabels?: boolean; onLinkClick?: () => void }) => (
    <>
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-border">
        {showLabels && (
          <Link to={getDashboardPath()} className="flex items-center gap-2" onClick={onLinkClick}>
            <img 
              src="/logo.png" 
              alt="zurT Logo" 
              className="h-12 w-12 object-contain"
            />
            <span className="font-semibold text-lg text-foreground">zurT</span>
          </Link>
        )}
        {!showLabels && (
          <Link to={getDashboardPath()} className="mx-auto" onClick={onLinkClick}>
            <img 
              src="/logo.png" 
              alt="zurT Logo" 
              className="h-12 w-12 object-contain"
            />
          </Link>
        )}
        {!isMobile && (
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
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isEnabled = item.enabled !== false; // Default to true if not specified
          const hasSubItems = item.subItems && item.subItems.length > 0;
          const isExpanded = expandedItems.has(item.label);
          const isSubActive = isSubItemActive(item.subItems);
          const isActive = item.href ? location.pathname === item.href : isSubActive;
          
          // Render disabled items differently
          if (!isEnabled) {
            return (
              <div
                key={item.label}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-not-allowed opacity-50"
                )}
                title="Funcionalidade em breve"
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {showLabels && <span>{item.label}</span>}
              </div>
            );
          }

          // Render items with submenus - collapsed: dropdown to the right (icon + chevron-down = "has submenu")
          if (hasSubItems && !showLabels) {
            return (
              <DropdownMenu key={item.label}>
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(
                      "w-full flex flex-col items-center justify-center gap-0.5 px-2 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-primary border border-sidebar-primary/30"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                    title={`${item.label} — Clique para ver opções`}
                    aria-label={`${item.label}, submenu`}
                  >
                    <item.icon className={cn("h-5 w-5 flex-shrink-0", isActive && "text-sidebar-primary")} />
                    <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 opacity-90" aria-hidden />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="start" sideOffset={8} className="min-w-[11rem]">
                  <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground normal-case">
                    {item.label}
                  </DropdownMenuLabel>
                  {item.subItems!.map((subItem) => {
                    const isSubActive = location.pathname === subItem.href;
                    const isSubEnabled = subItem.enabled !== false;
                    if (!isSubEnabled) {
                      return (
                        <DropdownMenuItem key={subItem.href} disabled className="opacity-50">
                          {subItem.icon && <subItem.icon className="mr-2 h-4 w-4 shrink-0" />}
                          {subItem.label}
                        </DropdownMenuItem>
                      );
                    }
                    const SubIcon = subItem.icon;
                    return (
                      <DropdownMenuItem
                        key={subItem.href}
                        onClick={() => {
                          navigate(subItem.href);
                          onLinkClick?.();
                        }}
                        className={cn("flex items-center gap-2", isSubActive && "bg-accent font-medium")}
                      >
                        {SubIcon && <SubIcon className="h-4 w-4 shrink-0" />}
                        {subItem.label}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          }

          // Render items with submenus - expanded: inline expandable list
          if (hasSubItems && showLabels) {
            return (
              <div key={item.label}>
                <button
                  onClick={() => toggleExpanded(item.label)}
                  className={cn(
                    "w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-primary border border-sidebar-primary/30"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className={cn("h-5 w-5 flex-shrink-0", isActive && "text-sidebar-primary")} />
                    <span>{item.label}</span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 flex-shrink-0" />
                  )}
                </button>
                {isExpanded && (
                  <div className="ml-4 mt-1 space-y-1 border-l border-sidebar-border pl-3">
                    {item.subItems!.map((subItem) => {
                      const isSubActive = location.pathname === subItem.href;
                      const isSubEnabled = subItem.enabled !== false;
                      
                      if (!isSubEnabled) {
                        const DisabledSubIcon = subItem.icon;
                        return (
                          <div
                            key={subItem.href}
                            className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground opacity-50 cursor-not-allowed"
                          >
                            {DisabledSubIcon && <DisabledSubIcon className="h-3.5 w-3.5 shrink-0" />}
                            <span>{subItem.label}</span>
                          </div>
                        );
                      }

                      const SubIcon = subItem.icon;
                      return (
                        <Link
                          key={subItem.href}
                          to={subItem.href}
                          onClick={onLinkClick}
                          className={cn(
                            "flex items-center gap-2 px-2 py-1.5 text-xs rounded-md transition-colors",
                            isSubActive
                              ? "bg-sidebar-accent text-sidebar-primary font-medium"
                              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          )}
                        >
                          {SubIcon && <SubIcon className="h-3.5 w-3.5 shrink-0" />}
                          <span>{subItem.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          // Render regular items without submenus
          return (
            <Link
              key={item.href || item.label}
              to={item.href || '#'}
              onClick={onLinkClick}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary border border-sidebar-primary/30"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5 flex-shrink-0", isActive && "text-sidebar-primary")} />
              {showLabels && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </>
  );

  // Mobile sidebar (Sheet)
  if (isMobile) {
    return (
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="left" className="w-80 p-0 bg-sidebar text-sidebar-foreground">
          <VisuallyHidden.Root asChild>
            <SheetTitle>Navigation Menu</SheetTitle>
          </VisuallyHidden.Root>
          <div className="flex flex-col h-full">
            <NavigationContent showLabels={true} onLinkClick={() => onMobileOpenChange?.(false)} />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop sidebar (hidden on screens < 1024px, lg = 1024px in Tailwind)
  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col h-screen bg-sidebar text-sidebar-foreground transition-all duration-300 sticky top-0 border-r border-sidebar-border",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <NavigationContent showLabels={!collapsed} />
    </aside>
  );
};

export default Sidebar;
