import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  Wallet,
  CreditCard,
  TrendingUp,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

const BottomNav = () => {
  const location = useLocation();
  const { t } = useTranslation('layout');

  const navItems = [
    { icon: LayoutDashboard, label: t('bottomNav.home'), href: "/app/dashboard" },
    { icon: Wallet, label: t('bottomNav.accounts'), href: "/app/accounts" },
    { icon: CreditCard, label: t('bottomNav.cards'), href: "/app/cards" },
    { icon: TrendingUp, label: t('bottomNav.invest'), href: "/app/investments" },
    { icon: MoreHorizontal, label: t('bottomNav.more'), href: "/app/more" },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href === "/app/dashboard" && location.pathname.startsWith("/app") && !navItems.slice(1, -1).some(i => location.pathname.startsWith(i.href)));
          
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[64px]",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "text-primary")} />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
      {/* Safe area for iOS */}
      <div className="h-safe-area-inset-bottom bg-card/95" />
    </nav>
  );
};

export default BottomNav;
