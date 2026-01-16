import { Link, useLocation } from "react-router-dom";
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
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  collapsed?: boolean;
  onCollapse?: () => void;
}

const navItems = [
  { icon: LayoutDashboard, label: "Painel", href: "/app/dashboard" },
  { icon: Link2, label: "Conexões", href: "/app/connections" },
  { icon: Wallet, label: "Contas", href: "/app/accounts" },
  { icon: CreditCard, label: "Cartões", href: "/app/cards" },
  { icon: TrendingUp, label: "Investimentos", href: "/app/investments" },
  { icon: FileText, label: "Relatórios", href: "/app/reports" },
  { icon: Target, label: "Metas", href: "/app/goals" },
  { icon: Calculator, label: "Calculadoras", href: "/app/calculators" },
];

const Sidebar = ({ collapsed = false, onCollapse }: SidebarProps) => {
  const location = useLocation();

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
          <Link to="/app/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">F</span>
            </div>
            <span className="font-semibold text-lg text-foreground">zurT</span>
          </Link>
        )}
        {collapsed && (
          <Link to="/app/dashboard" className="mx-auto">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">F</span>
            </div>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onCollapse}
          className={cn(
            "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            collapsed && "hidden"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
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
        <Link
          to="/app/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        >
          <Settings className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>Configurações</span>}
        </Link>
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors">
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
