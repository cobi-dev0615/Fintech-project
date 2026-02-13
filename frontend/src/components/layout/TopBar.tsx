import { Menu, UserCircle, LogOut, Moon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { CircleUserRound } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import NotificationDropdown from "@/components/notifications/NotificationDropdown";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";
import { useAuth } from "@/hooks/useAuth";

interface TopBarProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
  hideSearch?: boolean;
  title?: string;
  subtitle?: string;
}

const TopBar = ({ onMenuClick, showMenuButton = false, hideSearch = false, title, subtitle }: TopBarProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation('layout');

  // Get abbreviated name (First name or First + Last Initial)
  const getAbbreviatedName = () => {
    if (!user?.full_name) return '';
    const names = user.full_name.trim().split(' ');
    if (names.length >= 2) {
      return `${names[0]} ${names[names.length - 1][0]}.`;
    }
    return names[0];
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user?.full_name) return 'U';
    const names = user.full_name.trim().split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return user.full_name[0].toUpperCase();
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

  const handleLogout = () => {
    logout(); // clears session and navigates to /login
  };

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border/30 bg-background/80 backdrop-blur-xl px-4 lg:px-6">
      <div className="flex items-center gap-4">
        {showMenuButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="lg:hidden text-muted-foreground hover:text-foreground hover:bg-muted/50"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        {title && (
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        )}
      </div>

      <div className="flex items-center gap-1">
        {/* Language Switcher */}
        <LanguageSwitcher />

        {/* Dark Mode Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted/50"
          aria-label="Toggle theme"
        >
          <Moon className="h-[18px] w-[18px]" />
        </Button>

        {/* Notifications */}
        <NotificationDropdown />

        {/* Separator */}
        <div className="h-6 w-px bg-border/40 mx-1.5 hidden sm:block" />

        {/* User Profile */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-lg text-foreground hover:bg-muted/50 transition-colors focus-visible:outline-none"
                aria-label={t('topbar.openAccountMenu')}
              >
                <CircleUserRound className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground hidden sm:inline max-w-[120px] truncate">
                  {getAbbreviatedName() || t('topbar.accountFallback')}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 mt-2">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium text-foreground">{user.full_name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate(getSettingsPath())}>
                <UserCircle className="h-4 w-4 mr-2" />
                {t('topbar.myProfile')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                {t('topbar.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
};

export default TopBar;
